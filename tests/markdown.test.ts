import { describe, expect, it } from 'vitest';
import {
  createMarkdownProcessor,
  isUnifiedProcessor,
} from '@astrojs/markdown-remark';
import config from '../astro.config.mjs';
import { rehypePlugins } from '../src/lib/markdown';

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
