import { describe, expect, it } from 'vitest';
import type { State } from './types';
import { diffEstado, sinCambios } from './sync';

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
  ajustes: { recargoDomingoPct: 0, recargoFestivoPct: 25, festivos: ['2026-10-12'] }
});

describe('diffEstado', () => {
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
