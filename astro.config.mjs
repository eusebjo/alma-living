// @ts-check
import { defineConfig } from 'astro/config';
import { unified } from '@astrojs/markdown-remark';
import { rehypePlugins } from './src/lib/markdown';

// https://astro.build/config
export default defineConfig({
  output: 'static',
  site: process.env.SITE_URL ?? 'http://localhost:4321',
  markdown: {
    // Da Astro 7 `markdown.rehypePlugins` è deprecato: i plugin rehype si
    // passano al processore `unified()`.
    processor: unified({ rehypePlugins }),
  },
});
