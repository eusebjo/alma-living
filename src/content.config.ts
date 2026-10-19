import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { makePaginaSchema, negozioSchema } from './content/schemas';

// Un solo oggetto JSON piatto: il loader `glob` ricava l'id della voce dal nome
// del file, quindi `negozio.json` diventa la voce `negozio`.
const negozio = defineCollection({
  loader: glob({ pattern: '*.json', base: './src/content/negozio' }),
  schema: negozioSchema,
});

// Frontmatter (titolo, descrizione, immagine, immagine_alt) più il corpo in
// Markdown. Le immagini stanno in `src/content/pagine/immagini/` e si citano
// con un percorso relativo: `immagini/home.webp` (come lo scrive il pannello) o
// `./immagini/home.webp`.
const pagine = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/pagine' }),
  schema: ({ image }) => makePaginaSchema(image),
});

export const collections = { negozio, pagine };
