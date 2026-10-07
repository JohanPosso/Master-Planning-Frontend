import { describe, expect, it } from 'vitest';
import type { Registro, State } from './types';
import { aplicarDiaFichajes, diffEstado, fusionarNovedades, sinCambios } from './sync';

const base = (): State => ({
  version: 1,
  empleadas: [{ id: 'e1', nombre: 'Ana', rol: 'Empleada', color: 'azul', tarifaCent: 1000, diasDescanso: [], descansoSeguido: false, excluirNomina: false, activa: true }],
  plantillas: [],
  turnos: [
    { id: 't1', empleadaId: 'e1', fecha: '2026-10-05', tramos: [{ inicio: 400, fin: 720 }] },
    { id: 't2', empleadaId: 'e1', fecha: '2026-10-06', tramos: [{ inicio: 540, fin: 720 }] }
  ],
  registros: [],
  pagos: [],
  semanas: [{ lunes: '2026-10-05', publicada: false }],
  reglas: { apertura: { desde: 400, hasta: 1260 }, franjaVacia: true, minPersonas: { activa: true, desde: 540, hasta: 780, valor: 2 }, maxHorasDia: { activa: true, valor: 10 }, maxHorasSemana: { activa: true, valor: 40 }, diaLibre: true, descansoSeguido: true },
  ajustes: { recargoDomingoPct: 0, recargoFestivoPct: 25, festivos: ['2026-10-12'] },
  fichajes: [],
  fichaje: { geocerca: { activa: false, latitud: null, longitud: null, radioM: 150 }, red: { activa: false, ips: [] }, sinVerificar: 'revisar' as const, cierreAutomaticoHoras: 10 }
});

describe('diffEstado', () => {
  it('nunca envía fichajes ni su configuración (solo lectura / se guardan aparte)', () => {
    const antes = base();
    const despues: State = { ...antes, fichajes: [{ id: 'f1', empleadaId: 'e1', fecha: '2026-10-05', minuto: 480, tipo: 'entrada', marca: '2026-10-05T06:00:00Z' }], fichaje: { geocerca: { activa: true, latitud: 1, longitud: 2, radioM: 100 }, red: { activa: false, ips: [] }, sinVerificar: 'revisar' as const, cierreAutomaticoHoras: 10 } };
    expect(sinCambios(diffEstado(despues, antes))).toBe(true);
  });

  it('no genera operaciones si no hay cambios', () => {
    expect(sinCambios(diffEstado(base(), base()))).toBe(true);
  });

  it('deshacer un «mover» que sustituyó a otro turno: restaura ambos', () => {
    const antes = base();
    const despues: State = { ...antes, turnos: [{ ...antes.turnos[0], fecha: '2026-10-06' }] };
    expect(diffEstado(despues, antes)).toEqual({ turnos: { upsert: antes.turnos, delete: [] } });
  });

  it('deshacer una creación borra lo creado', () => {
    const antes = base();
    const despues: State = { ...antes, turnos: [...antes.turnos, { id: 't3', empleadaId: 'e1', fecha: '2026-10-07', tramos: [{ inicio: 1, fin: 2 }] }] };
    expect(diffEstado(despues, antes)).toEqual({ turnos: { upsert: [], delete: ['t3'] } });
  });

  it('usa el lunes como clave de semanas e incluye reglas/ajustes completos si cambian', () => {
    const antes = base();
    const despues: State = {
      ...antes,
      semanas: [{ lunes: '2026-10-05', publicada: true }],
      reglas: { ...antes.reglas, diaLibre: false },
      ajustes: { ...antes.ajustes, festivos: [] }
    };
    expect(diffEstado(despues, antes)).toEqual({
      semanas: { upsert: antes.semanas, delete: [] },
      reglas: antes.reglas,
      ajustes: antes.ajustes
    });
  });
});

describe('fusionarNovedades', () => {
  const reg = (id: string, fecha: string, fin: number, origen?: 'fichaje') => ({ id, empleadaId: 'e1', fecha, tramos: [{ inicio: 480, fin }], estado: 'previsto' as const, ...(origen && { origen }) });
  const fich = (id: string, fecha: string) => ({ id, empleadaId: 'e1', fecha, minuto: 480, tipo: 'entrada' as const, marca: `${fecha}T06:00:00Z` });

  it('estado actual: el servidor manda desde la fecha pedida', () => {
    const s = { ...base(), registros: [reg('viejo', '2026-10-01', 600), reg('local', '2026-10-06', 600)], fichajes: [fich('f0', '2026-10-01')] };
    const r = fusionarNovedades(s, { desde: '2026-10-06', fichajes: [fich('f1', '2026-10-06')], registros: [reg('srv', '2026-10-06', 720, 'fichaje')] });
    expect(r.registros.map(x => x.id)).toEqual(['viejo', 'srv']);
    expect(r.fichajes.map(x => x.id)).toEqual(['f0', 'f1']);
  });

  it('sin cambios reales devuelve el mismo estado (las filas en edición no se reinician)', () => {
    const r1 = reg('a', '2026-10-06', 600, 'fichaje');
    const s = { ...base(), registros: [r1], fichajes: [fich('f1', '2026-10-06')] };
    const mismo = fusionarNovedades(s, { desde: '2026-10-06', fichajes: [fich('f1', '2026-10-06')], registros: [{ ...r1 }] });
    expect(mismo).toBe(s);
    const otro = fusionarNovedades(s, { desde: '2026-10-06', fichajes: [fich('f1', '2026-10-06'), fich('f2', '2026-10-06')], registros: [{ ...r1 }] });
    expect(otro.registros[0]).toBe(r1);
    expect(otro.fichajes[0]).toBe(s.fichajes[0]);
  });

  it('historial: quita las horas fichadas que una corrección eliminó (no resucitan al deshacer)', () => {
    const snap = { ...base(), registros: [reg('fich', '2026-10-07', 700, 'fichaje'), reg('manual', '2026-10-07', 650)] };
    const r = fusionarNovedades(snap, { desde: '2026-10-06', fichajes: [], registros: [] }, { historial: true });
    expect(r.registros.map(x => x.id)).toEqual(['manual']);
  });

  it('historial: añade las horas fichadas pero conserva lo que el encargado editó a mano', () => {
    const snap = { ...base(), registros: [reg('manual', '2026-10-06', 650), reg('fich', '2026-10-07', 700, 'fichaje')] };
    const n = { desde: '2026-10-06', fichajes: [], registros: [reg('manual', '2026-10-06', 999), reg('fich', '2026-10-07', 730, 'fichaje'), reg('nuevo', '2026-10-08', 720, 'fichaje')] };
    const r = fusionarNovedades(snap, n, { historial: true });
    const fin = Object.fromEntries(r.registros.map(x => [x.id, x.tramos[0].fin]));
    expect(fin).toEqual({ manual: 650, fich: 730, nuevo: 720 });
    // Deshacer desde el estado actual a esta instantánea no borra el registro fichado
    const actual = fusionarNovedades(snap, n);
    expect(diffEstado(actual, r).registros?.delete ?? []).toEqual([]);
  });
});

describe('aplicarDiaFichajes', () => {
  const dia = (registro: Registro | null) => ({ empleadaId: 'e1', fecha: '2026-10-06', fichajes: [], registro });
  const r = (fin: number, origen?: 'fichaje'): Registro => ({ id: 'r', empleadaId: 'e1', fecha: '2026-10-06', tramos: [{ inicio: 480, fin }], estado: 'previsto', ...(origen && { origen }) });

  it('estado actual: sustituye fichajes y registro del día', () => {
    const s = { ...base(), registros: [r(600)] };
    expect(aplicarDiaFichajes(s, dia(r(720, 'fichaje'))).registros[0].tramos[0].fin).toBe(720);
    expect(aplicarDiaFichajes(s, dia(null)).registros).toEqual([]);
  });
  it('historial: no toca un registro manual, sí uno de fichaje', () => {
    expect(aplicarDiaFichajes({ ...base(), registros: [r(600)] }, dia(r(720, 'fichaje')), { historial: true }).registros[0].tramos[0].fin).toBe(600);
    expect(aplicarDiaFichajes({ ...base(), registros: [r(600, 'fichaje')] }, dia(null), { historial: true }).registros).toEqual([]);
  });
});
