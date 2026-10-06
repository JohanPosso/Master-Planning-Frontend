import type { Ajustes, Empleada, PeriodoPago, Plantilla, Registro, Reglas, Semana, State, Turno } from './types';
import type { SyncOps } from './sync';

/** En desarrollo Vite redirige /api al backend (vite.config.ts). En producción: VITE_API_URL. */
const BASE = (import.meta.env.VITE_API_URL ?? '/api').replace(/\/$/, '');

export class ApiError extends Error {
  constructor(public status: number, message: string, public detalles?: unknown) {
    super(message);
    this.name = 'ApiError';
  }
}

async function pedir<T>(metodo: string, ruta: string, cuerpo?: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${BASE}${ruta}`, {
      method: metodo,
      headers: cuerpo === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo)
    });
  } catch {
    throw new ApiError(0, 'No se pudo conectar con el servidor');
  }
  if (res.status === 204) return undefined as T;
  const datos = await res.json().catch(() => null);
  if (!res.ok) {
    // Sin cuerpo de error de la API (proxy o gateway caídos) → el servidor no está respondiendo.
    const porDefecto = res.status >= 500 ? 'El servidor no responde. Inténtalo de nuevo en unos segundos.' : `Error ${res.status}`;
    const { message = porDefecto, details } = datos?.error ?? {};
    const campo = Array.isArray(details) && details[0] ? ` · ${details[0].path}: ${details[0].message}` : '';
    throw new ApiError(res.status, message + campo, details);
  }
  return datos as T;
}

export const mensajeError = (e: unknown) => (e instanceof Error ? e.message : 'Error inesperado');

export const api = {
  estado: () => pedir<State>('GET', '/estado'),
  sync: (ops: SyncOps) => pedir<void>('POST', '/sync', ops),

  guardarEmpleada: (e: Empleada) => pedir<Empleada>('PUT', `/empleadas/${e.id}`, e),
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
  setAjustes: (a: Partial<Ajustes>) => pedir<Ajustes>('PATCH', '/ajustes', a)
};
