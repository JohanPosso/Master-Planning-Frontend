import { useRef, useState, type PointerEvent as RPointerEvent } from 'react';
import type { Aviso, Tramo, Turno } from '../lib/types';
import { colorVars } from '../lib/theme';
import { activas, cobertura } from '../lib/rules';
import { dur, hhmm, minutos } from '../lib/time';
import { useStore } from '../store';
import { cx } from '../components/ui';
import type { EditorTarget } from '../components/TurnoEditor';
import { AvisoItem } from '../components/AvisoItem';

const INI = 360, SPAN = 900; // 06:00 – 21:00
const pct = (m: number) => `${((m - INI) / SPAN) * 100}%`;

interface Drag { id: string; k: number; edge: 'inicio' | 'fin'; x0: number; v0: number; v: number; w: number }

export function DayTimeline({ fecha, onOpen, avisos }: { fecha: string; onOpen: (t: EditorTarget) => void; avisos: Aviso[] }) {
  const { state, acciones } = useStore();
  const [drag, setDrag] = useState<Drag | null>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const skipClick = useRef(false);
  const emps = activas(state);
  const cov = cobertura(state, fecha);

  const tramosVista = (t: Turno): Tramo[] => drag && drag.id === t.id ? t.tramos.map((x, k) => k === drag.k ? { ...x, [drag.edge]: drag.v } : x) : t.tramos;

  const down = (e: RPointerEvent, t: Turno, k: number, edge: 'inicio' | 'fin') => {
    e.stopPropagation(); e.preventDefault();
    (e.target as Element).setPointerCapture(e.pointerId);
    setDrag({ id: t.id, k, edge, x0: e.clientX, v0: t.tramos[k][edge], v: t.tramos[k][edge], w: trackRef.current?.getBoundingClientRect().width ?? 900 });
  };
  const move = (e: RPointerEvent, t: Turno) => {
    if (!drag || drag.id !== t.id) return;
    const step = e.altKey ? 1 : 5;
    let v = Math.round((drag.v0 + (e.clientX - drag.x0) / drag.w * SPAN) / step) * step;
    const tr = t.tramos[drag.k];
    v = drag.edge === 'inicio' ? Math.max(INI, Math.min(v, tr.fin - 15)) : Math.min(INI + SPAN, Math.max(v, tr.inicio + 15));
    setDrag({ ...drag, v });
  };
  const up = (t: Turno) => {
    if (!drag || drag.id !== t.id) return;
    if (drag.v !== drag.v0) acciones.guardarTurno({ ...t, tramos: tramosVista(t) }, `${drag.edge === 'inicio' ? 'Inicio' : 'Fin'} a las ${hhmm(drag.v)}`);
    skipClick.current = true; setTimeout(() => { skipClick.current = false; }, 0);
    setDrag(null);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="grid rounded-xl border border-border bg-surface px-4 pb-4 pt-3" style={{ gridTemplateColumns: '140px minmax(0,1fr)', rowGap: 8 }}>
        <div />
        <div className="relative h-[22px]" ref={trackRef}>
          {Array.from({ length: 16 }, (_, i) => (
            <span key={i} className="num absolute text-[11px] text-muted" style={{ left: pct(INI + i * 60), transform: `translateX(${i === 0 ? '0' : i === 15 ? '-100%' : '-50%'})` }}>{String(6 + i).padStart(2, '0')}:00</span>
          ))}
        </div>
        {emps.map(e => {
          const t = state.turnos.find(x => x.empleadaId === e.id && x.fecha === fecha);
          return (
            <div key={e.id} className="contents" style={colorVars(e.color)}>
              <div className="flex h-[52px] items-center gap-2"><span className="h-[9px] w-[9px] rounded-full bg-c-solid" /><span className="text-sm font-semibold">{e.nombre}</span></div>
              <div className="relative h-[52px] rounded-lg" style={{ background: 'repeating-linear-gradient(90deg,transparent 0 calc(100%/15 - 1px),var(--border) calc(100%/15 - 1px) calc(100%/15))' }}>
                {!t && (
                  <button onClick={() => onOpen({ empleadaId: e.id, fecha })} className="rest-stripes absolute inset-x-0 inset-y-1 grid place-items-center rounded-md">
                    <span className="text-[10px] font-semibold tracking-[.1em] text-muted">DESCANSO</span>
                  </button>
                )}
                {t && tramosVista(t).map((x, k) => (
                  <div key={k} onClick={() => !drag && !skipClick.current && onOpen({ turno: t, empleadaId: e.id, fecha })}
                    onPointerMove={ev => move(ev, t)} onPointerUp={() => up(t)}
                    className={cx('group absolute inset-y-1 flex cursor-pointer items-center gap-2.5 overflow-hidden rounded-md border bg-c-tint px-2.5 text-c-fg', drag?.id === t.id && drag.k === k ? 'border-c-solid shadow-md' : 'border-c-line')}
                    style={{ left: pct(x.inicio), width: `calc(${(x.fin - x.inicio) / SPAN * 100}% - 2px)` }}>
                    <span className="num whitespace-nowrap text-[13px] font-semibold">{hhmm(x.inicio)} – {hhmm(x.fin)}</span>
                    <span className="whitespace-nowrap text-xs opacity-80">{dur(x.fin - x.inicio)}</span>
                    <span onPointerDown={ev => down(ev, t, k, 'inicio')} className="absolute inset-y-0 left-0 w-2 cursor-ew-resize after:absolute after:left-[2px] after:top-1/2 after:h-5 after:w-1 after:-translate-y-1/2 after:rounded after:bg-c-solid after:opacity-0 group-hover:after:opacity-100" />
                    <span onPointerDown={ev => down(ev, t, k, 'fin')} className="absolute inset-y-0 right-0 w-2 cursor-ew-resize after:absolute after:right-[2px] after:top-1/2 after:h-5 after:w-1 after:-translate-y-1/2 after:rounded after:bg-c-solid after:opacity-0 group-hover:after:opacity-100" />
                  </div>
                ))}
              </div>
            </div>
          );
        })}
        <div className="mt-2 flex h-[68px] flex-col justify-center gap-0.5 border-t border-border pt-2"><span className="text-[13px] font-semibold">Cobertura</span><span className="text-[11px] text-muted">personas / mínimo</span></div>
        <div className="relative mt-2 flex h-[68px] items-end gap-px border-t border-border pt-2">
          {cov.map(s => (
            <div key={s.t} title={`${hhmm(s.t)} · ${s.c} de ${s.req}`} className="flex-1 rounded-t-[2px]"
              style={{ height: s.req === 0 ? 4 : s.c === 0 ? 8 : `${Math.min(s.c, 3) / 3 * 100}%`, background: s.req === 0 ? 'var(--rest-b)' : s.c === 0 ? 'var(--error-solid)' : s.c < s.req ? 'var(--warn-line)' : 'var(--ok-solid)' }} />
          ))}
        </div>
      </div>
      {avisos.length > 0 && <div className="grid gap-2.5" style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(260px,1fr))' }}>{avisos.map((a, i) => <AvisoItem key={i} a={a} />)}</div>}
      <span className="num text-[13px] text-muted">{dur(minutos(state.turnos.filter(t => t.fecha === fecha).flatMap(t => t.tramos)))} planificadas este día · ajuste a 5 min (Alt: al minuto)</span>
    </div>
  );
}
