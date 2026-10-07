import type { Fichaje, Tramo } from './types';

/** Igual que en el servidor: empareja entradas y salidas; una entrada sin salida queda abierta. */
export function estadoDia(fichajes: Fichaje[]) {
  const pares: Tramo[] = [];
  let abierta: number | null = null;
  for (const f of [...fichajes].sort((a, b) => a.marca.localeCompare(b.marca))) {
    if (f.tipo === 'entrada') abierta ??= f.minuto;
    else if (abierta !== null) {
      if (f.minuto > abierta) pares.push({ inicio: abierta, fin: f.minuto });
      abierta = null;
    }
  }
  return { pares, abierta, dentro: abierta !== null, minutos: pares.reduce((t, p) => t + p.fin - p.inicio, 0) };
}

/** Minutos trabajados hoy contando el tramo abierto hasta ahora. */
export const minutosEnVivo = (cerrados: number, dentroDesde: number | null, minutoAhora: number) =>
  cerrados + (dentroDesde !== null ? Math.max(minutoAhora - dentroDesde, 0) : 0);

/** Fichajes agrupados por empleada y día: clave `${empleadaId}|${fecha}`. */
export function agruparFichajes(fichajes: Fichaje[]) {
  const m = new Map<string, Fichaje[]>();
  for (const f of fichajes) {
    const k = `${f.empleadaId}|${f.fecha}`;
    m.set(k, [...(m.get(k) ?? []), f]);
  }
  return m;
}

/** Minuto del día actual en una zona horaria, desplazado según el reloj del servidor. */
export function minutoEn(timeZone: string, instante: Date) {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-GB', { timeZone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(instante).map(x => [x.type, x.value]));
  return (Number(p.hour) % 24) * 60 + Number(p.minute);
}
