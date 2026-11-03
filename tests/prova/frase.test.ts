import { describe, expect, it } from 'vitest';
import { fraseTagliata, paroleCheStanno } from '../../src/prova/comune/frase';

describe('fraseTagliata', () => {
  const testo = "Nell'angolo romantico è arrivato il copriletto, morbido e caldo.";

  it('tiene le prime parole e aggiunge i puntini', () => {
    expect(fraseTagliata(testo, 3)).toBe("Nell'angolo romantico è…");
  });

  it('toglie la punteggiatura attaccata all’ultima parola tenuta', () => {
    expect(fraseTagliata(testo, 6)).toBe("Nell'angolo romantico è arrivato il copriletto…");
  });

  it('con zero parole restano solo i puntini', () => {
    expect(fraseTagliata(testo, 0)).toBe('…');
  });

  it('conta le parole a ogni spazio, anche doppio o a capo', () => {
    expect(fraseTagliata('  uno   due\ntre  ', 2)).toBe('uno due…');
  });
});

describe('paroleCheStanno', () => {
  it('trova la più grande quantità che sta', () => {
    expect(paroleCheStanno(10, (n) => n <= 7)).toBe(7);
  });

  it('dà 0 se non sta nemmeno una parola, e il totale se stanno tutte', () => {
    expect(paroleCheStanno(10, () => false)).toBe(0);
    expect(paroleCheStanno(10, () => true)).toBe(10);
  });

  it('prova poche volte: una ricerca a metà, non parola per parola', () => {
    const provati: number[] = [];
    paroleCheStanno(64, (n) => {
      provati.push(n);
      return n <= 20;
    });
    expect(provati.length).toBeLessThanOrEqual(7);
  });

  it('con zero parole non prova nulla', () => {
    const provati: number[] = [];
    expect(paroleCheStanno(0, (n) => (provati.push(n), true))).toBe(0);
    expect(provati).toEqual([]);
  });
});
