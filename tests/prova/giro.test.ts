import { describe, expect, it } from 'vitest';
import { fotoDelGiro, passoDelGiro } from '../../src/prova/comune/giro';

describe('passoDelGiro', () => {
  it('fermo non conta il tempo', () => {
    expect(passoDelGiro(1200, 500, false, 5000)).toEqual({ trascorso: 1200, avanza: false });
  });

  it('in corsa accumula e, raggiunta la durata, avanza e riparte da zero', () => {
    expect(passoDelGiro(4000, 900, true, 5000)).toEqual({ trascorso: 4900, avanza: false });
    expect(passoDelGiro(4900, 100, true, 5000)).toEqual({ trascorso: 0, avanza: true });
  });

  it('un intervallo enorme fa avanzare di una foto sola', () => {
    expect(passoDelGiro(0, 60_000, true, 5000)).toEqual({ trascorso: 0, avanza: true });
  });

  it('un intervallo negativo non toglie tempo', () => {
    expect(passoDelGiro(300, -50, true, 5000)).toEqual({ trascorso: 300, avanza: false });
  });

  it('un intervallo che non è un numero finito vale 0: né tempo perso, né foto saltate', () => {
    for (const dt of [Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY]) {
      expect(passoDelGiro(300, dt, true, 5000), String(dt)).toEqual({
        trascorso: 300,
        avanza: false,
      });
    }
  });
});

describe('fotoDelGiro', () => {
  const tutte = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
  const grandi = [0, 1, 6, 10, 11];

  it('passa alla foto attiva dopo, a giro', () => {
    expect(fotoDelGiro(tutte, 11, 1)).toBe(0);
    expect(fotoDelGiro(grandi, 1, 1)).toBe(6);
    expect(fotoDelGiro(grandi, 11, 1)).toBe(0);
  });

  it('e a quella prima', () => {
    expect(fotoDelGiro(grandi, 0, -1)).toBe(11);
    expect(fotoDelGiro(grandi, 6, -1)).toBe(1);
  });

  it('da una foto non attiva va alla prima attiva dopo, o all’ultima prima', () => {
    expect(fotoDelGiro(grandi, 3, 1)).toBe(6);
    expect(fotoDelGiro(grandi, 3, -1)).toBe(1);
  });

  it('senza foto attive resta dov’è', () => {
    expect(fotoDelGiro([], 4, 1)).toBe(4);
  });
});
