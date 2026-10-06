import type { Ajustes, Empleada, PeriodoPago, Plantilla, Registro, Reglas, Semana, State, Turno } from './types';

/**
 * «Deshacer» contra el servidor: se calcula la diferencia entre el estado actual y el anterior
 * y se envía como un lote a POST /api/sync, que la aplica en una sola transacción.
 */
export interface Cambios<T, K = string> { upsert: T[]; delete: K[] }
export interface SyncOps {
  empleadas?: Cambios<Empleada>;
  plantillas?: Cambios<Plantilla>;
  semanas?: Cambios<Semana>;
  turnos?: Cambios<Turno>;
  registros?: Cambios<Registro>;
  pagos?: Cambios<PeriodoPago>;
  reglas?: Reglas;
  ajustes?: Ajustes;
}

const igual = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

function diffColeccion<T>(actual: T[], destino: T[], clave: (x: T) => string): Cambios<T> | undefined {
  const antes = new Map(actual.map(x => [clave(x), x]));
  const despues = new Set(destino.map(clave));
  const upsert = destino.filter(x => !igual(antes.get(clave(x)), x));
  const borrar = [...antes.keys()].filter(k => !despues.has(k));
  return upsert.length || borrar.length ? { upsert, delete: borrar } : undefined;
}

const porId = <T extends { id: string }>(x: T) => x.id;

/** Operaciones que llevan el servidor de `actual` a `destino`. Vacío si no hay nada que cambiar. */
export function diffEstado(actual: State, destino: State): SyncOps {
  const ops: SyncOps = {
    empleadas: diffColeccion(actual.empleadas, destino.empleadas, porId),
    plantillas: diffColeccion(actual.plantillas, destino.plantillas, porId),
    semanas: diffColeccion(actual.semanas, destino.semanas, s => s.lunes),
    turnos: diffColeccion(actual.turnos, destino.turnos, porId),
    registros: diffColeccion(actual.registros, destino.registros, porId),
    pagos: diffColeccion(actual.pagos, destino.pagos, porId),
    reglas: igual(actual.reglas, destino.reglas) ? undefined : destino.reglas,
    ajustes: igual(actual.ajustes, destino.ajustes) ? undefined : destino.ajustes
  };
  return Object.fromEntries(Object.entries(ops).filter(([, v]) => v !== undefined)) as SyncOps;
}

export const sinCambios = (ops: SyncOps) => Object.keys(ops).length === 0;
