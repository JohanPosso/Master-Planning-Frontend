import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import type { Plantilla, Reglas } from '../lib/types';
import { desdeIso, dur, fmt, hhmm, minutos, toMin, uid } from '../lib/time';
import { tramosValidos, useStore } from '../store';
import { Button, Card, PageHeader, Segmented, Toggle, cx, inputCls } from '../components/ui';

function PlantillaFila({ p }: { p: Plantilla }) {
  const { acciones } = useStore();
  const [nombre, setNombre] = useState(p.nombre);
  const [tr, setTr] = useState(p.tramos.map(t => ({ a: hhmm(t.inicio), b: hhmm(t.fin) })));
  const parsed = tr.map(t => ({ inicio: toMin(t.a || '00:00'), fin: toMin(t.b || '00:00') }));
  const cambiado = nombre !== p.nombre || JSON.stringify(parsed) !== JSON.stringify(p.tramos);
  const ok = nombre.trim() && tramosValidos(parsed);
  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-3">
      <input value={nombre} onChange={e => setNombre(e.target.value)} className={cx(inputCls, 'w-44 font-semibold')} aria-label="Nombre de la plantilla" />
      {tr.map((t, i) => (
        <div key={i} className="flex items-center gap-1">
          {i > 0 && <span className="px-1 text-muted">+</span>}
          <input type="time" value={t.a} onChange={e => setTr(x => x.map((y, k) => k === i ? { ...y, a: e.target.value } : y))} className={cx(inputCls, 'w-[96px]')} />
          <span className="text-muted">–</span>
          <input type="time" value={t.b} onChange={e => setTr(x => x.map((y, k) => k === i ? { ...y, b: e.target.value } : y))} className={cx(inputCls, 'w-[96px]')} />
        </div>
      ))}
      {tr.length < 2 ? <button onClick={() => setTr(x => [...x, { a: '18:00', b: '20:00' }])} className="text-xs font-medium text-muted hover:text-text">+ tramo</button>
        : <button onClick={() => setTr(x => x.slice(0, 1))} className="text-xs font-medium text-muted hover:text-text">− tramo</button>}
      <span className="num ml-auto text-[13px] text-muted">{ok ? dur(minutos(parsed)) : '—'}</span>
      {cambiado && <Button variant="primary" disabled={!ok} onClick={() => acciones.guardarPlantilla({ ...p, nombre: nombre.trim(), tramos: parsed })}>Guardar</Button>}
      <button onClick={() => acciones.eliminarPlantilla(p.id)} className="grid h-8 w-8 place-items-center rounded-lg text-muted hover:bg-hover" aria-label="Eliminar plantilla"><Trash2 size={15} /></button>
    </div>
  );
}

/** Borrador local: se puede vaciar y reescribir; se guarda al salir del campo o con Enter, dentro de [min, max]. */
function Num({ value, onChange, suf, w = 64, min = 0, max = 999 }: { value: number; onChange: (n: number) => void; suf?: string; w?: number; min?: number; max?: number }) {
  const [txt, setTxt] = useState(String(value));
  const descartar = useRef(false);
  useEffect(() => setTxt(String(value)), [value]);
  const confirmar = () => {
    // Escape hace blur() dentro del propio keydown: el focusout llega antes de que React aplique setTxt.
    if (descartar.current) { descartar.current = false; setTxt(String(value)); return; }
    const n = parseInt(txt, 10);
    const v = Number.isNaN(n) ? value : Math.min(max, Math.max(min, n));
    setTxt(String(v));
    if (v !== value) onChange(v);
  };
  return (
    <div className="flex h-8 items-center gap-1 rounded-md border border-border bg-bg px-2" style={{ width: w + (suf ? 24 : 0) }}>
      <input inputMode="numeric" value={txt} onChange={e => setTxt(e.target.value.replace(/\D/g, ''))} onBlur={confirmar} onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur(); if (e.key === 'Escape') { descartar.current = true; e.currentTarget.blur(); } }} className="num min-w-0 flex-1 bg-transparent text-right text-[13px] font-semibold outline-none" />
      {suf && <span className="text-xs text-muted">{suf}</span>}
    </div>
  );
}
function Hora({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return <input type="time" value={hhmm(value)} onChange={e => e.target.value && onChange(toMin(e.target.value))} className={cx(inputCls, 'h-8 w-[96px] text-[13px]')} />;
}

export default function Ajustes() {
  const { state, acciones, tema, setTema } = useStore();
  const [tab, setTab] = useState<'turnos' | 'tarifas' | 'apariencia'>('turnos');
  const [fest, setFest] = useState('');
  const r = state.reglas;
  const set = (p: Partial<Reglas>) => acciones.setReglas(p);
  const reglas: { t: string; d: string; on: boolean; tog: (v: boolean) => void; ctrl?: ReactNode }[] = [
    { t: 'Horario de apertura', d: 'Fuera de esta franja no se exige cobertura.', on: true, tog: () => {}, ctrl: <div className="flex items-center gap-1"><Hora value={r.apertura.desde} onChange={v => set({ apertura: { ...r.apertura, desde: v } })} /><span className="text-muted">–</span><Hora value={r.apertura.hasta} onChange={v => set({ apertura: { ...r.apertura, hasta: v } })} /></div> },
    { t: 'Franja descubierta', d: 'Avisa si en horario de apertura no hay nadie.', on: r.franjaVacia, tog: v => set({ franjaVacia: v }) },
    { t: 'Mínimo de personas', d: 'En la franja indicada.', on: r.minPersonas.activa, tog: v => set({ minPersonas: { ...r.minPersonas, activa: v } }), ctrl: <div className="flex items-center gap-1"><Num value={r.minPersonas.valor} onChange={v => set({ minPersonas: { ...r.minPersonas, valor: v } })} w={44} min={1} max={50} /><Hora value={r.minPersonas.desde} onChange={v => set({ minPersonas: { ...r.minPersonas, desde: v } })} /><span className="text-muted">–</span><Hora value={r.minPersonas.hasta} onChange={v => set({ minPersonas: { ...r.minPersonas, hasta: v } })} /></div> },
    { t: 'Máximo de horas al día', d: 'No aplica a quien tenga rol Jefa.', on: r.maxHorasDia.activa, tog: v => set({ maxHorasDia: { ...r.maxHorasDia, activa: v } }), ctrl: <Num value={r.maxHorasDia.valor} onChange={v => set({ maxHorasDia: { ...r.maxHorasDia, valor: v } })} suf="h" w={44} min={1} max={24} /> },
    { t: 'Máximo de horas a la semana', d: 'Por empleada.', on: r.maxHorasSemana.activa, tog: v => set({ maxHorasSemana: { ...r.maxHorasSemana, activa: v } }), ctrl: <Num value={r.maxHorasSemana.valor} onChange={v => set({ maxHorasSemana: { ...r.maxHorasSemana, valor: v } })} suf="h" w={44} min={1} max={168} /> },
    { t: 'Al menos un día libre', d: 'Por semana y empleada.', on: r.diaLibre, tog: v => set({ diaLibre: v }) },
    { t: 'Días de descanso seguidos', d: 'Para quien lo tenga marcado en su ficha (Silvia).', on: r.descansoSeguido, tog: v => set({ descansoSeguido: v }) }
  ];

  return (
    <div className="flex min-h-full flex-col">
      <PageHeader title="Ajustes">
        <Segmented value={tab} onChange={setTab} options={[{ value: 'turnos', label: 'Turnos y reglas' }, { value: 'tarifas', label: 'Recargos y festivos' }, { value: 'apariencia', label: 'Apariencia' }]} />
      </PageHeader>
      <div className="grid flex-1 items-start gap-5 p-4 md:p-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        {tab === 'turnos' && <>
          <Card className="overflow-hidden">
            <div className="flex items-center justify-between border-b border-border px-4 py-4"><div className="flex flex-col gap-0.5"><span className="text-[15px] font-semibold">Plantillas de turno</span><span className="text-xs text-muted">Aparecen en el panel lateral del horario para arrastrarlas.</span></div>
              <Button onClick={() => acciones.guardarPlantilla({ id: uid(), nombre: 'Nueva plantilla', tramos: [{ inicio: 540, fin: 720 }] })}><Plus size={15} />Nueva</Button></div>
            {state.plantillas.map(p => <PlantillaFila key={p.id + p.nombre + JSON.stringify(p.tramos)} p={p} />)}
            <div className="px-4 py-3 text-xs text-muted">Minutos exactos (p. ej. 10:35 – 12:00) y hasta 2 tramos por turno.</div>
          </Card>
          <Card className="overflow-hidden">
            <div className="flex flex-col gap-0.5 border-b border-border px-4 py-4"><span className="text-[15px] font-semibold">Reglas de aviso</span><span className="text-xs text-muted">Avisan, nunca bloquean.</span></div>
            {reglas.map(x => (
              <div key={x.t} className="flex flex-wrap items-center gap-3 border-b border-border px-4 py-3">
                <div className="flex min-w-[180px] flex-1 flex-col gap-0.5"><span className="text-sm font-medium">{x.t}</span><span className="text-xs text-muted">{x.d}</span></div>
                {x.ctrl && <div className={cx(!x.on && 'pointer-events-none opacity-45')}>{x.ctrl}</div>}
                {x.t !== 'Horario de apertura' && <Toggle on={x.on} onChange={x.tog} label={x.t} />}
              </div>
            ))}
          </Card>
        </>}
        {tab === 'tarifas' && <>
          <Card className="flex flex-col">
            <div className="border-b border-border px-4 py-4"><span className="text-[15px] font-semibold">Recargos</span></div>
            <div className="flex items-center justify-between border-b border-border px-4 py-3"><span className="text-sm">Domingos</span><Num value={state.ajustes.recargoDomingoPct} onChange={v => acciones.setAjustes({ recargoDomingoPct: v })} suf="%" max={500} /></div>
            <div className="flex items-center justify-between px-4 py-3"><span className="text-sm">Festivos</span><Num value={state.ajustes.recargoFestivoPct} onChange={v => acciones.setAjustes({ recargoFestivoPct: v })} suf="%" max={500} /></div>
            <div className="px-4 pb-4 text-xs text-muted">La tarifa por hora se define en la ficha de cada empleada (por defecto 10,00 €/h).</div>
          </Card>
          <Card className="flex flex-col">
            <div className="flex items-center gap-2 border-b border-border px-4 py-4"><span className="flex-1 text-[15px] font-semibold">Festivos</span>
              <input type="date" value={fest} onChange={e => setFest(e.target.value)} className={cx(inputCls, 'h-8')} />
              <Button disabled={!fest} onClick={() => { acciones.setAjustes({ festivos: [...new Set([...state.ajustes.festivos, fest])].sort() }); setFest(''); }}>Añadir</Button></div>
            {state.ajustes.festivos.map(f => (
              <div key={f} className="flex items-center justify-between border-b border-border px-4 py-2.5 text-sm"><span>{fmt(desdeIso(f), "EEEE d 'de' MMMM yyyy")}</span>
                <button onClick={() => acciones.setAjustes({ festivos: state.ajustes.festivos.filter(x => x !== f) })} className="grid h-7 w-7 place-items-center rounded-md text-muted hover:bg-hover" aria-label="Quitar"><Trash2 size={14} /></button></div>
            ))}
          </Card>
        </>}
        {tab === 'apariencia' && (
          <Card className="flex items-center justify-between gap-3 p-4">
            <div className="flex flex-col gap-0.5"><span className="text-sm font-semibold">Tema</span><span className="text-xs text-muted">Se guarda en este dispositivo.</span></div>
            <Segmented value={tema} onChange={setTema} options={[{ value: 'claro', label: 'Claro' }, { value: 'oscuro', label: 'Oscuro' }]} />
          </Card>
        )}
      </div>
    </div>
  );
}
