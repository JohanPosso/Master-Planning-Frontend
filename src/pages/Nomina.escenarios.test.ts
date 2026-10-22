import { describe, expect, it } from 'vitest';
import { endOfMonth, parseISO, startOfMonth } from 'date-fns';
import type { State } from '../lib/types';
import { fechasPagadasEmpleada, inicioSinPagar } from '../lib/rules';
import { calcularPeriodo } from './Nomina';

const emp = (id: string, nombre: string) => ({
  id, nombre, rol: 'Empleada' as const, color: 'azul' as const, tarifaCent: 1000,
  diasDescanso: [], descansoSeguido: false, excluirNomina: false, activa: true,
});

function state(parcial: Partial<State> = {}): State {
  return {
    version: 1,
    empleadas: [emp('ana', 'Ana'), emp('silvia', 'Silvia')],
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

const reg = (id: string, empleadaId: string, fecha: string, min = 120) => ({
  id, empleadaId, fecha, tramos: [{ inicio: 480, fin: 480 + min }], estado: 'confirmado' as const,
});

describe('Flujo: pagar → nuevos días → vuelve a deber', () => {
  it('tras pagar 2 h el día 6, el día 8 aparece como pendiente solo para Ana', () => {
    let s = state({
      registros: [
        reg('r1', 'ana', '2026-10-06'),
        reg('r2', 'silvia', '2026-10-06'),
      ],
    });

    const mes = startOfMonth(parseISO('2026-10-01'));
    const antes = calcularPeriodo(s, mes, endOfMonth(mes), true, '2026-10-22');
    expect(antes.lineas.find(l => l.e.id === 'ana')!.min).toBe(120);
    expect(antes.lineas.find(l => l.e.id === 'silvia')!.min).toBe(120);

    // Pago individual a Ana el día 6
    s = {
      ...s,
      pagos: [{
        id: 'p1', inicio: '2026-10-06', fin: '2026-10-06', etiqueta: 'Ana · adelanto',
        pagadoEn: '2026-10-06T18:00:00Z', totalCent: 2000,
        lineas: [{ empleadaId: 'ana', minutos: 120, importeCent: 2000 }],
      }],
    };

    const trasPago = calcularPeriodo(s, mes, endOfMonth(mes), true, '2026-10-06');
    expect(trasPago.lineas.find(l => l.e.id === 'ana')!.min).toBe(0);
    expect(trasPago.lineas.find(l => l.e.id === 'silvia')!.min).toBe(120);

    // «Avanzar la semana»: Ana trabaja el 8 y el 9
    s = {
      ...s,
      registros: [
        ...s.registros,
        reg('r3', 'ana', '2026-10-08'),
        reg('r4', 'ana', '2026-10-09'),
      ],
    };

    const conNuevos = calcularPeriodo(s, mes, endOfMonth(mes), true, '2026-10-09');
    expect(conNuevos.lineas.find(l => l.e.id === 'ana')!.min).toBe(240);
    expect(conNuevos.lineas.find(l => l.e.id === 'silvia')!.min).toBe(120);
    expect(inicioSinPagar(s.pagos, 'ana', '2026-10-01')).toBe('2026-10-07');
    expect(fechasPagadasEmpleada(s.pagos, 'ana').has('2026-10-06')).toBe(true);
    expect(fechasPagadasEmpleada(s.pagos, 'ana').has('2026-10-08')).toBe(false);

    // Segundo pago Ana 7–9
    s = {
      ...s,
      pagos: [
        ...s.pagos,
        {
          id: 'p2', inicio: '2026-10-07', fin: '2026-10-09', etiqueta: 'Ana · hasta 9',
          pagadoEn: '2026-10-09T18:00:00Z', totalCent: 4000,
          lineas: [{ empleadaId: 'ana', minutos: 240, importeCent: 4000 }],
        },
      ],
    };

    const alDiaAna = calcularPeriodo(s, mes, endOfMonth(mes), true, '2026-10-09');
    expect(alDiaAna.lineas.find(l => l.e.id === 'ana')!.min).toBe(0);
    expect(alDiaAna.lineas.find(l => l.e.id === 'silvia')!.min).toBe(120);
  });

  it('borrar el pago (simulado) restaura el pendiente de esa empleada', () => {
    const conPago = state({
      registros: [reg('r1', 'ana', '2026-10-12', 300)],
      pagos: [{
        id: 'p1', inicio: '2026-10-12', fin: '2026-10-12', etiqueta: 'Ana',
        pagadoEn: '2026-10-12T12:00:00Z', totalCent: 5000,
        lineas: [{ empleadaId: 'ana', minutos: 300, importeCent: 5000 }],
      }],
    });
    const mes = startOfMonth(parseISO('2026-10-01'));
    expect(calcularPeriodo(conPago, mes, endOfMonth(mes), true, '2026-10-12').lineas.find(l => l.e.id === 'ana')!.min).toBe(0);

    const sinPago = { ...conPago, pagos: [] };
    expect(calcularPeriodo(sinPago, mes, endOfMonth(mes), true, '2026-10-12').lineas.find(l => l.e.id === 'ana')!.min).toBe(300);
  });
});
