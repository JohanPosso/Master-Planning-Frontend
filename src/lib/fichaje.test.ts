import { describe, expect, it } from 'vitest';
import type { Fichaje } from './types';
import { agruparFichajes, estadoDia, minutoEn, minutosEnVivo } from './fichaje';

let n = 0;
const F = (tipo: Fichaje['tipo'], minuto: number, empleadaId = 'a', fecha = '2026-10-07'): Fichaje =>
  ({ id: String(n), empleadaId, fecha, minuto, tipo, marca: new Date(Date.UTC(2026, 9, 7, 0, 0, n++)).toISOString() });

describe('estadoDia', () => {
  it('empareja turno partido y detecta la entrada abierta', () => {
    expect(estadoDia([F('entrada', 540), F('salida', 720), F('entrada', 1080)])).toEqual({ pares: [{ inicio: 540, fin: 720 }], abierta: 1080, dentro: true, minutos: 180 });
  });
  it('ignora salidas huérfanas y pares de 0 minutos', () => {
    expect(estadoDia([F('salida', 400), F('entrada', 480), F('salida', 480)]).pares).toEqual([]);
  });
});

describe('utilidades', () => {
  it('cuenta en vivo el tramo abierto', () => {
    expect(minutosEnVivo(120, 600, 645)).toBe(165);
    expect(minutosEnVivo(120, null, 645)).toBe(120);
  });
  it('agrupa por empleada y día', () => {
    const g = agruparFichajes([F('entrada', 1), F('salida', 2), F('entrada', 3, 'b')]);
    expect(g.get('a|2026-10-07')).toHaveLength(2);
    expect(g.get('b|2026-10-07')).toHaveLength(1);
  });
  it('minuto del día en Madrid', () => {
    expect(minutoEn('Europe/Madrid', new Date('2026-10-07T06:02:00Z'))).toBe(482);
  });
});
