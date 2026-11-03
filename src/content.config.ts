import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { negozioSchema, postSchema, prodottoSchema, storiaSchema } from './content/schemas';

// Un solo oggetto JSON piatto: il loader `glob` ricava l'id della voce dal nome
// del file, quindi `negozio.json` diventa la voce `negozio`.
const negozio = defineCollection({
  loader: glob({ pattern: '*.json', base: './src/content/negozio' }),
  schema: negozioSchema,
});

// Un file JSON per voce: il nome del file è l'id (`sabbia.json` → `sabbia`).
// Le foto sono indirizzi del bucket, non file del repository (vedi `foto.ts`).
const prodotti = defineCollection({
  loader: glob({ pattern: '*.json', base: './src/content/prodotti' }),
  schema: prodottoSchema,
});

const post = defineCollection({
  loader: glob({ pattern: '*.json', base: './src/content/post' }),
  schema: postSchema,
});

const storie = defineCollection({
  loader: glob({ pattern: '*.json', base: './src/content/storie' }),
  schema: storiaSchema,
});

export const collections = { negozio, prodotti, post, storie };
