import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { addDays, endOfMonth, startOfMonth } from 'date-fns';
import { colorVars } from '../lib/theme';
import { activas, avisosSemana, cobertura, jornada } from '../lib/rules';
import { capital, diaIdx, diasSemana, dur, eur, fmt, hhmm, iso, lunesDe, minutos, rangoTramos } from '../lib/time';
import { agruparFichajes, estadoDia } from '../lib/fichaje';
import type { Fichaje, Turno } from '../lib/types';
import { useStore } from '../store';
import { Button, Card, PageHeader, cx } from '../components/ui';
import { AvisoItem } from '../components/AvisoItem';
import { calcularPeriodo } from './Nomina';

/** Minuto actual del día; se actualiza solo para que el estado «sin fichar» avance sin recargar. */
function useMinutoActual() {
  const calc = () => { const d = new Date(); return d.getHours() * 60 + d.getMinutes(); };
  const [m, setM] = useState(calc);
  useEffect(() => { const t = setInterval(() => setM(calc()), 30_000); return () => clearInterval(t); }, []);
  return m;
}

const MARGEN_RETRASO_MIN = 5;

/** Estado del fichaje de hoy en una línea: dentro, ya salió, o sin fichar (en aviso si ya debería haber entrado). */
function EstadoFichaje({ fichajes, turno, minutoActual }: { fichajes: Fichaje[]; turno?: Turno; minutoActual: number }) {
  const e = estadoDia(fichajes);
  if (e.dentro) return <span className="flex items-center gap-1.5 text-[11px] font-semibold"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-ok-solid" />Dentro desde {hhmm(e.abierta!)}</span>;
  const automatica = fichajes.some(f => !f.anulado && f.origen === 'automatico');
  if (e.pares.length) return <span className={cx('text-[11px]', automatica ? 'font-semibold text-warn-fg' : 'opacity-80')}>{automatica ? 'Cierre automático' : 'Salió'} a las {hhmm(e.pares.at(-1)!.fin)} · {dur(e.minutos)}</span>;
  if (turno && turno.tramos[0].inicio + MARGEN_RETRASO_MIN <= minutoActual) return <span className="text-[11px] font-semibold text-warn-fg">Sin fichar</span>;
  return <span className="text-[11px] opacity-60">Aún no ha fichado</span>;
}

export default function Inicio() {
  const { state } = useStore();
  const hoyD = new Date(), hoy = iso(hoyD), lunes = lunesDe(hoyD);
  const emps = activas(state);
  const semMin = (l: Date, id: string) => diasSemana(l).reduce((a, d) => a + minutos(jornada(state, id, iso(d)).tramos), 0);
  const pagables = emps.filter(e => !e.excluirNomina);
  const semPay = (l: Date) => pagables.reduce((a, e) => a + semMin(l, e.id), 0);
  const esta = semPay(lunes), pasada = semPay(addDays(lunes, -7));
  const mes = useMemo(() => calcularPeriodo(state, startOfMonth(hoyD), endOfMonth(hoyD)), [state]); // eslint-disable-line react-hooks/exhaustive-deps
  const minutoActual = useMinutoActual();
  const fichajesHoy = useMemo(() => agruparFichajes(state.fichajes.filter(f => f.fecha === hoy)), [state.fichajes, hoy]);
  const fichDe = (id: string) => fichajesHoy.get(`${id}|${hoy}`) ?? [];
  // Trabajan hoy: quien tiene turno y también quien ha fichado sin tenerlo (extra).
  const inicioDe = (x: { e: { id: string }; t?: Turno }) => x.t?.tramos[0].inicio ?? fichDe(x.e.id)[0]?.minuto ?? 0;
  const trabajan = emps.map(e => ({ e, t: state.turnos.find(t => t.empleadaId === e.id && t.fecha === hoy) })).filter(x => x.t || fichDe(x.e.id).length).sort((a, b) => inicioDe(a) - inicioDe(b));
  const dentroAhora = trabajan.filter(x => estadoDia(fichDe(x.e.id)).dentro).length;
  const descansan = emps.filter(e => !trabajan.some(x => x.e.id === e.id));
  const max = Math.max(1, ...emps.map(e => semMin(lunes, e.id)));
  const semanas = Array.from({ length: 8 }, (_, i) => addDays(lunes, (i - 7) * 7));
  const costes = semanas.map(l => pagables.reduce((a, e) => a + semMin(l, e.id) / 60 * e.tarifaCent, 0));
  const lo = Math.min(...costes) * .95, hi = Math.max(...costes) * 1.03 || 1;
  const pts = costes.map((c, i) => [i / 7 * 520, 190 - (c - lo) / (hi - lo || 1) * 180]);
  const line = 'M' + pts.map(p => p.map(n => n.toFixed(1)).join(',')).join(' L');
  let acc = 0;
  const donut = pagables.map(e => { const a = acc; acc += (semMin(lunes, e.id) / (esta || 1)) * 360; return `var(--${e.color}-solid) ${a}deg ${Math.max(a, acc - 1.5)}deg, var(--surface) ${Math.max(a, acc - 1.5)}deg ${acc}deg`; }).join(',');
  const avisos = avisosSemana(state, lunes);
  const dias = diasSemana(lunes);

  return (
    <div className="flex min-h-full flex-col">
      <PageHeader title="Buenos días" badge={<span className="text-sm text-muted">{capital(fmt(hoyD, "EEEE, d 'de' MMMM"))}</span>}>
        <Link to="/horas"><Button>Registrar horas de hoy</Button></Link>
        <Link to="/horario"><Button variant="primary">Abrir horario</Button></Link>
      </PageHeader>
      <div className="num grid flex-1 grid-cols-1 gap-3.5 p-4 md:grid-cols-12 md:px-6 md:py-5">
        <Card className="flex flex-col gap-1.5 p-4 md:col-span-3"><span className="text-xs font-medium text-muted">Horas esta semana · nómina</span><span className="text-[28px] font-semibold tracking-tight">{dur(esta)}</span><span className="text-xs text-muted"><span className={cx('font-semibold', esta >= pasada ? 'text-ok-fg' : 'text-warn-fg')}>{esta >= pasada ? '+' : '−'}{dur(Math.abs(esta - pasada))}</span> vs. semana pasada</span></Card>
        <Card className="flex flex-col gap-1.5 p-4 md:col-span-3"><span className="text-xs font-medium text-muted">Coste estimado · {fmt(hoyD, 'MMMM')}</span><span className="text-[28px] font-semibold tracking-tight">{eur(mes.total)}</span><span className="text-xs text-muted">{mes.pendientes} días sin confirmar</span></Card>
        <Card className="flex flex-col gap-2.5 p-4 md:col-span-6">
          <div className="flex justify-between gap-2"><span className="text-xs font-medium text-muted">Hoy trabajan{dentroAhora > 0 && <span className="text-ok-fg"> · {dentroAhora} dentro ahora</span>}</span><span className="text-xs text-muted">Descansan: {descansan.length ? descansan.map(e => e.nombre).join(', ') : 'nadie'}</span></div>
          <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
            {trabajan.map(({ e, t }) => (
              <div key={e.id} style={colorVars(e.color)} className="flex flex-col gap-0.5 rounded-lg border border-c-line bg-c-tint px-2.5 py-2 text-c-fg"><span className="text-[13px] font-semibold">{e.nombre}</span><span className="text-xs">{t ? rangoTramos(t.tramos) : 'Sin turno (extra)'}</span><EstadoFichaje fichajes={fichDe(e.id)} turno={t} minutoActual={minutoActual} /></div>
            ))}
          </div>
        </Card>
        <Card className="flex flex-col gap-3.5 p-4 md:col-span-4">
          <span className="text-sm font-semibold">Horas por empleada</span>
          {emps.map(e => (
            <div key={e.id} style={colorVars(e.color)} className="grid grid-cols-[76px_minmax(0,1fr)_56px] items-center gap-2.5">
              <span className="text-[13px] font-medium">{e.nombre}</span>
              <div className="h-3.5 overflow-hidden rounded bg-sunken"><div className="h-full rounded transition-[width] duration-500" style={{ width: `${semMin(lunes, e.id) / max * 100}%`, background: e.excluirNomina ? 'repeating-linear-gradient(135deg,var(--c-solid) 0 4px,var(--c-tint) 4px 8px)' : 'var(--c-solid)' }} /></div>
              <span className="text-right text-[13px] font-semibold">{dur(semMin(lunes, e.id))}</span>
            </div>
          ))}
          <span className="text-[11px] text-muted">Rayado: excluida de nómina</span>
        </Card>
        <Card className="flex flex-col gap-2.5 p-4 md:col-span-5">
          <div className="flex items-baseline justify-between"><span className="text-sm font-semibold">Coste semanal</span><span className="text-xs text-muted">Últimas 8 semanas</span></div>
          <svg viewBox="0 0 520 190" preserveAspectRatio="none" className="h-40 w-full overflow-visible">
            <path d={line + ' L520,190 L0,190 Z'} fill="var(--primary-tint)" />
            <path d={line} fill="none" stroke="var(--primary)" strokeWidth={2.2} vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
          </svg>
          <div className="flex justify-between text-[11px] text-muted">{costes.map((c, i) => <span key={i} className={cx('flex flex-col items-center', i === 7 && 'font-bold text-text')}><span>{Math.round(c / 100)} €</span><span>{fmt(semanas[i], 'd MMM')}</span></span>)}</div>
        </Card>
        <Card className="flex flex-col gap-3 p-4 md:col-span-3">
          <span className="text-sm font-semibold">Reparto de horas</span>
          <div className="grid flex-1 place-items-center"><div className="grid h-[150px] w-[150px] place-items-center rounded-full" style={{ background: `conic-gradient(${donut || 'var(--sunken) 0 360deg'})` }}><div className="flex h-[62%] w-[62%] flex-col items-center justify-center rounded-full bg-surface"><span className="text-[17px] font-semibold">{dur(esta)}</span><span className="text-[11px] text-muted">nómina</span></div></div></div>
          {pagables.map(e => <div key={e.id} style={colorVars(e.color)} className="flex items-center gap-2 text-xs"><span className="h-2 w-2 rounded-sm bg-c-solid" /><span className="flex-1">{e.nombre}</span><span className="font-semibold">{Math.round(semMin(lunes, e.id) / (esta || 1) * 100)} %</span></div>)}
        </Card>
        <Card className="flex flex-col gap-2.5 p-4 md:col-span-8">
          <div className="flex items-baseline justify-between"><span className="text-sm font-semibold">Cobertura por franja · esta semana</span><span className="text-[11px] text-muted">Rojo: franja sin nadie</span></div>
          <div className="grid gap-[3px]" style={{ gridTemplateColumns: '36px repeat(15,minmax(0,1fr))' }}>
            {dias.map((d, di) => {
              const cov = cobertura(state, iso(d));
              return [
                <span key={'l' + di} className={cx('flex items-center text-[11px]', di === diaIdx(hoyD) ? 'font-bold text-text' : 'text-muted')}>{capital(fmt(d, 'EEE'))}</span>,
                ...Array.from({ length: 15 }, (_, h) => {
                  const sl = cov.filter(s => s.t >= 360 + h * 60 && s.t < 420 + h * 60);
                  const open = sl.some(s => s.req > 0); const c = sl.reduce((a, s) => a + s.c, 0) / sl.length;
                  return <div key={di + '-' + h} title={`${6 + h}:00 · ${c.toFixed(1)} personas`} className="h-6 rounded-[3px]" style={{ background: !open ? 'var(--sunken)' : c === 0 ? 'var(--error-bg)' : `color-mix(in oklch,var(--primary) ${Math.round(14 + Math.min(c, 4) / 4 * 86)}%,var(--surface))`, border: open && c === 0 ? '1px solid var(--error-line)' : 0 }} />;
                })
              ];
            })}
            <span />
            {Array.from({ length: 15 }, (_, h) => <span key={h} className="text-[10px] text-muted">{String(6 + h).padStart(2, '0')}</span>)}
          </div>
        </Card>
        <Card className="flex flex-col gap-2 p-4 md:col-span-4">
          <div className="flex items-baseline justify-between"><span className="text-sm font-semibold">Avisos de la semana</span><Link to="/horario" className="text-xs text-muted">Ver en horario</Link></div>
          {avisos.length === 0 ? <span className="text-[13px] text-muted">Todo en orden.</span> : avisos.slice(0, 5).map((a, i) => <AvisoItem key={i} a={a} />)}
        </Card>
      </div>
    </div>
  );
}
