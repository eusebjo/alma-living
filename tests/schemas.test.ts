import { describe, expect, it } from 'vitest';
import { z } from 'astro/zod';
import { GIORNI, LIMITI } from '../src/content/limits';
import { makePaginaSchema, negozioSchema } from '../src/content/schemas';

const negozioValido = {
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
  orari: [],
};

describe('negozioSchema', () => {
  it('accetta un esempio valido', () => {
    expect(negozioSchema.safeParse(negozioValido).success).toBe(true);
  });

  it("l'email è facoltativa ma, se presente, deve essere valida", () => {
    expect(
      negozioSchema.safeParse({ ...negozioValido, email: 'info@example.com' })
        .success,
    ).toBe(true);
    expect(
      negozioSchema.safeParse({ ...negozioValido, email: 'non-una-email' })
        .success,
    ).toBe(false);
  });

  it('orari ha come valore predefinito un elenco vuoto', () => {
    const { orari: _orari, ...senzaOrari } = negozioValido;
    const risultato = negozioSchema.parse(senzaOrari);
    expect(risultato.orari).toEqual([]);
  });

  it('rifiuta un CAP di 4 cifre', () => {
    const risultato = negozioSchema.safeParse({
      ...negozioValido,
      indirizzo: { ...negozioValido.indirizzo, cap: '5712' },
    });
    expect(risultato.success).toBe(false);
  });

  it('rifiuta una sigla di provincia non in maiuscolo', () => {
    const risultato = negozioSchema.safeParse({
      ...negozioValido,
      indirizzo: { ...negozioValido.indirizzo, provincia: 'Li' },
    });
    expect(risultato.success).toBe(false);
  });

  it('rifiuta un telefono non numerico', () => {
    expect(
      negozioSchema.safeParse({ ...negozioValido, telefono: 'abc' }).success,
    ).toBe(false);
  });

  it('accetta un prefisso internazionale ma solo all\'inizio del telefono', () => {
    expect(
      negozioSchema.safeParse({ ...negozioValido, telefono: '+39 334 520 5451' })
        .success,
    ).toBe(true);
    expect(
      negozioSchema.safeParse({ ...negozioValido, telefono: '334 +39 520 5451' })
        .success,
    ).toBe(false);
  });

  it('rifiuta un telefono con meno di 9 o più di 15 cifre', () => {
    expect(
      negozioSchema.safeParse({ ...negozioValido, telefono: '12345678' })
        .success,
    ).toBe(false);
    expect(
      negozioSchema.safeParse({ ...negozioValido, telefono: '1234567890123456' })
        .success,
    ).toBe(false);
  });

  it('rifiuta un nome oltre il limite', () => {
    const nome = 'a'.repeat(LIMITI.negozio.nome.max + 1);
    expect(negozioSchema.safeParse({ ...negozioValido, nome }).success).toBe(
      false,
    );
  });

  it('rifiuta una descrizione fuori dai limiti', () => {
    const corta = 'a'.repeat(LIMITI.negozio.descrizione.min - 1);
    const lunga = 'a'.repeat(LIMITI.negozio.descrizione.max + 1);
    expect(
      negozioSchema.safeParse({ ...negozioValido, descrizione: corta }).success,
    ).toBe(false);
    expect(
      negozioSchema.safeParse({ ...negozioValido, descrizione: lunga }).success,
    ).toBe(false);
  });

  describe('orari', () => {
    const conOrario = (orario: Record<string, string>) => ({
      ...negozioValido,
      orari: [orario],
    });

    it('accetta un orario valido', () => {
      const risultato = negozioSchema.safeParse(
        conOrario({ giorno: 'lunedi', apertura: '09:30', chiusura: '13:00' }),
      );
      expect(risultato.success).toBe(true);
    });

    it('accetta tutti i giorni previsti', () => {
      for (const giorno of GIORNI) {
        const risultato = negozioSchema.safeParse(
          conOrario({ giorno, apertura: '09:30', chiusura: '13:00' }),
        );
        expect(risultato.success, giorno).toBe(true);
      }
    });

    it('rifiuta un giorno sconosciuto', () => {
      const risultato = negozioSchema.safeParse(
        conOrario({ giorno: 'lunedì', apertura: '09:30', chiusura: '13:00' }),
      );
      expect(risultato.success).toBe(false);
    });

    it('rifiuta una chiusura precedente all\'apertura', () => {
      const risultato = negozioSchema.safeParse(
        conOrario({ giorno: 'lunedi', apertura: '13:00', chiusura: '09:30' }),
      );
      expect(risultato.success).toBe(false);
    });

    it('rifiuta una chiusura uguale all\'apertura', () => {
      const risultato = negozioSchema.safeParse(
        conOrario({ giorno: 'lunedi', apertura: '09:30', chiusura: '09:30' }),
      );
      expect(risultato.success).toBe(false);
    });

    it('confronta gli orari come tempo, non come testo', () => {
      const risultato = negozioSchema.safeParse(
        conOrario({ giorno: 'lunedi', apertura: '09:05', chiusura: '10:00' }),
      );
      expect(risultato.success).toBe(true);
    });

    it.each(['9:30', '24:00', '12:60', '12.30', 'mezzogiorno'])(
      'rifiuta un orario non nel formato HH:MM a 24 ore: %s',
      (apertura) => {
        const risultato = negozioSchema.safeParse(
          conOrario({ giorno: 'lunedi', apertura, chiusura: '23:59' }),
        );
        expect(risultato.success).toBe(false);
      },
    );
  });
});

describe('makePaginaSchema', () => {
  const schema = makePaginaSchema(() => z.string());
  const paginaValida = {
    titolo: 'Alma Living',
    descrizione:
      'Alma Living, negozio di biancheria per la casa in Via Ricasoli a Livorno.',
    immagine: './immagini/home.webp',
    immagine_alt: 'Immagine segnaposto',
  };

  it('accetta un esempio valido', () => {
    expect(schema.safeParse(paginaValida).success).toBe(true);
  });

  it('accetta un titolo di 70 caratteri e rifiuta uno di 71', () => {
    expect(
      schema.safeParse({ ...paginaValida, titolo: 'a'.repeat(70) }).success,
    ).toBe(true);
    expect(
      schema.safeParse({ ...paginaValida, titolo: 'a'.repeat(71) }).success,
    ).toBe(false);
  });

  it('accetta una descrizione di 50 caratteri e rifiuta una di 49', () => {
    expect(
      schema.safeParse({ ...paginaValida, descrizione: 'a'.repeat(50) }).success,
    ).toBe(true);
    expect(
      schema.safeParse({ ...paginaValida, descrizione: 'a'.repeat(49) }).success,
    ).toBe(false);
  });

  it('rifiuta una descrizione oltre il limite', () => {
    const descrizione = 'a'.repeat(LIMITI.pagina.descrizione.max + 1);
    expect(schema.safeParse({ ...paginaValida, descrizione }).success).toBe(
      false,
    );
  });

  it("rifiuta l'assenza di immagine_alt", () => {
    const { immagine_alt: _alt, ...senzaAlt } = paginaValida;
    expect(schema.safeParse(senzaAlt).success).toBe(false);
  });

  it("rifiuta un immagine_alt troppo corto o troppo lungo", () => {
    expect(
      schema.safeParse({ ...paginaValida, immagine_alt: 'abcd' }).success,
    ).toBe(false);
    expect(
      schema.safeParse({
        ...paginaValida,
        immagine_alt: 'a'.repeat(LIMITI.pagina.immagine_alt.max + 1),
      }).success,
    ).toBe(false);
  });

  it("usa il tipo di immagine passato dal chiamante", () => {
    const conImmagineNumerica = makePaginaSchema(() => z.number());
    expect(
      conImmagineNumerica.safeParse({ ...paginaValida, immagine: 1 }).success,
    ).toBe(true);
    expect(conImmagineNumerica.safeParse(paginaValida).success).toBe(false);
  });
});
