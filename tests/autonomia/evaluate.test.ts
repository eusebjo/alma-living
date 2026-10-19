import { describe, expect, it } from 'vitest';
import { evaluate } from '../../scripts/autonomia/evaluate';
import type { ChangedFile, Rules } from '../../scripts/autonomia/types';
import {
  HOME,
  NEGOZIO,
  ORARI_LUNEDI,
  aggiunto,
  homeMd,
  immagine,
  kb,
  modificato,
  negozioJson,
  proposta,
  regoleDelRepository,
  rimosso,
  rinominato,
  rules,
} from './fixtures';

const FOTO_WEBP = 'src/content/pagine/immagini/foto.webp';
const FOTO_JPG = 'src/content/pagine/immagini/foto.jpg';

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

  it('2. un estraneo modifica home.md: respinto, azione autore', () => {
    const verdetto = evaluate(
      proposta([modificato(HOME, homeMd(), homeMd({ titolo: 'Altro titolo' }))], {
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

  it('6e. una chiave con un punto nel nome non permette di aggirare le regole sui campi vietati', () => {
    const verdetto = evaluate(
      proposta([
        modificato(
          NEGOZIO,
          negozioJson(),
          negozioJson((n) => {
            (n as unknown as Record<string, unknown>)['indirizzo.via'] = 'Via Roma';
            (n as unknown as Record<string, unknown>)['nome.x'] = 'x';
          }),
        ),
      ]),
      rules,
    );
    expect(verdetto.esito).toBe('respinto');
    expect(verdetto.violazioni.map((v) => v.campo)).toEqual(['indirizzo.via', 'nome.x']);
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
    ['src/content/pagine/sotto/annidata.md'],
    ['src/content/pagine/home.txt'],
  ])('7. lei modifica %s: respinto, azione perimetro', (percorso) => {
    const verdetto = evaluate(proposta([modificato(percorso, 'a', 'b')]), rules);

    expect(verdetto.esito).toBe('respinto');
    expect(verdetto.violazioni).toHaveLength(1);
    expect(verdetto.violazioni[0]).toMatchObject({ file: percorso, azione: 'perimetro' });
  });

  it.each([
    ['src/content/pagine/immagini/../../../../.github/workflows/ci.yml'],
    ['src/content/pagine/./home.md'],
    ['src/content/pagine/../negozio/negozio.json'],
    ['src\\content\\pagine\\home.md'],
    ['src/content/pagine/immagini\\..\\..\\..\\.github\\ci.yml'],
    ['/src/content/pagine/home.md'],
    ['src//content/pagine/home.md'],
    ['src/content/pagine/immagini//foto.webp'],
    ['src/content/pagine/immagini/estate//foto.webp'],
    ['src/content/pagine/home.md/'],
    ['src/content/pagine/immagini/.nascosto.webp'],
    ['src/content/pagine/immagini/.cartella/foto.webp'],
    ['SRC/content/pagine/home.md'],
    ['src/content/pagine/home.md\0.png'],
    [''],
  ])('7b. il percorso anomalo %j è fuori perimetro (nessuna scorciatoia con ../, backslash o simili)', (percorso) => {
    const verdetto = evaluate(
      proposta([{ ...modificato(percorso, 'a', 'b'), sizeBytes: 10 }]),
      rules,
    );
    expect(verdetto.esito).toBe('respinto');
    expect(verdetto.violazioni.map((v) => v.azione)).toContain('perimetro');
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
    const strano = { ...modificato(HOME, homeMd(), homeMd()), status: 'copied' } as unknown as ChangedFile;
    const verdetto = evaluate(proposta([strano]), rules);
    expect(verdetto.esito).toBe('respinto');
    expect(verdetto.violazioni[0]).toMatchObject({ file: HOME, azione: 'perimetro' });
  });
});

describe('evaluate, creazione, eliminazione e rinomina di contenuti', () => {
  it('8. lei aggiunge src/content/pagine/nuova.md: respinto, azione crea', () => {
    const verdetto = evaluate(
      proposta([aggiunto('src/content/pagine/nuova.md', homeMd())]),
      rules,
    );

    expect(verdetto.esito).toBe('respinto');
    expect(verdetto.violazioni).toHaveLength(1);
    expect(verdetto.violazioni[0]).toMatchObject({
      file: 'src/content/pagine/nuova.md',
      azione: 'crea',
    });
  });

  it('9. lei rimuove home.md: respinto, azione elimina', () => {
    const verdetto = evaluate(proposta([rimosso(HOME, homeMd())]), rules);

    expect(verdetto.esito).toBe('respinto');
    expect(verdetto.violazioni).toHaveLength(1);
    expect(verdetto.violazioni[0]).toMatchObject({ file: HOME, azione: 'elimina' });
  });

  it('10. lei rinomina home.md: respinto (elimina del vecchio più crea del nuovo)', () => {
    const nuovo = 'src/content/pagine/principale.md';
    const verdetto = evaluate(proposta([rinominato(HOME, nuovo, homeMd())]), rules);

    expect(verdetto.esito).toBe('respinto');
    expect(verdetto.violazioni.map((v) => [v.file, v.azione])).toEqual([
      [HOME, 'elimina'],
      [nuovo, 'crea'],
    ]);
  });

  it('10b. spostare un contenuto fuori dal perimetro, o un file esterno dentro, è respinto', () => {
    const fuori = evaluate(
      proposta([rinominato(HOME, 'src/pages/home.md', homeMd())]),
      rules,
    );
    expect(fuori.violazioni.map((v) => [v.file, v.azione])).toEqual([
      [HOME, 'elimina'],
      ['src/pages/home.md', 'perimetro'],
    ]);

    const dentro = evaluate(
      proposta([rinominato('src/layouts/Altro.astro', 'src/content/pagine/x.md', homeMd())]),
      rules,
    );
    expect(dentro.violazioni.map((v) => [v.file, v.azione])).toEqual([
      ['src/layouts/Altro.astro', 'perimetro'],
      ['src/content/pagine/x.md', 'crea'],
    ]);
  });

  it('10c. una rinomina senza percorso precedente non si può verificare ed è respinta', () => {
    const senzaOrigine: ChangedFile = {
      path: 'src/content/pagine/x.md',
      status: 'renamed',
      before: homeMd(),
      after: homeMd(),
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

describe('evaluate, pagine in markdown', () => {
  it('13. lei modifica titolo e corpo di home.md: consentito', () => {
    const verdetto = evaluate(
      proposta([
        modificato(
          HOME,
          homeMd(),
          homeMd({ titolo: 'Un titolo nuovo', corpo: 'Un testo completamente nuovo.' }),
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

  it('lei può cambiare descrizione e immagine di una pagina', () => {
    const verdetto = evaluate(
      proposta([
        modificato(
          HOME,
          homeMd(),
          homeMd({
            descrizione: 'Una descrizione nuova della pagina principale.',
            immagine: './immagini/foto.webp',
          }),
        ),
      ]),
      rules,
    );
    expect(verdetto.esito).toBe('consentito');
  });

  it('aggiungere un campo che la pagina non prevede (nessuna regola) è vietato', () => {
    const dopo = homeMd().replace('---\n\n', 'bozza: false\n---\n\n');
    const verdetto = evaluate(proposta([modificato(HOME, homeMd(), dopo)]), rules);
    expect(verdetto.esito).toBe('respinto');
    expect(verdetto.violazioni).toHaveLength(1);
    expect(verdetto.violazioni[0]).toMatchObject({ file: HOME, campo: 'bozza' });
  });

  it('differenze di sole righe a capo o spazi attorno al corpo non contano come modifiche', () => {
    const verdetto = evaluate(
      proposta([
        modificato(HOME, homeMd(), homeMd({ fineRiga: '\r\n', corpo: '   Testo segnaposto della pagina principale.   ' })),
      ]),
      rules,
    );
    expect(verdetto.esito).toBe('consentito');
    expect(verdetto.livello).toBe(1);
  });

  it('un frontmatter scritto in un linguaggio diverso da YAML è un errore di formato e non viene eseguito', () => {
    const globale = globalThis as Record<string, unknown>;
    const dopo = `---js\n{ titolo: (globalThis.__autonomiaValutazione = true, 'x') }\n---\nTesto`;
    const verdetto = evaluate(proposta([modificato(HOME, homeMd(), dopo)]), rules);

    expect(globale.__autonomiaValutazione).toBeUndefined();
    expect(verdetto.esito).toBe('respinto');
    expect(verdetto.violazioni.map((v) => v.azione)).toEqual(['formato']);
  });

  it('un frontmatter rotto è un errore di formato', () => {
    const verdetto = evaluate(
      proposta([modificato(HOME, homeMd(), '---\ntitolo: [aperta\n---\nTesto')]),
      rules,
    );
    expect(verdetto.violazioni.map((v) => v.azione)).toEqual(['formato']);
  });
});

describe('evaluate, immagini', () => {
  it('11. lei carica immagini/foto.webp da 900 KB: consentito', () => {
    const verdetto = evaluate(proposta([immagine(FOTO_WEBP, kb(900))]), rules);

    expect(verdetto).toEqual({
      ruolo: 'redazione',
      esito: 'consentito',
      livello: 1,
      violazioni: [],
    });
  });

  it('12. lei carica immagini/foto.jpg da 9.000 KB: respinto, azione dimensione (focus 3)', () => {
    const verdetto = evaluate(proposta([immagine(FOTO_JPG, kb(9000))]), rules);

    expect(verdetto.esito).toBe('respinto');
    expect(verdetto.violazioni).toHaveLength(1);
    expect(verdetto.violazioni[0]).toMatchObject({ file: FOTO_JPG, azione: 'dimensione' });
    expect(verdetto.violazioni[0].messaggio).toContain('9.000 KB');
    expect(verdetto.violazioni[0].messaggio).toContain('1.500 KB');
  });

  it('12b. il limite è inclusivo: 1.500 KB esatti passano, un byte in più no', () => {
    expect(evaluate(proposta([immagine(FOTO_WEBP, kb(1500))]), rules).esito).toBe('consentito');
    expect(evaluate(proposta([immagine(FOTO_WEBP, kb(1500) + 1)]), rules).esito).toBe('respinto');
  });

  it('12c. il limite si applica anche a una foto modificata e a una già presente sostituita', () => {
    const verdetto = evaluate(proposta([immagine(FOTO_WEBP, kb(2000), 'modified')]), rules);
    expect(verdetto.violazioni.map((v) => v.azione)).toEqual(['dimensione']);
  });

  it('12d. senza la dimensione il limite non si può verificare: respinto (si rifiuta ciò che non si sa misurare)', () => {
    for (const dimensione of [undefined, Number.NaN, -1, Number.POSITIVE_INFINITY]) {
      const verdetto = evaluate(proposta([immagine(FOTO_WEBP, dimensione)]), rules);
      expect(verdetto.esito).toBe('respinto');
      expect(verdetto.violazioni.map((v) => v.azione)).toEqual(['dimensione']);
    }
  });

  it('modificare un\'immagine già presente conta come caricamento (livello 1)', () => {
    const verdetto = evaluate(proposta([immagine(FOTO_WEBP, kb(100), 'modified')]), rules);
    expect(verdetto).toMatchObject({ esito: 'consentito', livello: 1 });
  });

  it('eliminare un\'immagine è vietato; la dimensione non serve', () => {
    const verdetto = evaluate(proposta([immagine(FOTO_WEBP, undefined, 'removed')]), rules);
    expect(verdetto.esito).toBe('respinto');
    expect(verdetto.violazioni.map((v) => [v.file, v.azione])).toEqual([[FOTO_WEBP, 'elimina']]);
  });

  it('rinominare un\'immagine è vietato (elimina più carica)', () => {
    const nuovo = 'src/content/pagine/immagini/nuova.webp';
    const rinomina: ChangedFile = {
      path: nuovo,
      previousPath: FOTO_WEBP,
      status: 'renamed',
      before: null,
      after: null,
      sizeBytes: kb(100),
    };
    const verdetto = evaluate(proposta([rinomina]), rules);
    expect(verdetto.violazioni.map((v) => [v.file, v.azione])).toEqual([[FOTO_WEBP, 'elimina']]);
  });

  it('immagini in sottocartelle del percorso dei media sono ammesse', () => {
    const verdetto = evaluate(
      proposta([immagine('src/content/pagine/immagini/estate/mare.webp', kb(100))]),
      rules,
    );
    expect(verdetto.esito).toBe('consentito');
  });

  it('le immagini fuori da percorsi dei media sono fuori perimetro', () => {
    const verdetto = evaluate(proposta([immagine('public/foto.webp', kb(100))]), rules);
    expect(verdetto.violazioni.map((v) => v.azione)).toEqual(['perimetro']);
  });

  it('una proposta con testo e foto valide è consentita a livello 1', () => {
    const verdetto = evaluate(
      proposta([
        modificato(HOME, homeMd(), homeMd({ immagine: './immagini/foto.webp' })),
        immagine(FOTO_WEBP, kb(900)),
      ]),
      rules,
    );
    expect(verdetto).toMatchObject({ esito: 'consentito', livello: 1 });
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
      media: { ...rules.media, azioni: { carica: 2, elimina: 0 } },
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
    const regole: Rules = { ...rules, media: { ...rules.media, azioni: { carica: 0, elimina: 0 } } };
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
    const regole: Rules = { ...rules, media: { ...rules.media, percorsi: [] } };
    const verdetto = evaluate(proposta([immagine(FOTO_WEBP, kb(10))]), regole);
    expect(verdetto.violazioni.map((v) => v.azione)).toEqual(['perimetro']);
  });

  it('il regolamento caricato dal repository non cambia durante la valutazione', () => {
    const copia = structuredClone(regoleDelRepository);
    evaluate(proposta([immagine(FOTO_WEBP, kb(10))]), regoleDelRepository);
    expect(regoleDelRepository).toEqual(copia);
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
        aggiunto('src/content/pagine/nuova.md', homeMd()),
        rimosso(HOME, homeMd()),
        rinominato(HOME, 'src/content/pagine/x.md', homeMd()),
        rinominato('src/layouts/A.astro', 'src/content/pagine/y.md', homeMd()),
        { path: 'src/content/pagine/z.md', status: 'renamed', before: null, after: null },
        immagine(FOTO_JPG, kb(9000)),
        immagine(FOTO_WEBP, undefined),
        immagine(FOTO_WEBP, undefined, 'removed'),
        { ...modificato(HOME, homeMd(), homeMd()), status: 'copied' } as unknown as ChangedFile,
        modificato('src/content/pagine/../x', 'a', 'b'),
      ]),
      rules,
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
