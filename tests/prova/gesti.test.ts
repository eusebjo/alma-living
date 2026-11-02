import { describe, expect, it } from 'vitest';
import {
  azioneDelTocco,
  PRESSIONE_LUNGA_MS,
  SOGLIA_TRASCINAMENTO_PX,
  versoTrascinamento,
} from '../../src/prova/comune/gesti';

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

describe('azioneDelTocco', () => {
  it.each([
    [10, 300, 120, 'prec'],
    [99, 300, 120, 'prec'],
    [100, 300, 120, 'pausa'],
    [199, 300, 120, 'pausa'],
    [200, 300, 120, 'succ'],
    [299, 300, 120, 'succ'],
    [150, 300, 300, 'pausa'],
    [150, 300, 301, null],
    [10, 300, 900, null],
    [5, 0, 50, null],
  ])('x %i su %i px, %i ms → %s', (x, larghezza, durata, attesa) => {
    expect(azioneDelTocco(x, larghezza, durata)).toBe(attesa);
  });

  it('una pressione è lunga oltre 300 ms', () => {
    expect(PRESSIONE_LUNGA_MS).toBe(300);
  });

  it('senza una durata misurata (NaN o infinita) non è un tocco', () => {
    expect(azioneDelTocco(10, 300, Number.NaN)).toBeNull();
    expect(azioneDelTocco(10, 300, Number.POSITIVE_INFINITY)).toBeNull();
  });

  it('una zona senza larghezza valida (negativa, NaN) non dà azioni', () => {
    expect(azioneDelTocco(10, -300, 50)).toBeNull();
    expect(azioneDelTocco(10, Number.NaN, 50)).toBeNull();
  });
});
