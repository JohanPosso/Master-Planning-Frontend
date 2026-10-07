import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { toast } from 'sonner';
import type { Empleada, PeriodoPago, Plantilla, Registro, State, Tramo, Turno } from './lib/types';
import { api, mensajeError, type EmpleadaWrite } from './lib/api';
import { aplicarDiaFichajes, diffEstado, fusionarNovedades, sinCambios } from './lib/sync';
import { addDays } from 'date-fns';
import { iso, uid } from './lib/time';
import { aplicarTema, type Tema } from './lib/theme';

type Mut = (s: State) => State;
interface Api {
  state: State;
  tema: Tema; setTema: (t: Tema) => void;
  deshacer: () => void;
  acciones: {
    guardarEmpleada: (e: EmpleadaWrite) => void;
    eliminarEmpleada: (id: string) => void;
    moverTurno: (id: string, empleadaId: string, fecha: string, duplicar: boolean) => void;
    turnoDesdePlantilla: (plantillaId: string, empleadaId: string, fecha: string) => void;
    guardarTurno: (t: Turno, msg?: string) => void;
    eliminarTurno: (id: string) => void;
    copiarSemanaAnterior: (lunes: Date) => void;
    publicarSemana: (lunes: Date, publicada: boolean) => void;
    guardarRegistro: (r: Omit<Registro, 'id'> & { id?: string }, msg?: string) => void;
    confirmarDia: (fecha: string, empleadaIds: string[]) => void;
    marcarPagado: (p: Omit<PeriodoPago, 'id' | 'pagadoEn'>) => void;
    guardarPlantilla: (p: Plantilla) => void;
    eliminarPlantilla: (id: string) => void;
    setReglas: (r: Partial<State['reglas']>) => void;
    setAjustes: (a: Partial<State['ajustes']>) => void;
    setFichajeConfig: (c: State['fichaje']) => Promise<void>;
    /** Correcciones de fichajes (sin «deshacer»: quedan en el historial con su motivo). Devuelven si se guardó. */
    anadirFichaje: (d: { empleadaId: string; fecha: string; tipo: 'entrada' | 'salida'; minuto: number; motivo: string }) => Promise<boolean>;
    corregirFichaje: (id: string, d: { tipo: 'entrada' | 'salida'; minuto: number; motivo: string }) => Promise<boolean>;
    anularFichaje: (id: string, motivo: string) => Promise<boolean>;
  };
}
const Ctx = createContext<Api | null>(null);
export const useStore = () => { const c = useContext(Ctx); if (!c) throw new Error('StoreProvider ausente'); return c; };

const MAX_HISTORIAL = 50;
const upsert = <T,>(lista: T[], item: T, mismo: (x: T) => boolean) => lista.some(mismo) ? lista.map(x => mismo(x) ? item : x) : [...lista, item];
const mismoDia = (r: Pick<Registro, 'empleadaId' | 'fecha'>) => (x: Registro) => x.empleadaId === r.empleadaId && x.fecha === r.fecha;

/**
 * Estado sincronizado con la API.
 * - Cambios optimistas: se ven al instante y se envían al servidor en una cola, en el mismo orden en que se hicieron.
 * - Operaciones que calcula el servidor (copiar semana, confirmar día, pagar): se aplican al recibir la respuesta.
 * - Si algo falla: aviso y resincronización completa con el servidor cuando la cola se vacía.
 * - Deshacer: vuelve al estado anterior y envía la diferencia a /api/sync (una transacción).
 */
function crearMotor(setState: (s: State) => void, setError: (e: string | null) => void) {
  const ref: { estado: State | null } = { estado: null };
  const hist: State[] = [];
  let cola: Promise<unknown> = Promise.resolve();

  const aplicar = (fn: Mut) => { if (!ref.estado) return; ref.estado = fn(ref.estado); setState(ref.estado); };
  const guardarEnHistorial = (s: State) => { hist.push(s); if (hist.length > MAX_HISTORIAL) hist.shift(); };
  /** Cambio que viene de fuera (fichajes): se aplica al estado y a las instantáneas de «deshacer». */
  const aplicarExterno = (fn: Mut, fnHistorial: Mut = fn) => {
    if (!ref.estado) return;
    for (let i = 0; i < hist.length; i++) hist[i] = fnHistorial(hist[i]);
    aplicar(fn);
  };
  const encolar = <T,>(tarea: () => Promise<T>) => { const p = cola.then(tarea); cola = p.catch(() => undefined); return p; };

  const cargar = async () => {
    try {
      const s = await api.estado();
      ref.estado = s; setState(s); setError(null);
    } catch (e) {
      if (ref.estado) toast.error(`No se pudo sincronizar: ${mensajeError(e)}`);
      else setError(mensajeError(e));
    }
  };

  const fallo = (e: unknown, snapshot?: State) => {
    toast.error(mensajeError(e));
    if (!snapshot) return;
    const i = hist.lastIndexOf(snapshot); if (i >= 0) hist.splice(i, 1);
    void encolar(cargar);
  };

  const deshacer = () => {
    const destino = hist.pop(), actual = ref.estado;
    if (!destino || !actual) return;
    const ops = diffEstado(actual, destino);
    // Los fichajes no se deshacen: son de las empleadas y de solo lectura.
    aplicar(() => ({ ...destino, fichajes: actual.fichajes, fichaje: actual.fichaje }));
    toast('Cambio deshecho');
    if (!sinCambios(ops)) encolar(() => api.sync(ops)).catch(e => fallo(e, destino));
  };
  const conDeshacer = { action: { label: 'Deshacer', onClick: deshacer }, duration: 6000 };

  const optimista = (fn: Mut, remoto: () => Promise<unknown>, msg?: string) => {
    const antes = ref.estado; if (!antes) return;
    const despues = fn(antes); if (despues === antes) return;
    guardarEnHistorial(antes);
    aplicar(() => despues);
    if (msg) toast(msg, conDeshacer);
    encolar(remoto).catch(e => fallo(e, antes));
  };

  const enServidor = <T,>(remoto: () => Promise<T>, resultado: (r: T) => { mut?: Mut; msg: string }) =>
    encolar(async () => {
      const { mut, msg } = resultado(await remoto());
      if (mut && ref.estado) { guardarEnHistorial(ref.estado); aplicar(mut); }
      toast(msg, mut ? conDeshacer : undefined);
    }).catch(e => fallo(e));

  const actual = () => ref.estado;

  const acciones: Api['acciones'] = {
    guardarEmpleada: e => {
      const { password, quitarAcceso, tieneAccesoPortal: _tap, ...limpia } = e;
      const preview = {
        ...limpia,
        tieneAccesoPortal: quitarAcceso ? false : Boolean(limpia.usuario && (password || e.tieneAccesoPortal)),
      };
      optimista(
        s => ({ ...s, empleadas: upsert(s.empleadas, preview, x => x.id === e.id) }),
        async () => {
          const guardada = await api.guardarEmpleada(e);
          aplicar(s => ({ ...s, empleadas: upsert(s.empleadas, guardada, x => x.id === guardada.id) }));
        },
        actual()?.empleadas.some(x => x.id === e.id) ? 'Cambios guardados' : `${e.nombre} añadida al equipo`);
    },
    eliminarEmpleada: id => {
      const hoy = iso(new Date());
      const n = actual()?.empleadas.find(e => e.id === id)?.nombre;
      optimista(
        s => ({ ...s, empleadas: s.empleadas.map(e => e.id === id ? { ...e, eliminadaEn: hoy, activa: false } : e), turnos: s.turnos.filter(t => !(t.empleadaId === id && t.fecha >= hoy)) }),
        () => api.eliminarEmpleada(id), `${n} eliminada`);
    },
    moverTurno: (id, empleadaId, fecha, duplicar) => {
      const nuevoId = uid();
      optimista(s => {
        const t = s.turnos.find(x => x.id === id);
        if (!t || (t.empleadaId === empleadaId && t.fecha === fecha)) return s;
        const otros = s.turnos.filter(x => !(x.empleadaId === empleadaId && x.fecha === fecha && x.id !== id));
        return { ...s, turnos: duplicar ? [...otros, { ...t, id: nuevoId, empleadaId, fecha }] : otros.map(x => x.id === id ? { ...x, empleadaId, fecha } : x) };
      }, () => api.moverTurno(id, { empleadaId, fecha, duplicar, nuevoId }), duplicar ? 'Turno duplicado' : 'Turno movido');
    },
    turnoDesdePlantilla: (plantillaId, empleadaId, fecha) => {
      const id = uid();
      optimista(s => {
        const p = s.plantillas.find(x => x.id === plantillaId); if (!p) return s;
        return { ...s, turnos: [...s.turnos.filter(x => !(x.empleadaId === empleadaId && x.fecha === fecha)), { id, empleadaId, fecha, tramos: p.tramos, plantillaId }] };
      }, () => api.turnoDesdePlantilla({ id, plantillaId, empleadaId, fecha }), 'Turno añadido');
    },
    guardarTurno: (t, msg = 'Turno guardado') => optimista(
      s => ({ ...s, turnos: s.turnos.some(x => x.id === t.id) ? s.turnos.map(x => x.id === t.id ? t : x) : [...s.turnos.filter(x => !(x.empleadaId === t.empleadaId && x.fecha === t.fecha)), t] }),
      () => api.guardarTurno(t), msg),
    eliminarTurno: id => optimista(s => ({ ...s, turnos: s.turnos.filter(t => t.id !== id) }), () => api.eliminarTurno(id), 'Turno eliminado'),
    copiarSemanaAnterior: lunes => enServidor(() => api.copiarSemanaAnterior(iso(lunes)), ({ creados }) => ({
      mut: creados.length ? s => ({ ...s, turnos: [...s.turnos, ...creados] }) : undefined,
      msg: creados.length ? `Semana anterior copiada · ${creados.length} turnos` : 'No había huecos que rellenar'
    })),
    publicarSemana: (lunes, publicada) => optimista(
      s => ({ ...s, semanas: [...s.semanas.filter(x => x.lunes !== iso(lunes)), { lunes: iso(lunes), publicada }] }),
      () => api.publicarSemana(iso(lunes), publicada), publicada ? 'Horario publicado' : 'Horario vuelto a borrador'),
    guardarRegistro: (r, msg) => {
      const rec: Registro = { ...r, id: actual()?.registros.find(mismoDia(r))?.id ?? r.id ?? uid() };
      optimista(s => ({ ...s, registros: upsert(s.registros, rec, mismoDia(rec)) }), () => api.guardarRegistro(rec), msg);
    },
    confirmarDia: (fecha, ids) => enServidor(() => api.confirmarDia(fecha, ids), regs => ({
      mut: s => ({ ...s, registros: regs.reduce((acc, r) => upsert(acc, r, mismoDia(r)), s.registros) }),
      msg: 'Horas confirmadas'
    })),
    marcarPagado: p => enServidor(() => api.pagar({ id: uid(), inicio: p.inicio, fin: p.fin, etiqueta: p.etiqueta }), pago => ({
      mut: s => ({ ...s, pagos: [pago, ...s.pagos.filter(x => x.inicio !== pago.inicio)] }),
      msg: `${p.etiqueta} marcado como pagado`
    })),
    guardarPlantilla: p => optimista(s => ({ ...s, plantillas: upsert(s.plantillas, p, x => x.id === p.id) }), () => api.guardarPlantilla(p), 'Plantilla guardada'),
    eliminarPlantilla: id => optimista(s => ({ ...s, plantillas: s.plantillas.filter(p => p.id !== id) }), () => api.eliminarPlantilla(id), 'Plantilla eliminada'),
    setReglas: r => optimista(s => ({ ...s, reglas: { ...s.reglas, ...r } }), () => api.setReglas(r)),
    setAjustes: a => optimista(s => ({ ...s, ajustes: { ...s.ajustes, ...a } }), () => api.setAjustes(a)),
    // Sin «deshacer»: se guarda en el servidor (que valida la geocerca) y luego se refleja.
    setFichajeConfig: c => encolar(async () => {
      const fichaje = await api.setFichajeConfig(c);
      aplicarExterno(s => ({ ...s, fichaje }));
      toast('Ajustes de fichaje guardados');
    }).catch(e => fallo(e)),
    anadirFichaje: d => corregir(() => api.anadirFichaje(d), 'Fichaje añadido'),
    corregirFichaje: (id, d) => corregir(() => api.corregirFichaje(id, d), 'Fichaje corregido'),
    anularFichaje: (id, motivo) => corregir(() => api.anularFichaje(id, motivo), 'Fichaje anulado')
  };

  const corregir = (remoto: () => ReturnType<typeof api.anadirFichaje>, msg: string) => encolar(async () => {
    const dia = await remoto();
    aplicarExterno(s => aplicarDiaFichajes(s, dia), s => aplicarDiaFichajes(s, dia, { historial: true }));
    toast(msg);
    return true;
  }).catch(e => { fallo(e); return false; });

  /** Trae lo fichado desde ayer. En cola: nunca pisa un cambio del encargado que aún no llegó al servidor. */
  const refrescarFichajes = () => encolar(async () => {
    if (!ref.estado) return;
    const n = await api.fichajesNovedades(iso(addDays(new Date(), -1)));
    aplicarExterno(s => fusionarNovedades(s, n), s => fusionarNovedades(s, n, { historial: true }));
  }).catch(() => undefined); // silencioso: se reintenta en el siguiente ciclo

  return { cargar, deshacer, acciones, refrescarFichajes };
}

function PantallaCarga({ error, reintentar }: { error: string | null; reintentar: () => void }) {
  return (
    <div className="grid h-full place-items-center bg-bg p-6 text-text">
      <div className="flex max-w-sm flex-col items-center gap-3 text-center">
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary text-lg font-bold text-primary-fg">J</span>
        {error ? <>
          <p className="text-sm font-semibold">No se pudieron cargar los datos</p>
          <p className="text-sm text-muted">{error}</p>
          <button onClick={reintentar} className="h-9 rounded-lg border border-border bg-surface px-4 text-sm font-semibold hover:bg-hover">Reintentar</button>
        </> : <p className="text-sm text-muted" role="status">Cargando…</p>}
      </div>
    </div>
  );
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tema, setTemaS] = useState<Tema>(() => (localStorage.getItem('jornada:tema') as Tema) || (matchMedia('(prefers-color-scheme: dark)').matches ? 'oscuro' : 'claro'));
  const motor = useRef<ReturnType<typeof crearMotor>>();
  motor.current ??= crearMotor(setState, setError);
  const { cargar, deshacer, acciones, refrescarFichajes } = motor.current;

  useEffect(() => { void cargar(); }, [cargar]);
  // Fichajes en vivo: cada 30 s con la pestaña visible, y al volver a ella.
  useEffect(() => {
    const tick = () => { if (document.visibilityState === 'visible') void refrescarFichajes(); };
    const t = setInterval(tick, 30_000);
    document.addEventListener('visibilitychange', tick);
    return () => { clearInterval(t); document.removeEventListener('visibilitychange', tick); };
  }, [refrescarFichajes]);
  useEffect(() => { aplicarTema(tema); localStorage.setItem('jornada:tema', tema); }, [tema]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z' && !e.shiftKey && tag !== 'INPUT' && tag !== 'TEXTAREA') { e.preventDefault(); deshacer(); }
    };
    window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h);
  }, [deshacer]);

  const valor = useMemo(() => state && { state, tema, setTema: setTemaS, deshacer, acciones }, [state, tema, deshacer, acciones]);
  if (!valor) return <PantallaCarga error={error} reintentar={() => { setError(null); void cargar(); }} />;
  return <Ctx.Provider value={valor}>{children}</Ctx.Provider>;
}

export const tramosValidos = (t: Tramo[]) => t.length > 0 && t.every(x => x.fin > x.inicio) && (t.length < 2 || t[1].inicio >= t[0].fin);
