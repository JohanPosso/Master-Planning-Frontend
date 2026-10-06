import { useEffect, useMemo, useState, type KeyboardEvent } from 'react';
import { addDays, addMonths, eachDayOfInterval, endOfMonth, startOfMonth } from 'date-fns';
import { ChevronLeft, ChevronRight, Check } from 'lucide-react';
import type { Empleada, Registro as Reg, Turno } from '../lib/types';
import { colorVars } from '../lib/theme';
import { activas, jornada } from '../lib/rules';
import { capital, diasSemana, diff, dur, fmt, hhmm, iso, lunesDe, minutos, rangoSemana, rangoTramos, toMin } from '../lib/time';
import { tramosValidos, useStore } from '../store';
import { Badge, Button, Card, PageHeader, Segmented, cx } from '../components/ui';

type Vista = 'dia' | 'semana' | 'mes';
const COLS = '150px 170px 190px 84px 76px minmax(120px,1fr) 150px';

function Fila({ e, fecha, turno, registro, hoy }: { e: Empleada; fecha: string; turno?: Turno; registro?: Reg; hoy: string }) {
  const { acciones } = useStore();
  const base = registro?.tramos ?? turno?.tramos ?? [];
  const [vals, setVals] = useState(base.map(t => ({ a: hhmm(t.inicio), b: hhmm(t.fin) })));
  const [nota, setNota] = useState(registro?.nota ?? '');
  useEffect(() => { setVals(base.map(t => ({ a: hhmm(t.inicio), b: hhmm(t.fin) }))); setNota(registro?.nota ?? ''); }, [registro, turno]); // eslint-disable-line react-hooks/exhaustive-deps

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

  return (
    <div style={{ ...colorVars(e.color), gridTemplateColumns: COLS }} className={cx('grid items-center gap-2 border-b border-border px-4 py-2.5', futuro && !registro && 'opacity-70')}
      onKeyDown={tecla}>
      <div className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-c-solid" /><span className="text-[13px] font-semibold">{e.nombre}</span></div>
      <span className="num text-[13px] text-muted">{turno ? rangoTramos(turno.tramos) : 'Extra'}</span>
      <div className="flex flex-col gap-1">
        {vals.map((v, k) => (
          <div key={k} className="flex items-center gap-1">
            <input type="time" value={v.a} onBlur={blur} onChange={ev => setVals(vs => vs.map((x, i) => i === k ? { ...x, a: ev.target.value } : x))} className={inp(!!turno && v.a !== hhmm(turno.tramos[k]?.inicio ?? -1))} aria-label="Entrada" />
            <span className="text-xs text-muted">–</span>
            <input type="time" value={v.b} onBlur={blur} onChange={ev => setVals(vs => vs.map((x, i) => i === k ? { ...x, b: ev.target.value } : x))} className={inp(!!turno && v.b !== hhmm(turno.tramos[k]?.fin ?? -1))} aria-label="Salida" />
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
    const filas = emps.map(e => ({ e, ...jornada(state, e.id, f) })).filter(r => r.turno || r.registro);
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

  return (
    <div className="flex min-h-full flex-col">
      <PageHeader title="Registro de horas">
        <Segmented value={vista} onChange={setVista} options={[{ value: 'dia', label: 'Día' }, { value: 'semana', label: 'Semana' }, { value: 'mes', label: 'Mes' }]} />
        <div className="flex h-9 items-center rounded-lg border border-border bg-surface">
          <button className="grid h-[34px] w-[34px] place-items-center" onClick={() => mover(-1)} aria-label="Anterior"><ChevronLeft size={16} /></button>
          <span className="num border-x border-border px-3 text-sm font-semibold leading-[34px]">{label}</span>
          <button className="grid h-[34px] w-[34px] place-items-center" onClick={() => mover(1)} aria-label="Siguiente"><ChevronRight size={16} /></button>
        </div>
        {pendHoy && <Button variant="primary" onClick={() => acciones.confirmarDia(pendHoy.f, pendHoy.filas.map(r => r.e.id))}>Confirmar {fmt(pendHoy.d, 'EEEE d')}</Button>}
      </PageHeader>
      <div className="flex flex-wrap items-center gap-1.5 border-b border-border px-4 py-3 md:px-6">
        <span className="mr-1 text-xs text-muted">Empleada</span>
        <button onClick={() => setFiltro(null)} className={cx('h-[30px] rounded-full px-3 text-[13px] font-semibold', !filtro ? 'bg-text text-bg' : 'border border-border bg-surface')}>Todas</button>
        {activas(state).map(e => (
          <button key={e.id} style={colorVars(e.color)} onClick={() => setFiltro(e.id)} className={cx('flex h-[30px] items-center gap-1.5 rounded-full border px-3 text-[13px] font-medium', filtro === e.id ? 'border-c-solid bg-c-tint text-c-fg' : 'border-border bg-surface')}>
            <span className="h-2 w-2 rounded-full bg-c-solid" />{e.nombre}
          </button>
        ))}
        <div className="flex-1" />
        <span className="hidden text-xs text-muted lg:inline">Tab para pasar de campo · Enter confirma la fila</span>
      </div>
      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
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
                  {g.filas.map(r => <Fila key={r.e.id + g.f} e={r.e} fecha={g.f} turno={r.turno} registro={r.registro} hoy={hoy} />)}
                </div>
              ))}
            </div>
          </Card>
        </div>
        <aside className="flex w-full flex-none flex-col gap-4 border-t border-border bg-surface p-5 lg:w-[300px] lg:border-l lg:border-t-0">
          <span className="text-sm font-semibold">Horas confirmadas en el periodo</span>
          <div className="flex flex-col">
            <div className="grid grid-cols-[1fr_64px_64px_60px] pb-1.5 text-[11px] font-medium uppercase tracking-[.06em] text-muted"><span /><span className="text-right">Plan</span><span className="text-right">Real</span><span className="text-right">Dif.</span></div>
            {resumen.map(({ e, p, r }) => (
              <div key={e.id} style={colorVars(e.color)} className="num grid grid-cols-[1fr_64px_64px_60px] items-center border-t border-border py-2 text-[13px]">
                <span className="flex items-center gap-1.5 font-semibold"><span className="h-2 w-2 rounded-full bg-c-solid" />{e.nombre}</span>
                <span className="text-right text-muted">{dur(p)}</span><span className="text-right font-semibold">{dur(r)}</span>
                <span className={cx('text-right text-xs font-semibold', r > p ? 'text-warn-fg' : 'text-muted')}>{diff(r - p)}</span>
              </div>
            ))}
          </div>
          <div className="mt-auto rounded-lg bg-sunken px-3.5 py-3 text-xs leading-relaxed text-muted">Solo las horas <strong className="font-semibold text-text">confirmadas</strong> cuentan en la nómina. Lo planificado aparece en gris hasta que se confirma.</div>
        </aside>
      </div>
    </div>
  );
}
