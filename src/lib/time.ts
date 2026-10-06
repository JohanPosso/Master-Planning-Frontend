import { addDays, format, startOfWeek, parseISO, isSunday } from 'date-fns';
import { es } from 'date-fns/locale';
import type { Tramo } from './types';

export const toMin = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
export const hhmm = (m: number) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
export const dur = (min: number) => { const h = Math.floor(min / 60), r = min % 60; return r ? `${h} h ${String(r).padStart(2, '0')}` : `${h} h`; };
export const diff = (min: number) => min === 0 ? '—' : `${min > 0 ? '+' : '−'}${Math.abs(min) < 60 ? `${Math.abs(min)} min` : dur(Math.abs(min))}`;
export const eur = (cent: number) => {
  const n = Math.round(cent) / 100; const [i, d] = Math.abs(n).toFixed(2).split('.');
  return (n < 0 ? '−' : '') + i.replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ',' + d + ' €';
};
export const iso = (d: Date) => format(d, 'yyyy-MM-dd');
export const desdeIso = (s: string) => parseISO(s);
export const lunesDe = (d: Date) => startOfWeek(d, { weekStartsOn: 1 });
export const diasSemana = (lunes: Date) => Array.from({ length: 7 }, (_, i) => addDays(lunes, i));
export const fmt = (d: Date, f: string) => format(d, f, { locale: es });
export const minutos = (t: Tramo[] | undefined) => (t ?? []).reduce((a, x) => a + x.fin - x.inicio, 0);
export const rangoTramos = (t: Tramo[]) => t.map(x => `${hhmm(x.inicio)} – ${hhmm(x.fin)}`).join(' · ');
export const esDomingo = (fecha: string) => isSunday(parseISO(fecha));
export const diaIdx = (d: Date) => (d.getDay() + 6) % 7;
/** UUID v4: la API exige UUID y el cliente los genera para poder actualizar de forma optimista. */
export const uid = (): string => crypto.randomUUID?.() ?? '10000000-1000-4000-8000-100000000000'.replace(/[018]/g, c => (+c ^ (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (+c / 4)))).toString(16));
export const capital = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
export function rangoSemana(lunes: Date) {
  const dom = addDays(lunes, 6);
  return lunes.getMonth() === dom.getMonth()
    ? `${fmt(lunes, 'd')} – ${fmt(dom, "d MMM yyyy")}`
    : `${fmt(lunes, 'd MMM')} – ${fmt(dom, 'd MMM yyyy')}`;
}
