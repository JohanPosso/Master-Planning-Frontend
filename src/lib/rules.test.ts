import { describe, expect, it } from 'vitest';
import type { State } from './types';
import { abiertoEn, fechasPagadasEmpleada, inicioSinPagar } from './rules';

const base = (): State => ({
  version: 1,
  empleadas: [],
  plantillas: [],
  turnos: [],
  registros: [],
  pagos: [],
  semanas: [],
  reglas: {
    apertura: { desde: 400, hasta: 1260 },
    cierres: [{ desde: 840, hasta: 1020 }],
    franjaVacia: true,
    minPersonas: { activa: false, desde: 540, hasta: 780, valor: 2 },
    maxHorasDia: { activa: false, valor: 10 },
    maxHorasSemana: { activa: false, valor: 40 },
    diaLibre: false,
    descansoSeguido: false,
  },
  ajustes: { recargoDomingoPct: 0, recargoFestivoPct: 0, festivos: [] },
  fichajes: [],
  fichaje: { geocerca: { activa: false, latitud: null, longitud: null, radioM: 150 }, red: { activa: false, ips: [] }, sinVerificar: 'revisar', cierreAutomaticoHoras: 10 },
});

describe('abiertoEn', () => {
  it('excluye el cierre de mediodía', () => {
    const s = base();
    expect(abiertoEn(s, 600)).toBe(true);
    expect(abiertoEn(s, 840)).toBe(false);
    expect(abiertoEn(s, 1020)).toBe(true);
  });
});

describe('fechasPagadasEmpleada', () => {
  it('solo cuenta a la empleada de la línea', () => {
    const pagos = [{
      id: '1', inicio: '2026-10-01', fin: '2026-10-15', etiqueta: 'Ana',
      pagadoEn: '2026-10-15T12:00:00Z', totalCent: 100,
      lineas: [{ empleadaId: 'e1', minutos: 60, importeCent: 100 }],
    }];
    expect(fechasPagadasEmpleada(pagos, 'e1').has('2026-10-10')).toBe(true);
    expect(fechasPagadasEmpleada(pagos, 'e2').has('2026-10-10')).toBe(false);
    expect(inicioSinPagar(pagos, 'e1', '2026-10-01')).toBe('2026-10-16');
    expect(inicioSinPagar(pagos, 'e2', '2026-10-01')).toBe('2026-10-01');
  });
});
