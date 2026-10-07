import type { Ajustes, Fichaje, Empleada, PeriodoPago, Plantilla, Registro, Reglas, Semana, State, Turno } from './types';

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

export interface Novedades { desde: string; fichajes: Fichaje[]; registros: Registro[] }

/**
 * Incorpora lo que han fichado las empleadas (y los registros que eso generó) sin depender del historial.
 * - Estado actual: desde `desde`, el servidor manda (fichajes y registros).
 * - Instantáneas de «deshacer» (`historial`): solo se añaden fichajes y registros de fichaje que la instantánea
 *   no tenía o que seguían siendo de fichaje. Así deshacer no borra horas fichadas, pero sí revierte lo que
 *   el encargado editó a mano.
 */
export function fusionarNovedades(s: State, n: Novedades, { historial = false } = {}): State {
  const fichajes = conservar(s.fichajes, [...s.fichajes.filter(f => f.fecha < n.desde), ...n.fichajes], f => f.id);
  if (!historial) {
    const registros = conservar(s.registros, [...s.registros.filter(r => r.fecha < n.desde), ...n.registros], r => r.id);
    return fichajes === s.fichajes && registros === s.registros ? s : { ...s, fichajes, registros };
  }
  const clave = (r: Registro) => `${r.empleadaId}|${r.fecha}`;
  const deFichaje = new Map(n.registros.filter(r => r.origen === 'fichaje').map(r => [clave(r), r]));
  const registros = s.registros.map(r => (r.origen === 'fichaje' && deFichaje.get(clave(r))) || r);
  const presentes = new Set(registros.map(clave));
  return { ...s, fichajes, registros: [...registros, ...[...deFichaje.values()].filter(r => !presentes.has(clave(r)))] };
}

/**
 * Reutiliza los objetos que no han cambiado (y la lista entera si nada cambió). Sin esto, cada refresco
 * crearía objetos nuevos y las filas que se están editando se reiniciarían.
 */
function conservar<T>(antes: T[], despues: T[], clave: (x: T) => string): T[] {
  const previos = new Map(antes.map(x => [clave(x), x]));
  const res = despues.map(x => { const p = previos.get(clave(x)); return p && igual(p, x) ? p : x; });
  return res.length === antes.length && res.every((x, i) => x === antes[i]) ? antes : res;
}
