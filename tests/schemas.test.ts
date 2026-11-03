import { describe, expect, it } from 'vitest';
import { z } from 'astro/zod';
import { CATEGORIE } from '../src/content/categorie';
import { INQUADRATURE, indirizzoFoto, inquadraturaVicina } from '../src/content/foto';
import { GIORNI, LIMITI } from '../src/content/limits';
import {
  fotoSchema,
  negozioSchema,
  postSchema,
  prodottoSchema,
  storiaSchema,
} from '../src/content/schemas';
import { categorie } from '../src/sito/componenti/dati';

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

describe('collection pagine', () => {
  it('non esiste più: niente schema né limiti delle pagine', async () => {
    const schemi = await import('../src/content/schemas');
    expect(schemi).not.toHaveProperty('makePaginaSchema');
    expect(LIMITI).not.toHaveProperty('pagina');
  });
});

// --- Foto, prodotti, post e storie ---

/** Il primo messaggio di errore di `safeParse`, o `undefined` se il valore è valido. */
function errore(schema: z.ZodType, valore: unknown): string | undefined {
  const risultato = schema.safeParse(valore);
  return risultato.success ? undefined : risultato.error.issues[0]?.message;
}

/** Il percorso del primo errore di `safeParse`, o `undefined` se il valore è valido. */
function percorso(schema: z.ZodType, valore: unknown): PropertyKey[] | undefined {
  const risultato = schema.safeParse(valore);
  return risultato.success ? undefined : risultato.error.issues[0]?.path;
}

const URL_OK = indirizzoFoto('cms', 'plaid-verde.webp');
const FOTO = { src: URL_OK, alt: 'Plaid verde con la scritta Abbracciami', inquadratura: 'centro' };
const PRODOTTO = {
  nome: 'Plaid Abbracciami',
  dettaglio: 'Pile ricamato con frange, verde o rosso',
  categorie: ['natale', 'letto'],
  novita: true,
  data: '2026-10-27',
  foto: FOTO,
};
const POST = {
  data: '2026-10-28',
  testo: 'Sono arrivati i cuscini di Natale.',
  foto: [FOTO],
  soggetto: 'sui cuscini di Natale',
};
const FOTO_STORIA = { ...FOTO, frase: 'La parete dei plaid è pronta.', soggetto: 'la parete dei plaid' };
const STORIA = {
  nome: 'Oggi',
  data: '2026-10-28',
  etichetta: 'Oggi',
  invito: 'whatsapp',
  foto: [FOTO_STORIA],
};

describe('CATEGORIE', () => {
  it("sono le sette categorie, nell'ordine dei filtri", () => {
    expect(CATEGORIE.map((c) => c.id)).toEqual([
      'letto',
      'bagno',
      'bimbi',
      'tavola',
      'profumi',
      'natale',
      'mare',
    ]);
    expect(CATEGORIE.find((c) => c.id === 'tavola')?.nome).toBe('Tavola e cucina');
  });

  it('i filtri della pagina (dati.ts) sono le stesse categorie', () => {
    expect(categorie).toBe(CATEGORIE);
  });
});

describe('INQUADRATURE e inquadraturaVicina', () => {
  it("le posizioni sono cinque, dall'alto al basso", () => {
    expect(INQUADRATURE).toEqual({
      alto: '50% 20%',
      'centro-alto': '50% 35%',
      centro: '50% 50%',
      'centro-basso': '50% 65%',
      basso: '50% 80%',
    });
  });

  it('sceglie la posizione con la percentuale verticale più vicina', () => {
    expect(inquadraturaVicina('50% 56%')).toBe('centro');
    expect(inquadraturaVicina('50% 58%')).toBe('centro-basso');
    expect(inquadraturaVicina('40% 68%')).toBe('centro-basso');
    expect(inquadraturaVicina('50% 24%')).toBe('alto');
    expect(inquadraturaVicina('50% 40%')).toBe('centro-alto');
    expect(inquadraturaVicina('50% 78%')).toBe('basso');
  });

  it('ogni posizione è la più vicina a se stessa', () => {
    for (const [nome, posizione] of Object.entries(INQUADRATURE)) {
      expect(inquadraturaVicina(posizione), nome).toBe(nome);
    }
  });

  it('a metà strada tra due posizioni tiene la più vicina al centro', () => {
    expect(inquadraturaVicina('50% 57.5%')).toBe('centro');
    expect(inquadraturaVicina('50% 42.5%')).toBe('centro');
    expect(inquadraturaVicina('50% 27.5%')).toBe('centro-alto');
    expect(inquadraturaVicina('50% 72.5%')).toBe('centro-basso');
  });

  it("fuori dall'intervallo 0-100 vale la posizione estrema", () => {
    expect(inquadraturaVicina('50% -10%')).toBe('alto');
    expect(inquadraturaVicina('50% 130%')).toBe('basso');
  });

  it.each(['', 'center', 'top left', '50%', 'left 40%', '50px 40px', '50% abc'])(
    'senza una percentuale verticale leggibile (%j) è al centro',
    (posizione) => {
      expect(inquadraturaVicina(posizione)).toBe('centro');
    },
  );
});

describe('fotoSchema', () => {
  it('accetta una foto del pannello e una foto fissa del sito', () => {
    expect(fotoSchema.safeParse(FOTO).success).toBe(true);
    expect(
      fotoSchema.safeParse({ ...FOTO, src: indirizzoFoto('prova', 'scaffale.jpg') }).success,
    ).toBe(true);
  });

  it('il testo alternativo è obbligatorio e ha dei limiti', () => {
    expect(errore(fotoSchema, { src: URL_OK, alt: '' })).toBe(
      'Il testo alternativo deve avere almeno 5 caratteri.',
    );
    expect(errore(fotoSchema, { src: URL_OK, alt: 'abcd' })).toBe(
      'Il testo alternativo deve avere almeno 5 caratteri.',
    );
    expect(fotoSchema.safeParse({ src: URL_OK, alt: 'abcde' }).success).toBe(true);
    expect(errore(fotoSchema, { src: URL_OK })).toBe('Il testo alternativo è obbligatorio.');
    const lungo = 'a'.repeat(LIMITI.foto.alt.max + 1);
    expect(errore(fotoSchema, { src: URL_OK, alt: lungo })).toBe(
      `Il testo alternativo può avere al massimo ${LIMITI.foto.alt.max} caratteri.`,
    );
    expect(
      fotoSchema.safeParse({ src: URL_OK, alt: 'a'.repeat(LIMITI.foto.alt.max) }).success,
    ).toBe(true);
  });

  it.each([
    'https://pub-x.r2.dev/prova/a.jpg',
    'https://example.com/cms/a.jpg',
    'http://foto.almalivingviaricasoli.it/cms/a.jpg',
    'https://foto.almalivingviaricasoli.it/cms/../prova/a.jpg',
    '/cms/a.jpg',
    '',
  ])('una foto da %j va caricata dal pannello', (src) => {
    expect(errore(fotoSchema, { src, alt: 'Plaid verde' })).toBe(
      'La foto va caricata dal pannello.',
    );
    expect(percorso(fotoSchema, { src, alt: 'Plaid verde' })).toEqual(['src']);
  });

  it('senza foto chiede la foto', () => {
    expect(errore(fotoSchema, { alt: 'Plaid verde' })).toBe('La foto è obbligatoria.');
  });

  // Dal selettore del pannello si può creare una cartella dentro `cms/` e caricarci la
  // foto: il messaggio dice cosa fare, invece di "va caricata dal pannello" (l'ha già
  // caricata dal pannello).
  it.each([
    'https://foto.almalivingviaricasoli.it/cms/estate/plaid.webp',
    'https://foto.almalivingviaricasoli.it/prova/estate/plaid.webp',
  ])('una foto in una sottocartella, %j, va caricata senza cartella', (src) => {
    expect(errore(fotoSchema, { src, alt: 'Plaid verde' })).toBe(
      'Carica la foto senza metterla in una cartella.',
    );
    expect(percorso(fotoSchema, { src, alt: 'Plaid verde' })).toEqual(['src']);
  });

  it('la sottocartella ha il suo messaggio ovunque ci sia una foto: prodotto, colore, post, storia', () => {
    const src = 'https://foto.almalivingviaricasoli.it/cms/estate/plaid.webp';
    const sottocartella = 'Carica la foto senza metterla in una cartella.';
    expect(errore(prodottoSchema, { ...PRODOTTO, foto: { ...FOTO, src } })).toBe(sottocartella);
    expect(errore(prodottoSchema, { ...PRODOTTO, secondaFoto: { ...FOTO, src } })).toBe(sottocartella);
    expect(errore(postSchema, { ...POST, foto: [{ ...FOTO, src }] })).toBe(sottocartella);
    expect(errore(storiaSchema, { ...STORIA, foto: [{ ...FOTO_STORIA, src }] })).toBe(sottocartella);
  });

  it("l'inquadratura vale «centro» se manca e deve essere una delle posizioni", () => {
    expect(fotoSchema.parse({ src: URL_OK, alt: 'Plaid verde' }).inquadratura).toBe('centro');
    for (const nome of Object.keys(INQUADRATURE)) {
      expect(fotoSchema.parse({ ...FOTO, inquadratura: nome }).inquadratura).toBe(nome);
    }
    expect(errore(fotoSchema, { ...FOTO, inquadratura: '50% 40%' })).toBe(
      'Inquadratura non valida.',
    );
  });
});

describe('prodottoSchema', () => {
  it('accetta un esempio valido', () => {
    expect(prodottoSchema.safeParse(PRODOTTO).success).toBe(true);
  });

  it("«novità» vale false se manca; la foto prende l'inquadratura al centro", () => {
    const { novita: _novita, ...senzaNovita } = PRODOTTO;
    const prodotto = prodottoSchema.parse({
      ...senzaNovita,
      foto: { src: URL_OK, alt: 'Plaid verde' },
    });
    expect(prodotto.novita).toBe(false);
    expect(prodotto.foto.inquadratura).toBe('centro');
  });

  it('nome e dettaglio hanno un minimo e un massimo', () => {
    expect(errore(prodottoSchema, { ...PRODOTTO, nome: '' })).toBe('Il nome è obbligatorio.');
    expect(
      errore(prodottoSchema, { ...PRODOTTO, nome: 'a'.repeat(LIMITI.prodotto.nome.max + 1) }),
    ).toBe(`Il nome può avere al massimo ${LIMITI.prodotto.nome.max} caratteri.`);
    expect(
      prodottoSchema.safeParse({ ...PRODOTTO, nome: 'a'.repeat(LIMITI.prodotto.nome.max) })
        .success,
    ).toBe(true);
    expect(errore(prodottoSchema, { ...PRODOTTO, dettaglio: '' })).toBe(
      'Il dettaglio è obbligatorio.',
    );
    expect(
      errore(prodottoSchema, {
        ...PRODOTTO,
        dettaglio: 'a'.repeat(LIMITI.prodotto.dettaglio.max + 1),
      }),
    ).toBe(`Il dettaglio può avere al massimo ${LIMITI.prodotto.dettaglio.max} caratteri.`);
    expect(
      prodottoSchema.safeParse({
        ...PRODOTTO,
        dettaglio: 'a'.repeat(LIMITI.prodotto.dettaglio.max),
      }).success,
    ).toBe(true);
  });

  describe('categorie', () => {
    it('serve almeno una categoria', () => {
      expect(errore(prodottoSchema, { ...PRODOTTO, categorie: [] })).toBe(
        'Scegli almeno una categoria.',
      );
    });

    it('accetta ognuna delle sette categorie, anche tutte insieme', () => {
      const ids = CATEGORIE.map((c) => c.id);
      for (const id of ids) {
        expect(prodottoSchema.safeParse({ ...PRODOTTO, categorie: [id] }).success, id).toBe(true);
      }
      expect(prodottoSchema.safeParse({ ...PRODOTTO, categorie: ids }).success).toBe(true);
    });

    it("rifiuta una categoria che non è nell'elenco", () => {
      expect(errore(prodottoSchema, { ...PRODOTTO, categorie: ['salotto'] })).toBe(
        'Categoria non valida.',
      );
    });

    it('rifiuta una categoria ripetuta', () => {
      expect(
        errore(prodottoSchema, { ...PRODOTTO, categorie: ['letto', 'bagno', 'letto'] }),
      ).toBe('Una categoria è ripetuta.');
    });
  });

  describe('data', () => {
    it.each(['2026-10-27', '2024-02-29', '2000-02-29', '2026-12-31', '2026-01-01'])(
      'accetta %s',
      (data) => {
        expect(prodottoSchema.safeParse({ ...PRODOTTO, data }).success).toBe(true);
      },
    );

    it.each([
      '2026-02-30',
      '2026-02-29',
      '1900-02-29',
      '2026-13-01',
      '2026-00-10',
      '2026-04-31',
      '2026-10-00',
      '2026-2-3',
      '27/10/2026',
      '28 ottobre',
      '2026-10-27T10:00:00Z',
      '',
    ])('rifiuta %j', (data) => {
      expect(errore(prodottoSchema, { ...PRODOTTO, data })).toBe('La data non è valida.');
    });

    it('senza data chiede la data', () => {
      const { data: _data, ...senzaData } = PRODOTTO;
      expect(errore(prodottoSchema, senzaData)).toBe('La data è obbligatoria.');
    });
  });

  describe('foto', () => {
    it('la foto principale è obbligatoria e viene dal pannello', () => {
      const { foto: _foto, ...senzaFoto } = PRODOTTO;
      expect(prodottoSchema.safeParse(senzaFoto).success).toBe(false);
      expect(percorso(prodottoSchema, senzaFoto)).toEqual(['foto']);
      expect(
        errore(prodottoSchema, {
          ...PRODOTTO,
          foto: { ...FOTO, src: 'https://pub-x.r2.dev/prova/a.jpg' },
        }),
      ).toBe('La foto va caricata dal pannello.');
    });

    it("la seconda foto è facoltativa, ma se c'è è una foto vera", () => {
      expect(prodottoSchema.safeParse({ ...PRODOTTO, secondaFoto: FOTO }).success).toBe(true);
      expect(
        errore(prodottoSchema, {
          ...PRODOTTO,
          secondaFoto: { ...FOTO, src: 'https://example.com/a.jpg' },
        }),
      ).toBe('La foto va caricata dal pannello.');
      expect(errore(prodottoSchema, { ...PRODOTTO, secondaFoto: { ...FOTO, alt: '' } })).toBe(
        'Il testo alternativo deve avere almeno 5 caratteri.',
      );
    });
  });

  describe('colori', () => {
    const verde = { nome: 'verde', tinta: '#3f5a43', foto: FOTO };
    const rosso = { nome: 'rosso', tinta: '#aa3333' };

    it('sono facoltativi', () => {
      expect(prodottoSchema.safeParse(PRODOTTO).success).toBe(true);
      expect(prodottoSchema.safeParse({ ...PRODOTTO, colori: [] }).success).toBe(true);
    });

    it('la foto va a tutti i colori o a nessuno', () => {
      expect(errore(prodottoSchema, { ...PRODOTTO, colori: [verde, rosso] })).toBe(
        'Metti la foto a tutti i colori o a nessuno.',
      );
      expect(percorso(prodottoSchema, { ...PRODOTTO, colori: [verde, rosso] })).toEqual([
        'colori',
      ]);
      expect(errore(prodottoSchema, { ...PRODOTTO, colori: [rosso, verde] })).toBe(
        'Metti la foto a tutti i colori o a nessuno.',
      );
      expect(
        prodottoSchema.safeParse({ ...PRODOTTO, colori: [verde, { ...rosso, foto: FOTO }] })
          .success,
      ).toBe(true);
      expect(
        prodottoSchema.safeParse({ ...PRODOTTO, colori: [{ ...verde, foto: undefined }, rosso] })
          .success,
      ).toBe(true);
    });

    it('la tinta è un colore esadecimale di sei cifre', () => {
      for (const tinta of ['#3f5a43', '#3F5A43', '#000000']) {
        expect(
          prodottoSchema.safeParse({ ...PRODOTTO, colori: [{ ...rosso, tinta }] }).success,
          tinta,
        ).toBe(true);
      }
      for (const tinta of ['#a33', '3f5a43', '#3f5a4', '#3f5a43f', '#gggggg', 'rosso', '']) {
        expect(
          errore(prodottoSchema, { ...PRODOTTO, colori: [{ ...rosso, tinta }] }),
          tinta,
        ).toBe('La tinta va scritta come #RRGGBB, per esempio #3f5a43.');
      }
    });

    it('il nome del colore è obbligatorio e ha un massimo', () => {
      expect(errore(prodottoSchema, { ...PRODOTTO, colori: [{ ...rosso, nome: '' }] })).toBe(
        'Il nome del colore è obbligatorio.',
      );
      const lungo = 'a'.repeat(LIMITI.prodotto.colore.max + 1);
      expect(errore(prodottoSchema, { ...PRODOTTO, colori: [{ ...rosso, nome: lungo }] })).toBe(
        `Il nome del colore può avere al massimo ${LIMITI.prodotto.colore.max} caratteri.`,
      );
    });

    it('al massimo sei colori', () => {
      const colori = (quanti: number) =>
        Array.from({ length: quanti }, (_, i) => ({ nome: `colore ${i}`, tinta: '#aa3333' }));
      expect(
        prodottoSchema.safeParse({ ...PRODOTTO, colori: colori(LIMITI.prodotto.colori.max) })
          .success,
      ).toBe(true);
      expect(
        errore(prodottoSchema, { ...PRODOTTO, colori: colori(LIMITI.prodotto.colori.max + 1) }),
      ).toBe(`Un prodotto può avere al massimo ${LIMITI.prodotto.colori.max} colori.`);
    });

    it('una foto di un colore deve venire dal pannello', () => {
      expect(
        errore(prodottoSchema, {
          ...PRODOTTO,
          colori: [{ ...verde, foto: { ...FOTO, src: 'https://example.com/a.jpg' } }],
        }),
      ).toBe('La foto va caricata dal pannello.');
    });
  });
});

describe('postSchema', () => {
  it('accetta un esempio valido, con o senza «di cosa parla»', () => {
    expect(postSchema.safeParse(POST).success).toBe(true);
    const { soggetto: _soggetto, ...senzaSoggetto } = POST;
    expect(postSchema.safeParse(senzaSoggetto).success).toBe(true);
  });

  it('serve almeno una foto, e al massimo quante ne dice il limite', () => {
    expect(errore(postSchema, { ...POST, foto: [] })).toBe('Il post deve avere almeno una foto.');
    const foto = (quante: number) => Array.from({ length: quante }, () => FOTO);
    expect(postSchema.safeParse({ ...POST, foto: foto(LIMITI.post.foto.max) }).success).toBe(true);
    expect(errore(postSchema, { ...POST, foto: foto(LIMITI.post.foto.max + 1) })).toBe(
      `Il post può avere al massimo ${LIMITI.post.foto.max} foto.`,
    );
  });

  it('ogni foto ha la sua foto vera e il suo testo alternativo', () => {
    expect(
      errore(postSchema, { ...POST, foto: [{ ...FOTO, src: 'https://example.com/a.jpg' }] }),
    ).toBe('La foto va caricata dal pannello.');
    expect(errore(postSchema, { ...POST, foto: [FOTO, { ...FOTO, alt: '' }] })).toBe(
      'Il testo alternativo deve avere almeno 5 caratteri.',
    );
    expect(percorso(postSchema, { ...POST, foto: [FOTO, { ...FOTO, alt: '' }] })).toEqual([
      'foto',
      1,
      'alt',
    ]);
  });

  it('il testo è obbligatorio e ha un massimo', () => {
    expect(errore(postSchema, { ...POST, testo: '' })).toBe('Il testo è obbligatorio.');
    expect(errore(postSchema, { ...POST, testo: 'a'.repeat(LIMITI.post.testo.max + 1) })).toBe(
      `Il testo può avere al massimo ${LIMITI.post.testo.max} caratteri.`,
    );
    expect(
      postSchema.safeParse({ ...POST, testo: 'a'.repeat(LIMITI.post.testo.max) }).success,
    ).toBe(true);
  });

  it('«di cosa parla» ha un massimo', () => {
    expect(
      errore(postSchema, { ...POST, soggetto: 'a'.repeat(LIMITI.post.soggetto.max + 1) }),
    ).toBe(`«Di cosa parla» può avere al massimo ${LIMITI.post.soggetto.max} caratteri.`);
    expect(
      postSchema.safeParse({ ...POST, soggetto: 'a'.repeat(LIMITI.post.soggetto.max) }).success,
    ).toBe(true);
  });

  it('la data è una data vera', () => {
    expect(errore(postSchema, { ...POST, data: '2026-02-30' })).toBe('La data non è valida.');
    expect(errore(postSchema, { ...POST, data: '28 ottobre' })).toBe('La data non è valida.');
    const { data: _data, ...senzaData } = POST;
    expect(errore(postSchema, senzaData)).toBe('La data è obbligatoria.');
  });
});

describe('storiaSchema', () => {
  it('accetta un esempio valido, con o senza etichetta', () => {
    expect(storiaSchema.safeParse(STORIA).success).toBe(true);
    const { etichetta: _etichetta, ...senzaEtichetta } = STORIA;
    expect(storiaSchema.safeParse(senzaEtichetta).success).toBe(true);
  });

  it('serve almeno una foto, e al massimo quante ne dice il limite', () => {
    expect(errore(storiaSchema, { ...STORIA, foto: [] })).toBe(
      'La storia deve avere almeno una foto.',
    );
    const foto = (quante: number) => Array.from({ length: quante }, () => FOTO_STORIA);
    expect(storiaSchema.safeParse({ ...STORIA, foto: foto(LIMITI.storia.foto.max) }).success).toBe(
      true,
    );
    expect(errore(storiaSchema, { ...STORIA, foto: foto(LIMITI.storia.foto.max + 1) })).toBe(
      `La storia può avere al massimo ${LIMITI.storia.foto.max} foto.`,
    );
  });

  it('ogni foto ha frase e soggetto, con i loro limiti', () => {
    const conFoto = (foto: Record<string, unknown>) => ({ ...STORIA, foto: [foto] });
    expect(errore(storiaSchema, conFoto({ ...FOTO_STORIA, frase: '' }))).toBe(
      'La frase è obbligatoria.',
    );
    expect(errore(storiaSchema, conFoto({ ...FOTO_STORIA, soggetto: '' }))).toBe(
      'Il soggetto è obbligatorio.',
    );
    const { frase: _frase, ...senzaFrase } = FOTO_STORIA;
    expect(storiaSchema.safeParse(conFoto(senzaFrase)).success).toBe(false);
    expect(percorso(storiaSchema, conFoto(senzaFrase))).toEqual(['foto', 0, 'frase']);
    expect(
      errore(
        storiaSchema,
        conFoto({ ...FOTO_STORIA, frase: 'a'.repeat(LIMITI.storia.frase.max + 1) }),
      ),
    ).toBe(`La frase può avere al massimo ${LIMITI.storia.frase.max} caratteri.`);
    expect(
      errore(
        storiaSchema,
        conFoto({ ...FOTO_STORIA, soggetto: 'a'.repeat(LIMITI.storia.soggetto.max + 1) }),
      ),
    ).toBe(`Il soggetto può avere al massimo ${LIMITI.storia.soggetto.max} caratteri.`);
    expect(
      storiaSchema.safeParse(
        conFoto({
          ...FOTO_STORIA,
          frase: 'a'.repeat(LIMITI.storia.frase.max),
          soggetto: 'a'.repeat(LIMITI.storia.soggetto.max),
        }),
      ).success,
    ).toBe(true);
  });

  it("ogni foto della storia ha la sua foto vera e l'inquadratura al centro se manca", () => {
    expect(
      errore(storiaSchema, {
        ...STORIA,
        foto: [{ ...FOTO_STORIA, src: 'https://example.com/a.jpg' }],
      }),
    ).toBe('La foto va caricata dal pannello.');
    const { inquadratura: _inquadratura, ...senzaInquadratura } = FOTO_STORIA;
    expect(
      storiaSchema.parse({ ...STORIA, foto: [senzaInquadratura] }).foto[0]?.inquadratura,
    ).toBe('centro');
  });

  it("l'etichetta è «Oggi» o «Nuovo»", () => {
    for (const etichetta of ['Oggi', 'Nuovo']) {
      expect(storiaSchema.safeParse({ ...STORIA, etichetta }).success, etichetta).toBe(true);
    }
    expect(errore(storiaSchema, { ...STORIA, etichetta: 'Arrivi' })).toBe(
      "L'etichetta può essere «Oggi» o «Nuovo».",
    );
  });

  it("l'invito è WhatsApp, telefono o indicazioni", () => {
    for (const invito of ['whatsapp', 'chiama', 'indicazioni']) {
      expect(storiaSchema.safeParse({ ...STORIA, invito }).success, invito).toBe(true);
    }
    expect(errore(storiaSchema, { ...STORIA, invito: 'email' })).toBe('Invito non valido.');
    const { invito: _invito, ...senzaInvito } = STORIA;
    expect(errore(storiaSchema, senzaInvito)).toBe('Invito non valido.');
  });

  it('il nome è obbligatorio e la data è una data vera', () => {
    expect(errore(storiaSchema, { ...STORIA, nome: '' })).toBe('Il nome è obbligatorio.');
    expect(errore(storiaSchema, { ...STORIA, data: '2026-02-30' })).toBe('La data non è valida.');
  });
});
