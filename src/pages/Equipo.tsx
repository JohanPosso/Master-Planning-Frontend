import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Plus, Trash2, X } from 'lucide-react';
import type { ColorKey, Empleada } from '../lib/types';
import type { EmpleadaWrite } from '../lib/api';
import { COLORES, NOMBRE_COLOR, colorVars } from '../lib/theme';
import { eur, uid } from '../lib/time';
import { useStore } from '../store';
import { Badge, Button, Modal, PageHeader, Toggle, cx, inputCls } from '../components/ui';

const DN = ['L', 'M', 'X', 'J', 'V', 'S', 'D'], DL = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
const descTxt = (d: number[]) => !d.length ? 'Sin preferencia' : d.length === 2 && d[1] - d[0] === 1 ? `${DL[d[0]]} y ${DL[d[1]].toLowerCase()}` : d.map(i => DL[i]).join(', ');

type Draft = Omit<Empleada, 'tarifaCent'> & { tarifa: string; password: string; quitarAcceso: boolean };
const toDraft = (e: Empleada): Draft => ({
  ...e,
  usuario: e.usuario ?? '',
  tarifa: (e.tarifaCent / 100).toFixed(2).replace('.', ','),
  password: '',
  quitarAcceso: false,
});

export default function Equipo() {
  const { state, acciones } = useStore();
  const team = state.empleadas.filter(e => !e.eliminadaEn);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [nuevo, setNuevo] = useState(false);
  const [confirmar, setConfirmar] = useState(false);
  const upd = (p: Partial<Draft>) => setDraft(d => d && { ...d, ...p });

  const abrirNueva = () => {
    const libre = COLORES.find(c => !team.some(e => e.color === c)) ?? 'gris';
    setNuevo(true);
    setDraft({
      id: uid(), nombre: '', rol: 'Empleada', color: libre, tarifa: '10,00', diasDescanso: [],
      descansoSeguido: false, excluirNomina: false, activa: true, usuario: '', password: '', quitarAcceso: false,
    });
  };
  const tarifaCent = draft ? Math.round(parseFloat(draft.tarifa.replace(',', '.')) * 100) : 0;
  const valido = !!draft && draft.nombre.trim().length > 0 && tarifaCent >= 0 && !Number.isNaN(tarifaCent)
    && (!draft.password || (draft.usuario?.trim().length ?? 0) >= 2);
  const guardar = () => {
    if (!draft || !valido) return;
    const { tarifa, password, quitarAcceso, ...rest } = draft;
    void tarifa;
    const payload: EmpleadaWrite = {
      ...rest,
      nombre: draft.nombre.trim(),
      tarifaCent,
      usuario: draft.usuario?.trim() || null,
    };
    if (quitarAcceso) payload.quitarAcceso = true;
    else if (password) payload.password = password;
    acciones.guardarEmpleada(payload);
    setDraft(null);
  };
  const usados = team.filter(e => e.id !== draft?.id).map(e => e.color);

  return (
    <div className="flex min-h-full flex-col">
      <PageHeader title="Equipo" badge={<span className="text-[13px] text-muted">{team.filter(e => e.activa).length} activas · {team.length} en total</span>}>
        <Button variant="primary" onClick={abrirNueva}><Plus size={15} />Nueva empleada</Button>
      </PageHeader>
      <div className="flex min-h-0 flex-1">
        <div className="flex min-w-0 flex-1 flex-col gap-2.5 overflow-auto p-4 md:px-6 md:py-5">
          <div className="hidden grid-cols-[minmax(0,1.3fr)_110px_110px_minmax(0,1fr)_120px_90px] px-4 text-[11px] font-medium uppercase tracking-[.06em] text-muted md:grid"><span>Nombre</span><span>Rol</span><span>Tarifa</span><span>Descanso preferido</span><span>Nómina</span><span>Estado</span></div>
          {team.length === 0 && (
            <div className="flex flex-col items-center gap-2.5 rounded-xl border-[1.5px] border-dashed border-border-strong p-12 text-center">
              <span className="text-[15px] font-semibold">Aún no hay nadie en el equipo</span>
              <span className="text-[13px] text-muted">Añade a tu primera empleada para empezar a planificar.</span>
              <Button variant="primary" onClick={abrirNueva}><Plus size={15} />Nueva empleada</Button>
            </div>
          )}
          {team.map(e => (
            <button key={e.id} style={colorVars(e.color)} onClick={() => { setNuevo(false); setDraft(toDraft(e)); }}
              className={cx('grid grid-cols-[1fr_auto] items-center gap-2 rounded-xl border bg-surface px-4 py-3 text-left transition-shadow hover:border-border-strong hover:shadow-sm md:grid-cols-[minmax(0,1.3fr)_110px_110px_minmax(0,1fr)_120px_90px]',
                draft?.id === e.id ? 'border-c-solid shadow-[0_0_0_3px_var(--c-tint)]' : 'border-border', !e.activa && 'opacity-60')}>
              <div className="flex items-center gap-3"><span className="grid h-[34px] w-[34px] place-items-center rounded-full border-[1.5px] border-c-solid bg-c-tint text-[13px] font-semibold text-c-fg">{e.nombre[0]?.toUpperCase()}</span><div className="flex flex-col"><span className="text-sm font-semibold">{e.nombre}</span><span className="text-xs text-muted">{NOMBRE_COLOR[e.color]}{e.tieneAccesoPortal ? ' · portal' : ''}</span></div></div>
              <span className="hidden text-[13px] md:block">{e.rol}</span>
              <span className="num hidden text-[13px] md:block">{eur(e.tarifaCent)}/h</span>
              <span className="hidden text-[13px] text-muted md:block">{descTxt(e.diasDescanso)}</span>
              <div className="hidden md:block"><Badge tone={e.excluirNomina ? 'neutral' : 'ok'}>{e.excluirNomina ? 'Excluida' : 'Incluida'}</Badge></div>
              <div><Badge tone={e.activa ? 'primary' : 'neutral'}>{e.activa ? 'Activa' : 'Inactiva'}</Badge></div>
            </button>
          ))}
        </div>
        <AnimatePresence>
          {draft && (
            <motion.aside key="drawer" initial={{ x: 24, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 24, opacity: 0 }} transition={{ duration: .18 }}
              className="fixed inset-0 z-40 flex flex-col bg-surface md:static md:w-[400px] md:flex-none md:border-l md:border-border">
              <div style={colorVars(draft.color)} className="flex items-center gap-3 border-b border-border px-5 py-4">
                <span className="grid h-10 w-10 place-items-center rounded-full border-[1.5px] border-c-solid bg-c-tint text-[15px] font-semibold text-c-fg transition-colors">{draft.nombre[0]?.toUpperCase() || '?'}</span>
                <div className="flex flex-1 flex-col"><span className="text-base font-semibold">{nuevo ? 'Nueva empleada' : draft.nombre || 'Sin nombre'}</span><span className="text-xs text-muted">{nuevo ? 'Completa la ficha' : 'Editar ficha'}</span></div>
                <button onClick={() => setDraft(null)} className="grid h-8 w-8 place-items-center rounded-lg text-muted hover:bg-hover" aria-label="Cerrar"><X size={16} /></button>
              </div>
              <div className="flex flex-1 flex-col gap-[18px] overflow-auto px-5 py-[18px]">
                <label className="flex flex-col gap-1.5"><span className="text-xs font-semibold">Nombre</span><input autoFocus={nuevo} value={draft.nombre} onChange={e => upd({ nombre: e.target.value })} placeholder="Nombre de la empleada" className={inputCls} /></label>
                <div className="flex flex-col gap-2">
                  <div className="flex justify-between"><span className="text-xs font-semibold">Color</span><span className="text-xs text-muted">{NOMBRE_COLOR[draft.color]}</span></div>
                  <div className="grid grid-cols-10 gap-1.5">
                    {COLORES.map((c: ColorKey) => (
                      <button key={c} title={NOMBRE_COLOR[c]} aria-label={NOMBRE_COLOR[c]} onClick={() => upd({ color: c })}
                        className="grid aspect-square place-items-center rounded-lg transition-shadow" style={{ background: `var(--${c}-solid)`, boxShadow: draft.color === c ? `0 0 0 2px var(--surface),0 0 0 4px var(--${c}-solid)` : 'none' }}>
                        {usados.includes(c) && <span className="h-1.5 w-1.5 rounded-full bg-white/90" />}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5"><span className="text-xs font-semibold">Rol</span>
                    <div className="flex h-[38px] gap-0.5 rounded-lg bg-sunken p-[3px]">{(['Empleada', 'Jefa'] as const).map(r => <button key={r} onClick={() => upd({ rol: r })} className={cx('flex-1 rounded-md text-[13px]', draft.rol === r ? 'bg-surface font-semibold shadow-sm' : 'text-muted')}>{r}</button>)}</div>
                  </div>
                  <label className="flex flex-col gap-1.5"><span className="text-xs font-semibold">Tarifa por hora</span>
                    <div className="flex h-[38px] items-center gap-1.5 rounded-lg border border-border bg-bg px-3"><input inputMode="decimal" value={draft.tarifa} onChange={e => upd({ tarifa: e.target.value })} className="num min-w-0 flex-1 bg-transparent text-sm outline-none" /><span className="text-[13px] text-muted">€/h</span></div>
                  </label>
                </div>
                <div className="flex flex-col gap-3 rounded-xl border border-border bg-sunken/40 p-3">
                  <span className="text-xs font-semibold">Acceso al portal</span>
                  <label className="flex flex-col gap-1.5"><span className="text-[11px] text-muted">Usuario</span>
                    <input value={draft.usuario ?? ''} onChange={e => upd({ usuario: e.target.value, quitarAcceso: false })} placeholder="ej. silvia" className={inputCls} autoComplete="off" />
                  </label>
                  <label className="flex flex-col gap-1.5"><span className="text-[11px] text-muted">PIN / contraseña {draft.tieneAccesoPortal && !nuevo ? '(dejar vacío para no cambiar)' : ''}</span>
                    <input type="password" value={draft.password} onChange={e => upd({ password: e.target.value, quitarAcceso: false })} placeholder="mín. 4 caracteres" className={inputCls} autoComplete="new-password" />
                  </label>
                  {draft.tieneAccesoPortal && !nuevo && (
                    <label className="flex items-center gap-2 text-[13px]">
                      <input type="checkbox" checked={draft.quitarAcceso} onChange={e => upd({ quitarAcceso: e.target.checked, password: '' })} />
                      Quitar acceso al portal
                    </label>
                  )}
                </div>
                <div className="flex flex-col gap-2"><span className="text-xs font-semibold">Días de descanso preferidos</span>
                  <div className="flex gap-1.5">{DN.map((t, i) => { const on = draft.diasDescanso.includes(i); return <button key={i} onClick={() => upd({ diasDescanso: on ? draft.diasDescanso.filter(x => x !== i) : [...draft.diasDescanso, i].sort() })} className={cx('grid h-[38px] w-[38px] place-items-center rounded-lg border text-[13px] font-semibold', on ? 'border-text bg-text text-bg' : 'border-border bg-bg')}>{t}</button>; })}</div>
                </div>
                <div className="flex flex-col border-t border-border">
                  {([['excluirNomina', 'Excluir de nómina', 'Sus horas se planifican y registran, pero no se pagan desde aquí.'], ['descansoSeguido', 'Exigir 2 días seguidos de descanso', 'Avisa si en una semana no los tiene.'], ['activa', 'Activa', 'Las inactivas no aparecen en el horario (útil para sustituciones).']] as const).map(([k, t, d]) => (
                    <div key={k} className="flex items-center gap-3 border-b border-border py-3">
                      <div className="flex flex-1 flex-col gap-0.5"><span className="text-[13px] font-semibold">{t}</span><span className="text-xs text-muted">{d}</span></div>
                      <Toggle on={draft[k]} onChange={v => upd({ [k]: v } as Partial<Draft>)} label={t} />
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2 border-t border-border px-5 py-3.5">
                {!nuevo && <Button variant="danger" onClick={() => setConfirmar(true)}><Trash2 size={15} />Eliminar</Button>}
                <div className="flex-1" />
                <Button onClick={() => setDraft(null)}>Cancelar</Button>
                <Button variant="primary" disabled={!valido} onClick={guardar}>{nuevo ? 'Crear empleada' : 'Guardar cambios'}</Button>
              </div>
            </motion.aside>
          )}
        </AnimatePresence>
      </div>
      <Modal open={confirmar} onClose={() => setConfirmar(false)} title={`¿Eliminar a ${draft?.nombre}?`}
        footer={<>
          <div className="flex-1" />
          <Button onClick={() => setConfirmar(false)}>Cancelar</Button>
          <Button onClick={() => { if (draft) { const { tarifa, password, quitarAcceso, ...r } = draft; void tarifa; void password; void quitarAcceso; acciones.guardarEmpleada({ ...r, tarifaCent, activa: false }); } setConfirmar(false); setDraft(null); }}>Marcar inactiva</Button>
          <Button className="bg-error-solid text-white hover:opacity-90" onClick={() => { if (draft) acciones.eliminarEmpleada(draft.id); setConfirmar(false); setDraft(null); }}>Eliminar</Button>
        </>}>
        <p className="text-sm leading-relaxed text-muted">Se quitarán sus turnos futuros del horario. Sus horas registradas y pagadas se conservan en el histórico. Si solo deja de trabajar un tiempo, márcala como inactiva.</p>
      </Modal>
    </div>
  );
}
