import { useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import type { Empleada, Tramo, Turno } from '../lib/types';
import { capital, desdeIso, dur, fmt, hhmm, minutos, toMin, uid } from '../lib/time';
import { colorVars } from '../lib/theme';
import { tramosValidos, useStore } from '../store';
import { Button, Modal, inputCls } from './ui';

export interface EditorTarget { turno?: Turno; empleadaId: string; fecha: string }

export function TurnoEditor({ target, onClose }: { target: EditorTarget | null; onClose: () => void }) {
  const { state, acciones } = useStore();
  const [tramos, setTramos] = useState<{ a: string; b: string }[]>([]);
  useEffect(() => {
    if (target) setTramos((target.turno?.tramos ?? [{ inicio: 540, fin: 720 }]).map(t => ({ a: hhmm(t.inicio), b: hhmm(t.fin) })));
  }, [target]);
  const emp: Empleada | undefined = state.empleadas.find(e => e.id === target?.empleadaId);
  const parsed: Tramo[] = tramos.filter(t => t.a && t.b).map(t => ({ inicio: toMin(t.a), fin: toMin(t.b) }));
  const ok = tramos.length > 0 && parsed.length === tramos.length && tramosValidos(parsed);
  const guardar = () => {
    if (!target || !ok) return;
    acciones.guardarTurno({ ...(target.turno ?? { id: uid(), empleadaId: target.empleadaId, fecha: target.fecha }), tramos: parsed }, target.turno ? 'Turno actualizado' : 'Turno añadido');
    onClose();
  };
  return (
    <Modal open={!!target} onClose={onClose} width={460}
      title={emp && target ? <div className="flex items-center gap-2.5" style={colorVars(emp.color)}><span className="h-2.5 w-2.5 rounded-full bg-c-solid" />{emp.nombre} · {capital(fmt(desdeIso(target.fecha), "EEEE d 'de' MMMM"))}</div> : ''}
      footer={<>
        {target?.turno && <Button variant="danger" onClick={() => { acciones.eliminarTurno(target.turno!.id); onClose(); }}><Trash2 size={15} />Eliminar</Button>}
        <div className="flex-1" />
        <Button onClick={onClose}>Cancelar</Button>
        <Button variant="primary" disabled={!ok} onClick={guardar}>Guardar</Button>
      </>}>
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap gap-1.5">
          {state.plantillas.map(p => (
            <button key={p.id} onClick={() => setTramos(p.tramos.map(t => ({ a: hhmm(t.inicio), b: hhmm(t.fin) })))}
              className="rounded-full border border-border px-2.5 py-1 text-xs font-medium hover:bg-hover">{p.nombre}</button>
          ))}
        </div>
        {tramos.map((t, i) => (
          <div key={i} className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold text-muted">{tramos.length > 1 ? `Tramo ${i + 1}` : 'Horario'}</span>
            <div className="flex items-center gap-2">
              <input type="time" step={60} value={t.a} onChange={e => setTramos(ts => ts.map((x, k) => k === i ? { ...x, a: e.target.value } : x))} className={inputCls + ' flex-1'} />
              <span className="text-muted">–</span>
              <input type="time" step={60} value={t.b} onChange={e => setTramos(ts => ts.map((x, k) => k === i ? { ...x, b: e.target.value } : x))} className={inputCls + ' flex-1'} />
              {tramos.length > 1 && <button onClick={() => setTramos(ts => ts.filter((_, k) => k !== i))} className="grid h-9 w-9 place-items-center rounded-lg text-muted hover:bg-hover" aria-label="Quitar tramo"><Trash2 size={15} /></button>}
            </div>
          </div>
        ))}
        {tramos.length < 2 && <Button variant="ghost" className="self-start" onClick={() => setTramos(ts => [...ts, { a: '18:00', b: '20:00' }])}><Plus size={15} />Añadir tramo (turno partido)</Button>}
        <div className="flex justify-between rounded-lg bg-sunken px-3 py-2.5 text-sm num">
          <span className="text-muted">Duración</span>
          <span className="font-semibold">{ok ? dur(minutos(parsed)) : 'Revisa las horas'}</span>
        </div>
      </div>
    </Modal>
  );
}
