import type { Ajustes, Empleada, Fichaje, FichajeConfig, PeriodoPago, Perfil, Plantilla, Registro, Reglas, Rol, Semana, State, Turno } from './types';
import type { SyncOps } from './sync';

/** En desarrollo Vite redirige /api al backend (vite.config.ts). En producción: VITE_API_URL. */
const BASE = (import.meta.env.VITE_API_URL ?? '/api').replace(/\/$/, '');

let authToken: string | null = null;
export const setAuthToken = (token: string | null) => {
  authToken = token;
};

/** Se avisa a la sesión cuando el servidor rechaza el token (caducado o no válido) para cerrarla. */
let alNoAutorizado: ((codigo: string) => void) | null = null;
export const setAlNoAutorizado = (fn: ((codigo: string) => void) | null) => {
  alNoAutorizado = fn;
};

export class ApiError extends Error {
  constructor(public status: number, message: string, public detalles?: unknown) {
    super(message);
    this.name = 'ApiError';
  }
}

async function pedir<T>(metodo: string, ruta: string, cuerpo?: unknown): Promise<T> {
  let res: Response;
  const headers: Record<string, string> = {};
  if (cuerpo !== undefined) headers['Content-Type'] = 'application/json';
  if (authToken) headers.Authorization = `Bearer ${authToken}`;
  try {
    res = await fetch(`${BASE}${ruta}`, {
      method: metodo,
      headers,
      body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
    });
  } catch {
    throw new ApiError(0, 'No se pudo conectar con el servidor');
  }
  if (res.status === 204) return undefined as T;
  const datos = await res.json().catch(() => null);
  if (!res.ok) {
    const porDefecto = res.status >= 500 ? 'El servidor no responde. Inténtalo de nuevo en unos segundos.' : `Error ${res.status}`;
    const { message = porDefecto, details } = datos?.error ?? {};
    // Credenciales incorrectas en el login también dan 401: eso no es «sesión caducada».
    if (res.status === 401 && authToken && ruta !== '/auth/login') alNoAutorizado?.(datos?.error?.code ?? 'UNAUTHORIZED');
    const campo = Array.isArray(details) && details[0] ? ` · ${details[0].path}: ${details[0].message}` : '';
    throw new ApiError(res.status, message + campo, details);
  }
  return datos as T;
}

export const mensajeError = (e: unknown) => (e instanceof Error ? e.message : 'Error inesperado');

export interface LoginRes {
  token: string;
  rol: Rol;
  perfil: Perfil;
  /** Instante en que caduca la sesión (ISO). */
  expiraEn: string;
}

export interface PortalEstado {
  version: number;
  empleada: Omit<Empleada, 'tarifaCent' | 'tieneAccesoPortal'> & { usuario?: string | null };
  empleadas: Omit<Empleada, 'tarifaCent' | 'usuario' | 'tieneAccesoPortal'>[];
  turnos: Turno[];
  registros: Registro[];
  pagos: PeriodoPago[];
  semanas: Semana[];
  reglas: Reglas;
  ajustes: Ajustes;
}

export interface PortalNomina {
  inicio: string;
  fin: string;
  estimacion: {
    minutos: number;
    recargosCent: number;
    importeCent: number;
    excluida: boolean;
    pendientes: string[];
  };
  historico: PeriodoPago[];
}

/** Bloque de fichaje del portal. `ahora` es la hora del servidor (la que se registra al fichar). */
export interface ResumenFichaje {
  ahora: string;
  zonaHoraria: string;
  hoy: string;
  minutoActual: number;
  toca: 'entrada' | 'salida';
  dentroDesde: number | null;
  minutosHoy: number;
  fichajesHoy: Fichaje[];
  turnoHoy: Turno | null;
  semana: { lunes: string; minutosFichados: number; minutosPlanificados: number };
  historial: { fecha: string; fichajes: Fichaje[]; minutos: number; incompleto: boolean; corregido: boolean }[];
  geocerca: { activa: boolean; radioM: number };
  red: { activa: boolean };
  /** Conectada al Wi-Fi de la cafetería: no hace falta pedir la ubicación. */
  enRedCafeteria: boolean;
  cierreAutomaticoHoras: number;
}

/** Resultado de una corrección: todos los fichajes del día (con anulados) y cómo queda el registro. */
export interface DiaFichajes { fecha: string; empleadaId: string; fichajes: Fichaje[]; registro: Registro | null }

export interface Ubicacion { latitud: number; longitud: number; precisionM?: number }

export type EmpleadaWrite = Empleada & { password?: string; quitarAcceso?: boolean };

export const api = {
  login: (usuario: string, password: string) => pedir<LoginRes>('POST', '/auth/login', { usuario, password }),
  me: () => pedir<{ rol: Rol; perfil: Perfil; expiraEn: string }>('GET', '/auth/me'),
  logout: () => pedir<void>('POST', '/auth/logout'),

  portalEstado: () => pedir<PortalEstado>('GET', '/portal/estado'),
  portalNomina: (inicio: string, fin: string) => pedir<PortalNomina>('GET', `/portal/nomina?inicio=${inicio}&fin=${fin}`),
  portalFichaje: () => pedir<ResumenFichaje>('GET', '/portal/fichaje'),
  fichar: (tipo: 'entrada' | 'salida', ubicacion?: Ubicacion) =>
    pedir<{ fichaje: Fichaje; registro: Registro | null }>('POST', '/portal/fichajes', { tipo, ubicacion }),
  portalPerfil: (datos: { nombre?: string; usuario?: string; passwordActual?: string; passwordNueva?: string }) =>
    pedir<PortalEstado['empleada']>('PATCH', '/portal/perfil', datos),

  estado: () => pedir<State>('GET', '/estado'),
  sync: (ops: SyncOps) => pedir<void>('POST', '/sync', ops),

  guardarEmpleada: (e: EmpleadaWrite) => pedir<Empleada>('PUT', `/empleadas/${e.id}`, e),
  eliminarEmpleada: (id: string) => pedir<{ empleada: Empleada }>('DELETE', `/empleadas/${id}`),

  guardarTurno: (t: Turno) => pedir<Turno>('PUT', `/turnos/${t.id}`, t),
  eliminarTurno: (id: string) => pedir<void>('DELETE', `/turnos/${id}`),
  moverTurno: (id: string, destino: { empleadaId: string; fecha: string; duplicar: boolean; nuevoId: string }) =>
    pedir<Turno>('POST', `/turnos/${id}/mover`, destino),
  turnoDesdePlantilla: (datos: { id: string; plantillaId: string; empleadaId: string; fecha: string }) =>
    pedir<Turno>('POST', '/turnos/desde-plantilla', datos),

  publicarSemana: (lunes: string, publicada: boolean) => pedir<Semana>('PUT', `/semanas/${lunes}`, { publicada }),
  copiarSemanaAnterior: (lunes: string) => pedir<{ creados: Turno[] }>('POST', `/semanas/${lunes}/copiar-anterior`),

  guardarRegistro: (r: Registro) => pedir<Registro>('PUT', `/registros/${r.empleadaId}/${r.fecha}`, r),
  confirmarDia: (fecha: string, empleadaIds: string[]) => pedir<Registro[]>('POST', '/registros/confirmar-dia', { fecha, empleadaIds }),

  pagar: (p: { id: string; inicio: string; fin: string; etiqueta: string }) => pedir<PeriodoPago>('POST', '/pagos', p),

  guardarPlantilla: (p: Plantilla) => pedir<Plantilla>('PUT', `/plantillas/${p.id}`, p),
  eliminarPlantilla: (id: string) => pedir<void>('DELETE', `/plantillas/${id}`),

  setReglas: (r: Partial<Reglas>) => pedir<Reglas>('PATCH', '/reglas', r),
  setAjustes: (a: Partial<Ajustes>) => pedir<Ajustes>('PATCH', '/ajustes', a),

  fichajesNovedades: (desde: string) => pedir<{ desde: string; fichajes: Fichaje[]; registros: Registro[] }>('GET', `/fichajes/novedades?desde=${desde}`),
  setFichajeConfig: (c: FichajeConfig) => pedir<FichajeConfig>('PUT', '/fichaje/config', c),
  miIp: () => pedir<{ ip: string }>('GET', '/fichaje/mi-ip'),
  anadirFichaje: (d: { empleadaId: string; fecha: string; tipo: Fichaje['tipo']; minuto: number; motivo: string }) => pedir<DiaFichajes>('POST', '/fichajes', d),
  corregirFichaje: (id: string, d: { tipo: Fichaje['tipo']; minuto: number; motivo: string }) => pedir<DiaFichajes>('PUT', `/fichajes/${id}`, d),
  anularFichaje: (id: string, motivo: string) => pedir<DiaFichajes>('POST', `/fichajes/${id}/anular`, { motivo }),
};
