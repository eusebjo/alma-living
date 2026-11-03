import { parseFrontmatter } from '@astrojs/markdown-remark';
import { describe, expect, it } from 'vitest';
import { evaluate } from '../../scripts/autonomia/evaluate';
import { eRamoDelPannello, ruoloDi, ruoloEffettivo } from '../../scripts/autonomia/ruolo';
import type { ChangedFile, Rules } from '../../scripts/autonomia/types';
import {
  IMMAGINI,
  NEGOZIO,
  NOTA,
  ORARI_LUNEDI,
  POST,
  PRODOTTO,
  STORIA,
  aggiunto,
  immagine,
  kb,
  modificato,
  negozioJson,
  notaMd,
  postJson,
  prodottoJson,
  proposta,
  regoleConNoteEImmagini,
  regoleDelRepository,
  rimosso,
  rinominato,
  rules,
  storiaJson,
} from './fixtures';

// Immagini caricate nel repository: le ammettono solo le regole di prova
// (`regoleConNoteEImmagini`); con quelle vere sono fuori perimetro.
const FOTO_WEBP = `${IMMAGINI}/foto.webp`;
const FOTO_JPG = `${IMMAGINI}/foto.jpg`;

describe('evaluate, autore e ruolo', () => {
  it('1. eusebjo modifica src/layouts/BaseLayout.astro: consentito, ruolo sviluppo', () => {
    const verdetto = evaluate(
      proposta(
        [modificato('src/layouts/BaseLayout.astro', '<html>a</html>', '<html>b</html>')],
        { author: 'eusebjo' },
      ),
      rules,
    );

    expect(verdetto).toEqual({
      ruolo: 'sviluppo',
      esito: 'consentito',
      livello: null,
      violazioni: [],
    });
  });

  it('1b. lo sviluppo passa anche con proposta in bozza e senza etichette (regola 1 prima di tutte)', () => {
    const verdetto = evaluate(
      proposta([modificato('autonomia.yml', 'a', 'b')], {
        author: 'eusebjo',
        draft: true,
        labels: [],
      }),
      rules,
    );
    expect(verdetto.esito).toBe('consentito');
    expect(verdetto.ruolo).toBe('sviluppo');
  });

  it('1c. il login si confronta senza distinguere maiuscole e minuscole, come fa GitHub', () => {
    expect(evaluate(proposta([], { author: 'Eusebjo' }), rules).ruolo).toBe('sviluppo');
    expect(evaluate(proposta([], { author: 'LEI' }), rules).ruolo).toBe('redazione');
  });

  it('2. un estraneo modifica un post: respinto, azione autore', () => {
    const verdetto = evaluate(
      proposta([modificato(POST, postJson(), postJson((p) => { p.testo = 'Altro testo.'; }))], {
        author: 'estraneo',
      }),
      rules,
    );

    expect(verdetto.esito).toBe('respinto');
    expect(verdetto.ruolo).toBe('sconosciuto');
    expect(verdetto.livello).toBeNull();
    expect(verdetto.violazioni).toHaveLength(1);
    expect(verdetto.violazioni[0]).toMatchObject({ azione: 'autore' });
    expect(verdetto.violazioni[0].messaggio).toContain('non è autorizzat');
    expect(verdetto.violazioni[0].messaggio).toContain('@estraneo');
  });

  it("2b. l'autore sconosciuto è respinto per autore anche se la proposta è in bozza o senza etichette", () => {
    for (const altro of [{ draft: true }, { labels: [] }]) {
      const verdetto = evaluate(proposta([], { author: 'estraneo', ...altro }), rules);
      expect(verdetto.esito).toBe('respinto');
      expect(verdetto.violazioni.map((v) => v.azione)).toEqual(['autore']);
    }
  });

  it("2c. un autore con un nome simile a quello di un utente autorizzato non passa", () => {
    for (const autore of ['eusebjo2', 'xeusebjo', 'eusebjo[bot]', 'lei-bis', '']) {
      expect(evaluate(proposta([], { author: autore }), rules).esito).toBe('respinto');
    }
  });
});

describe('evaluate, stato della proposta (focus 4)', () => {
  const modificaValida = modificato(
    NEGOZIO,
    negozioJson(),
    negozioJson((n) => {
      n.orari = ORARI_LUNEDI;
    }),
  );

  it('14. con draft: true la redazione è in_bozza, violazione stato', () => {
    const verdetto = evaluate(proposta([modificaValida], { draft: true }), rules);

    expect(verdetto.esito).toBe('in_bozza');
    expect(verdetto.ruolo).toBe('redazione');
    expect(verdetto.livello).toBeNull();
    expect(verdetto.violazioni).toHaveLength(1);
    expect(verdetto.violazioni[0]).toMatchObject({ azione: 'stato' });
    expect(verdetto.violazioni[0].messaggio).toMatch(/bozza/);
  });

  it('14. senza etichette la redazione è in_bozza, violazione stato', () => {
    const verdetto = evaluate(proposta([modificaValida], { labels: [] }), rules);

    expect(verdetto.esito).toBe('in_bozza');
    expect(verdetto.violazioni).toHaveLength(1);
    expect(verdetto.violazioni[0]).toMatchObject({ azione: 'stato' });
    expect(verdetto.violazioni[0].messaggio).toMatch(/inviata/);
  });

  it('14. un esito in_bozza non elenca anche le violazioni sui file', () => {
    const verdetto = evaluate(
      proposta([modificato('src/layouts/BaseLayout.astro', 'a', 'b')], { draft: true }),
      rules,
    );
    expect(verdetto.esito).toBe('in_bozza');
    expect(verdetto.violazioni.map((v) => v.azione)).toEqual(['stato']);
  });

  it('14. etichette estranee a stati_inviati non bastano; contano solo quelle esatte', () => {
    for (const labels of [
      ['bug'],
      ['livello-1-serve-approvazione'],
      ['Sveltia-CMS/Pending_Review'],
      ['sveltia-cms/pending_review '],
      ['sveltia-cms/draft'],
    ]) {
      expect(evaluate(proposta([modificaValida], { labels }), rules).esito).toBe('in_bozza');
    }
  });

  it('entrambe le etichette di stato inviato sono accettate, anche insieme ad altre', () => {
    for (const labels of [
      ['sveltia-cms/pending_review'],
      ['sveltia-cms/pending_publish'],
      ['bug', 'sveltia-cms/pending_publish'],
    ]) {
      expect(evaluate(proposta([modificaValida], { labels }), rules).esito).toBe('consentito');
    }
  });

  it('draft con etichetta di invio resta in_bozza', () => {
    const verdetto = evaluate(
      proposta([modificaValida], { draft: true, labels: ['sveltia-cms/pending_review'] }),
      rules,
    );
    expect(verdetto.esito).toBe('in_bozza');
  });
});

describe('evaluate, campi di negozio.json', () => {
  it('3. lei modifica solo orari: consentito, livello 1', () => {
    const verdetto = evaluate(
      proposta([
        modificato(
          NEGOZIO,
          negozioJson(),
          negozioJson((n) => {
            n.orari = ORARI_LUNEDI;
          }),
        ),
      ]),
      rules,
    );

    expect(verdetto).toEqual({
      ruolo: 'redazione',
      esito: 'consentito',
      livello: 1,
      violazioni: [],
    });
  });

  it('3b. lei può modificare descrizione, telefono ed email', () => {
    const verdetto = evaluate(
      proposta([
        modificato(
          NEGOZIO,
          negozioJson(),
          negozioJson((n) => {
            n.descrizione = 'Biancheria per la casa, lenzuola, asciugamani e tende.';
            n.telefono = '0586 123456';
            n.email = 'info@example.com';
          }),
        ),
      ]),
      rules,
    );
    expect(verdetto.esito).toBe('consentito');
    expect(verdetto.livello).toBe(1);
  });

  it('4. lei modifica nome: respinto, campo nome', () => {
    const verdetto = evaluate(
      proposta([
        modificato(
          NEGOZIO,
          negozioJson(),
          negozioJson((n) => {
            n.nome = 'Un altro nome';
          }),
        ),
      ]),
      rules,
    );

    expect(verdetto.esito).toBe('respinto');
    expect(verdetto.livello).toBeNull();
    expect(verdetto.violazioni).toHaveLength(1);
    expect(verdetto.violazioni[0]).toMatchObject({
      file: NEGOZIO,
      campo: 'nome',
      azione: 'modifica',
    });
  });

  it('5. orari e nome nello stesso file: respinto, una sola violazione, per nome (focus 2)', () => {
    const verdetto = evaluate(
      proposta([
        modificato(
          NEGOZIO,
          negozioJson(),
          negozioJson((n) => {
            n.orari = ORARI_LUNEDI;
            n.nome = 'Un altro nome';
          }),
        ),
      ]),
      rules,
    );

    expect(verdetto.esito).toBe('respinto');
    expect(verdetto.violazioni).toHaveLength(1);
    expect(verdetto.violazioni[0]).toMatchObject({ file: NEGOZIO, campo: 'nome' });
    expect(JSON.stringify(verdetto.violazioni)).not.toContain('orari');
  });

  it('6. lei modifica indirizzo.via: respinto, campo indirizzo.via', () => {
    const verdetto = evaluate(
      proposta([
        modificato(
          NEGOZIO,
          negozioJson(),
          negozioJson((n) => {
            n.indirizzo.via = 'Via Roma';
          }),
        ),
      ]),
      rules,
    );

    expect(verdetto.esito).toBe('respinto');
    expect(verdetto.violazioni).toHaveLength(1);
    expect(verdetto.violazioni[0]).toMatchObject({ campo: 'indirizzo.via' });
  });

  it('6b. ogni campo vietato modificato produce una violazione, in ordine', () => {
    const verdetto = evaluate(
      proposta([
        modificato(
          NEGOZIO,
          negozioJson(),
          negozioJson((n) => {
            n.nome = 'Altro';
            n.indirizzo.cap = '00100';
            n.indirizzo.citta = 'Roma';
          }),
        ),
      ]),
      rules,
    );
    expect(verdetto.violazioni.map((v) => v.campo)).toEqual([
      'nome',
      'indirizzo.cap',
      'indirizzo.citta',
    ]);
  });

  it('6c. un campo sconosciuto o dal nome simile a uno consentito è vietato (nessuna regola vale 0)', () => {
    const verdetto = evaluate(
      proposta([
        modificato(
          NEGOZIO,
          negozioJson(),
          negozioJson((n) => {
            (n as unknown as Record<string, unknown>).nomecompleto = 'x';
            (n as unknown as Record<string, unknown>).orari2 = [];
            (n as unknown as Record<string, unknown>).telefono2 = 'x';
          }),
        ),
      ]),
      rules,
    );
    expect(verdetto.esito).toBe('respinto');
    expect(verdetto.violazioni.map((v) => v.campo)).toEqual([
      'nomecompleto',
      'orari2',
      'telefono2',
    ]);
  });

  it('6d. campi dal nome ereditato dagli oggetti (constructor, __proto__) sono vietati', () => {
    const dopo = JSON.stringify({
      ...JSON.parse(negozioJson()),
      constructor: 'x',
    }).replace('{', '{"__proto__":{"x":1},');
    const verdetto = evaluate(
      proposta([modificato(NEGOZIO, negozioJson(), dopo)]),
      rules,
    );
    expect(verdetto.esito).toBe('respinto');
    expect(verdetto.violazioni.map((v) => v.campo).sort()).toEqual(['__proto__', 'constructor']);
  });

  it('6e. un campo con un punto nel nome è un errore di formato, mai un sotto-campo di uno consentito', () => {
    for (const chiave of ['indirizzo.via', 'nome.x', 'orari.extra', 'descrizione.x']) {
      const verdetto = evaluate(
        proposta([
          modificato(
            NEGOZIO,
            negozioJson(),
            negozioJson((n) => {
              (n as unknown as Record<string, unknown>)[chiave] = 'x';
            }),
          ),
        ]),
        rules,
      );
      expect(verdetto.esito, chiave).toBe('respinto');
      expect(verdetto.violazioni.map((v) => [v.file, v.azione]), chiave).toEqual([
        [NEGOZIO, 'formato'],
      ]);
    }
  });

  it('6e. lo stesso vale per un campo con nome vuoto e per i nomi annidati o dentro gli array', () => {
    const testi = [
      JSON.stringify({ ...JSON.parse(negozioJson()), '': 'x' }),
      JSON.stringify({ ...JSON.parse(negozioJson()), orari: [{ 'giorno.x': 'lunedi' }] }),
      JSON.stringify({ ...JSON.parse(negozioJson()), indirizzo: { ...JSON.parse(negozioJson()).indirizzo, '': 'x' } }),
    ];
    for (const dopo of testi) {
      const verdetto = evaluate(proposta([modificato(NEGOZIO, negozioJson(), dopo)]), rules);
      expect(verdetto.violazioni.map((v) => v.azione), dopo).toEqual(['formato']);
    }
  });

  it('6e. un campo del frontmatter con un punto o vuoto (corpo.x) è un errore di formato (regole di prova)', () => {
    for (const riga of ['corpo.x: 1', 'titolo.extra: 1', '"": 1', 'altro:\n  "a.b": 1']) {
      const dopo = notaMd().replace('---\n\n', `${riga}\n---\n\n`);
      const verdetto = evaluate(proposta([modificato(NOTA, notaMd(), dopo)]), regoleConNoteEImmagini);
      expect(verdetto.esito, riga).toBe('respinto');
      expect(verdetto.violazioni.map((v) => [v.file, v.azione]), riga).toEqual([[NOTA, 'formato']]);
    }
  });

  it('6f. sostituire un oggetto vietato con un altro tipo di valore è una modifica vietata', () => {
    const dopo = JSON.stringify({ ...JSON.parse(negozioJson()), indirizzo: 'Via Roma 1' });
    const verdetto = evaluate(proposta([modificato(NEGOZIO, negozioJson(), dopo)]), rules);
    expect(verdetto.violazioni).toHaveLength(1);
    expect(verdetto.violazioni[0]).toMatchObject({ campo: 'indirizzo' });
  });

  it('15. negozio.json con JSON non valido dopo la modifica: respinto, azione formato', () => {
    const verdetto = evaluate(
      proposta([modificato(NEGOZIO, negozioJson(), '{"nome": "Alma Living", ')]),
      rules,
    );

    expect(verdetto.esito).toBe('respinto');
    expect(verdetto.violazioni).toHaveLength(1);
    expect(verdetto.violazioni[0]).toMatchObject({ file: NEGOZIO, azione: 'formato' });
  });

  it('15b. un JSON che non è un oggetto, o contenuto mancante, è un errore di formato', () => {
    for (const dopo of ['[]', 'null', '']) {
      const verdetto = evaluate(proposta([modificato(NEGOZIO, negozioJson(), dopo)]), rules);
      expect(verdetto.violazioni.map((v) => v.azione)).toEqual(['formato']);
    }
    const senzaDopo: ChangedFile = { path: NEGOZIO, status: 'modified', before: negozioJson(), after: null };
    expect(evaluate(proposta([senzaDopo]), rules).violazioni[0]).toMatchObject({ azione: 'formato' });
    const senzaPrima: ChangedFile = { path: NEGOZIO, status: 'modified', before: null, after: negozioJson() };
    expect(evaluate(proposta([senzaPrima]), rules).violazioni[0]).toMatchObject({ azione: 'formato' });
  });

  it('15c. se il contenuto di partenza non è leggibile non si può confrontare: formato', () => {
    const verdetto = evaluate(
      proposta([modificato(NEGOZIO, '{rotto', negozioJson())]),
      rules,
    );
    expect(verdetto.violazioni.map((v) => v.azione)).toEqual(['formato']);
  });

  it('un file modificato senza differenze nei campi (solo formattazione) non tocca nessun livello', () => {
    const verdetto = evaluate(
      proposta([modificato(NEGOZIO, negozioJson(), JSON.stringify(JSON.parse(negozioJson())))]),
      rules,
    );
    expect(verdetto.esito).toBe('consentito');
    expect(verdetto.livello).toBe(1);
    expect(verdetto.violazioni).toEqual([]);
  });
});

describe('evaluate, perimetro dei file', () => {
  it.each([
    ['src/layouts/BaseLayout.astro'],
    ['autonomia.yml'],
    ['.github/workflows/ci.yml'],
    ['public/admin/config.yml'],
    ['package.json'],
    ['src/content/schemas.ts'],
    ['src/content/negozio/altro.json'],
    ['src/content/post/sotto/annidato.json'],
    ['src/content/post/p1.md'],
    ['src/content/prodotti/sabbia.yml'],
    ['src/content/storie/oggi.txt'],
    // La collection `pagine` non c'è più: i suoi file sono fuori perimetro.
    ['src/content/pagine/home.md'],
    ['src/content/pagine/immagini/home.webp'],
  ])('7. lei modifica %s: respinto, azione perimetro', (percorso) => {
    const verdetto = evaluate(proposta([modificato(percorso, 'a', 'b')]), rules);

    expect(verdetto.esito).toBe('respinto');
    expect(verdetto.violazioni).toHaveLength(1);
    expect(verdetto.violazioni[0]).toMatchObject({ file: percorso, azione: 'perimetro' });
  });

  it.each([
    ['src/content/post/../../../.github/workflows/ci.yml'],
    ['src/content/post/./p1.json'],
    ['src/content/post/../negozio/negozio.json'],
    ['src\\content\\post\\p1.json'],
    ['src/content/post\\..\\..\\..\\.github\\ci.yml'],
    ['/src/content/post/p1.json'],
    ['src//content/post/p1.json'],
    ['src/content/post//p1.json'],
    ['src/content/post/p1.json/'],
    ['src/content/post/.nascosto.json'],
    ['src/content/post/.cartella/p1.json'],
    ['SRC/content/post/p1.json'],
    ['src/content/post/p1.json\0.png'],
    [`${IMMAGINI}/../../../../.github/workflows/ci.yml`],
    [`${IMMAGINI}//foto.webp`],
    [`${IMMAGINI}/estate//foto.webp`],
    [`${IMMAGINI}/.nascosto.webp`],
    [`${IMMAGINI}/.cartella/foto.webp`],
    [''],
  ])('7b. il percorso anomalo %j è fuori perimetro (nessuna scorciatoia con ../, backslash o simili)', (percorso) => {
    // Con le regole di prova, così anche la cartella delle immagini ha le sue trappole.
    for (const regole of [rules, regoleConNoteEImmagini]) {
      const verdetto = evaluate(
        proposta([{ ...modificato(percorso, 'a', 'b'), sizeBytes: 10 }]),
        regole,
      );
      expect(verdetto.esito).toBe('respinto');
      expect(verdetto.violazioni.map((v) => v.azione)).toContain('perimetro');
    }
  });

  it('7c. una proposta con un file di contenuto valido e uno fuori perimetro è respinta per intero', () => {
    const verdetto = evaluate(
      proposta([
        modificato(
          NEGOZIO,
          negozioJson(),
          negozioJson((n) => {
            n.orari = ORARI_LUNEDI;
          }),
        ),
        modificato('src/layouts/BaseLayout.astro', 'a', 'b'),
      ]),
      rules,
    );
    expect(verdetto.esito).toBe('respinto');
    expect(verdetto.violazioni).toHaveLength(1);
    expect(verdetto.violazioni[0]).toMatchObject({
      file: 'src/layouts/BaseLayout.astro',
      azione: 'perimetro',
    });
  });

  it('un file aggiunto o rimosso fuori perimetro è una violazione di perimetro', () => {
    const verdetto = evaluate(
      proposta([aggiunto('src/nuovo.ts', 'x'), rimosso('src/vecchio.ts', 'x')]),
      rules,
    );
    expect(verdetto.violazioni.map((v) => [v.file, v.azione])).toEqual([
      ['src/nuovo.ts', 'perimetro'],
      ['src/vecchio.ts', 'perimetro'],
    ]);
  });

  it('un tipo di modifica non riconosciuto (es. copied di GitHub) non passa', () => {
    const strano = { ...modificato(POST, postJson(), postJson()), status: 'copied' } as unknown as ChangedFile;
    const verdetto = evaluate(proposta([strano]), rules);
    expect(verdetto.esito).toBe('respinto');
    expect(verdetto.violazioni[0]).toMatchObject({ file: POST, azione: 'perimetro' });
  });

  it.each([
    'src/content/post/cuscini.webp',
    'src/content/prodotti/sabbia.jpg',
    'src/content/storie/oggi.png',
    'src/content/immagini/foto.webp',
    'public/foto.webp',
  ])('con le regole vere nessun file si carica nel repository: %s è fuori perimetro', (percorso) => {
    // Le foto stanno su R2 (`media.percorsi` è vuoto): una foto nel repository
    // pubblico, aggiunta o modificata, è sempre respinta.
    for (const status of ['added', 'modified'] as const) {
      const verdetto = evaluate(proposta([immagine(percorso, kb(100), status)]), rules);
      expect(verdetto.esito, status).toBe('respinto');
      expect(verdetto.violazioni.map((v) => [v.file, v.azione]), status).toEqual([
        [percorso, 'perimetro'],
      ]);
    }
  });
});

describe('evaluate, creazione, eliminazione e rinomina di contenuti', () => {
  const NUOVO_POST = 'src/content/post/nuovo.json';
  const NUOVA_STORIA = 'src/content/storie/nuova.json';

  it('8. lei crea src/content/post/nuovo.json valido: consentito, livello 1', () => {
    expect(evaluate(proposta([aggiunto(NUOVO_POST, postJson())]), rules)).toEqual({
      ruolo: 'redazione',
      esito: 'consentito',
      livello: 1,
      violazioni: [],
    });
  });

  it('8b. lei crea un prodotto: consentito, livello 1', () => {
    const verdetto = evaluate(
      proposta([aggiunto('src/content/prodotti/plaid-abbracciami.json', prodottoJson())]),
      rules,
    );
    expect(verdetto).toMatchObject({ esito: 'consentito', livello: 1 });
  });

  it('8c. lei crea src/content/storie/nuova.json: respinto, «Non puoi creare nuovi contenuti.»', () => {
    const verdetto = evaluate(proposta([aggiunto(NUOVA_STORIA, storiaJson())]), rules);

    expect(verdetto.esito).toBe('respinto');
    expect(verdetto.violazioni).toEqual([
      { file: NUOVA_STORIA, azione: 'crea', messaggio: 'Non puoi creare nuovi contenuti.' },
    ]);
  });

  it('8d. un post nuovo che non si legge come JSON è un errore di formato', () => {
    const verdetto = evaluate(proposta([aggiunto(NUOVO_POST, '{"data": ')]), rules);
    expect(verdetto.violazioni.map((v) => [v.file, v.azione])).toEqual([[NUOVO_POST, 'formato']]);
  });

  it('9. lei toglie un post o un prodotto: consentito, livello 1', () => {
    const verdetto = evaluate(
      proposta([rimosso(POST, postJson()), rimosso(PRODOTTO, prodottoJson())]),
      rules,
    );
    expect(verdetto).toMatchObject({ esito: 'consentito', livello: 1, violazioni: [] });
  });

  it('9b. lei toglie una storia: respinto, azione elimina', () => {
    const verdetto = evaluate(proposta([rimosso(STORIA, storiaJson())]), rules);

    expect(verdetto.esito).toBe('respinto');
    expect(verdetto.violazioni).toHaveLength(1);
    expect(verdetto.violazioni[0]).toMatchObject({ file: STORIA, azione: 'elimina' });
  });

  it('10. lei rinomina una storia: respinto (elimina della vecchia più crea della nuova)', () => {
    const verdetto = evaluate(proposta([rinominato(STORIA, NUOVA_STORIA, storiaJson())]), rules);

    expect(verdetto.esito).toBe('respinto');
    expect(verdetto.violazioni.map((v) => [v.file, v.azione])).toEqual([
      [STORIA, 'elimina'],
      [NUOVA_STORIA, 'crea'],
    ]);
  });

  it('10b. spostare un contenuto fuori dal perimetro, o un file esterno dentro, è respinto', () => {
    const fuori = evaluate(
      proposta([rinominato(STORIA, 'src/pages/oggi.json', storiaJson())]),
      rules,
    );
    expect(fuori.violazioni.map((v) => [v.file, v.azione])).toEqual([
      [STORIA, 'elimina'],
      ['src/pages/oggi.json', 'perimetro'],
    ]);

    const dentro = evaluate(
      proposta([rinominato('src/layouts/Altro.astro', NUOVO_POST, postJson())]),
      rules,
    );
    expect(dentro.violazioni.map((v) => [v.file, v.azione])).toEqual([
      ['src/layouts/Altro.astro', 'perimetro'],
    ]);
  });

  it('10c. una rinomina senza percorso precedente non si può verificare ed è respinta', () => {
    const senzaOrigine: ChangedFile = {
      path: NUOVO_POST,
      status: 'renamed',
      before: postJson(),
      after: postJson(),
    };
    const verdetto = evaluate(proposta([senzaOrigine]), rules);
    expect(verdetto.esito).toBe('respinto');
    expect(verdetto.violazioni[0]).toMatchObject({ azione: 'perimetro' });
  });

  it('negozio.json non si può eliminare né creare', () => {
    expect(evaluate(proposta([rimosso(NEGOZIO, negozioJson())]), rules).violazioni[0]).toMatchObject({
      azione: 'elimina',
    });
    expect(evaluate(proposta([aggiunto(NEGOZIO, negozioJson())]), rules).violazioni[0]).toMatchObject({
      azione: 'crea',
    });
  });
});

describe('evaluate, campi di prodotti, post e storie', () => {
  it('lei cambia testo e foto di un post: consentito, livello 1', () => {
    const dopo = postJson((p) => {
      p.testo = 'Un testo nuovo per il post.';
      p.foto[0]!.inquadratura = 'alto';
    });
    expect(evaluate(proposta([modificato(POST, postJson(), dopo)]), rules)).toEqual({
      ruolo: 'redazione',
      esito: 'consentito',
      livello: 1,
      violazioni: [],
    });
  });

  it('lei cambia nome, categorie e colori di un prodotto: consentito, livello 1', () => {
    const dopo = prodottoJson((p) => {
      p.nome = 'Lenzuola sabbia';
      p.categorie = ['letto', 'bagno'];
      p.colori = [{ nome: 'sabbia', tinta: '#d8c3a5' }];
    });
    expect(evaluate(proposta([modificato(PRODOTTO, prodottoJson(), dopo)]), rules)).toMatchObject({
      esito: 'consentito',
      livello: 1,
    });
  });

  it('lei cambia data, etichetta, invito e foto di una storia: consentito, livello 1', () => {
    const dopo = storiaJson((s) => {
      s.data = '2026-11-03';
      delete s.etichetta;
      s.invito = 'chiama';
      s.foto[0]!.frase = 'Una frase nuova.';
    });
    expect(evaluate(proposta([modificato(STORIA, storiaJson(), dopo)]), rules)).toMatchObject({
      esito: 'consentito',
      livello: 1,
    });
  });

  it('il nome di una storia non si cambia: respinto, campo nome', () => {
    const dopo = storiaJson((s) => {
      s.nome = 'Domani';
    });
    const verdetto = evaluate(proposta([modificato(STORIA, storiaJson(), dopo)]), rules);
    expect(verdetto.esito).toBe('respinto');
    expect(verdetto.violazioni).toEqual([
      expect.objectContaining({ file: STORIA, campo: 'nome', azione: 'modifica' }),
    ]);
  });

  it('un campo che lo schema non prevede è vietato', () => {
    const dopo = JSON.stringify({ ...JSON.parse(postJson()), bozza: true });
    const verdetto = evaluate(proposta([modificato(POST, postJson(), dopo)]), rules);
    expect(verdetto.violazioni.map((v) => [v.file, v.campo])).toEqual([[POST, 'bozza']]);
  });
});

describe('evaluate, contenuti in Markdown (regole di prova)', () => {
  const regole = regoleConNoteEImmagini;

  it('13. lei modifica titolo e corpo di una nota: consentito', () => {
    const verdetto = evaluate(
      proposta([
        modificato(
          NOTA,
          notaMd(),
          notaMd({ titolo: 'Un titolo nuovo', corpo: 'Un testo completamente nuovo.' }),
        ),
      ]),
      regole,
    );

    expect(verdetto).toEqual({
      ruolo: 'redazione',
      esito: 'consentito',
      livello: 1,
      violazioni: [],
    });
  });

  it('lei può cambiare descrizione e immagine di una nota', () => {
    const verdetto = evaluate(
      proposta([
        modificato(
          NOTA,
          notaMd(),
          notaMd({
            descrizione: 'Una descrizione nuova della nota.',
            immagine: './immagini/foto.webp',
          }),
        ),
      ]),
      regole,
    );
    expect(verdetto.esito).toBe('consentito');
  });

  it('aggiungere un campo che la nota non prevede (nessuna regola) è vietato', () => {
    const dopo = notaMd().replace('---\n\n', 'bozza: false\n---\n\n');
    const verdetto = evaluate(proposta([modificato(NOTA, notaMd(), dopo)]), regole);
    expect(verdetto.esito).toBe('respinto');
    expect(verdetto.violazioni).toHaveLength(1);
    expect(verdetto.violazioni[0]).toMatchObject({ file: NOTA, campo: 'bozza' });
  });

  it('differenze di sole righe a capo o spazi attorno al corpo non contano come modifiche', () => {
    const verdetto = evaluate(
      proposta([
        modificato(NOTA, notaMd(), notaMd({ fineRiga: '\r\n', corpo: '   Testo segnaposto della nota.   ' })),
      ]),
      regole,
    );
    expect(verdetto.esito).toBe('consentito');
    expect(verdetto.livello).toBe(1);
  });

  it('un frontmatter scritto in un linguaggio diverso da YAML è un errore di formato e non viene eseguito', () => {
    const globale = globalThis as Record<string, unknown>;
    const dopo = `---js\n{ titolo: (globalThis.__autonomiaValutazione = true, 'x') }\n---\nTesto`;
    const verdetto = evaluate(proposta([modificato(NOTA, notaMd(), dopo)]), regole);

    expect(globale.__autonomiaValutazione).toBeUndefined();
    expect(verdetto.esito).toBe('respinto');
    expect(verdetto.violazioni.map((v) => v.azione)).toEqual(['formato']);
  });

  it('un frontmatter rotto è un errore di formato', () => {
    const verdetto = evaluate(
      proposta([modificato(NOTA, notaMd(), '---\ntitolo: [aperta\n---\nTesto')]),
      regole,
    );
    expect(verdetto.violazioni.map((v) => v.azione)).toEqual(['formato']);
  });
});

describe('evaluate, immagini caricate nel repository (regole di prova)', () => {
  const regole = regoleConNoteEImmagini;

  it('11. lei carica immagini/foto.webp da 900 KB: consentito', () => {
    const verdetto = evaluate(proposta([immagine(FOTO_WEBP, kb(900))]), regole);

    expect(verdetto).toEqual({
      ruolo: 'redazione',
      esito: 'consentito',
      livello: 1,
      violazioni: [],
    });
  });

  it('12. lei carica immagini/foto.jpg da 9.000 KB: respinto, azione dimensione (focus 3)', () => {
    const verdetto = evaluate(proposta([immagine(FOTO_JPG, kb(9000))]), regole);

    expect(verdetto.esito).toBe('respinto');
    expect(verdetto.violazioni).toHaveLength(1);
    expect(verdetto.violazioni[0]).toMatchObject({ file: FOTO_JPG, azione: 'dimensione' });
    expect(verdetto.violazioni[0].messaggio).toContain('9.000 KB');
    expect(verdetto.violazioni[0].messaggio).toContain('1.500 KB');
  });

  it('12b. il limite è inclusivo: 1.500 KB esatti passano, un byte in più no', () => {
    expect(evaluate(proposta([immagine(FOTO_WEBP, kb(1500))]), regole).esito).toBe('consentito');
    expect(evaluate(proposta([immagine(FOTO_WEBP, kb(1500) + 1)]), regole).esito).toBe('respinto');
  });

  it('12c. il limite si applica anche a una foto modificata e a una già presente sostituita', () => {
    const verdetto = evaluate(proposta([immagine(FOTO_WEBP, kb(2000), 'modified')]), regole);
    expect(verdetto.violazioni.map((v) => v.azione)).toEqual(['dimensione']);
  });

  it('12d. senza la dimensione il limite non si può verificare: respinto (si rifiuta ciò che non si sa misurare)', () => {
    for (const dimensione of [undefined, Number.NaN, -1, Number.POSITIVE_INFINITY]) {
      const verdetto = evaluate(proposta([immagine(FOTO_WEBP, dimensione)]), regole);
      expect(verdetto.esito).toBe('respinto');
      expect(verdetto.violazioni.map((v) => v.azione)).toEqual(['dimensione']);
    }
  });

  it('modificare un\'immagine già presente conta come caricamento (livello 1)', () => {
    const verdetto = evaluate(proposta([immagine(FOTO_WEBP, kb(100), 'modified')]), regole);
    expect(verdetto).toMatchObject({ esito: 'consentito', livello: 1 });
  });

  it('eliminare un\'immagine è vietato; la dimensione non serve', () => {
    const verdetto = evaluate(proposta([immagine(FOTO_WEBP, undefined, 'removed')]), regole);
    expect(verdetto.esito).toBe('respinto');
    expect(verdetto.violazioni.map((v) => [v.file, v.azione])).toEqual([[FOTO_WEBP, 'elimina']]);
  });

  it('rinominare un\'immagine è vietato (elimina più carica)', () => {
    const nuovo = `${IMMAGINI}/nuova.webp`;
    const rinomina: ChangedFile = {
      path: nuovo,
      previousPath: FOTO_WEBP,
      status: 'renamed',
      before: null,
      after: null,
      sizeBytes: kb(100),
    };
    const verdetto = evaluate(proposta([rinomina]), regole);
    expect(verdetto.violazioni.map((v) => [v.file, v.azione])).toEqual([[FOTO_WEBP, 'elimina']]);
  });

  it('immagini in sottocartelle del percorso dei media sono ammesse', () => {
    const verdetto = evaluate(
      proposta([immagine(`${IMMAGINI}/estate/mare.webp`, kb(100))]),
      regole,
    );
    expect(verdetto.esito).toBe('consentito');
  });

  it('le immagini fuori da percorsi dei media sono fuori perimetro', () => {
    const verdetto = evaluate(proposta([immagine('public/foto.webp', kb(100))]), regole);
    expect(verdetto.violazioni.map((v) => v.azione)).toEqual(['perimetro']);
  });

  it('una proposta con testo e foto valide è consentita a livello 1', () => {
    const verdetto = evaluate(
      proposta([
        modificato(NOTA, notaMd(), notaMd({ immagine: './immagini/foto.webp' })),
        immagine(FOTO_WEBP, kb(900)),
      ]),
      regole,
    );
    expect(verdetto).toMatchObject({ esito: 'consentito', livello: 1 });
  });
});

describe('evaluate, campi nascosti nel frontmatter (stessa lettura della build, regole di prova)', () => {
  const regole = regoleConNoteEImmagini;
  const BOM = String.fromCharCode(0xfeff);
  const conSlug = notaMd().replace('---\n\n', 'slug: altra\n---\n\n');

  it('la modifica normale che aggiunge slug è respinta per il campo slug', () => {
    const verdetto = evaluate(proposta([modificato(NOTA, notaMd(), conSlug)]), regole);
    expect(verdetto.violazioni.map((v) => [v.azione, v.campo])).toEqual([['modifica', 'slug']]);
  });

  const nascoste: Record<string, string> = {
    'una riga vuota prima del frontmatter': `\n${conSlug}`,
    'spazi e a capo prima del frontmatter': `  \n${conSlug}`,
    'più righe vuote prima del frontmatter': `\n\n \t\n${conSlug}`,
    'frontmatter TOML': '+++\ntitolo = "Alma Living"\nslug = "altra"\n+++\n\nTesto segnaposto.\n',
    'frontmatter TOML dopo una riga vuota': '\n+++\ntitolo = "Alma Living"\nslug = "altra"\n+++\n\nTesto.\n',
    'due BOM': `${BOM}${BOM}${conSlug}`,
    'due BOM e linguaggio json': `${BOM}${BOM}---json\n{"slug": "altra"}\n---\n\nTesto.\n`,
    'frontmatter chiuso con +++': conSlug.replace('slug: altra\n---', 'slug: altra\n+++'),
  };

  it.each(Object.entries(nascoste))(
    'respinge (formato) il frontmatter nascosto: %s',
    (_nome, dopo) => {
      const verdetto = evaluate(proposta([modificato(NOTA, notaMd(), dopo)]), regole);

      expect(verdetto.esito).toBe('respinto');
      expect(verdetto.violazioni.map((v) => [v.file, v.azione])).toEqual([[NOTA, 'formato']]);
    },
  );

  it('anche se il frontmatter nascosto è già nel contenuto di partenza', () => {
    const verdetto = evaluate(
      proposta([modificato(NOTA, `\n${conSlug}`, `\n${conSlug}\nUn paragrafo in più.`)]),
      regole,
    );
    expect(verdetto.violazioni.map((v) => v.azione)).toEqual(['formato']);
  });

  it('la build di Astro vede davvero lo slug nelle prime forme (il caso è reale)', () => {
    for (const dopo of [nascoste['una riga vuota prima del frontmatter'], nascoste['frontmatter TOML']]) {
      expect(parseFrontmatter(dopo).frontmatter.slug).toBe('altra');
    }
  });

  it('una chiave di unione YAML (<<) non nasconde campi: è un campo sconosciuto e vietato', () => {
    const dopo = notaMd().replace('---\n\n', 'base: &b {slug: altra}\n<<: *b\n---\n\n');
    const verdetto = evaluate(proposta([modificato(NOTA, notaMd(), dopo)]), regole);
    expect(verdetto.esito).toBe('respinto');
    expect(verdetto.violazioni.map((v) => v.campo)).toEqual(['base', '<<']);
  });

  it('una nota aggiunta da chi ha crea > 0 è controllata con la stessa regola', () => {
    const conCrea: Rules = {
      ...regole,
      contenuti: {
        ...regole.contenuti,
        note: { ...regole.contenuti.note!, azioni: { crea: 1, modifica: 1, elimina: 0 } },
      },
    };
    const nuova = 'src/content/note/nuova.md';
    expect(evaluate(proposta([aggiunto(nuova, notaMd())]), conCrea).esito).toBe('consentito');
    for (const testo of Object.values(nascoste)) {
      expect(evaluate(proposta([aggiunto(nuova, testo)]), conCrea).violazioni.map((v) => v.azione)).toEqual([
        'formato',
      ]);
    }
  });
});

describe('evaluate, tipi di immagine ammessi (regole di prova)', () => {
  const regole = regoleConNoteEImmagini;
  const caricaFile = (nome: string, status: ChangedFile['status'] = 'added') =>
    proposta([immagine(`${IMMAGINI}/${nome}`, kb(100), status)]);

  it.each(['webp', 'jpg', 'jpeg', 'png', 'avif'])('accetta .%s', (estensione) => {
    const verdetto = evaluate(caricaFile(`foto.${estensione}`), regole);
    expect(verdetto).toMatchObject({ esito: 'consentito', livello: 1, violazioni: [] });
  });

  it.each(['foto.WEBP', 'foto.Jpg', 'foto.JPEG', 'foto.PnG', 'FOTO.AVIF'])(
    'accetta %s (maiuscole e minuscole indifferenti)',
    (nome) => {
      expect(evaluate(caricaFile(nome), regole).esito).toBe('consentito');
    },
  );

  it.each([
    'foto.svg',
    'foto.SVG',
    'foto.svgz',
    'pagina.html',
    'pagina.htm',
    'script.js',
    'dati.xml',
    'documento.pdf',
    'animazione.gif',
    'foto.heic',
    'foto.bmp',
    'foto.php',
    'foto.exe',
  ])('respinge %s con azione formato', (nome) => {
    const verdetto = evaluate(caricaFile(nome), regole);

    expect(verdetto.esito).toBe('respinto');
    expect(verdetto.violazioni).toHaveLength(1);
    expect(verdetto.violazioni[0]).toMatchObject({
      file: `${IMMAGINI}/${nome}`,
      azione: 'formato',
    });
  });

  it('conta l\'ultima estensione: foto.webp.svg è respinto, foto.svg.webp passa', () => {
    expect(evaluate(caricaFile('foto.webp.svg'), regole).violazioni.map((v) => v.azione)).toEqual([
      'formato',
    ]);
    expect(evaluate(caricaFile('foto.svg.webp'), regole).esito).toBe('consentito');
  });

  it.each(['foto', 'foto.', 'foto.svg.', 'foto.svg ', 'foto. webp', 'foto.webp '])(
    'respinge il nome senza una vera estensione ammessa: %j',
    (nome) => {
      expect(evaluate(caricaFile(nome), regole).violazioni.map((v) => v.azione)).toEqual(['formato']);
    },
  );

  it('si applica anche a un file modificato e alla destinazione di una rinomina', () => {
    expect(evaluate(caricaFile('foto.svg', 'modified'), regole).violazioni.map((v) => v.azione)).toEqual([
      'formato',
    ]);
    const rinomina: ChangedFile = {
      path: `${IMMAGINI}/nuova.svg`,
      previousPath: `${IMMAGINI}/vecchia.webp`,
      status: 'renamed',
      before: null,
      after: null,
      sizeBytes: kb(10),
    };
    expect(evaluate(proposta([rinomina]), regole).violazioni.map((v) => [v.file, v.azione])).toEqual([
      [`${IMMAGINI}/vecchia.webp`, 'elimina'],
      [`${IMMAGINI}/nuova.svg`, 'formato'],
    ]);
  });

  it('un file rimosso viene respinto per l\'eliminazione, non per il formato', () => {
    const verdetto = evaluate(
      proposta([immagine(`${IMMAGINI}/vecchia.svg`, undefined, 'removed')]),
      regole,
    );
    expect(verdetto.violazioni.map((v) => v.azione)).toEqual(['elimina']);
  });

  it('formato e dimensione sono segnalati insieme', () => {
    const verdetto = evaluate(
      proposta([immagine(`${IMMAGINI}/grande.svg`, kb(9000))]),
      regole,
    );
    expect(verdetto.violazioni.map((v) => v.azione).sort()).toEqual(['dimensione', 'formato']);
  });

  it('l\'elenco delle estensioni viene dalle regole, senza distinguere maiuscole e minuscole', () => {
    const soloPng: Rules = { ...regole, media: { ...regole.media, estensioni: ['PNG'] } };
    expect(evaluate(caricaFile('foto.png'), soloPng).esito).toBe('consentito');
    expect(evaluate(caricaFile('foto.webp'), soloPng).violazioni.map((v) => v.azione)).toEqual(['formato']);
    const nessuna: Rules = { ...regole, media: { ...regole.media, estensioni: [] } };
    expect(evaluate(caricaFile('foto.png'), nessuna).esito).toBe('respinto');
  });

  it('il messaggio dice, in italiano, quali formati si possono caricare', () => {
    const [violazione] = evaluate(caricaFile('foto.svg'), regole).violazioni;
    expect(violazione.messaggio).toMatch(/WEBP, JPG, JPEG, PNG o AVIF/);
    expect(violazione.messaggio).not.toMatch(/branch|merge|commit/i);
  });
});

describe('evaluate, livelli', () => {
  const negozioConLivelli = (campi: Record<string, 0 | 1 | 2 | 3 | 4>, modifica: 0 | 1 | 2 | 3 | 4): Rules => ({
    ...rules,
    contenuti: {
      ...rules.contenuti,
      negozio: {
        ...rules.contenuti.negozio,
        azioni: { crea: 0, modifica, elimina: 0 },
        campi,
      },
    },
  });

  const cambiaOrariETelefono = proposta([
    modificato(
      NEGOZIO,
      negozioJson(),
      negozioJson((n) => {
        n.orari = ORARI_LUNEDI;
        n.telefono = '0586 123456';
      }),
    ),
  ]);

  it('il livello del verdetto è il minimo dei livelli toccati', () => {
    const regole = negozioConLivelli({ orari: 3, telefono: 2 }, 4);
    expect(evaluate(cambiaOrariETelefono, regole)).toMatchObject({ esito: 'consentito', livello: 2 });
  });

  it("il livello dell'azione modifica fa da tetto al livello del campo", () => {
    const regole = negozioConLivelli({ orari: 3, telefono: 3 }, 2);
    expect(evaluate(cambiaOrariETelefono, regole)).toMatchObject({ esito: 'consentito', livello: 2 });
  });

  it("un campo a livello 0 vieta la modifica anche se l'azione modifica è a livello 4", () => {
    const regole = negozioConLivelli({ orari: 4, telefono: 0 }, 4);
    const verdetto = evaluate(cambiaOrariETelefono, regole);
    expect(verdetto.esito).toBe('respinto');
    expect(verdetto.violazioni.map((v) => v.campo)).toEqual(['telefono']);
  });

  it("se l'azione modifica è a livello 0 ogni modifica al file è vietata, anche su campi a livello alto", () => {
    const regole = negozioConLivelli({ orari: 4, telefono: 4 }, 0);
    const verdetto = evaluate(cambiaOrariETelefono, regole);
    expect(verdetto.esito).toBe('respinto');
    expect(verdetto.violazioni).toHaveLength(1);
    expect(verdetto.violazioni[0]).toMatchObject({ file: NEGOZIO, azione: 'modifica' });
    expect(verdetto.violazioni[0].campo).toBeUndefined();
  });

  it('media e contenuti si combinano con il minimo', () => {
    const regole: Rules = {
      ...negozioConLivelli({ orari: 3 }, 4),
      media: { ...regoleConNoteEImmagini.media, azioni: { carica: 2, elimina: 0 } },
    };
    const verdetto = evaluate(
      proposta([
        modificato(
          NEGOZIO,
          negozioJson(),
          negozioJson((n) => {
            n.orari = ORARI_LUNEDI;
          }),
        ),
        immagine(FOTO_WEBP, kb(100)),
      ]),
      regole,
    );
    expect(verdetto).toMatchObject({ esito: 'consentito', livello: 2 });
  });

  it('se il caricamento delle immagini è a livello 0 ogni immagine è vietata', () => {
    const regole: Rules = {
      ...regoleConNoteEImmagini,
      media: { ...regoleConNoteEImmagini.media, azioni: { carica: 0, elimina: 0 } },
    };
    const verdetto = evaluate(proposta([immagine(FOTO_WEBP, kb(10))]), regole);
    expect(verdetto.violazioni.map((v) => v.azione)).toEqual(['carica']);
  });

  it("senza nessun file toccato il livello è il più prudente tra quelli ammessi (1)", () => {
    expect(evaluate(proposta([]), rules)).toEqual({
      ruolo: 'redazione',
      esito: 'consentito',
      livello: 1,
      violazioni: [],
    });
  });

  it("creare è ammesso se l'azione crea ha livello maggiore di 0, e il contenuto deve essere leggibile", () => {
    const regole: Rules = {
      ...rules,
      contenuti: {
        ...rules.contenuti,
        negozio: { ...rules.contenuti.negozio, azioni: { crea: 2, modifica: 1, elimina: 0 } },
      },
    };
    expect(evaluate(proposta([aggiunto(NEGOZIO, negozioJson())]), regole)).toMatchObject({
      esito: 'consentito',
      livello: 2,
    });
    const rotto = evaluate(proposta([aggiunto(NEGOZIO, '{rotto')]), regole);
    expect(rotto.violazioni.map((v) => v.azione)).toEqual(['formato']);
  });

  it("l'elimina ammessa a livello maggiore di 0 non genera violazioni", () => {
    const regole: Rules = {
      ...rules,
      contenuti: {
        ...rules.contenuti,
        negozio: { ...rules.contenuti.negozio, azioni: { crea: 0, modifica: 1, elimina: 3 } },
      },
    };
    expect(evaluate(proposta([rimosso(NEGOZIO, negozioJson())]), regole)).toMatchObject({
      esito: 'consentito',
      livello: 3,
    });
  });
});

describe('evaluate, glob e collection', () => {
  it('con più collection vale la prima che corrisponde al percorso', () => {
    const regole: Rules = {
      ...rules,
      contenuti: {
        prima: {
          file: 'src/content/negozio/*.json',
          formato: 'json',
          azioni: { crea: 0, modifica: 1, elimina: 0 },
          campi: { telefono: 1 },
        },
        seconda: rules.contenuti.negozio,
      },
    };
    const verdetto = evaluate(
      proposta([
        modificato(
          NEGOZIO,
          negozioJson(),
          negozioJson((n) => {
            n.orari = ORARI_LUNEDI;
          }),
        ),
      ]),
      regole,
    );
    // Con la prima regola `orari` non ha livello: vietato.
    expect(verdetto.violazioni.map((v) => v.campo)).toEqual(['orari']);
  });

  it('un elenco di percorsi media vuoto non fa corrispondere nulla', () => {
    const regole: Rules = {
      ...regoleConNoteEImmagini,
      media: { ...regoleConNoteEImmagini.media, percorsi: [] },
    };
    const verdetto = evaluate(proposta([immagine(FOTO_WEBP, kb(10))]), regole);
    expect(verdetto.violazioni.map((v) => v.azione)).toEqual(['perimetro']);
  });

  it('il regolamento caricato dal repository non cambia durante la valutazione', () => {
    const copia = structuredClone(regoleDelRepository);
    evaluate(proposta([immagine(FOTO_WEBP, kb(10))]), regoleDelRepository);
    expect(regoleDelRepository).toEqual(copia);
  });
});

describe('evaluate, rami del pannello (cms/): regole della redazione per chiunque apra la proposta', () => {
  // Il pannello lavora su rami `cms/<collection>/<id>` e la redazione può
  // scrivere lì: una proposta di quel ramo aperta da chi è nello `sviluppo`
  // porterebbe online (con il merge dell'admin) le modifiche della redazione
  // senza i controlli sui contenuti. Per questo vale il ramo, non chi apre.
  const RAMO_PANNELLO = 'cms/negozio/negozio';
  const modificaNomeNegozio = modificato(
    NEGOZIO,
    negozioJson(),
    negozioJson((n) => {
      n.nome = 'Altro nome';
    }),
  );
  const modificaDescrizione = modificato(
    NEGOZIO,
    negozioJson(),
    negozioJson((n) => {
      n.descrizione = 'Una descrizione nuova del negozio.';
    }),
  );
  const daSviluppo = (
    files: ChangedFile[],
    ramo: string | null | undefined,
    altro: Partial<Parameters<typeof proposta>[1]> = {},
  ) => evaluate(proposta(files, { author: 'eusebjo', ...altro }), rules, { ramo });

  it('sviluppo + ramo cms/ + campo vietato: respinto con le regole della redazione', () => {
    const verdetto = daSviluppo([modificaNomeNegozio], RAMO_PANNELLO);

    expect(verdetto.ruolo).toBe('redazione');
    expect(verdetto.esito).toBe('respinto');
    expect(verdetto.livello).toBeNull();
    expect(verdetto.violazioni).toEqual([
      expect.objectContaining({ file: NEGOZIO, campo: 'nome', azione: 'modifica' }),
    ]);
  });

  it('sviluppo + ramo cms/ + file fuori perimetro: respinto', () => {
    const verdetto = daSviluppo(
      [modificato('src/layouts/BaseLayout.astro', 'a', 'b')],
      RAMO_PANNELLO,
    );
    expect(verdetto.esito).toBe('respinto');
    expect(verdetto.violazioni.map((v) => v.azione)).toEqual(['perimetro']);
  });

  it('sviluppo + ramo cms/ + campo consentito + pending_review: consentito, livello 1', () => {
    expect(daSviluppo([modificaDescrizione], RAMO_PANNELLO)).toEqual({
      ruolo: 'redazione',
      esito: 'consentito',
      livello: 1,
      violazioni: [],
    });
  });

  it('sviluppo + ramo cms/ vale anche con pending_publish', () => {
    const verdetto = daSviluppo([modificaDescrizione], RAMO_PANNELLO, {
      labels: ['sveltia-cms/pending_publish'],
    });
    expect(verdetto).toMatchObject({ esito: 'consentito', livello: 1 });
  });

  it('sviluppo + ramo cms/ in bozza o senza etichetta di invio: in_bozza, come per la redazione', () => {
    for (const altro of [
      { draft: true },
      { labels: [] },
      { labels: ['sveltia-cms/draft'] },
    ]) {
      const verdetto = daSviluppo([modificaNomeNegozio], RAMO_PANNELLO, altro);
      expect(verdetto.ruolo).toBe('redazione');
      expect(verdetto.esito).toBe('in_bozza');
      expect(verdetto.violazioni.map((v) => v.azione)).toEqual(['stato']);
    }
  });

  it('sviluppo + ramo di sviluppo (o ramo ignoto): invariato, nessun limite sui contenuti', () => {
    for (const ramo of [
      'fase1/9-correzioni',
      'main-fix',
      'fase1/cms/x',
      'cmsx/negozio',
      'cms',
      null,
      undefined,
    ]) {
      expect(daSviluppo([modificaNomeNegozio], ramo), String(ramo)).toEqual({
        ruolo: 'sviluppo',
        esito: 'consentito',
        livello: null,
        violazioni: [],
      });
    }
    // Senza il terzo parametro (chiamata di prima) il comportamento non cambia.
    expect(evaluate(proposta([modificaNomeNegozio], { author: 'eusebjo' }), rules)).toMatchObject({
      ruolo: 'sviluppo',
      esito: 'consentito',
    });
  });

  it('il prefisso cms/ si riconosce senza distinguere maiuscole e minuscole (si sbaglia dal lato prudente)', () => {
    for (const ramo of ['CMS/negozio/negozio', 'Cms/post/p1']) {
      expect(daSviluppo([modificaNomeNegozio], ramo), ramo).toMatchObject({
        ruolo: 'redazione',
        esito: 'respinto',
      });
    }
  });

  it('chi non è in nessun ruolo resta respinto per autore, anche da un ramo cms/', () => {
    const verdetto = evaluate(
      proposta([modificaDescrizione], { author: 'estraneo' }),
      rules,
      { ramo: RAMO_PANNELLO },
    );
    expect(verdetto.ruolo).toBe('sconosciuto');
    expect(verdetto.esito).toBe('respinto');
    expect(verdetto.violazioni.map((v) => v.azione)).toEqual(['autore']);
  });

  it('la redazione da un ramo di sviluppo non cambia: le regole sono le stesse', () => {
    const verdetto = evaluate(
      proposta([modificaNomeNegozio], { author: 'lei' }),
      rules,
      { ramo: 'fase1/qualcosa' },
    );
    expect(verdetto).toMatchObject({ ruolo: 'redazione', esito: 'respinto' });
  });
});

describe('evaluate, messaggi per chi gestisce i contenuti', () => {
  const GERGO = /branch|merge|commit/i;

  const casi = (): ReturnType<typeof evaluate>[] => [
    evaluate(proposta([], { author: 'estraneo' }), rules),
    evaluate(proposta([], { draft: true }), rules),
    evaluate(proposta([], { labels: [] }), rules),
    evaluate(
      proposta([
        modificato(NEGOZIO, negozioJson(), negozioJson((n) => { n.nome = 'x'; })),
        modificato(NEGOZIO, negozioJson(), '{rotto'),
        modificato('src/layouts/BaseLayout.astro', 'a', 'b'),
        modificato(STORIA, storiaJson(), storiaJson((s) => { s.nome = 'x'; })),
        aggiunto('src/content/storie/nuova.json', storiaJson()),
        aggiunto('src/content/post/rotto.json', '{rotto'),
        rimosso(STORIA, storiaJson()),
        rinominato(STORIA, 'src/content/storie/x.json', storiaJson()),
        rinominato('src/layouts/A.astro', 'src/content/storie/y.json', storiaJson()),
        { path: 'src/content/storie/z.json', status: 'renamed', before: null, after: null },
        immagine('src/content/post/foto.webp', kb(10)),
        { ...modificato(POST, postJson(), postJson()), status: 'copied' } as unknown as ChangedFile,
        modificato('src/content/post/../x', 'a', 'b'),
      ]),
      rules,
    ),
    // Le immagini nel repository solo con le regole di prova: tipo, peso, eliminazione.
    evaluate(
      proposta([
        modificato(NOTA, notaMd(), '---\ntitolo: [aperta\n---\nTesto'),
        immagine(FOTO_JPG, kb(9000)),
        immagine(`${IMMAGINI}/foto.svg`, kb(10)),
        immagine(FOTO_WEBP, undefined),
        immagine(FOTO_WEBP, undefined, 'removed'),
      ]),
      regoleConNoteEImmagini,
    ),
  ];

  it('sono in italiano, non vuoti e senza parole come branch, merge, commit', () => {
    const messaggi = casi().flatMap((v) => v.violazioni.map((x) => x.messaggio));
    expect(messaggi.length).toBeGreaterThan(15);
    for (const messaggio of messaggi) {
      expect(messaggio.trim()).not.toBe('');
      expect(messaggio).not.toMatch(GERGO);
    }
  });

  it("non riportano il nome dell'autore senza proteggerlo (niente menzioni, HTML o a capo)", () => {
    const verdetto = evaluate(
      proposta([], { author: '@everyone`\n<!-- x -->' }),
      rules,
    );
    expect(verdetto.violazioni).toHaveLength(1);
    expect(verdetto.violazioni[0].azione).toBe('autore');
    expect(verdetto.violazioni[0].messaggio).not.toMatch(/[<>\n]/);
    // Il nome sta dentro un blocco di codice: una menzione lì non avvisa nessuno.
    expect(verdetto.violazioni[0].messaggio).toMatch(
      /^L'utente `[^`]*@everyone[^`]*` non è autorizzato/,
    );
  });
});

describe('eRamoDelPannello', () => {
  it.each([
    'cms/negozio/negozio',
    'cms/post/p1',
    'cms/x',
    'CMS/post/p1',
    'Cms/post/p1',
  ])('%s è un ramo del pannello', (ramo) => {
    expect(eRamoDelPannello(ramo)).toBe(true);
  });

  it.each([
    'main',
    'fase1/9-correzioni',
    'fase1/cms/x',
    'cms',
    'cmsx/post/p1',
    'cms-post/p1',
    ' cms/post/p1',
    '',
    null,
    undefined,
  ])('%j non è un ramo del pannello', (ramo) => {
    expect(eRamoDelPannello(ramo)).toBe(false);
  });
});

describe('ruoloEffettivo', () => {
  it('lo sviluppo su un ramo cms/ vale come redazione', () => {
    expect(ruoloEffettivo('eusebjo', 'cms/post/p1', rules)).toBe('redazione');
    expect(ruoloEffettivo('Eusebjo', 'CMS/post/p1', rules)).toBe('redazione');
  });

  it('lo sviluppo su un altro ramo, o senza ramo, resta sviluppo', () => {
    expect(ruoloEffettivo('eusebjo', 'fase1/x', rules)).toBe('sviluppo');
    expect(ruoloEffettivo('eusebjo', null, rules)).toBe('sviluppo');
    expect(ruoloEffettivo('eusebjo', undefined, rules)).toBe('sviluppo');
  });

  it('la redazione resta redazione e gli sconosciuti restano sconosciuti, su qualunque ramo', () => {
    for (const ramo of ['cms/post/p1', 'fase1/x', null]) {
      expect(ruoloEffettivo('lei', ramo, rules)).toBe('redazione');
      expect(ruoloEffettivo('estraneo', ramo, rules)).toBe('sconosciuto');
    }
  });

  it('ruoloDi guarda solo l’autore', () => {
    expect(ruoloDi('eusebjo', rules)).toBe('sviluppo');
    expect(ruoloDi('LEI', rules)).toBe('redazione');
    expect(ruoloDi('estraneo', rules)).toBe('sconosciuto');
  });
});
