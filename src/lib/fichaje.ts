import type { Fichaje, Tramo } from './types';

export const vigentes = (fichajes: Fichaje[]) => fichajes.filter(f => !f.anulado);
/** Orden del día como en el servidor: por minuto y, a igualdad, por instante. */
export const ordenarDia = (fichajes: Fichaje[]) => [...fichajes].sort((a, b) => a.minuto - b.minuto || a.marca.localeCompare(b.marca));

/** Igual que en el servidor: empareja entradas y salidas vigentes; una entrada sin salida queda abierta. */
export function estadoDia(fichajes: Fichaje[]) {
  const pares: Tramo[] = [];
  let abierta: number | null = null;
  for (const f of ordenarDia(vigentes(fichajes))) {
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

/** IP sin espacios ni el prefijo IPv4-mapeado (`::ffff:1.2.3.4` → `1.2.3.4`), igual que en el servidor. */
export const normalizarIp = (ip: string) => ip.trim().replace(/^::ffff:/i, '').toLowerCase();

const OCTETO = '(25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)';
const IPV4 = new RegExp(`^${OCTETO}(\\.${OCTETO}){3}$`);
/** IPv4 (185.250.76.217) o IPv6 (2a0c:5a80::1). El servidor vuelve a validarla. */
export function esIpValida(ip: string) {
  if (IPV4.test(ip)) return true;
  if (!/^[0-9a-f:]+$/i.test(ip) || !ip.includes(':') || (ip.match(/::/g)?.length ?? 0) > 1) return false;
  const grupos = ip.split(':');
  return grupos.length <= 8 && grupos.every(g => g.length <= 4) && (ip.includes('::') || grupos.length === 8);
}

/** Minuto del día actual en una zona horaria, desplazado según el reloj del servidor. */
export function minutoEn(timeZone: string, instante: Date) {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-GB', { timeZone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(instante).map(x => [x.type, x.value]));
  return (Number(p.hour) % 24) * 60 + Number(p.minute);
}
