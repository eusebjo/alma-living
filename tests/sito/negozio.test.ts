import { describe, expect, it } from 'vitest';
import type { Negozio } from '../../src/content/schemas';
import { datiNegozio } from '../../src/sito/comune/negozio';
import { ORARI_PROVA } from '../../src/sito/comune/orari';

const negozio: Negozio = {
  nome: 'Alma Living',
  descrizione: 'Negozio di biancheria per la casa nel centro di Livorno.',
  indirizzo: {
    via: 'Via Ricasoli',
    civico: '51-53',
    cap: '57125',
    citta: 'Livorno',
    provincia: 'LI',
  },
  telefono: '334 520 5451',
  orari: [{ giorno: 'lunedi', apertura: '09:00', chiusura: '12:30' }],
};

describe('datiNegozio', () => {
  const dati = datiNegozio(negozio);

  it('prende nome, indirizzo e telefono dal negozio', () => {
    expect(dati.nome).toBe('Alma Living');
    expect(dati.indirizzo).toBe('Via Ricasoli 51-53, 57125 Livorno');
    expect(dati.telefono).toBe('334 520 5451');
  });

  it("dà anche le parti dell'indirizzo e la forma breve, senza CAP", () => {
    expect(dati.via).toBe('Via Ricasoli');
    expect(dati.civico).toBe('51-53');
    expect(dati.cap).toBe('57125');
    expect(dati.citta).toBe('Livorno');
    expect(dati.indirizzoBreve).toBe('Via Ricasoli 51-53, Livorno');
  });

  it("segue l'indirizzo scritto nel pannello", () => {
    const altrove = datiNegozio({
      ...negozio,
      indirizzo: { via: 'Via Grande', civico: '10', cap: '57123', citta: 'Livorno', provincia: 'LI' },
    });
    expect(altrove.indirizzo).toBe('Via Grande 10, 57123 Livorno');
    expect(altrove.indirizzoBreve).toBe('Via Grande 10, Livorno');
    expect(altrove.via).toBe('Via Grande');
  });

  it('i contatti hanno i valori fissati per la prova', () => {
    expect(dati.telefonoHref).toBe('tel:+393345205451');
    expect(dati.whatsapp).toBe('https://wa.me/393345205451');
    expect(dati.instagram).toEqual({
      handle: '@almaliving.viaricasoli',
      url: 'https://www.instagram.com/almaliving.viaricasoli/',
    });
  });

  it('mappe e recensioni sono link, non incorporati', () => {
    const maps =
      'https://www.google.com/maps/search/?api=1&query=Alma%20Living%20Via%20Ricasoli%2051%20Livorno';
    expect(dati.mappeUrl).toBe(maps);
    expect(dati.recensioniUrl).toBe(maps);
  });

  it('stelle Google e frase del marchio di esempio', () => {
    expect(dati.google).toEqual({ media: '5,0', recensioni: 5 });
    expect(dati.frase).toBe(
      'Rendiamo la tua casa ancora più casa. Biancheria, profumi e dettagli che scaldano l’ambiente.',
    );
  });

  it('gli orari sono quelli della prova, non quelli del negozio', () => {
    expect(dati.orari).toBe(ORARI_PROVA);
  });
});
