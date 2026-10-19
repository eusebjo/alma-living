import { describe, expect, it } from 'vitest';
import {
  createMarkdownProcessor,
  isUnifiedProcessor,
} from '@astrojs/markdown-remark';
import rehypeSanitize from 'rehype-sanitize';
import config from '../astro.config.mjs';
import {
  eIndirizzoLocale,
  rehypePlugins,
  rimuoviImmaginiEsterne,
} from '../src/lib/markdown';

const HTML_GREZZO =
  '<script>alert(1)</script>\n\nCiao <b style="color:red">x</b> <iframe src="x"></iframe>';

function senzaHtmlPericoloso(html: string) {
  expect(html).not.toContain('<script');
  expect(html).not.toContain('style=');
  expect(html).not.toContain('<iframe');
  expect(html).toContain('Ciao');
}

describe('HTML grezzo nel testo di una pagina', () => {
  it('senza sanitizer passa intatto (controllo: il test sa vedere il problema)', async () => {
    const processor = await createMarkdownProcessor();
    const { code } = await processor.render(HTML_GREZZO);
    expect(code).toContain('<script');
    expect(code).toContain('style=');
    expect(code).toContain('<iframe');
  });

  it('con i rehypePlugins di src/lib/markdown.ts viene rimosso', async () => {
    const processor = await createMarkdownProcessor({ rehypePlugins });
    const { code } = await processor.render(HTML_GREZZO);
    senzaHtmlPericoloso(code);
  });

  it('il processore configurato in astro.config.mjs applica gli stessi rehypePlugins', async () => {
    const processorConfigurato = config.markdown?.processor;
    expect(processorConfigurato).toBeDefined();
    expect(isUnifiedProcessor(processorConfigurato!)).toBe(true);
    // Gli stessi plugin di src/lib/markdown.ts, non un elenco riscritto a mano...
    expect(
      (processorConfigurato as { options: { rehypePlugins: unknown[] } })
        .options.rehypePlugins,
    ).toEqual(rehypePlugins);

    // ...e lo stesso rendering che Astro usa per le collection.
    const renderer = await processorConfigurato!.createRenderer({});
    const { code } = await renderer.render(HTML_GREZZO);
    senzaHtmlPericoloso(code);
  });

  it('i link con schema javascript: non sopravvivono', async () => {
    const processor = await createMarkdownProcessor({ rehypePlugins });
    const { code } = await processor.render('[clicca](javascript:alert(1))');
    expect(code).not.toContain('javascript:');
    expect(code).toContain('clicca');
  });

  it('il Markdown normale resta intatto', async () => {
    const processor = await createMarkdownProcessor({ rehypePlugins });
    const { code } = await processor.render(
      '## Titolo\n\nTesto **forte** e [un link](https://example.com).',
    );
    expect(code).toMatch(/<h2[^>]*>Titolo<\/h2>/);
    expect(code).toContain('<strong>forte</strong>');
    expect(code).toContain('<a href="https://example.com">un link</a>');
  });
});

describe('immagini nel testo di una pagina', () => {
  // Una pagina non deve caricare risorse di terzi: il Markdown `![x](https://...)`
  // darebbe un `<img>` verso un altro sito. Si prova con il processore che
  // Astro usa davvero per le collection (astro.config.mjs).
  async function render(markdown: string): Promise<string> {
    const renderer = await config.markdown!.processor!.createRenderer({});
    const { code } = await renderer.render(markdown);
    return code;
  }

  it('il plugin viene dopo rehype-sanitize: toglie ciò che il sanitizer lascia passare', () => {
    expect(rehypePlugins[0]).toBe(rehypeSanitize);
    expect(rehypePlugins.indexOf(rimuoviImmaginiEsterne)).toBeGreaterThan(
      rehypePlugins.indexOf(rehypeSanitize),
    );
  });

  it('controllo: rehype-sanitize da solo lascia passare le immagini https e //host', async () => {
    const processor = await createMarkdownProcessor({ rehypePlugins: [rehypeSanitize] });
    const https = await processor.render('![x](https://example.com/a.jpg)');
    expect(https.code).toContain('<img src="https://example.com/a.jpg"');
    const protocolloRelativo = await processor.render('![x](//example.com/a.jpg)');
    expect(protocolloRelativo.code).toContain('<img src="//example.com/a.jpg"');
  });

  it.each([
    ['https', '![x](https://example.com/a.jpg)'],
    ['http', '![x](http://example.com/a.jpg)'],
    ['https in maiuscolo', '![x](HTTPS://example.com/a.jpg)'],
    ['protocol-relative (//host)', '![x](//example.com/a.jpg)'],
    ['data:', '![x](data:image/png;base64,iVBORw0KGgo=)'],
    ['javascript:', '![x](javascript:alert(1))'],
    ['ftp:', '![x](ftp://example.com/a.jpg)'],
    ['blob:', '![x](blob:https://example.com/0000)'],
    ['mailto:', '![x](mailto:a@example.com)'],
    ['senza indirizzo', '![x]()'],
    ['con riferimento esterno', '![x][r]\n\n[r]: https://example.com/a.jpg'],
  ])("un'immagine %s non resta nella pagina", async (_nome, immagine) => {
    const [prima, ...definizioni] = immagine.split('\n\n');
    const html = await render([`Prima ${prima} dopo`, ...definizioni].join('\n\n'));
    expect(html).not.toContain('<img');
    expect(html).not.toContain('example.com');
    expect(html).not.toContain('javascript:');
    expect(html).not.toContain('data:');
    // Il resto del testo non si perde.
    expect(html).toContain('Prima');
    expect(html).toContain('dopo');
  });

  it.each([
    ['un percorso relativo', 'immagini/a.jpg'],
    ['un percorso con ./', './immagini/a.jpg'],
    ['un percorso con ../', '../immagini/a.jpg'],
    ['un percorso dalla radice del sito', '/immagini/a.jpg'],
    ['solo il nome del file', 'a.jpg'],
    ['due punti dopo una cartella', 'immagini/a:b.jpg'],
  ])("un'immagine con %s resta", async (_nome, src) => {
    const html = await render(`![Descrizione](${src})`);
    expect(html).toContain(`<img src="${src}" alt="Descrizione">`);
  });

  it('i link verso altri siti restano: non caricano nulla', async () => {
    const html = await render('[un link](https://example.com/pagina)');
    expect(html).toContain('<a href="https://example.com/pagina">un link</a>');
  });

  it('con più immagini toglie solo quelle esterne', async () => {
    const html = await render(
      [
        '![uno](immagini/uno.jpg)',
        '![due](https://example.com/due.jpg)',
        '![tre](//example.com/tre.jpg)',
        '![quattro](/immagini/quattro.jpg)',
      ].join('\n\n'),
    );
    expect(html.match(/<img\b/g)).toHaveLength(2);
    expect(html).toContain('src="immagini/uno.jpg"');
    expect(html).toContain('src="/immagini/quattro.jpg"');
    expect(html).not.toContain('example.com');
  });
});

describe('eIndirizzoLocale', () => {
  // Il browser tratta alcuni indirizzi diversamente da come li legge il
  // sanitizer: `\` vale come `/`, tabulazioni e a capo si ignorano, spazi e
  // caratteri di controllo ai bordi si tolgono. Si controlla ciò che il
  // browser vedrebbe, non il testo scritto.
  it.each([
    'immagini/a.jpg',
    './immagini/a.jpg',
    '../a.jpg',
    '/immagini/a.jpg',
    'a.jpg',
    'immagini/a:b.jpg',
    'immagini/a.jpg?versione=2',
    '#ancora',
  ])('%j è un indirizzo del sito', (src) => {
    expect(eIndirizzoLocale(src)).toBe(true);
  });

  it.each([
    'https://example.com/a.jpg',
    'HTTP://example.com/a.jpg',
    '//example.com/a.jpg',
    '\\\\example.com\\a.jpg',
    '/\\example.com/a.jpg',
    '\\/example.com/a.jpg',
    '/\t/example.com/a.jpg',
    '/\n/example.com/a.jpg',
    '\t//example.com/a.jpg',
    '  //example.com/a.jpg',
    'ht\ttps://example.com/a.jpg',
    'data:image/png;base64,AAAA',
    ' javascript:alert(1)',
    'java\nscript:alert(1)',
    'blob:https://example.com/0',
    'mailto:a@example.com',
    'x:y',
    '',
    '   ',
  ])('%j non è un indirizzo del sito', (src) => {
    expect(eIndirizzoLocale(src)).toBe(false);
  });

  it('un valore che non è un testo non è un indirizzo del sito', () => {
    for (const valore of [undefined, null, 5, true, ['a.jpg'], {}]) {
      expect(eIndirizzoLocale(valore)).toBe(false);
    }
  });
});

describe('rimuoviImmaginiEsterne', () => {
  // Il plugin lavora sull'albero rehype: lo si prova anche su alberi che il
  // Markdown non produce (immagini dentro altri elementi, senza `src`).
  const immagine = (src?: unknown) => ({
    type: 'element',
    tagName: 'img',
    properties: src === undefined ? { alt: 'x' } : { src, alt: 'x' },
    children: [],
  });
  const elemento = (tagName: string, children: unknown[]) => ({
    type: 'element',
    tagName,
    properties: {},
    children,
  });

  it('toglie le immagini esterne a qualunque profondità e tiene le altre', () => {
    const albero = {
      type: 'root',
      children: [
        elemento('p', [immagine('https://example.com/a.jpg'), immagine('a.jpg')]),
        elemento('blockquote', [
          elemento('ul', [
            elemento('li', [immagine('//example.com/b.jpg'), { type: 'text', value: 'testo' }]),
          ]),
        ]),
      ],
    };
    rimuoviImmaginiEsterne()(albero);
    expect(JSON.stringify(albero)).not.toContain('example.com');
    expect(JSON.stringify(albero)).toContain('"src":"a.jpg"');
    expect(JSON.stringify(albero)).toContain('testo');
  });

  it("toglie anche un'immagine senza indirizzo", () => {
    const albero = { type: 'root', children: [elemento('p', [immagine()])] };
    rimuoviImmaginiEsterne()(albero);
    expect(albero.children[0]!.children).toEqual([]);
  });
});
