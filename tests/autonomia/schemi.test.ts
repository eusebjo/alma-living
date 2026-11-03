import { describe, expect, it } from 'vitest';
import { validaConSchemi } from '../../scripts/autonomia/schemi';
import type { ChangedFile } from '../../scripts/autonomia/types';
import type { PostContenuto, Prodotto, StoriaContenuto } from '../../src/content/schemas';
import {
  NEGOZIO,
  NOTA,
  ORARI_LUNEDI,
  POST,
  PRODOTTO,
  STORIA,
  aggiunto,
  modificato,
  negozioJson,
  notaMd,
  postJson,
  prodottoJson,
  regoleConNoteEImmagini,
  rules,
  storiaJson,
  type Negozio,
} from './fixtures';

// Controllo con gli schemi veri dei contenuti (src/content/schemas.ts): ciò che
// la build rifiuterebbe con un errore in inglese, qui si spiega in italiano.

const GERGO = /branch|merge|commit/i;
const INGLESE = /expected|received|invalid input|required/i;
const NUOVO_POST = 'src/content/post/nuovo.json';

const negozio = (modifica: (n: Negozio) => void): ChangedFile =>
  modificato(NEGOZIO, negozioJson(), negozioJson(modifica));

const post = (modifica: (p: PostContenuto) => void, path = POST): ChangedFile =>
  modificato(path, postJson(), postJson(modifica));

const prodotto = (modifica: (p: Prodotto) => void): ChangedFile =>
  modificato(PRODOTTO, prodottoJson(), prodottoJson(modifica));

const storia = (modifica: (s: StoriaContenuto) => void): ChangedFile =>
  modificato(STORIA, storiaJson(), storiaJson(modifica));

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

describe('validaConSchemi, prodotti, post e storie', () => {
  it('un post, un prodotto e una storia validi non danno nessuna violazione', () => {
    const file = [
      post((p) => {
        p.testo = 'Un testo nuovo.';
      }),
      prodotto((p) => {
        p.colori = [
          { nome: 'sabbia', tinta: '#d8c3a5' },
          { nome: 'bianco', tinta: '#FFFFFF' },
        ];
      }),
      storia((s) => {
        delete s.etichetta;
      }),
    ];
    expect(validaConSchemi(file, rules)).toEqual([]);
  });

  it('un post nuovo valido non dà nessuna violazione', () => {
    expect(validaConSchemi([aggiunto(NUOVO_POST, postJson())], rules)).toEqual([]);
  });

  it('un post con una foto da r2.dev: «La foto va caricata dal pannello.»', () => {
    const daR2Dev = 'https://pub-02e2834056a84517a87c5431c6904c14.r2.dev/cms/cuscini.webp';
    for (const file of [
      post((p) => {
        p.foto[0]!.src = daR2Dev;
      }),
      aggiunto(
        NUOVO_POST,
        postJson((p) => {
          p.foto[0]!.src = daR2Dev;
        }),
      ),
    ]) {
      const violazioni = validaConSchemi([file], rules);

      expect(violazioni).toHaveLength(1);
      expect(violazioni[0]).toMatchObject({ file: file.path, campo: 'foto.src', azione: 'formato' });
      expect(violazioni[0]!.messaggio).toMatch(/^La foto va caricata dal pannello\. \(riga 1 dell'elenco\)/);
      expect(violazioni[0]!.messaggio).toMatch(/pannello dei contenuti/);
    }
  });

  it('la foto di un prodotto da un altro sito o da una sottocartella è rifiutata, con il messaggio giusto', () => {
    for (const [src, messaggio] of [
      ['https://example.com/plaid.webp', 'La foto va caricata dal pannello.'],
      [
        'https://foto.almalivingviaricasoli.it/cms/estate/plaid.webp',
        'Carica la foto senza metterla in una cartella.',
      ],
    ] as const) {
      const violazioni = validaConSchemi(
        [
          prodotto((p) => {
            p.foto.src = src;
          }),
        ],
        rules,
      );
      expect(violazioni.map((v) => [v.campo, v.messaggio.split(' Correggi')[0]]), src).toEqual([
        ['foto.src', messaggio],
      ]);
    }
  });

  it.each<[string, ChangedFile, string, RegExp]>([
    [
      'post con una data che non esiste',
      post((p) => {
        p.data = '2026-02-30';
      }),
      'data',
      /La data non è valida/,
    ],
    [
      'post senza foto',
      post((p) => {
        p.foto = [];
      }),
      'foto',
      /almeno una foto/,
    ],
    [
      'post con un’inquadratura sconosciuta',
      post((p) => {
        (p.foto[0] as { inquadratura: string }).inquadratura = 'sinistra';
      }),
      'foto.inquadratura',
      /Inquadratura non valida/,
    ],
    [
      'prodotto con una categoria sconosciuta',
      prodotto((p) => {
        (p as { categorie: string[] }).categorie = ['cucina'];
      }),
      'categorie',
      /Categoria non valida/,
    ],
    [
      'prodotto con la foto solo su alcuni colori',
      prodotto((p) => {
        p.colori = [
          { nome: 'verde', tinta: '#5e654f', foto: p.foto },
          { nome: 'rosso', tinta: '#b8263a' },
        ];
      }),
      'colori',
      /a tutti i colori o a nessuno/,
    ],
    [
      'prodotto con una tinta scritta a parole',
      prodotto((p) => {
        p.colori = [{ nome: 'verde', tinta: 'verde' }];
      }),
      'colori.tinta',
      /#RRGGBB/,
    ],
    [
      'storia con l’etichetta vuota',
      storia((s) => {
        (s as { etichetta: string }).etichetta = '';
      }),
      'etichetta',
      /«Oggi» o «Nuovo»/,
    ],
    [
      'storia con un invito sconosciuto',
      storia((s) => {
        (s as { invito: string }).invito = 'email';
      }),
      'invito',
      /Invito non valido/,
    ],
    [
      'storia con una foto senza frase',
      storia((s) => {
        delete (s.foto[0] as { frase?: string }).frase;
      }),
      'foto.frase',
      /^Questo campo è obbligatorio\./,
    ],
  ])('%s: violazione in italiano sul campo giusto', (_nome, file, campo, testo) => {
    const violazioni = validaConSchemi([file], rules);

    expect(violazioni).toHaveLength(1);
    expect(violazioni[0]).toMatchObject({ file: file.path, campo, azione: 'formato' });
    expect(violazioni[0]!.messaggio).toMatch(testo);
    expect(violazioni[0]!.messaggio).not.toMatch(INGLESE);
    expect(violazioni[0]!.messaggio).not.toMatch(GERGO);
  });

  it('vale per ogni file della cartella, non solo per quelli di oggi', () => {
    const altro = 'src/content/post/2026-11-03.json';
    const violazioni = validaConSchemi(
      [
        post((p) => {
          p.foto = [];
        }, altro),
      ],
      rules,
    );
    expect(violazioni.map((v) => v.file)).toEqual([altro]);
  });
});

describe('validaConSchemi, nomi dei file nuovi di prodotti e post', () => {
  // Il nome del file è l'id della voce nella pagina: la build legge solo
  // minuscole, cifre e trattini, e un post `articolo-…` si confonderebbe con gli
  // articoli degli scaffali (`articolo-<id>`). Il pannello scrive nomi validi
  // (la data); un nome diverso arriva solo da un file scritto a mano.
  const NOME_NON_VALIDO =
    'Il nome del file non è valido: usa solo lettere minuscole, numeri e trattini.';
  const POST_ARTICOLO = 'Il nome di un post non può cominciare con «articolo-».';

  it.each([
    ['src/content/post/Plaid_Rosso.json', postJson(), NOME_NON_VALIDO],
    ['src/content/post/articolo-sabbia.json', postJson(), POST_ARTICOLO],
    ['src/content/prodotti/plaid rosso.json', prodottoJson(), NOME_NON_VALIDO],
    ['src/content/prodotti/città.json', prodottoJson(), NOME_NON_VALIDO],
    ['src/content/post/2026.11.03.json', postJson(), NOME_NON_VALIDO],
  ])('un file aggiunto %s è respinto', (path, testo, messaggio) => {
    const violazioni = validaConSchemi([aggiunto(path, testo)], rules);

    expect(violazioni).toEqual([{ file: path, azione: 'formato', messaggio }]);
    expect(messaggio).not.toMatch(GERGO);
  });

  it('un nome con caratteri non validi e che comincia con articolo- dà entrambi i messaggi', () => {
    const path = 'src/content/post/articolo-Plaid.json';
    expect(validaConSchemi([aggiunto(path, postJson())], rules).map((v) => v.messaggio)).toEqual([
      NOME_NON_VALIDO,
      POST_ARTICOLO,
    ]);
  });

  it.each([
    ['src/content/post/2026-11-03-1.json', postJson()],
    ['src/content/post/2026-11-03.json', postJson()],
    ['src/content/prodotti/2026-11-03.json', prodottoJson()],
    // Solo i post non possono chiamarsi `articolo-…`.
    ['src/content/prodotti/articolo-sabbia.json', prodottoJson()],
  ])('un file aggiunto %s passa', (path, testo) => {
    expect(validaConSchemi([aggiunto(path, testo)], rules)).toEqual([]);
  });

  it('una rinomina verso un nome non valido è respinta', () => {
    const rinomina: ChangedFile = {
      path: 'src/content/post/Post Nuovo.json',
      previousPath: POST,
      status: 'renamed',
      before: postJson(),
      after: postJson(),
    };
    expect(validaConSchemi([rinomina], rules)).toEqual([
      { file: 'src/content/post/Post Nuovo.json', azione: 'formato', messaggio: NOME_NON_VALIDO },
    ]);
  });

  it('il nome si controlla anche se il contenuto non è stato letto', () => {
    const nonLetto: ChangedFile = {
      path: 'src/content/post/Plaid_Rosso.json',
      status: 'added',
      before: null,
      after: null,
    };
    expect(validaConSchemi([nonLetto], rules).map((v) => v.messaggio)).toEqual([NOME_NON_VALIDO]);
  });

  it('i file già esistenti (modificati o tolti) e le altre collection non si controllano per nome', () => {
    const file: ChangedFile[] = [
      modificato('src/content/post/Vecchio_Nome.json', postJson(), postJson()),
      { path: 'src/content/prodotti/Vecchio.json', status: 'removed', before: prodottoJson(), after: null },
      // Una storia nuova la respinge già `evaluate` (azione crea).
      aggiunto('src/content/storie/Nuova_Storia.json', storiaJson()),
      // Fuori dalle collection: lo segnala `evaluate` (perimetro).
      aggiunto('src/content/post/sotto/Plaid_Rosso.json', postJson()),
    ];
    expect(validaConSchemi(file, rules)).toEqual([]);
  });
});

describe('validaConSchemi, cosa si controlla', () => {
  it('salta i file rimossi e quelli senza testo letto', () => {
    const rimosso: ChangedFile = { path: POST, status: 'removed', before: postJson(), after: null };
    const nonLetto: ChangedFile = { path: POST, status: 'modified', before: null, after: null };
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

  it('salta i file fuori dalle collection (immagini, la vecchia cartella delle pagine, altro)', () => {
    const foto: ChangedFile = {
      path: 'src/content/post/foto.webp',
      status: 'added',
      before: null,
      after: null,
      sizeBytes: 1000,
    };
    const pagina = modificato('src/content/pagine/home.md', notaMd(), notaMd({ titolo: '' }));
    expect(
      validaConSchemi([foto, pagina, modificato('README.md', 'a', 'b')], rules),
    ).toEqual([]);
  });

  it('controlla anche un file aggiunto o rinominato', () => {
    const sbagliato = postJson((p) => {
      p.foto = [];
    });
    const rinominato: ChangedFile = {
      path: NUOVO_POST,
      previousPath: POST,
      status: 'renamed',
      before: postJson(),
      after: sbagliato,
    };
    expect(validaConSchemi([aggiunto(NUOVO_POST, sbagliato)], rules)).toHaveLength(1);
    expect(validaConSchemi([rinominato], rules)).toHaveLength(1);
  });

  it('una collection senza schema noto non viene controllata (e non fa fallire nulla)', () => {
    // Le note in Markdown delle regole di prova non hanno uno schema in SCHEMI.
    const nota = modificato(NOTA, notaMd(), notaMd({ titolo: 'x'.repeat(500) }));
    expect(validaConSchemi([nota], regoleConNoteEImmagini)).toEqual([]);
  });
});
