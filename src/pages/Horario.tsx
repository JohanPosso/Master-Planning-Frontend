import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { AvisoItem } from '../components/AvisoItem';
import { DndContext, DragOverlay, KeyboardSensor, PointerSensor, useDraggable, useDroppable, useSensor, useSensors, type DragEndEvent, type DragStartEvent } from '@dnd-kit/core';
import { AnimatePresence, motion } from 'motion/react';
import { ChevronDown, Copy, Download, FileSpreadsheet, GripVertical, Plus, Printer } from 'lucide-react';
import { useStore } from '../store';
import type { Turno } from '../lib/types';
import { colorVars } from '../lib/theme';
import { activas, avisosSemana } from '../lib/rules';
import { capital, diaIdx, diasSemana, dur, fmt, iso, lunesDe, minutos, rangoTramos } from '../lib/time';
import { descargarCSV } from '../lib/export';
import { Badge, Button, PageHeader, Segmented, cx } from '../components/ui';
import { WeekSelector } from '../components/WeekSelector';
import { ChipBody } from '../components/ShiftChip';
import { TurnoEditor, type EditorTarget } from '../components/TurnoEditor';
import { DayTimeline } from './DayTimeline';

function useAlt() {
  const ref = useRef(false); const [alt, setAlt] = useState(false);
  useEffect(() => {
    const h = (e: KeyboardEvent) => { ref.current = e.altKey; setAlt(e.altKey); };
    window.addEventListener('keydown', h); window.addEventListener('keyup', h);
    return () => { window.removeEventListener('keydown', h); window.removeEventListener('keyup', h); };
  }, []);
  return { ref, alt };
}

function Celda({ empId, fecha, hoy, children }: { empId: string; fecha: string; hoy: boolean; children: ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: `c|${empId}|${fecha}` });
  return (
    <div ref={setNodeRef} className={cx('group relative flex min-h-24 flex-col gap-[3px] border-b border-r border-border p-[5px] transition-colors', hoy && 'bg-primary-tint/40')}
      style={isOver ? { background: 'color-mix(in oklch, var(--c-tint) 55%, transparent)', boxShadow: 'inset 0 0 0 2px var(--c-solid)' } : undefined}>
      {children}
    </div>
  );
}

function Chip({ t, onOpen }: { t: Turno; onOpen: () => void }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: `t|${t.id}` });
  return (
    <motion.div ref={setNodeRef} layoutId={t.id} {...listeners} {...attributes} onClick={onOpen}
      transition={{ type: 'spring', stiffness: 500, damping: 32 }}
      className="group/chip flex flex-1 cursor-grab outline-none focus-visible:ring-2 focus-visible:ring-c-solid rounded-md" style={{ opacity: isDragging ? .35 : 1 }}>
      <ChipBody tramos={t.tramos} />
    </motion.div>
  );
}

function PlantillaItem({ id, nombre, rango, d }: { id: string; nombre: string; rango: string; d: string }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: `p|${id}` });
  return (
    <div ref={setNodeRef} {...listeners} {...attributes} className={cx('flex cursor-grab items-center gap-2 rounded-lg border border-border bg-bg py-2 pl-1.5 pr-2.5 hover:border-border-strong hover:shadow-sm', isDragging && 'opacity-40')}>
      <GripVertical size={14} className="text-muted" />
      <div className="flex min-w-0 flex-1 flex-col"><span className="text-[13px] font-semibold">{nombre}</span><span className="num text-xs text-muted">{rango}</span></div>
      <span className="num whitespace-nowrap text-[11px] text-muted">{d}</span>
    </div>
  );
}

export default function Horario() {
  const { state, acciones } = useStore();
  const [lunes, setLunes] = useState(() => lunesDe(new Date()));
  const [dir, setDir] = useState(0);
  const [vista, setVista] = useState<'semana' | 'dia'>('semana');
  const [dia, setDia] = useState(() => diaIdx(new Date()));
  const [editor, setEditor] = useState<EditorTarget | null>(null);
  const [activo, setActivo] = useState<{ kind: 't' | 'p'; id: string } | null>(null);
  const [menu, setMenu] = useState(false);
  const { ref: altRef, alt } = useAlt();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }), useSensor(KeyboardSensor));

  const dias = diasSemana(lunes), fechas = dias.map(iso), hoy = iso(new Date());
  const emps = activas(state);
  const avisos = useMemo(() => avisosSemana(state, lunes), [state, lunes]);
  const publicada = state.semanas.find(s => s.lunes === iso(lunes))?.publicada ?? false;
  const turnoDe = (e: string, f: string) => state.turnos.find(t => t.empleadaId === e && t.fecha === f);
  const minDia = (f: string, soloNomina = false) => minutos(emps.filter(e => !soloNomina || !e.excluirNomina).flatMap(e => turnoDe(e.id, f)?.tramos ?? []));
  const total = fechas.reduce((a, f) => a + minDia(f), 0), totalNom = fechas.reduce((a, f) => a + minDia(f, true), 0);
  const coste = emps.filter(e => !e.excluirNomina).reduce((a, e) => a + fechas.reduce((x, f) => x + minutos(turnoDe(e.id, f)?.tramos) / 60 * e.tarifaCent, 0), 0);
  const nivelDia = (f: string) => avisos.some(a => a.fecha === f && a.nivel === 'error') ? 'error' : avisos.some(a => a.fecha === f) ? 'warn' : null;

  const irA = (d: Date, dd: number) => { setDir(dd); setLunes(d); };
  const onStart = (e: DragStartEvent) => { const [k, id] = String(e.active.id).split('|'); setActivo({ kind: k as 't' | 'p', id }); if ((e.activatorEvent as PointerEvent)?.altKey) altRef.current = true; };
  const onEnd = (e: DragEndEvent) => {
    setActivo(null);
    if (!e.over) return;
    const [, empId, fecha] = String(e.over.id).split('|');
    const [k, id] = String(e.active.id).split('|');
    if (k === 't') acciones.moverTurno(id, empId, fecha, altRef.current);
    else acciones.turnoDesdePlantilla(id, empId, fecha);
  };
  const activoTurno = activo?.kind === 't' ? state.turnos.find(t => t.id === activo.id) : undefined;
  const activoPlant = activo?.kind === 'p' ? state.plantillas.find(p => p.id === activo.id) : undefined;
  const activoEmp = activoTurno ? state.empleadas.find(e => e.id === activoTurno.empleadaId) : undefined;

  const exportar = () => {
    descargarCSV(`horario-${iso(lunes)}`, [
      ['Empleada', ...dias.map(d => capital(fmt(d, 'EEE d MMM'))), 'Total'],
      ...emps.map(e => [e.nombre, ...fechas.map(f => { const t = turnoDe(e.id, f); return t ? rangoTramos(t.tramos) : 'DESCANSO'; }), dur(fechas.reduce((a, f) => a + minutos(turnoDe(e.id, f)?.tramos), 0))])
    ]);
    setMenu(false);
  };

  return (
    <div className="flex min-h-full flex-col">
      <PageHeader title="Horario" badge={<Badge tone={publicada ? 'ok' : 'neutral'}>{publicada ? 'Publicado' : 'Borrador'}</Badge>}>
        {vista === 'semana' ? <WeekSelector lunes={lunes} onChange={irA} /> : (
          <WeekSelector lunes={lunes} onChange={(d, dd) => { if (dd === 0) { irA(d, 0); setDia(diaIdx(new Date())); } else { const n = dia + dd; if (n < 0) { irA(d, -1); setDia(6); } else if (n > 6) { irA(d, 1); setDia(0); } else setDia(n); } }} label={capital(fmt(dias[dia], "EEEE, d MMM yyyy"))} />
        )}
        <Segmented className="hidden md:flex" value={vista} onChange={setVista} options={[{ value: 'semana', label: 'Semana' }, { value: 'dia', label: 'Día' }]} />
        <div className="mx-1 hidden h-6 w-px bg-border lg:block" />
        <Button className="hidden lg:inline-flex" onClick={() => acciones.copiarSemanaAnterior(lunes)}><Copy size={15} />Copiar semana anterior</Button>
        <div className="relative hidden md:block">
          <Button onClick={() => setMenu(m => !m)}><Download size={15} />Exportar<ChevronDown size={13} /></Button>
          {menu && (
            <div className="absolute right-0 top-11 z-30 flex w-48 flex-col rounded-xl border border-border bg-surface p-1 shadow-modal">
              <button className="flex items-center gap-2 rounded-lg px-3 py-2 text-left text-[13px] hover:bg-hover" onClick={() => { setMenu(false); setTimeout(() => window.print(), 50); }}><Printer size={15} />Imprimir / PDF</button>
              <button className="flex items-center gap-2 rounded-lg px-3 py-2 text-left text-[13px] hover:bg-hover" onClick={exportar}><FileSpreadsheet size={15} />Excel (CSV)</button>
            </div>
          )}
        </div>
        <Button variant="primary" onClick={() => acciones.publicarSemana(lunes, !publicada)}>{publicada ? 'Volver a borrador' : 'Publicar'}</Button>
      </PageHeader>

      {/* Móvil: vista Día en lista */}
      <div className="flex flex-col gap-3 p-4 md:hidden">
        <div className="flex gap-1">
          {dias.map((d, i) => (
            <button key={i} onClick={() => setDia(i)} className={cx('flex h-[62px] flex-1 flex-col items-center justify-center gap-0.5 rounded-xl border', i === dia ? 'border-text bg-text text-bg' : 'border-border bg-surface')}>
              <span className="text-[11px] opacity-75">{['L', 'M', 'X', 'J', 'V', 'S', 'D'][i]}</span>
              <span className="num text-base font-semibold">{fmt(d, 'd')}</span>
              <span className={cx('h-[5px] w-[5px] rounded-full', nivelDia(fechas[i]) === 'error' ? 'bg-error-solid' : nivelDia(fechas[i]) === 'warn' ? 'bg-warn-line' : 'bg-transparent')} />
            </button>
          ))}
        </div>
        <div className="flex items-baseline justify-between num"><span className="font-semibold">{capital(fmt(dias[dia], 'EEEE d'))}</span><span className="text-[13px] text-muted">{dur(minDia(fechas[dia]))}</span></div>
        {emps.map(e => { const t = turnoDe(e.id, fechas[dia]); return (
          <button key={e.id} style={colorVars(e.color)} onClick={() => setEditor({ turno: t, empleadaId: e.id, fecha: fechas[dia] })}
            className={cx('flex min-h-16 items-center gap-3 rounded-xl border px-3.5 py-3 text-left', t ? 'border-c-line bg-c-tint text-c-fg' : 'rest-stripes border-transparent')}>
            <span className="grid h-[34px] w-[34px] flex-none place-items-center rounded-full bg-surface text-[13px] font-bold text-c-fg">{e.nombre[0]}</span>
            <div className="flex flex-1 flex-col"><span className="text-[15px] font-semibold">{e.nombre}</span><span className={cx('num text-sm', !t && 'text-xs font-semibold tracking-[.1em] text-muted')}>{t ? rangoTramos(t.tramos) : 'DESCANSO'}</span></div>
            {t && <span className="num text-[13px] font-semibold">{dur(minutos(t.tramos))}</span>}
          </button>
        ); })}
        {avisos.filter(a => a.fecha === fechas[dia]).map((a, i) => <AvisoItem key={i} a={a} />)}
      </div>

      <DndContext sensors={sensors} onDragStart={onStart} onDragEnd={onEnd} onDragCancel={() => setActivo(null)}>
        <div className="hidden min-h-0 flex-1 md:flex">
          <div className="flex min-w-0 flex-1 flex-col gap-3.5 overflow-auto p-5 pl-6">
            <div className="flex flex-wrap items-baseline gap-5 num">
              <div className="flex items-baseline gap-1.5"><span className="text-[22px] font-semibold tracking-tight">{dur(total)}</span><span className="text-[13px] text-muted">planificadas</span></div>
              <div className="flex items-baseline gap-1.5"><span className="text-[15px] font-semibold">{dur(totalNom)}</span><span className="text-[13px] text-muted">en nómina · {(coste / 100).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}</span></div>
              <div className="flex-1" />
              <span className="text-xs text-muted">Alt + arrastrar para duplicar · {vista === 'dia' ? 'estira los bordes para cambiar la duración' : 'clic para editar'}</span>
            </div>
            <AnimatePresence mode="wait" initial={false}>
              <motion.div key={iso(lunes) + vista + (vista === 'dia' ? dia : '')} initial={{ opacity: 0, x: dir * 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: dir * -24 }} transition={{ duration: .18 }}>
                {vista === 'dia' ? (
                  <DayTimeline fecha={fechas[dia]} onOpen={setEditor} avisos={avisos.filter(a => a.fecha === fechas[dia])} />
                ) : (
                  <div className="grid min-w-[860px] overflow-hidden rounded-xl border border-border bg-surface" style={{ gridTemplateColumns: '150px repeat(7,minmax(0,1fr)) 78px' }}>
                    <div className="flex items-end border-b border-r border-border px-3 py-2.5 text-[11px] font-medium uppercase tracking-[.06em] text-muted">Equipo</div>
                    {dias.map((d, i) => { const n = nivelDia(fechas[i]); return (
                      <button key={i} onClick={() => { setDia(i); setVista('dia'); }} className={cx('flex flex-col items-center gap-0.5 border-b border-r border-border px-2 py-2.5 hover:bg-hover', fechas[i] === hoy && 'bg-primary-tint')}>
                        <span className="text-[11px] font-medium uppercase tracking-[.06em] text-muted">{fmt(d, 'EEE')}</span>
                        <div className="flex items-center gap-1.5"><span className="num text-[17px] font-semibold">{fmt(d, 'd')}</span><span className={cx('h-[7px] w-[7px] rounded-full', n === 'error' ? 'bg-error-solid' : n === 'warn' ? 'bg-warn-line' : 'bg-transparent')} /></div>
                      </button>
                    ); })}
                    <div className="flex items-end justify-end border-b border-border px-2.5 py-2.5 text-[11px] font-medium uppercase tracking-[.06em] text-muted">Total</div>
                    {emps.map(e => {
                      const tot = fechas.reduce((a, f) => a + minutos(turnoDe(e.id, f)?.tramos), 0);
                      const n = fechas.filter(f => turnoDe(e.id, f)).length;
                      return (
                        <div key={e.id} className="contents" style={colorVars(e.color)}>
                          <div className="flex flex-col justify-center gap-1 border-b border-r border-border px-3 py-2.5">
                            <div className="flex items-center gap-2"><span className="h-[9px] w-[9px] flex-none rounded-full bg-c-solid" /><span className="text-sm font-semibold">{e.nombre}</span></div>
                            {e.excluirNomina && <span className="ml-[17px] self-start rounded-full border border-border bg-sunken px-1.5 py-0.5 text-[10px] font-semibold text-muted">Excluida de nómina</span>}
                          </div>
                          {fechas.map(f => { const t = turnoDe(e.id, f); return (
                            <Celda key={f} empId={e.id} fecha={f} hoy={f === hoy}>
                              {t ? <Chip t={t} onOpen={() => setEditor({ turno: t, empleadaId: e.id, fecha: f })} /> : (
                                <button onClick={() => setEditor({ empleadaId: e.id, fecha: f })} className="rest-stripes flex flex-1 items-center justify-center rounded-md" aria-label={`Añadir turno a ${e.nombre}`}>
                                  <span className="text-[10px] font-semibold tracking-[.1em] text-muted group-hover:hidden">DESCANSO</span>
                                  <Plus size={16} className="hidden text-muted group-hover:block" />
                                </button>
                              )}
                            </Celda>
                          ); })}
                          <div className="num flex flex-col items-end justify-center gap-0.5 border-b border-border p-2.5"><span className="text-[15px] font-semibold">{dur(tot)}</span><span className="text-[11px] text-muted">{e.excluirNomina ? 'No computa' : `${n} días`}</span></div>
                        </div>
                      );
                    })}
                    <div className="flex items-center border-r border-border bg-sunken px-3 py-2.5 text-xs font-semibold text-muted">Total día</div>
                    {fechas.map(f => <div key={f} className="num flex flex-col items-center gap-0.5 border-r border-border bg-sunken px-2 py-2.5"><span className="text-[13px] font-semibold">{dur(minDia(f))}</span><span className="text-[11px] text-muted">{dur(minDia(f, true))} nómina</span></div>)}
                    <div className="num flex items-center justify-end bg-sunken p-2.5 text-[13px] font-semibold">{dur(total)}</div>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
          <aside className="no-print flex w-[276px] flex-none flex-col overflow-auto border-l border-border bg-surface">
            <div className="flex items-center justify-between px-4 pb-2.5 pt-4"><span className="text-sm font-semibold">Plantillas</span><Link to="/ajustes" className="text-[13px] font-medium text-muted no-underline hover:text-text">Gestionar</Link></div>
            <div className="flex flex-col gap-1.5 px-3">
              {state.plantillas.map(p => <PlantillaItem key={p.id} id={p.id} nombre={p.nombre} rango={rangoTramos(p.tramos)} d={dur(minutos(p.tramos))} />)}
            </div>
            <div className="mt-4 flex items-center gap-2 border-t border-border px-4 pb-2.5 pt-3.5"><span className="text-sm font-semibold">Avisos</span>{avisos.length > 0 && <Badge tone={avisos.some(a => a.nivel === 'error') ? 'error' : 'warn'}>{avisos.length}</Badge>}</div>
            <div className="flex flex-col gap-1.5 px-3 pb-4">
              {avisos.length === 0 ? <span className="px-1 text-[13px] text-muted">Todo en orden esta semana.</span> : avisos.map((a, i) => <AvisoItem key={i} a={a} />)}
            </div>
          </aside>
        </div>
        <DragOverlay dropAnimation={{ duration: 180, easing: 'cubic-bezier(.2,.8,.2,1)' }}>
          {activoTurno && activoEmp ? <div style={colorVars(activoEmp.color)} className="flex h-[86px] w-[110px]"><ChipBody tramos={activoTurno.tramos} overlay duplicar={alt} /></div> : null}
          {activoPlant ? <div style={colorVars('gris')} className="flex h-[86px] w-[110px]"><ChipBody tramos={activoPlant.tramos} overlay /></div> : null}
        </DragOverlay>
      </DndContext>
      <TurnoEditor target={editor} onClose={() => setEditor(null)} />
    </div>
  );
}
