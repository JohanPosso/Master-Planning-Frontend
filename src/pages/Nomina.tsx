import { useMemo, useState } from 'react';
import { addMonths, eachDayOfInterval, endOfMonth, startOfMonth } from 'date-fns';
import { AlertTriangle, ChevronLeft, ChevronRight, FileSpreadsheet, Printer } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { State } from '../lib/types';
import { colorVars } from '../lib/theme';
import { importeDia, jornada } from '../lib/rules';
import { capital, desdeIso, dur, eur, fmt, iso, minutos } from '../lib/time';
import { descargarCSV } from '../lib/export';
import { useStore } from '../store';
import { Badge, Button, Card, PageHeader, cx } from '../components/ui';

export function calcularPeriodo(s: State, inicio: Date, fin: Date) {
  const fechas = eachDayOfInterval({ start: inicio, end: fin }).map(iso);
  const pend = new Set<string>();
  const lineas = s.empleadas.filter(e => !e.eliminadaEn || fechas.some(f => s.registros.some(r => r.empleadaId === e.id && r.fecha === f))).map(e => {
    let min = 0, base = 0, rec = 0;
    fechas.forEach(f => {
      const j = jornada(s, e.id, f); const m = minutos(j.tramos);
      if (!m) return;
      if (j.registro?.estado !== 'confirmado') pend.add(f);
      min += m; const imp = importeDia(s, e.tarifaCent, f, m); base += imp.base; rec += imp.recargo;
    });
    return { e, min, base, rec, importe: e.excluirNomina ? 0 : base + rec };
  }).filter(l => l.min > 0 || l.e.activa);
  const pagables = lineas.filter(l => !l.e.excluirNomina);
  // Cada línea se paga redondeada al céntimo; el total es su suma (igual que en el servidor).
  return { lineas, pendientes: pend.size, total: pagables.reduce((a, l) => a + Math.round(l.importe), 0), minutos: pagables.reduce((a, l) => a + l.min, 0), recargos: pagables.reduce((a, l) => a + Math.round(l.rec), 0) };
}

export default function Nomina() {
  const { state, acciones } = useStore();
  const [mes, setMes] = useState(() => startOfMonth(new Date()));
  const fin = endOfMonth(mes), prevIni = addMonths(mes, -1);
  const act = useMemo(() => calcularPeriodo(state, mes, fin), [state, mes]); // eslint-disable-line react-hooks/exhaustive-deps
  const prev = useMemo(() => calcularPeriodo(state, prevIni, endOfMonth(prevIni)), [state, mes]); // eslint-disable-line react-hooks/exhaustive-deps
  const pagado = state.pagos.find(p => p.inicio === iso(mes));
  const etiqueta = capital(fmt(mes, 'MMMM yyyy'));
  const dMin = act.minutos - prev.minutos, dEur = act.total - prev.total;
  // Mismas reglas que el servidor: no se paga un mes futuro, vacío o con horas sin confirmar.
  const motivoNoPagable = iso(mes) > iso(new Date()) ? 'Este mes aún no ha empezado'
    : act.pendientes ? 'Confirma antes todas las horas del mes'
    : act.minutos === 0 ? 'No hay horas que pagar este mes' : undefined;

  const marcar = () => acciones.marcarPagado({
    inicio: iso(mes), fin: iso(fin), etiqueta, totalCent: Math.round(act.total),
    lineas: act.lineas.filter(l => !l.e.excluirNomina).map(l => ({ empleadaId: l.e.id, minutos: l.min, importeCent: Math.round(l.importe) }))
  });
  const exportar = () => descargarCSV(`nomina-${iso(mes).slice(0, 7)}`, [
    ['Empleada', 'Horas', 'Minutos', 'Tarifa €/h', 'Recargos €', 'Importe €', 'Nómina'],
    ...act.lineas.map(l => [l.e.nombre, dur(l.min), l.min, (l.e.tarifaCent / 100).toFixed(2).replace('.', ','), (l.rec / 100).toFixed(2).replace('.', ','), (l.importe / 100).toFixed(2).replace('.', ','), l.e.excluirNomina ? 'Excluida' : 'Incluida']),
    ['Total', dur(act.minutos), act.minutos, '', (act.recargos / 100).toFixed(2).replace('.', ','), (act.total / 100).toFixed(2).replace('.', ','), '']
  ]);

  return (
    <div className="flex min-h-full flex-col">
      <PageHeader title="Nómina" badge={<Badge tone={pagado ? 'ok' : 'warn'}>{pagado ? 'Pagado' : 'Abierto'}</Badge>}>
        <div className="flex h-9 items-center rounded-lg border border-border bg-surface">
          <button className="grid h-[34px] w-[34px] place-items-center" onClick={() => setMes(m => addMonths(m, -1))} aria-label="Mes anterior"><ChevronLeft size={16} /></button>
          <span className="border-x border-border px-3 text-sm font-semibold leading-[34px]">{etiqueta}</span>
          <button className="grid h-[34px] w-[34px] place-items-center" onClick={() => setMes(m => addMonths(m, 1))} aria-label="Mes siguiente"><ChevronRight size={16} /></button>
        </div>
        <Button onClick={() => window.print()}><Printer size={15} />PDF</Button>
        <Button onClick={exportar}><FileSpreadsheet size={15} />Excel</Button>
        <Button variant="primary" disabled={!!pagado || !!motivoNoPagable} title={motivoNoPagable} onClick={marcar}>{pagado ? 'Pagado' : 'Marcar como pagado'}</Button>
      </PageHeader>
      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <div className="flex min-w-0 flex-1 flex-col gap-3.5 p-4 md:px-6 md:py-5">
          {act.pendientes > 0 && !pagado && (
            <div className="flex items-center gap-2.5 rounded-xl border border-warn-line bg-warn-bg px-3.5 py-2.5 text-[13px] text-warn-fg">
              <AlertTriangle size={16} /><span className="flex-1"><strong className="font-semibold">Estimación.</strong> Quedan {act.pendientes} días sin confirmar; «Marcar como pagado» se activa cuando el mes esté confirmado.</span>
              <Link to="/horas" className="font-semibold text-warn-fg underline underline-offset-2">Ir a Registro</Link>
            </div>
          )}
          <div className="num grid gap-3 md:grid-cols-3">
            <Card className="flex flex-col gap-1.5 p-4"><span className="text-xs font-medium text-muted">Total a pagar</span><span className="text-[32px] font-semibold tracking-tight">{eur(act.total)}</span><span className="text-xs text-muted">{act.lineas.filter(l => !l.e.excluirNomina).length} empleadas</span></Card>
            <Card className="flex flex-col gap-1.5 p-4"><span className="text-xs font-medium text-muted">Horas pagadas</span><span className="text-[32px] font-semibold tracking-tight">{dur(act.minutos)}</span><span className="text-xs text-muted"><span className={cx('font-semibold', dMin > 0 ? 'text-warn-fg' : 'text-ok-fg')}>{dMin >= 0 ? '+' : '−'}{dur(Math.abs(dMin))}</span> respecto a {fmt(prevIni, 'MMMM')}</span></Card>
            <Card className="flex flex-col gap-1.5 p-4"><span className="text-xs font-medium text-muted">{capital(fmt(prevIni, 'MMMM yyyy'))}</span><span className="text-[32px] font-semibold tracking-tight text-muted">{eur(prev.total)}</span><span className="text-xs text-muted">{dEur >= 0 ? '+' : '−'}{eur(Math.abs(dEur))} de diferencia</span></Card>
          </div>
          <Card className="overflow-x-auto">
            <div className="min-w-[720px]">
              <div className="grid h-[38px] grid-cols-[minmax(0,1.4fr)_110px_110px_120px_130px_minmax(0,1fr)] items-center px-4 text-[11px] font-medium uppercase tracking-[.06em] text-muted"><span>Empleada</span><span className="text-right">Horas</span><span className="text-right">Tarifa</span><span className="text-right">Recargos</span><span className="text-right">Importe</span><span className="text-right">vs. mes anterior</span></div>
              {act.lineas.map(l => {
                const p = prev.lineas.find(x => x.e.id === l.e.id); const d = l.min - (p?.min ?? 0); const ex = l.e.excluirNomina;
                return (
                  <div key={l.e.id} style={colorVars(l.e.color)} className={cx('num grid grid-cols-[minmax(0,1.4fr)_110px_110px_120px_130px_minmax(0,1fr)] items-center border-t border-border px-4 py-3', ex && 'opacity-60 rest-stripes')}>
                    <div className="flex items-center gap-2.5"><span className="grid h-7 w-7 place-items-center rounded-full bg-c-tint text-xs font-semibold text-c-fg">{l.e.nombre[0]}</span><div className="flex flex-col"><span className="text-sm font-semibold">{l.e.nombre}</span><span className="text-xs text-muted">{ex ? 'Excluida de nómina' : l.e.rol}</span></div></div>
                    <span className="text-right text-sm font-semibold">{dur(l.min)}</span>
                    <span className="text-right text-sm text-muted">{ex ? '—' : `${eur(l.e.tarifaCent)}/h`}</span>
                    <span className="text-right text-sm text-muted">{ex ? '—' : eur(l.rec)}</span>
                    <span className="text-right text-[15px] font-semibold">{ex ? 'No computa' : eur(l.importe)}</span>
                    <span className="text-right text-[13px] text-muted">{ex ? '' : `${d >= 0 ? '+' : '−'}${dur(Math.abs(d))}`}</span>
                  </div>
                );
              })}
              <div className="num grid grid-cols-[minmax(0,1.4fr)_110px_110px_120px_130px_minmax(0,1fr)] items-center bg-sunken px-4 py-3.5">
                <span className="text-sm font-semibold">Total negocio</span><span className="text-right text-sm font-semibold">{dur(act.minutos)}</span><span /><span className="text-right text-sm text-muted">{eur(act.recargos)}</span><span className="text-right text-base font-bold">{eur(act.total)}</span><span className={cx('text-right text-[13px] font-semibold', dEur > 0 ? 'text-warn-fg' : 'text-ok-fg')}>{dEur >= 0 ? '+' : '−'}{eur(Math.abs(dEur))}</span>
              </div>
            </div>
          </Card>
        </div>
        <aside className="flex w-full flex-none flex-col gap-5 border-t border-border bg-surface p-5 lg:w-[300px] lg:border-l lg:border-t-0">
          <div className="flex flex-col gap-2">
            <div className="flex items-baseline justify-between"><span className="text-sm font-semibold">Recargos</span><Link to="/ajustes" className="text-xs text-muted">Editar</Link></div>
            <div className="flex justify-between border-t border-border py-2 text-[13px]"><span>Domingos</span><span className="num font-semibold">+{state.ajustes.recargoDomingoPct} %</span></div>
            <div className="flex justify-between border-t border-border py-2 text-[13px]"><span>Festivos</span><span className="num font-semibold">+{state.ajustes.recargoFestivoPct} %</span></div>
          </div>
          <div className="flex flex-col">
            <span className="mb-2 text-sm font-semibold">Histórico</span>
            {state.pagos.length === 0 && <span className="text-[13px] text-muted">Aún no hay periodos pagados.</span>}
            {state.pagos.map(p => (
              <div key={p.id} className="num flex items-center justify-between border-t border-border py-2.5">
                <div className="flex flex-col"><span className="text-[13px] font-semibold">{p.etiqueta}</span><span className="text-xs text-muted">Pagado el {fmt(desdeIso(p.pagadoEn.slice(0, 10)), "d 'de' MMM")}</span></div>
                <span className="text-[13px] font-semibold">{eur(p.totalCent)}</span>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}
