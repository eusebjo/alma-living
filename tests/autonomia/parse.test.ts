import { parseFrontmatter } from '@astrojs/markdown-remark';
import { afterEach, describe, expect, it } from 'vitest';
import { parseContent } from '../../scripts/autonomia/parse';

describe('parseContent, json', () => {
  it("restituisce l'oggetto", () => {
    const testo = '{"nome":"Alma Living","indirizzo":{"via":"Via Ricasoli"},"orari":[]}';
    expect(parseContent(testo, 'json')).toEqual({
      nome: 'Alma Living',
      indirizzo: { via: 'Via Ricasoli' },
      orari: [],
    });
  });

  it('ignora un BOM iniziale', () => {
    expect(parseContent('\uFEFF{"a":1}', 'json')).toEqual({ a: 1 });
  });

  it('lancia con un JSON malformato', () => {
    expect(() => parseContent('{"nome": ', 'json')).toThrow(Error);
    expect(() => parseContent('{"nome": ', 'json')).toThrow(/JSON/);
    expect(() => parseContent('', 'json')).toThrow(/JSON/);
  });

  it('lancia se la radice non è un oggetto', () => {
    for (const testo of ['[]', '[1,2]', 'null', '"testo"', '42', 'true']) {
      expect(() => parseContent(testo, 'json')).toThrow(/oggetto/);
    }
  });

  it('una chiave __proto__ resta un dato e non inquina i prototipi', () => {
    const risultato = parseContent('{"__proto__":{"polluted":true},"a":1}', 'json');
    expect(Object.hasOwn(risultato, '__proto__')).toBe(true);
    expect(Object.getPrototypeOf(risultato)).toBe(Object.prototype);
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
  });
});

describe('parseContent, markdown', () => {
  const testo = [
    '---',
    'titolo: Alma Living',
    'immagine: ./immagini/home.webp',
    '---',
    '',
    '   Primo paragrafo.',
    '',
    'Secondo paragrafo.   ',
    '',
    '',
  ].join('\n');

  it('restituisce il frontmatter più il corpo, senza spazi iniziali e finali', () => {
    expect(parseContent(testo, 'markdown')).toEqual({
      titolo: 'Alma Living',
      immagine: './immagini/home.webp',
      corpo: 'Primo paragrafo.\n\nSecondo paragrafo.',
    });
  });

  it('gestisce le righe in stile Windows e il BOM', () => {
    const windows = `\uFEFF${testo.replaceAll('\n', '\r\n')}`;
    expect(parseContent(windows, 'markdown')).toEqual({
      titolo: 'Alma Living',
      immagine: './immagini/home.webp',
      corpo: 'Primo paragrafo.\n\nSecondo paragrafo.',
    });
  });

  it('senza frontmatter restituisce solo il corpo', () => {
    expect(parseContent('Solo testo.\n', 'markdown')).toEqual({
      corpo: 'Solo testo.',
    });
    expect(parseContent('', 'markdown')).toEqual({ corpo: '' });
  });

  it('una riga di trattini iniziale a quattro o più caratteri non è un frontmatter', () => {
    expect(parseContent('----\nTesto', 'markdown')).toEqual({
      corpo: '----\nTesto',
    });
  });

  it('il frontmatter vuoto restituisce solo il corpo', () => {
    expect(parseContent('---\n---\nTesto\n', 'markdown')).toEqual({
      corpo: 'Testo',
    });
  });

  it('lascia le date come testo, senza trasformarle in oggetti Date', () => {
    expect(parseContent('---\ndata: 2026-10-19\n---\nTesto', 'markdown')).toEqual({
      data: '2026-10-19',
      corpo: 'Testo',
    });
  });

  it('mantiene tipi e strutture del frontmatter (liste, oggetti annidati)', () => {
    const risultato = parseContent(
      '---\ntag: [a, b]\nautore:\n  nome: Lei\n---\nTesto',
      'markdown',
    );
    expect(risultato).toEqual({
      tag: ['a', 'b'],
      autore: { nome: 'Lei' },
      corpo: 'Testo',
    });
  });

  it('lancia con un frontmatter YAML non valido', () => {
    expect(() => parseContent('---\ntitolo: [aperta\n---\nTesto', 'markdown')).toThrow(
      /frontmatter/i,
    );
  });

  it('lancia con una chiave ripetuta nel frontmatter', () => {
    expect(() =>
      parseContent('---\ntitolo: a\ntitolo: b\n---\nTesto', 'markdown'),
    ).toThrow(/frontmatter/i);
  });

  it('lancia se il frontmatter non è una mappa di campi', () => {
    expect(() => parseContent('---\nsolo testo\n---\nCorpo', 'markdown')).toThrow(
      /frontmatter/i,
    );
    expect(() => parseContent('---\n- a\n- b\n---\nCorpo', 'markdown')).toThrow(
      /frontmatter/i,
    );
  });

  it('lancia se il frontmatter contiene un campo chiamato corpo (sarebbe ambiguo)', () => {
    expect(() =>
      parseContent('---\ncorpo: nascosto\n---\nTesto', 'markdown'),
    ).toThrow(/corpo/);
  });

  it('rifiuta i valori YAML che non sono dati semplici (binari, insiemi, tag con codice)', () => {
    for (const riga of [
      'x: !!binary aGk=',
      'x: !!set {a, b}',
      'x: !!omap [a: 1]',
      'x: !!js/function "function(){ return 1 }"',
      'x: !custom 1',
    ]) {
      expect(() => parseContent(`---\n${riga}\n---\nTesto`, 'markdown'), riga).toThrow(
        /frontmatter/i,
      );
    }
  });

  it('rifiuta un riferimento circolare e un eccesso di alias (esplosione di dati)', () => {
    expect(() => parseContent('---\nx: &a [*a]\n---\nTesto', 'markdown')).toThrow(
      /frontmatter/i,
    );

    const righe = ['a: &a [lol, lol, lol, lol, lol, lol, lol, lol, lol]'];
    let precedente = 'a';
    for (const nome of ['b', 'c', 'd', 'e', 'f', 'g', 'h', 'i']) {
      righe.push(`${nome}: &${nome} [${Array(9).fill(`*${precedente}`).join(', ')}]`);
      precedente = nome;
    }
    const inizio = Date.now();
    expect(() => parseContent(`---\n${righe.join('\n')}\n---\nTesto`, 'markdown')).toThrow(
      /frontmatter/i,
    );
    expect(Date.now() - inizio).toBeLessThan(2000);
  });

  it("accetta un alias semplice", () => {
    expect(parseContent('---\na: &x 1\nb: *x\n---\nTesto', 'markdown')).toEqual({
      a: 1,
      b: 1,
      corpo: 'Testo',
    });
  });
});

describe('parseContent, frontmatter che non è YAML (sicurezza)', () => {
  // gray-matter, di serie, esegue il codice JavaScript scritto in un
  // frontmatter `---js`. Qui il contenuto arriva da una proposta altrui,
  // quindi non deve mai essere eseguito.
  const globale = globalThis as Record<string, unknown>;

  afterEach(() => {
    delete globale.__autonomiaEseguito;
  });

  const payload = (aperturaRiga: string) =>
    `${aperturaRiga}\n{ titolo: (globalThis.__autonomiaEseguito = true, 'x') }\n---\nTesto`;

  it.each([
    ['---js'],
    ['---javascript'],
    ['---JS'],
    ['--- js'],
    ['---\tjs'],
    ['---  javascript  '],
  ])('rifiuta %j senza eseguire nulla', (aperturaRiga) => {
    expect(() => parseContent(payload(aperturaRiga), 'markdown')).toThrow(/frontmatter/i);
    expect(globale.__autonomiaEseguito).toBeUndefined();
  });

  it.each([['---json'], ['---toml'], ['---coffee'], ['---constructor'], ['---toString']])(
    'rifiuta anche il linguaggio %j',
    (aperturaRiga) => {
      expect(() =>
        parseContent(`${aperturaRiga}\n{"a": 1}\n---\nTesto`, 'markdown'),
      ).toThrow(/frontmatter/i);
    },
  );

  it('accetta spazi dopo la riga di apertura, che non indicano nessun linguaggio', () => {
    expect(parseContent('---   \ntitolo: x\n---\nTesto', 'markdown')).toEqual({
      titolo: 'x',
      corpo: 'Testo',
    });
  });
});

describe('parseContent, frontmatter letto come lo legge la build di Astro', () => {
  const BOM = String.fromCharCode(0xfeff);

  // Testi in cui la build di Astro vede (o potrebbe vedere) dei campi che
  // gray-matter non vedrebbe: il controllo li deve rifiutare, non leggerli
  // come "solo corpo".
  const nascosti: Record<string, string> = {
    'una riga vuota prima': '\n---\ntitolo: x\nslug: altra\n---\nTesto',
    'spazi e a capo prima': '  \n---\ntitolo: x\nslug: altra\n---\nTesto',
    'tante righe vuote e tabulazioni prima': '\n\n  \n\t\n---\ntitolo: x\nslug: altra\n---\nTesto',
    'frontmatter TOML': '+++\ntitolo = "x"\nslug = "altra"\n+++\nTesto',
    'frontmatter TOML dopo una riga vuota': '\n+++\ntitolo = "x"\nslug = "altra"\n+++\nTesto',
    'due BOM': `${BOM}${BOM}---\ntitolo: x\nslug: altra\n---\nTesto`,
    'due BOM e un linguaggio': `${BOM}${BOM}---json\n{"slug": "altra"}\n---\nTesto`,
    'un BOM e una riga vuota': `${BOM}\n---\ntitolo: x\nslug: altra\n---\nTesto`,
    'chiuso con +++ invece di ---': '---\ntitolo: x\n+++\nslug: altra\n---\nTesto',
    'quattro trattini in apertura': '----\ntitolo: x\nslug: altra\n---\nTesto',
    'non chiuso': '---\ntitolo: x\nslug: altra\nTesto',
  };

  it.each(Object.entries(nascosti))('rifiuta: %s', (_nome, testo) => {
    expect(() => parseContent(testo, 'markdown')).toThrow(/frontmatter/i);
  });

  it('con un solo BOM davanti il frontmatter normale è accettato', () => {
    expect(parseContent(`${BOM}---\ntitolo: x\n---\nTesto`, 'markdown')).toEqual({
      titolo: 'x',
      corpo: 'Testo',
    });
  });

  it('una riga vuota o una riga di trattini nel corpo, senza frontmatter, non è un problema', () => {
    expect(parseContent('\nSolo testo.\n', 'markdown')).toEqual({ corpo: 'Solo testo.' });
    expect(parseContent('Testo\n\n---\n\nAltro testo', 'markdown')).toEqual({
      corpo: 'Testo\n\n---\n\nAltro testo',
    });
  });

  it('i campi che legge il controllo sono quelli che legge Astro (funzione parseFrontmatter della build)', () => {
    const validi: Record<string, string> = {
      normale: '---\ntitolo: x\ndescrizione: y\n---\n\nTesto\n',
      'righe in stile Windows': '---\r\ntitolo: x\r\n---\r\nTesto',
      'con un BOM': `${BOM}---\ntitolo: x\n---\nTesto`,
      vuoto: '---\n---\nTesto',
      'solo commenti': '---\n# niente\n---\nTesto',
      'spazi dopo i trattini': '---   \ntitolo: x\n---\nTesto',
      'trattini nel corpo': '---\ntitolo: x\n---\nTesto\n\n---\n\nAltro',
      'senza frontmatter': 'Solo testo',
      'trattini senza frontmatter': 'Testo\n\n---\n\nAltro',
      'quattro trattini senza chiusura': '----\nTesto',
      'testo vuoto': '',
    };

    for (const [nome, testo] of Object.entries({ ...validi, ...nascosti })) {
      let campiAstro: string[] | null;
      try {
        campiAstro = Object.keys(parseFrontmatter(testo).frontmatter).sort();
      } catch {
        campiAstro = null; // la build fallirebbe da sola
      }

      let campiControllo: string[] | null;
      try {
        campiControllo = Object.keys(parseContent(testo, 'markdown'))
          .filter((campo) => campo !== 'corpo')
          .sort();
      } catch {
        campiControllo = null; // rifiutato: va bene
      }

      if (campiControllo !== null && campiAstro !== null) {
        expect(campiControllo, nome).toEqual(campiAstro);
      }
      if (nome in validi) {
        expect(campiControllo, nome).not.toBeNull();
      }
    }
  });
});

describe('parseContent, nomi dei campi con punti o vuoti', () => {
  it.each([
    ['{"orari.extra": 1}'],
    ['{"a": {"b.c": 1}}'],
    ['{"orari": [{"giorno.x": "lunedi"}]}'],
    ['{"": 1}'],
    ['{"a": {"": 1}}'],
    ['{".": 1}'],
    ['{"a.": 1}'],
  ])('JSON: rifiuta %s', (testo) => {
    expect(() => parseContent(testo, 'json')).toThrow(/nome non valido/);
  });

  it.each([
    ['corpo.x: 1'],
    ['"": 1'],
    ['a:\n  "b.c": 1'],
    ['a:\n  - "b.c": 1'],
    ['"orari.extra": 1'],
  ])('frontmatter: rifiuta %j', (riga) => {
    expect(() => parseContent(`---\n${riga}\n---\nTesto`, 'markdown')).toThrow(
      /nome non valido/,
    );
  });

  it('i nomi con altri segni di punteggiatura restano ammessi', () => {
    expect(parseContent('{"immagine_alt": 1, "a-b": 2, "A B": 3}', 'json')).toEqual({
      immagine_alt: 1,
      'a-b': 2,
      'A B': 3,
    });
    expect(parseContent('---\nimmagine_alt: x\na-b: y\n---\nT', 'markdown')).toEqual({
      immagine_alt: 'x',
      'a-b': 'y',
      corpo: 'T',
    });
  });
});
