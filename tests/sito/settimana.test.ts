import { describe, expect, it } from 'vitest';
import { ORARI_PROVA, type Fascia } from '../../src/sito/comune/orari';
import { orariInBreve, settimana } from '../../src/sito/componenti/settimana';

describe('settimana (Salvia social)', () => {
  it('riassume gli orari della prova in giorni consecutivi con le stesse ore', () => {
    expect(settimana(ORARI_PROVA)).toEqual([
      { giorni: 'Lunedì–sabato', ore: '9:30–13:00 e 16:00–19:30', chiuso: false },
      { giorni: 'Domenica', ore: 'chiuso', chiuso: true },
    ]);
  });

  it('separa i giorni con orari diversi, anche non consecutivi', () => {
    const fasce: Fascia[] = [
      { giorno: 'lunedi', apertura: '09:00', chiusura: '12:30' },
      { giorno: 'martedi', apertura: '09:30', chiusura: '13:00' },
      { giorno: 'mercoledi', apertura: '09:30', chiusura: '13:00' },
      { giorno: 'venerdi', apertura: '09:30', chiusura: '13:00' },
    ];
    expect(settimana(fasce).map((g) => `${g.giorni} ${g.ore}`)).toEqual([
      'Lunedì 9:00–12:30',
      'Martedì–mercoledì 9:30–13:00',
      'Giovedì chiuso',
      'Venerdì 9:30–13:00',
      'Sabato–domenica chiuso',
    ]);
  });

  it('in una riga sola mette solo i giorni aperti', () => {
    expect(orariInBreve(ORARI_PROVA)).toBe('Lunedì–sabato 9:30–13:00 e 16:00–19:30');
    expect(orariInBreve([])).toBe('Chiuso');
  });
});
