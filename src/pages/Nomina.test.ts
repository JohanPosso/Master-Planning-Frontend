import { describe, expect, it } from 'vitest';
import { endOfMonth, parseISO, startOfMonth } from 'date-fns';
import type { State } from '../lib/types';
import { avisosSemana, cobertura, fechasPagadasEmpleada, inicioSinPagar } from '../lib/rules';
import { calcularPeriodo } from './Nomina';

const emp = (id = 'e1', nombre = 'Ana') => ({
  id, nombre, rol: 'Empleada' as const, color: 'azul' as const, tarifaCent: 1000,
  diasDescanso: [], descansoSeguido: false, excluirNomina: false, activa: true,
});

function state(parcial: Partial<State> = {}): State {
  return {
    version: 1,
    empleadas: [emp()],
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
    ...parcial,
  };
}

describe('calcularPeriodo · pago por empleada', () => {
  it('al pagar solo a una, la otra sigue pendiente', () => {
    const s = state({
      empleadas: [emp('e1', 'Ana'), emp('e2', 'Silvia')],
      registros: [
        { id: 'r1', empleadaId: 'e1', fecha: '2026-10-20', tramos: [{ inicio: 480, fin: 780 }], estado: 'confirmado' },
        { id: 'r2', empleadaId: 'e2', fecha: '2026-10-20', tramos: [{ inicio: 480, fin: 780 }], estado: 'confirmado' },
      ],
      pagos: [{
        id: 'p1', inicio: '2026-10-16', fin: '2026-10-22', etiqueta: 'Ana · hasta 22 oct',
        pagadoEn: '2026-10-22T12:00:00Z', totalCent: 5000,
        lineas: [{ empleadaId: 'e1', minutos: 300, importeCent: 5000 }],
      }],
    });
    const mes = startOfMonth(parseISO('2026-10-01'));
    const pendiente = calcularPeriodo(s, mes, endOfMonth(mes), true, '2026-10-22');
    const ana = pendiente.lineas.find(l => l.e.id === 'e1')!;
    const silvia = pendiente.lineas.find(l => l.e.id === 'e2')!;
    expect(ana.min).toBe(0);
    expect(silvia.min).toBe(300);
    expect(pendiente.total).toBe(5000);
    expect(inicioSinPagar(s.pagos, 'e1', '2026-10-01')).toBe('2026-10-23');
    expect(inicioSinPagar(s.pagos, 'e2', '2026-10-01')).toBe('2026-10-01');
    expect(fechasPagadasEmpleada(s.pagos, 'e1').has('2026-10-20')).toBe(true);
    expect(fechasPagadasEmpleada(s.pagos, 'e2').has('2026-10-20')).toBe(false);
  });
});

describe('cobertura · cierre mediodía', () => {
  it('no exige nadie entre 14:00 y 17:00', () => {
    const s = state();
    const cov = cobertura(s, '2026-10-22');
    expect(cov.find(x => x.t === 840)!.req).toBe(0);
    expect(cov.find(x => x.t === 900)!.req).toBe(0);
    expect(cov.find(x => x.t === 1020)!.req).toBe(1);
  });

  it('no genera aviso 14:00–17:00', () => {
    const av = avisosSemana(state(), parseISO('2026-10-19'));
    const jueves = av.filter(a => a.fecha === '2026-10-22' && a.detalle === 'Franja descubierta.');
    expect(jueves.some(a => a.titulo.includes('14:00') && a.titulo.includes('17:00'))).toBe(false);
  });
});
