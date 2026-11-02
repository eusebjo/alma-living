import { describe, expect, it } from 'vitest';
import {
  azioneDelTocco,
  gestoDellaStoria,
  PRESSIONE_LUNGA_MS,
  SOGLIA_CHIUDI_PX,
  SOGLIA_INVITO_PX,
  SOGLIA_MOVIMENTO_PX,
} from '../../src/prova/comune/gesti';

describe('azioneDelTocco', () => {
  it('il 25% sinistro torna indietro, il resto va avanti (niente pausa al centro)', () => {
    expect(azioneDelTocco(0, 400, 50)).toBe('prec');
    expect(azioneDelTocco(99, 400, 50)).toBe('prec');
    expect(azioneDelTocco(100, 400, 50)).toBe('succ');
    expect(azioneDelTocco(200, 400, 50)).toBe('succ');
    expect(azioneDelTocco(399, 400, 50)).toBe('succ');
  });

  it.each([
    [10, 300, 120, 'prec'],
    [74, 300, 120, 'prec'],
    [75, 300, 120, 'succ'],
    [150, 300, 300, 'succ'],
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

describe('gestoDellaStoria', () => {
  it('in giù da 80 px chiude, in su da 60 px apre la scheda, solo se più verticale che orizzontale', () => {
    expect(gestoDellaStoria(0, 80)).toBe('chiudi');
    expect(gestoDellaStoria(0, 79)).toBeNull();
    expect(gestoDellaStoria(0, -60)).toBe('invito');
    expect(gestoDellaStoria(0, -59)).toBeNull();
    expect(gestoDellaStoria(90, 85)).toBeNull();
    expect(gestoDellaStoria(Number.NaN, 200)).toBeNull();
    expect([SOGLIA_CHIUDI_PX, SOGLIA_INVITO_PX, SOGLIA_MOVIMENTO_PX]).toEqual([80, 60, 10]);
  });
});
