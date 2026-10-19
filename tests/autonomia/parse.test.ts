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
    expect(parseContent('﻿{"a":1}', 'json')).toEqual({ a: 1 });
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
    const windows = `﻿${testo.replaceAll('\n', '\r\n')}`;
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
