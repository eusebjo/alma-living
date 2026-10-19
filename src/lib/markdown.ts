import type { RehypePlugins } from '@astrojs/markdown-remark';
import rehypeSanitize from 'rehype-sanitize';

// Plugin rehype applicati al testo Markdown delle pagine. Lo schema di default
// di rehype-sanitize toglie `<script>`, `<iframe>`, gli attributi `style` e
// `on*`, e gli URL `javascript:`. Si collega in astro.config.mjs tramite
// `markdown.processor`.
export const rehypePlugins: RehypePlugins = [rehypeSanitize];
