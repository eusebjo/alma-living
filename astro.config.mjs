// @ts-check
import { defineConfig } from 'astro/config';
import { unified } from '@astrojs/markdown-remark';
import sitemap from '@astrojs/sitemap';
import { getSiteConfig } from './src/config/site';
import { rehypePlugins } from './src/lib/markdown';
import { includiInSitemap } from './src/lib/sitemap';

const { siteUrl, indexable } = getSiteConfig(process.env);

// https://astro.build/config
export default defineConfig({
  output: 'static',
  // Stessa fonte di SeoHead, robots.txt e llms.txt: `getSiteConfig`.
  site: siteUrl,
  // La sitemap esiste solo nelle build indicizzabili (sito lanciato e ramo
  // `main`): altrove non si genera nulla, e robots.txt non la cita. Il pannello
  // dei contenuti (/admin/) è una pagina Astro ma non entra nella sitemap.
  integrations: indexable ? [sitemap({ filter: includiInSitemap })] : [],
  markdown: {
    // Da Astro 7 `markdown.rehypePlugins` è deprecato: i plugin rehype si
    // passano al processore `unified()`.
    processor: unified({ rehypePlugins }),
  },
});
