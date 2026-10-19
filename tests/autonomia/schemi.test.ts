import { describe, expect, it } from 'vitest';
import { validaConSchemi } from '../../scripts/autonomia/schemi';
import type { ChangedFile, Rules } from '../../scripts/autonomia/types';
import {
  HOME,
  NEGOZIO,
  ORARI_LUNEDI,
  homeMd,
  modificato,
  negozioJson,
  rules,
  type Negozio,
} from './fixtures';

// Controllo con gli schemi veri dei contenuti (src/content/schemas.ts): ciò che
// la build rifiuterebbe con un errore in inglese, qui si spiega in italiano.

const GERGO = /branch|merge|commit/i;
const INGLESE = /expected|received|invalid input|required/i;
const PAGINA = 'src/content/pagine/chi-siamo.md';

const negozio = (modifica: (n: Negozio) => void): ChangedFile =>
  modificato(NEGOZIO, negozioJson(), negozioJson(modifica));

const pagina = (campi: Parameters<typeof homeMd>[0], path = HOME): ChangedFile =>
  modificato(path, homeMd(), homeMd(campi));

const negozioSenza = (campo: string): ChangedFile => {
  const dati = JSON.parse(negozioJson()) as Record<string, unknown>;
  delete dati[campo];
  return modificato(NEGOZIO, negozioJson(), JSON.stringify(dati));
};

describe('validaConSchemi, negozio.json', () => {
  it('un negozio valido non dà nessuna violazione', () => {
    expect(
      validaConSchemi(
        [
          negozio((n) => {
            n.orari = ORARI_LUNEDI;
          }),
        ],
        rules,
      ),
    ).toEqual([]);
  });

  it('una chiusura prima dell’apertura è una violazione di formato, con la riga e il campo', () => {
    const violazioni = validaConSchemi(
      [
        negozio((n) => {
          n.orari = [
            { giorno: 'lunedi', apertura: '09:00', chiusura: '13:00' },
            { giorno: 'martedi', apertura: '18:00', chiusura: '09:00' },
          ];
        }),
      ],
      rules,
    );

    expect(violazioni).toHaveLength(1);
    expect(violazioni[0]).toMatchObject({
      file: NEGOZIO,
      campo: 'orari.chiusura',
      azione: 'formato',
    });
    const { messaggio } = violazioni[0]!;
    expect(messaggio).toContain("La chiusura deve essere successiva all'apertura.");
    expect(messaggio).toMatch(/riga 2/);
    expect(messaggio).toMatch(/pannello dei contenuti/);
    expect(messaggio).not.toMatch(GERGO);
  });

  it('chiusura uguale all’apertura è una violazione', () => {
    const violazioni = validaConSchemi(
      [
        negozio((n) => {
          n.orari = [{ giorno: 'lunedi', apertura: '09:00', chiusura: '09:00' }];
        }),
      ],
      rules,
    );
    expect(violazioni).toHaveLength(1);
  });

  it.each<[string, (n: Negozio) => void, string, RegExp]>([
    [
      'telefono con lettere',
      (n) => {
        n.telefono = '33a 520 5451';
      },
      'telefono',
      /solo cifre, spazi/,
    ],
    [
      'telefono troppo corto',
      (n) => {
        n.telefono = '12345';
      },
      'telefono',
      /9 e 15 cifre/,
    ],
    [
      'descrizione troppo corta',
      (n) => {
        n.descrizione = 'Corta.';
      },
      'descrizione',
      /almeno 20 caratteri/,
    ],
    [
      'descrizione troppo lunga',
      (n) => {
        n.descrizione = 'x'.repeat(161);
      },
      'descrizione',
      /al massimo 160 caratteri/,
    ],
    [
      'email non valida',
      (n) => {
        n.email = 'non-una-email';
      },
      'email',
      /email non valido/,
    ],
    [
      'giorno con accento',
      (n) => {
        n.orari = [{ giorno: 'lunedì', apertura: '09:00', chiusura: '13:00' }];
      },
      'orari.giorno',
      /Giorno non valido/,
    ],
    [
      'ora scritta male',
      (n) => {
        n.orari = [{ giorno: 'lunedi', apertura: '9:00', chiusura: '13:00' }];
      },
      'orari.apertura',
      /HH:MM/,
    ],
  ])('%s: violazione in italiano sul campo giusto', (_nome, modifica, campo, testo) => {
    const violazioni = validaConSchemi([negozio(modifica)], rules);

    expect(violazioni).toHaveLength(1);
    expect(violazioni[0]).toMatchObject({ file: NEGOZIO, campo, azione: 'formato' });
    expect(violazioni[0]!.messaggio).toMatch(testo);
    expect(violazioni[0]!.messaggio).not.toMatch(GERGO);
  });

  it('un campo obbligatorio mancante dà un messaggio in italiano, non quello predefinito di Zod', () => {
    const violazioni = validaConSchemi([negozioSenza('telefono')], rules);

    expect(violazioni).toHaveLength(1);
    expect(violazioni[0]).toMatchObject({ campo: 'telefono', azione: 'formato' });
    expect(violazioni[0]!.messaggio).toMatch(/^Questo campo è obbligatorio\./);
    expect(violazioni[0]!.messaggio).not.toMatch(INGLESE);
  });

  it('un valore del tipo sbagliato non mostra il messaggio inglese di Zod', () => {
    const dati = JSON.parse(negozioJson()) as Record<string, unknown>;
    dati.orari = 'sempre aperto';
    const violazioni = validaConSchemi(
      [modificato(NEGOZIO, negozioJson(), JSON.stringify(dati))],
      rules,
    );

    expect(violazioni).toHaveLength(1);
    expect(violazioni[0]!.messaggio).not.toMatch(INGLESE);
    expect(violazioni[0]!.messaggio).toMatch(/pannello dei contenuti/);
  });

  it('elenca tutti i problemi di un file, non solo il primo', () => {
    const violazioni = validaConSchemi(
      [
        negozio((n) => {
          n.telefono = '12';
          n.descrizione = 'Corta.';
        }),
      ],
      rules,
    );
    expect(violazioni.map((v) => v.campo).sort()).toEqual(['descrizione', 'telefono']);
  });
});

describe('validaConSchemi, pagine', () => {
  it('una pagina valida non dà nessuna violazione', () => {
    expect(validaConSchemi([pagina({ titolo: 'Nuovo titolo' })], rules)).toEqual([]);
  });

  it('l’immagine si controlla come percorso (testo), senza verificare che il file esista', () => {
    expect(
      validaConSchemi([pagina({ immagine: './immagini/che-non-esiste.webp' })], rules),
    ).toEqual([]);
  });

  it.each<[string, Parameters<typeof homeMd>[0], string, RegExp]>([
    ['titolo troppo lungo', { titolo: 'x'.repeat(71) }, 'titolo', /al massimo 70 caratteri/],
    ['descrizione troppo corta', { descrizione: 'Troppo corta.' }, 'descrizione', /almeno 50 caratteri/],
    ['immagine vuota', { immagine: "''" }, 'immagine', /immagine/i],
  ])('%s: violazione in italiano sul campo giusto', (_nome, campi, campo, testo) => {
    const violazioni = validaConSchemi([pagina(campi)], rules);

    expect(violazioni).toHaveLength(1);
    expect(violazioni[0]).toMatchObject({ file: HOME, campo, azione: 'formato' });
    expect(violazioni[0]!.messaggio).toMatch(testo);
    expect(violazioni[0]!.messaggio).not.toMatch(GERGO);
  });

  it('il testo (corpo) non ha limiti: anche vuoto o lunghissimo va bene', () => {
    expect(validaConSchemi([pagina({ corpo: '' })], rules)).toEqual([]);
    expect(validaConSchemi([pagina({ corpo: 'parola '.repeat(5000) })], rules)).toEqual([]);
  });

  it('vale per ogni pagina della cartella, non solo per home.md', () => {
    const violazioni = validaConSchemi([pagina({ titolo: 'x'.repeat(71) }, PAGINA)], rules);
    expect(violazioni).toHaveLength(1);
    expect(violazioni[0]!.file).toBe(PAGINA);
  });
});

describe('validaConSchemi, cosa si controlla', () => {
  it('salta i file rimossi e quelli senza testo letto', () => {
    const rimosso: ChangedFile = { path: HOME, status: 'removed', before: homeMd(), after: null };
    const nonLetto: ChangedFile = { path: HOME, status: 'modified', before: null, after: null };
    expect(validaConSchemi([rimosso, nonLetto], rules)).toEqual([]);
  });

  it('salta i file illeggibili: li ha già segnalati evaluate', () => {
    const rotto: ChangedFile = {
      path: NEGOZIO,
      status: 'modified',
      before: '{}',
      after: '{ non json',
    };
    expect(validaConSchemi([rotto], rules)).toEqual([]);
  });

  it('salta i file fuori dalle collection (immagini, altro)', () => {
    const foto: ChangedFile = {
      path: 'src/content/pagine/immagini/foto.webp',
      status: 'added',
      before: null,
      after: null,
      sizeBytes: 1000,
    };
    expect(validaConSchemi([foto, modificato('README.md', 'a', 'b')], rules)).toEqual([]);
  });

  it('controlla anche un file aggiunto o rinominato', () => {
    const aggiunto: ChangedFile = {
      path: PAGINA,
      status: 'added',
      before: null,
      after: homeMd({ titolo: 'x'.repeat(71) }),
    };
    const rinominato: ChangedFile = {
      path: PAGINA,
      previousPath: HOME,
      status: 'renamed',
      before: homeMd(),
      after: homeMd({ titolo: 'x'.repeat(71) }),
    };
    expect(validaConSchemi([aggiunto], rules)).toHaveLength(1);
    expect(validaConSchemi([rinominato], rules)).toHaveLength(1);
  });

  it('una collection senza schema noto non viene controllata (e non fa fallire nulla)', () => {
    const conAltra: Rules = {
      ...rules,
      contenuti: {
        ...rules.contenuti,
        eventi: {
          file: 'src/content/eventi/*.md',
          formato: 'markdown',
          azioni: { crea: 0, modifica: 1, elimina: 0 },
          campi: { titolo: 1 },
        },
      },
    };
    const evento = modificato(
      'src/content/eventi/festa.md',
      homeMd(),
      homeMd({ titolo: 'x'.repeat(500) }),
    );
    expect(validaConSchemi([evento], conAltra)).toEqual([]);
  });
});
