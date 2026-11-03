import { describe, expect, it } from 'vitest';
import {
  ORARI_PROVA,
  righeOrari,
  statoNegozio,
  testoStato,
} from '../../src/sito/comune/orari';

describe('statoNegozio e testoStato', () => {
  // Date in UTC, attese sull'ora di Roma (CEST fino al 25 ottobre 2026, poi CET).
  it.each([
    ['2026-10-28T09:00:00Z', 'Aperto ora, chiude alle 13:00'], // mercoledì 10:00 CET
    ['2026-10-28T12:30:00Z', 'Chiuso, apre alle 16:00'], // mercoledì 13:30
    ['2026-10-28T19:00:00Z', 'Chiuso, apre domani alle 9:30'], // mercoledì 20:00
    ['2026-10-31T19:00:00Z', 'Chiuso, apre lunedì alle 9:30'], // sabato 20:00
    ['2026-11-01T10:00:00Z', 'Chiuso, apre domani alle 9:30'], // domenica 11:00
    ['2026-10-24T08:00:00Z', 'Aperto ora, chiude alle 13:00'], // sabato 10:00 CEST
    ['2026-10-26T08:00:00Z', 'Chiuso, apre alle 9:30'], // lunedì 9:00 CET
  ])('%s → %s', (iso, atteso) => {
    expect(testoStato(statoNegozio(ORARI_PROVA, new Date(iso)))).toBe(atteso);
  });

  it.each([
    // Il giorno cambia a Roma prima che in UTC: mercoledì 23:30 UTC è giovedì 00:30 CET.
    ['2026-10-28T23:30:00Z', 'Chiuso, apre alle 9:30'],
    // Mezzanotte esatta a Roma: l'ora 24 non deve comparire.
    ['2026-10-28T23:00:00Z', 'Chiuso, apre alle 9:30'],
    // Sabato 24 ottobre 00:30 CEST (22:30 UTC di venerdì).
    ['2026-10-23T22:30:00Z', 'Chiuso, apre alle 9:30'],
    // Notte del cambio d'ora: lunedì 26 ottobre 00:30 CET (23:30 UTC di domenica).
    ['2026-10-25T23:30:00Z', 'Chiuso, apre alle 9:30'],
  ])('mezzanotte a Roma, %s → %s', (iso, atteso) => {
    expect(testoStato(statoNegozio(ORARI_PROVA, new Date(iso)))).toBe(atteso);
  });

  it("all'ora esatta di apertura è aperto, a quella di chiusura è chiuso", () => {
    // mercoledì 9:30 CET = 8:30 UTC; 13:00 CET = 12:00 UTC.
    expect(statoNegozio(ORARI_PROVA, new Date('2026-10-28T08:30:00Z'))).toEqual({
      aperto: true,
      chiudeAlle: '13:00',
    });
    expect(testoStato(statoNegozio(ORARI_PROVA, new Date('2026-10-28T12:00:00Z')))).toBe(
      'Chiuso, apre alle 16:00',
    );
  });

  it('di pomeriggio chiude alle 19:30', () => {
    // mercoledì 17:00 CET = 16:00 UTC
    expect(testoStato(statoNegozio(ORARI_PROVA, new Date('2026-10-28T16:00:00Z')))).toBe(
      'Aperto ora, chiude alle 19:30',
    );
  });

  it('descrive la prossima apertura come dato', () => {
    // sabato 20:00 CET → lunedì
    expect(statoNegozio(ORARI_PROVA, new Date('2026-10-31T19:00:00Z'))).toEqual({
      aperto: false,
      apre: { giorno: 'lunedi', ora: '09:30', quando: 'giorno' },
    });
    expect(statoNegozio(ORARI_PROVA, new Date('2026-10-28T12:30:00Z'))).toEqual({
      aperto: false,
      apre: { giorno: 'mercoledi', ora: '16:00', quando: 'oggi' },
    });
    expect(statoNegozio(ORARI_PROVA, new Date('2026-11-01T10:00:00Z'))).toEqual({
      aperto: false,
      apre: { giorno: 'lunedi', ora: '09:30', quando: 'domani' },
    });
  });

  it('fasce fuori ordine: usa comunque la prima apertura utile', () => {
    const fasce = [
      { giorno: 'mercoledi', apertura: '16:00', chiusura: '19:30' },
      { giorno: 'mercoledi', apertura: '09:30', chiusura: '13:00' },
    ] as const;
    // mercoledì 10:00 CET
    expect(statoNegozio([...fasce], new Date('2026-10-28T09:00:00Z'))).toEqual({
      aperto: true,
      chiudeAlle: '13:00',
    });
    // mercoledì 14:00 CET
    expect(testoStato(statoNegozio([...fasce], new Date('2026-10-28T13:00:00Z')))).toBe(
      'Chiuso, apre alle 16:00',
    );
  });

  it('fasce consecutive: chiude alla fine dell’ultima', () => {
    const fasce = [
      { giorno: 'mercoledi', apertura: '09:30', chiusura: '13:00' },
      { giorno: 'mercoledi', apertura: '13:00', chiusura: '19:30' },
    ] as const;
    // mercoledì 10:00 CET
    expect(statoNegozio([...fasce], new Date('2026-10-28T09:00:00Z'))).toEqual({
      aperto: true,
      chiudeAlle: '19:30',
    });
  });

  it('un solo giorno di apertura: dopo la chiusura la prossima è tra una settimana', () => {
    const fasce = [{ giorno: 'mercoledi', apertura: '09:30', chiusura: '13:00' }] as const;
    // mercoledì 14:00 CET
    expect(testoStato(statoNegozio([...fasce], new Date('2026-10-28T13:00:00Z')))).toBe(
      'Chiuso, apre mercoledì alle 9:30',
    );
  });

  it('nessuna fascia: chiuso senza prossima apertura', () => {
    expect(statoNegozio([], new Date('2026-10-28T09:00:00Z'))).toEqual({
      aperto: false,
      apre: null,
    });
    expect(testoStato({ aperto: false, apre: null })).toBe('Chiuso');
  });
});

describe('righeOrari', () => {
  it('domenica chiusa, fasce unite', () => {
    const righe = righeOrari(ORARI_PROVA);
    expect(righe).toHaveLength(7);
    expect(righe[0]).toMatchObject({ etichetta: 'Lunedì', testo: '9:30–13:00, 16:00–19:30' });
    expect(righe[6]).toMatchObject({ etichetta: 'Domenica', testo: 'Chiuso' });
  });

  it('sette giorni da lunedì a domenica, con le etichette italiane', () => {
    expect(righeOrari(ORARI_PROVA).map(({ giorno, etichetta }) => [giorno, etichetta])).toEqual([
      ['lunedi', 'Lunedì'],
      ['martedi', 'Martedì'],
      ['mercoledi', 'Mercoledì'],
      ['giovedi', 'Giovedì'],
      ['venerdi', 'Venerdì'],
      ['sabato', 'Sabato'],
      ['domenica', 'Domenica'],
    ]);
  });

  it('il sabato ha le stesse fasce degli altri giorni di apertura', () => {
    expect(righeOrari(ORARI_PROVA)[5]?.testo).toBe('9:30–13:00, 16:00–19:30');
  });
});

describe('ORARI_PROVA', () => {
  it('lunedì-sabato 9:30-13:00 e 16:00-19:30, niente domenica', () => {
    expect(ORARI_PROVA).toHaveLength(12);
    expect(ORARI_PROVA.some((fascia) => fascia.giorno === 'domenica')).toBe(false);
    expect(ORARI_PROVA.filter((fascia) => fascia.giorno === 'sabato')).toEqual([
      { giorno: 'sabato', apertura: '09:30', chiusura: '13:00' },
      { giorno: 'sabato', apertura: '16:00', chiusura: '19:30' },
    ]);
  });
});
