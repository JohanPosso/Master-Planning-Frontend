import { useEffect, useState } from 'react';
import { Ban, Check, LogIn, LogOut, Plus } from 'lucide-react';
import type { Empleada, Fichaje } from '../lib/types';
import { estadoDia, ordenarDia, vigentes } from '../lib/fichaje';
import { capital, desdeIso, dur, fmt, hhmm, toMin } from '../lib/time';
import { useStore } from '../store';
import { Badge, Button, Modal, Segmented, cx, inputCls } from './ui';

type Tipo = Fichaje['tipo'];
const MOTIVO_MIN = 3;

/** Etiquetas de procedencia y verificación de un fichaje. */
export function EtiquetasFichaje({ f, compacto = false }: { f: Fichaje; compacto?: boolean }) {
  return (
    <>
      {f.origen === 'automatico' && <Badge tone="warn">Automática</Badge>}
      {f.origen === 'encargado' && <Badge tone="primary">Encargado</Badge>}
      {f.verificacion === 'sin_verificar' && <Badge tone="warn">Sin verificar</Badge>}
      {!compacto && f.verificacion === 'red' && <Badge>Wi-Fi</Badge>}
      {!compacto && f.verificacion === 'gps' && <Badge>GPS{f.distanciaM !== undefined ? ` · ${f.distanciaM} m` : ''}</Badge>}
    </>
  );
}

/** Un fichaje vigente: se puede cambiar su hora o tipo, o anularlo (siempre con motivo). */
function FilaFichaje({ f, motivoOk, onCorregir, onAnular }: { f: Fichaje; motivoOk: boolean; onCorregir: (tipo: Tipo, minuto: number) => void; onAnular: () => void }) {
  const [tipo, setTipo] = useState<Tipo>(f.tipo);
  const [hora, setHora] = useState(hhmm(f.minuto));
  useEffect(() => { setTipo(f.tipo); setHora(hhmm(f.minuto)); }, [f.id, f.tipo, f.minuto]);
  const cambiado = tipo !== f.tipo || (hora && toMin(hora) !== f.minuto);

  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-border py-2.5 last:border-b-0">
      <span className={cx('grid h-7 w-7 flex-none place-items-center rounded-full', tipo === 'entrada' ? 'bg-ok-bg text-ok-fg' : 'bg-sunken text-muted')}>
        {tipo === 'entrada' ? <LogIn size={14} /> : <LogOut size={14} />}
      </span>
      <select value={tipo} onChange={e => setTipo(e.target.value as Tipo)} className={cx(inputCls, 'h-8 w-[104px] px-2 text-[13px]')} aria-label="Tipo de fichaje">
        <option value="entrada">Entrada</option><option value="salida">Salida</option>
      </select>
      <input type="time" value={hora} onChange={e => setHora(e.target.value)} className={cx(inputCls, 'h-8 w-[96px] text-[13px]')} aria-label="Hora del fichaje" />
      <div className="flex flex-1 flex-wrap gap-1"><EtiquetasFichaje f={f} /></div>
      {cambiado ? (
        <Button className="h-8" variant="primary" disabled={!motivoOk || !hora} title={motivoOk ? undefined : 'Escribe antes el motivo'} onClick={() => onCorregir(tipo, toMin(hora))}><Check size={14} />Guardar</Button>
      ) : (
        <button onClick={onAnular} disabled={!motivoOk} title={motivoOk ? 'Anular este fichaje' : 'Escribe antes el motivo'}
          className="grid h-8 w-8 place-items-center rounded-lg text-muted hover:bg-error-bg hover:text-error-fg disabled:opacity-40 disabled:hover:bg-transparent" aria-label="Anular fichaje"><Ban size={15} /></button>
      )}
    </div>
  );
}

/**
 * Fichajes de una empleada en un día: el encargado añade el que falta, corrige la hora o anula uno.
 * Nada se borra: lo anulado queda abajo, tachado, con su motivo.
 */
export function FichajesDia({ empleada, fecha, open, onClose }: { empleada: Empleada; fecha: string; open: boolean; onClose: () => void }) {
  const { state, acciones } = useStore();
  const [motivo, setMotivo] = useState('');
  const [nuevoTipo, setNuevoTipo] = useState<Tipo>('salida');
  const [nuevaHora, setNuevaHora] = useState('');
  const [enviando, setEnviando] = useState(false);

  const delDia = state.fichajes.filter(f => f.empleadaId === empleada.id && f.fecha === fecha);
  const activos = ordenarDia(vigentes(delDia));
  const anulados = ordenarDia(delDia.filter(f => f.anulado));
  const { minutos, dentro } = estadoDia(delDia);
  const registro = state.registros.find(r => r.empleadaId === empleada.id && r.fecha === fecha);
  const motivoOk = motivo.trim().length >= MOTIVO_MIN;

  useEffect(() => { if (open) { setMotivo(''); setNuevaHora(''); setNuevoTipo(estadoDia(delDia).dentro ? 'salida' : 'entrada'); } }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const ejecutar = async (accion: () => Promise<boolean>) => {
    setEnviando(true);
    const ok = await accion();
    setEnviando(false);
    if (ok) { setMotivo(''); setNuevaHora(''); }
  };

  return (
    <Modal open={open} onClose={onClose} width={560}
      title={<span className="flex flex-col"><span>Fichajes · {empleada.nombre}</span><span className="text-xs font-normal text-muted">{capital(fmt(desdeIso(fecha), "EEEE d 'de' MMMM"))}</span></span>}
      footer={<>
        <span className="num flex-1 text-[13px] text-muted">
          Horas fichadas: <b className="text-text">{dur(minutos)}</b>{dentro && <Badge tone="warn">Falta salida</Badge>}
          {registro && <> · registro {registro.estado === 'confirmado' ? 'confirmado (no cambia)' : 'por confirmar'}</>}
        </span>
        <Button onClick={onClose}>Cerrar</Button>
      </>}>
      <div className={cx('flex flex-col gap-4', enviando && 'pointer-events-none opacity-60')}>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold">Motivo del cambio <span className="font-normal text-muted">(obligatorio, queda en el historial)</span></span>
          <input value={motivo} onChange={e => setMotivo(e.target.value)} maxLength={300} placeholder="p. ej. Olvidó fichar la salida" className={inputCls} />
        </label>

        <div>
          <span className="text-[11px] font-medium uppercase tracking-[.06em] text-muted">Fichajes</span>
          {activos.length === 0
            ? <p className="py-2 text-[13px] text-muted">No hay fichajes este día.</p>
            : activos.map(f => (
              <FilaFichaje key={f.id} f={f} motivoOk={motivoOk}
                onCorregir={(tipo, minuto) => void ejecutar(() => acciones.corregirFichaje(f.id, { tipo, minuto, motivo: motivo.trim() }))}
                onAnular={() => void ejecutar(() => acciones.anularFichaje(f.id, motivo.trim()))} />
            ))}
        </div>

        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-dashed border-border-strong p-3">
          <span className="text-[13px] font-medium">Añadir</span>
          <Segmented value={nuevoTipo} onChange={setNuevoTipo} options={[{ value: 'entrada', label: 'Entrada' }, { value: 'salida', label: 'Salida' }]} />
          <input type="time" value={nuevaHora} onChange={e => setNuevaHora(e.target.value)} className={cx(inputCls, 'h-9 w-[100px] text-[13px]')} aria-label="Hora del nuevo fichaje" />
          <Button variant="primary" disabled={!motivoOk || !nuevaHora} title={motivoOk ? undefined : 'Escribe antes el motivo'}
            onClick={() => void ejecutar(() => acciones.anadirFichaje({ empleadaId: empleada.id, fecha, tipo: nuevoTipo, minuto: toMin(nuevaHora), motivo: motivo.trim() }))}>
            <Plus size={15} />Añadir
          </Button>
        </div>

        {anulados.length > 0 && (
          <div className="flex flex-col gap-1.5">
            <span className="text-[11px] font-medium uppercase tracking-[.06em] text-muted">Historial de cambios</span>
            {anulados.map(f => (
              <div key={f.id} className="flex flex-wrap items-baseline gap-x-2 text-[12px] text-muted">
                <span className="num line-through">{f.tipo === 'entrada' ? 'Entrada' : 'Salida'} {hhmm(f.minuto)}</span>
                <span>· anulado {fmt(new Date(f.anulado!), "d MMM HH:mm")}{f.motivo ? ` · «${f.motivo}»` : ''}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
}
