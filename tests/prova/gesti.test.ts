import { describe, expect, it } from 'vitest';
import { SOGLIA_TRASCINAMENTO_PX, versoTrascinamento } from '../../src/prova/comune/gesti';

describe('versoTrascinamento', () => {
  it.each([
    // dito verso sinistra: la foto dopo; verso destra: quella prima
    [-40, 0, 1],
    [-120, 30, 1],
    [-60, 60, 1],
    [40, 0, -1],
    [90, -20, -1],
    // sotto la soglia, fermo, o più verticale che orizzontale: niente
    [-39, 0, 0],
    [39, 0, 0],
    [0, 0, 0],
    [-60, 61, 0],
    [50, -200, 0],
  ])('dx %i, dy %i → %i', (dx, dy, atteso) => {
    expect(versoTrascinamento(dx, dy)).toBe(atteso);
  });

  it('la soglia è di 40 px', () => {
    expect(SOGLIA_TRASCINAMENTO_PX).toBe(40);
  });
});
