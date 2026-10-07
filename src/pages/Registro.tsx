import { useEffect, useMemo, useState, type KeyboardEvent } from 'react';
import { addDays, addMonths, eachDayOfInterval, endOfMonth, startOfMonth } from 'date-fns';
import { ChevronLeft, ChevronRight, Check, Fingerprint } from 'lucide-react';
import type { Empleada, Fichaje, Registro as Reg, Turno } from '../lib/types';
import { estadoDia } from '../lib/fichaje';
import { colorVars } from '../lib/theme';
import { activas, jornada } from '../lib/rules';
import { capital, diasSemana, diff, dur, fmt, hhmm, iso, lunesDe, minutos, rangoSemana, rangoTramos, toMin } from '../lib/time';
import { tramosValidos, useStore } from '../store';
import { Badge, Button, Card, PageHeader, Segmented, cx } from '../components/ui';

type Vista = 'dia' | 'semana' | 'mes';

/** Lo que fichó la empleada ese día, en una línea; avisa si quedó una entrada sin salida en un día pasado. */
function LineaFichajes({ fichajes, registro, pasado }: { fichajes: Fichaje[]; registro?: Reg; pasado: boolean }) {
  if (!fichajes.length) return null;
  // Solo avisa mientras nadie lo haya resuelto: si ya hay registro de horas, el encargado lo completó.
  const incompleto = pasado && !registro && estadoDia(fichajes).dentro;
  return (
    <span className="flex flex-wrap items-center gap-1.5 text-[11px] text-muted" title={registro?.origen === 'fichaje' ? 'Horas tomadas de los fichajes' : 'Horas ajustadas a mano'}>
      <Fingerprint size={12} className={registro?.origen === 'fichaje' ? 'text-ok-fg' : ''} />
      <span className="num">{fichajes.map(f => `${f.tipo === 'entrada' ? '↘' : '↗'} ${hhmm(f.minuto)}`).join('  ')}</span>
      {incompleto && <Badge tone="warn">Falta salida</Badge>}
    </span>
  );
}
const COLS = '150px 170px 190px 84px 76px minmax(120px,1fr) 150px';

function useFilaRegistro(e: Empleada, fecha: string, turno: Turno | undefined, registro: Reg | undefined, hoy: string) {
  const { state, acciones } = useStore();
  const fichajes = useMemo(() => state.fichajes.filter(f => f.empleadaId === e.id && f.fecha === fecha), [state.fichajes, e.id, fecha]);
  const base = registro?.tramos ?? turno?.tramos ?? [];
  // Sin registro ni turno pero con fichajes (p. ej. olvidó la salida): se parte de lo fichado y la salida queda por completar.
  const valsIniciales = () => {
    if (base.length) return base.map(t => ({ a: hhmm(t.inicio), b: hhmm(t.fin) }));
    const { pares, abierta } = estadoDia(fichajes);
    return [...pares.map(p => ({ a: hhmm(p.inicio), b: hhmm(p.fin) })), ...(abierta !== null ? [{ a: hhmm(abierta), b: '' }] : [])].slice(0, 2);
  };
  const [vals, setVals] = useState(valsIniciales);
  const [nota, setNota] = useState(registro?.nota ?? '');
  // Por contenido, no por identidad: un refresco que no cambia nada no debe reiniciar lo que se está escribiendo.
  const huella = JSON.stringify([registro, turno?.tramos, fichajes.map(f => f.id)]);
  useEffect(() => { setVals(valsIniciales()); setNota(registro?.nota ?? ''); }, [huella]); // eslint-disable-line react-hooks/exhaustive-deps

  const parsed = vals.filter(v => v.a && v.b).map(v => ({ inicio: toMin(v.a), fin: toMin(v.b) }));
  const ok = parsed.length === vals.length && tramosValidos(parsed);
  const plan = minutos(turno?.tramos), real = ok ? minutos(parsed) : 0, df = turno ? real - plan : 0;
  const futuro = fecha > hoy;
  const estado = registro?.estado === 'confirmado' ? 'Confirmado' : futuro && !registro ? 'Planificado' : 'Por confirmar';
  const cambiado = JSON.stringify(parsed) !== JSON.stringify(base) || nota !== (registro?.nota ?? '');
  const guardar = (est: Reg['estado']) => { if (!ok) return; acciones.guardarRegistro({ empleadaId: e.id, fecha, tramos: parsed, nota: nota.trim() || undefined, estado: est }, est === 'confirmado' ? `${e.nombre}: horas confirmadas` : undefined); };
  const blur = () => { if (cambiado) guardar(registro?.estado ?? 'previsto'); };
  const tecla = (ev: KeyboardEvent) => { if (ev.key === 'Enter') { (ev.target as HTMLElement).blur(); guardar('confirmado'); } };
  const inp = (difiere: boolean) => cx('num h-[30px] w-[78px] rounded-md border px-1.5 text-center text-[13px] font-semibold outline-none focus:border-primary focus:shadow-[0_0_0_3px_var(--primary-tint)]',
    difiere ? 'border-warn-line bg-warn-bg text-warn-fg' : futuro && !registro ? 'border-border bg-transparent font-normal text-muted' : 'border-border bg-bg');

  return { vals, setVals, nota, setNota, ok, plan, real, df, futuro, estado, guardar, blur, tecla, inp, turno, fichajes };
}

function FilaDesktop({ e, fecha, turno, registro, hoy }: { e: Empleada; fecha: string; turno?: Turno; registro?: Reg; hoy: string }) {
  const { vals, setVals, nota, setNota, real, df, futuro, estado, guardar, blur, tecla, inp, turno: t, fichajes } = useFilaRegistro(e, fecha, turno, registro, hoy);

  return (
    <div style={{ ...colorVars(e.color), gridTemplateColumns: COLS }} className={cx('grid items-center gap-2 border-b border-border px-4 py-2.5', futuro && !registro && 'opacity-70')}
      onKeyDown={tecla}>
      <div className="flex flex-col gap-0.5">
        <div className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-c-solid" /><span className="text-[13px] font-semibold">{e.nombre}</span></div>
        <LineaFichajes fichajes={fichajes} registro={registro} pasado={fecha < hoy} />
      </div>
      <span className="num text-[13px] text-muted">{t ? rangoTramos(t.tramos) : 'Extra'}</span>
      <div className="flex flex-col gap-1">
        {vals.map((v, k) => (
          <div key={k} className="flex items-center gap-1">
            <input type="time" value={v.a} onBlur={blur} onChange={ev => setVals(vs => vs.map((x, i) => i === k ? { ...x, a: ev.target.value } : x))} className={inp(!!t && v.a !== hhmm(t.tramos[k]?.inicio ?? -1))} aria-label="Entrada" />
            <span className="text-xs text-muted">–</span>
            <input type="time" value={v.b} onBlur={blur} onChange={ev => setVals(vs => vs.map((x, i) => i === k ? { ...x, b: ev.target.value } : x))} className={inp(!!t && v.b !== hhmm(t.tramos[k]?.fin ?? -1))} aria-label="Salida" />
          </div>
        ))}
      </div>
      <div>{df === 0 ? <span className="text-[13px] text-muted">—</span> : <span className={cx('num rounded-full px-2 py-0.5 text-xs font-semibold', df > 0 ? 'bg-warn-bg text-warn-fg' : 'bg-primary-tint')}>{diff(df)}</span>}</div>
      <span className="num pr-3 text-right text-[13px] font-semibold">{dur(real)}</span>
      <input value={nota} onChange={ev => setNota(ev.target.value)} onBlur={blur} placeholder={futuro ? '' : 'Añadir nota'} className="h-[30px] min-w-0 rounded-md border border-transparent bg-transparent px-2 text-[13px] outline-none placeholder:text-muted placeholder:opacity-60 hover:border-border focus:border-primary" />
      <div className="flex items-center gap-1.5">
        <Badge tone={estado === 'Confirmado' ? 'ok' : estado === 'Planificado' ? 'neutral' : 'warn'}>{estado}</Badge>
        {estado !== 'Confirmado' && !futuro && <button onClick={() => guardar('confirmado')} className="grid h-7 w-7 place-items-center rounded-md text-muted hover:bg-hover hover:text-ok-fg" aria-label="Confirmar"><Check size={15} /></button>}
      </div>
    </div>
  );
}

function FilaMobile({ e, fecha, turno, registro, hoy }: { e: Empleada; fecha: string; turno?: Turno; registro?: Reg; hoy: string }) {
  const { vals, setVals, nota, setNota, real, df, futuro, estado, guardar, blur, tecla, inp, turno: t, fichajes } = useFilaRegistro(e, fecha, turno, registro, hoy);

  return (
    <div style={colorVars(e.color)} className={cx('rounded-xl border border-border bg-surface p-3.5', futuro && !registro && 'opacity-70')} onKeyDown={tecla}>
      <div className="mb-2.5 flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className="h-2 w-2 flex-none rounded-full bg-c-solid" />
          <span className="truncate text-[15px] font-semibold">{e.nombre}</span>
        </div>
        <Badge tone={estado === 'Confirmado' ? 'ok' : estado === 'Planificado' ? 'neutral' : 'warn'}>{estado}</Badge>
      </div>
      <div className="mb-3 text-[13px] text-muted">
        Planificado: <span className="num font-medium text-text">{t ? rangoTramos(t.tramos) : 'Extra'}</span>
        <div className="mt-1"><LineaFichajes fichajes={fichajes} registro={registro} pasado={fecha < hoy} /></div>
      </div>
      <div className="mb-3 flex flex-col gap-2">
        <span className="text-[11px] font-medium uppercase tracking-[.06em] text-muted">Horas reales</span>
        {vals.map((v, k) => (
          <div key={k} className="flex items-center gap-2">
            <input type="time" value={v.a} onBlur={blur} onChange={ev => setVals(vs => vs.map((x, i) => i === k ? { ...x, a: ev.target.value } : x))} className={cx(inp(!!t && v.a !== hhmm(t.tramos[k]?.inicio ?? -1)), 'h-10 flex-1')} aria-label="Entrada" />
            <span className="text-xs text-muted">–</span>
            <input type="time" value={v.b} onBlur={blur} onChange={ev => setVals(vs => vs.map((x, i) => i === k ? { ...x, b: ev.target.value } : x))} className={cx(inp(!!t && v.b !== hhmm(t.tramos[k]?.fin ?? -1)), 'h-10 flex-1')} aria-label="Salida" />
          </div>
        ))}
      </div>
      <div className="mb-3 flex items-center justify-between num text-[13px]">
        <div className="flex items-center gap-2">
          <span className="text-muted">Dif.</span>
          {df === 0 ? <span className="text-muted">—</span> : <span className={cx('rounded-full px-2 py-0.5 text-xs font-semibold', df > 0 ? 'bg-warn-bg text-warn-fg' : 'bg-primary-tint')}>{diff(df)}</span>}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-muted">Total</span>
          <span className="font-semibold">{dur(real)}</span>
        </div>
      </div>
      <input value={nota} onChange={ev => setNota(ev.target.value)} onBlur={blur} placeholder={futuro ? 'Nota' : 'Añadir nota'} className="mb-3 h-10 w-full rounded-lg border border-border bg-bg px-3 text-[13px] outline-none placeholder:text-muted focus:border-primary" />
      {estado !== 'Confirmado' && !futuro && (
        <Button variant="primary" className="w-full" onClick={() => guardar('confirmado')}>
          <Check size={15} />Confirmar horas
        </Button>
      )}
    </div>
  );
}

export default function Registro() {
  const { state, acciones } = useStore();
  const [vista, setVista] = useState<Vista>('semana');
  const [ancla, setAncla] = useState(() => new Date());
  const [filtro, setFiltro] = useState<string | null>(null);
  const hoy = iso(new Date());

  const dias = vista === 'dia' ? [ancla] : vista === 'semana' ? diasSemana(lunesDe(ancla)) : eachDayOfInterval({ start: startOfMonth(ancla), end: endOfMonth(ancla) });
  const mover = (n: number) => setAncla(a => vista === 'dia' ? addDays(a, n) : vista === 'semana' ? addDays(a, 7 * n) : addMonths(a, n));
  const label = vista === 'dia' ? capital(fmt(ancla, "EEEE, d MMM yyyy")) : vista === 'semana' ? rangoSemana(lunesDe(ancla)) : capital(fmt(ancla, 'MMMM yyyy'));
  const emps = activas(state).filter(e => !filtro || e.id === filtro);

  const grupos = useMemo(() => dias.map(d => {
    const f = iso(d);
    // También quien fichó sin turno ni registro aún (entrada abierta o salida olvidada): hay que revisarlo.
    const filas = emps.map(e => ({ e, ...jornada(state, e.id, f) })).filter(r => r.turno || r.registro || state.fichajes.some(x => x.empleadaId === r.e.id && x.fecha === f));
    const descansan = emps.filter(e => !filas.some(r => r.e.id === e.id)).map(e => e.nombre);
    return { d, f, filas, descansan, tot: filas.reduce((a, r) => a + minutos(r.tramos), 0) };
  }).filter(g => g.filas.length), [state, dias.map(iso).join(), filtro]); // eslint-disable-line react-hooks/exhaustive-deps

  const resumen = emps.map(e => {
    let p = 0, r = 0;
    dias.forEach(d => { const j = jornada(state, e.id, iso(d)); if (j.registro?.estado === 'confirmado') { p += minutos(j.turno?.tramos); r += minutos(j.registro.tramos); } });
    return { e, p, r };
  });
  const estDia = (f: string, filas: { registro?: Reg }[]) => filas.every(r => r.registro?.estado === 'confirmado') ? 'ok' : f <= hoy ? 'warn' : 'none';
  const pendHoy = grupos.find(g => g.f <= hoy && estDia(g.f, g.filas) === 'warn');

  const resumenAside = (
    <>
      <span className="text-sm font-semibold">Horas confirmadas en el periodo</span>
      <div className="flex flex-col">
        <div className="grid grid-cols-[1fr_64px_64px_60px] pb-1.5 text-[11px] font-medium uppercase tracking-[.06em] text-muted"><span /><span className="text-right">Plan</span><span className="text-right">Real</span><span className="text-right">Dif.</span></div>
        {resumen.map(({ e, p, r }) => (
          <div key={e.id} style={colorVars(e.color)} className="num grid grid-cols-[1fr_64px_64px_60px] items-center border-t border-border py-2 text-[13px]">
            <span className="flex min-w-0 items-center gap-1.5 font-semibold"><span className="h-2 w-2 flex-none rounded-full bg-c-solid" /><span className="truncate">{e.nombre}</span></span>
            <span className="text-right text-muted">{dur(p)}</span><span className="text-right font-semibold">{dur(r)}</span>
            <span className={cx('text-right text-xs font-semibold', r > p ? 'text-warn-fg' : 'text-muted')}>{diff(r - p)}</span>
          </div>
        ))}
      </div>
      <div className="rounded-lg bg-sunken px-3.5 py-3 text-xs leading-relaxed text-muted lg:mt-auto">Solo las horas <strong className="font-semibold text-text">confirmadas</strong> cuentan en la nómina. Lo planificado aparece en gris hasta que se confirma.</div>
    </>
  );

  return (
    <div className="flex min-h-full flex-col">
      <PageHeader title="Registro de horas">
        <Segmented className="w-full sm:w-auto" value={vista} onChange={setVista} options={[{ value: 'dia', label: 'Día' }, { value: 'semana', label: 'Semana' }, { value: 'mes', label: 'Mes' }]} />
        <div className="flex h-9 w-full items-center rounded-lg border border-border bg-surface sm:w-auto">
          <button className="grid h-[34px] w-[34px] place-items-center" onClick={() => mover(-1)} aria-label="Anterior"><ChevronLeft size={16} /></button>
          <span className="num min-w-0 flex-1 truncate border-x border-border px-2 text-center text-sm font-semibold leading-[34px] sm:flex-none sm:px-3">{label}</span>
          <button className="grid h-[34px] w-[34px] place-items-center" onClick={() => mover(1)} aria-label="Siguiente"><ChevronRight size={16} /></button>
        </div>
        {pendHoy && <Button variant="primary" className="w-full sm:w-auto" onClick={() => acciones.confirmarDia(pendHoy.f, pendHoy.filas.map(r => r.e.id))}>Confirmar {fmt(pendHoy.d, 'EEEE d')}</Button>}
      </PageHeader>
      <div className="-mx-px flex gap-1.5 overflow-x-auto border-b border-border px-4 py-3 md:mx-0 md:flex-wrap md:overflow-visible md:px-6">
        <span className="mr-1 hidden shrink-0 self-center text-xs text-muted sm:inline">Empleada</span>
        <button onClick={() => setFiltro(null)} className={cx('h-[30px] shrink-0 rounded-full px-3 text-[13px] font-semibold', !filtro ? 'bg-text text-bg' : 'border border-border bg-surface')}>Todas</button>
        {activas(state).map(e => (
          <button key={e.id} style={colorVars(e.color)} onClick={() => setFiltro(e.id)} className={cx('flex h-[30px] shrink-0 items-center gap-1.5 rounded-full border px-3 text-[13px] font-medium', filtro === e.id ? 'border-c-solid bg-c-tint text-c-fg' : 'border-border bg-surface')}>
            <span className="h-2 w-2 rounded-full bg-c-solid" />{e.nombre}
          </button>
        ))}
        <div className="hidden flex-1 lg:block" />
        <span className="hidden self-center text-xs text-muted lg:inline">Tab para pasar de campo · Enter confirma la fila</span>
      </div>

      {/* Móvil: tarjetas por día */}
      <div className="flex flex-col gap-4 p-4 md:hidden">
        {grupos.length === 0 && <div className="py-10 text-center text-sm text-muted">No hay turnos en este periodo.</div>}
        {grupos.map(g => (
          <section key={g.f} className="flex flex-col gap-2.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[15px] font-semibold">{capital(fmt(g.d, 'EEEE d'))}</span>
              {g.descansan.length > 0 && <span className="text-xs text-muted">Descansa: {g.descansan.join(', ')}</span>}
              <div className="flex-1" />
              {estDia(g.f, g.filas) === 'warn' && (
                <button className="text-xs font-semibold text-primary hover:underline" onClick={() => acciones.confirmarDia(g.f, g.filas.map(r => r.e.id))}>Confirmar día</button>
              )}
              <span className="num text-xs text-muted">{dur(g.tot)}</span>
            </div>
            {g.filas.map(r => <FilaMobile key={r.e.id + g.f} e={r.e} fecha={g.f} turno={r.turno} registro={r.registro} hoy={hoy} />)}
          </section>
        ))}
        <aside className="flex flex-col gap-4 rounded-xl border border-border bg-surface p-4">
          {resumenAside}
        </aside>
      </div>

      {/* Escritorio: tabla */}
      <div className="hidden min-h-0 flex-1 flex-col md:flex lg:flex-row">
        <div className="min-w-0 flex-1 overflow-auto p-4 md:px-6">
          <Card className="min-w-[940px] overflow-hidden">
            <div>
              <div style={{ gridTemplateColumns: COLS }} className="grid h-[38px] items-center gap-2 border-b border-border px-4 text-[11px] font-medium uppercase tracking-[.06em] text-muted"><span>Empleada</span><span>Planificado</span><span>Real</span><span>Dif.</span><span className="pr-3 text-right">Horas</span><span>Nota</span><span>Estado</span></div>
              {grupos.length === 0 && <div className="px-4 py-10 text-center text-sm text-muted">No hay turnos en este periodo.</div>}
              {grupos.map(g => (
                <div key={g.f}>
                  <div className="flex h-[34px] items-center gap-2.5 border-b border-border bg-sunken px-4">
                    <span className="text-[13px] font-semibold">{capital(fmt(g.d, 'EEEE d'))}</span>
                    {g.descansan.length > 0 && <span className="text-xs text-muted">Descansa: {g.descansan.join(', ')}</span>}
                    <div className="flex-1" />
                    {estDia(g.f, g.filas) === 'warn' && <button className="text-xs font-semibold text-primary hover:underline" onClick={() => acciones.confirmarDia(g.f, g.filas.map(r => r.e.id))}>Confirmar día</button>}
                    <span className="num text-xs text-muted">{dur(g.tot)}</span>
                  </div>
                  {g.filas.map(r => <FilaDesktop key={r.e.id + g.f} e={r.e} fecha={g.f} turno={r.turno} registro={r.registro} hoy={hoy} />)}
                </div>
              ))}
            </div>
          </Card>
        </div>
        <aside className="hidden w-full flex-none flex-col gap-4 border-t border-border bg-surface p-5 lg:flex lg:w-[300px] lg:border-l lg:border-t-0">
          {resumenAside}
        </aside>
      </div>
    </div>
  );
}
