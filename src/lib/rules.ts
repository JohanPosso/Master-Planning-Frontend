import type { Aviso, Registro, State, Turno } from './types';
import { diasSemana, fmt, hhmm, iso, minutos, esDomingo, capital } from './time';

export const activas = (s: State) => s.empleadas.filter(e => e.activa && !e.eliminadaEn);
const activaId = (s: State, id: string) => activas(s).some(e => e.id === id);

export interface Slot { t: number; c: number; req: number }
/** Cobertura cada 10 min de 06:00 a 21:00. */
export function cobertura(s: State, fecha: string): Slot[] {
  const segs = s.turnos.filter(t => t.fecha === fecha && activaId(s, t.empleadaId)).flatMap(t => t.tramos);
  const { apertura, minPersonas, franjaVacia } = s.reglas;
  const out: Slot[] = [];
  for (let t = 360; t < 1260; t += 10) {
    const c = segs.filter(x => t >= x.inicio && t < x.fin).length;
    const abierto = t >= apertura.desde && t < apertura.hasta;
    let req = abierto && franjaVacia ? 1 : 0;
    if (abierto && minPersonas.activa && t >= minPersonas.desde && t < minPersonas.hasta) req = Math.max(req, minPersonas.valor);
    out.push({ t, c, req });
  }
  return out;
}

export function avisosSemana(s: State, lunes: Date): Aviso[] {
  const av: Aviso[] = [];
  const dias = diasSemana(lunes), fechas = dias.map(iso);
  const nombre = (id: string) => s.empleadas.find(e => e.id === id)?.nombre ?? '';
  dias.forEach((d, di) => {
    const f = fechas[di], cov = cobertura(s, f);
    for (let i = 0; i < cov.length;) {
      if (cov[i].c >= cov[i].req) { i++; continue; }
      const cero = cov[i].c === 0; let j = i;
      while (j < cov.length && cov[j].c < cov[j].req && (cov[j].c === 0) === cero) j++;
      const desde = cov[i].t, hasta = cov[j - 1].t + 10;
      const quien = s.turnos.filter(t => t.fecha === f && activaId(s, t.empleadaId) && t.tramos.some(x => desde >= x.inicio && desde < x.fin)).map(t => nombre(t.empleadaId));
      av.push({
        nivel: cero ? 'error' : 'warn', fecha: f,
        titulo: `${capital(fmt(d, 'EEE d'))} · ${hhmm(desde)} – ${hhmm(hasta)} ${cero ? 'sin nadie' : quien.length === 1 ? `solo ${quien[0]}` : `${cov[i].c} de ${cov[i].req}`}`,
        detalle: cero ? 'Franja descubierta.' : `Mínimo ${s.reglas.minPersonas.valor} personas de ${hhmm(s.reglas.minPersonas.desde)} a ${hhmm(s.reglas.minPersonas.hasta)}.`
      });
      i = j;
    }
  });
  activas(s).forEach(e => {
    const porDia = fechas.map(f => minutos(s.turnos.filter(t => t.empleadaId === e.id && t.fecha === f).flatMap(t => t.tramos)));
    const total = porDia.reduce((a, b) => a + b, 0);
    if (e.rol !== 'Jefa') {
      if (s.reglas.maxHorasDia.activa) porDia.forEach((m, i) => { if (m > s.reglas.maxHorasDia.valor * 60) av.push({ nivel: 'warn', fecha: fechas[i], empleadaId: e.id, titulo: `${e.nombre} · más de ${s.reglas.maxHorasDia.valor} h el ${fmt(dias[i], 'EEEE d')}`, detalle: 'Supera el máximo diario.' }); });
      if (s.reglas.maxHorasSemana.activa && total > s.reglas.maxHorasSemana.valor * 60) av.push({ nivel: 'warn', empleadaId: e.id, titulo: `${e.nombre} · más de ${s.reglas.maxHorasSemana.valor} h esta semana`, detalle: 'Supera el máximo semanal.' });
    }
    if (s.reglas.diaLibre && porDia.every(m => m > 0)) av.push({ nivel: 'warn', empleadaId: e.id, titulo: `${e.nombre} sin día libre`, detalle: 'Trabaja los 7 días.' });
    if (s.reglas.descansoSeguido && e.descansoSeguido) {
      const ok = porDia.some((m, i) => i < 6 && m === 0 && porDia[i + 1] === 0);
      if (!ok) av.push({ nivel: 'warn', empleadaId: e.id, titulo: `${e.nombre} sin 2 días seguidos de descanso`, detalle: 'Tiene marcada la regla de descanso seguido.' });
    }
  });
  return av.sort((a, b) => (a.nivel === b.nivel ? 0 : a.nivel === 'error' ? -1 : 1));
}

/** Lo real si existe; si no, lo planificado (estimación). */
export function jornada(s: State, empleadaId: string, fecha: string): { tramos: Turno['tramos']; registro?: Registro; turno?: Turno } {
  const registro = s.registros.find(r => r.empleadaId === empleadaId && r.fecha === fecha);
  const turno = s.turnos.find(t => t.empleadaId === empleadaId && t.fecha === fecha);
  return { tramos: registro?.tramos ?? turno?.tramos ?? [], registro, turno };
}

export function importeDia(s: State, tarifaCent: number, fecha: string, min: number) {
  const fest = s.ajustes.festivos.includes(fecha);
  const pct = fest ? s.ajustes.recargoFestivoPct : esDomingo(fecha) ? s.ajustes.recargoDomingoPct : 0;
  const base = (min / 60) * tarifaCent;
  return { base, recargo: base * pct / 100 };
}
