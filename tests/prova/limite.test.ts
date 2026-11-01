import { describe, expect, it } from 'vitest';
import { limiteAttivo, quanteMostrare, testoMostraTutti } from '../../src/prova/comune/limite';

const REGOLE = [
  { media: '(max-width: 767px)', limite: 4 },
  { media: '(max-width: 1023px)', limite: 6 },
];

describe('limiteAttivo', () => {
  it('vince la prima regola che corrisponde', () => {
    expect(limiteAttivo(REGOLE, () => true)).toBe(4);
    expect(limiteAttivo(REGOLE, (m) => m === '(max-width: 1023px)')).toBe(6);
  });
  it('nessuna regola che corrisponde: nessun limite', () => {
    expect(limiteAttivo(REGOLE, () => false)).toBeNull();
    expect(limiteAttivo([], () => true)).toBeNull();
  });
});

describe('quanteMostrare', () => {
  it.each([
    [8, 4, false, 4],
    [8, 6, false, 6],
    [4, 4, false, 4],
    [3, 4, false, 3],
    [0, 4, false, 0],
    [8, null, false, 8],
    [8, 4, true, 8],
  ])('%i voci, limite %s, tutte %s → %i', (passano, limite, tutte, attese) => {
    expect(quanteMostrare(passano, limite, tutte)).toBe(attese);
  });
});

describe('testoMostraTutti', () => {
  it.each([
    [8, 'Mostra tutti gli 8'],
    [11, 'Mostra tutti gli 11'],
    [80, 'Mostra tutti gli 80'],
    [5, 'Mostra tutti i 5'],
    [7, 'Mostra tutti i 7'],
    [18, 'Mostra tutti i 18'],
  ])('%i → %s', (n, atteso) => {
    expect(testoMostraTutti(n)).toBe(atteso);
  });
});
