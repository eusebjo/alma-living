// @ts-check
import { defineConfig } from 'astro/config';
import { unified } from '@astrojs/markdown-remark';
import sitemap from '@astrojs/sitemap';
import { getSiteConfig } from './src/config/site';
import { rehypePlugins } from './src/lib/markdown';
import { includiInSitemap } from './src/lib/sitemap';
import { CARATTERI_PROVA } from './src/prova/comune/caratteri-config';

const { siteUrl, indexable } = getSiteConfig(process.env);

// https://astro.build/config
export default defineConfig({
  output: 'static',
  // Stessa fonte di SeoHead, robots.txt e llms.txt: `getSiteConfig`.
  site: siteUrl,
  // La sitemap esiste solo nelle build indicizzabili (sito lanciato e ramo
  // `main`): altrove non si genera nulla, e robots.txt non la cita. Il pannello
  // dei contenuti (/admin/) e le pagine di prova (/prova/) sono pagine Astro ma
  // non entrano nella sitemap.
  integrations: indexable ? [sitemap({ filter: includiInSitemap })] : [],
  markdown: {
    // Da Astro 7 `markdown.rehypePlugins` è deprecato: i plugin rehype si
    // passano al processore `unified()`.
    processor: unified({ rehypePlugins }),
  },
  // Caratteri delle varianti di prova: Astro li scarica alla build e li serve
  // da /_astro/fonts/ (nessuna richiesta a Google a pagina aperta).
  fonts: CARATTERI_PROVA,
});
