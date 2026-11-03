import type { APIRoute } from 'astro';
import { getEntry } from 'astro:content';
import { absoluteUrl, getSiteConfig } from '../config/site';
import { llmsTxt } from '../lib/llms';

export const GET: APIRoute = async () => {
  const { siteUrl } = getSiteConfig(process.env);

  const negozioEntry = await getEntry('negozio', 'negozio');
  if (!negozioEntry) {
    throw new Error('Manca src/content/negozio/negozio.json (voce "negozio").');
  }
  const negozio = negozioEntry.data;

  // Il sito ha una sola pagina, la home (src/pages/index.astro): stesso titolo
  // della pagina, descrizione del negozio.
  const pagine = [
    {
      titolo: 'Alma Living, biancheria per la casa a Livorno',
      descrizione: negozio.descrizione,
      url: absoluteUrl(siteUrl, '/'),
    },
  ];

  return new Response(llmsTxt(negozio, pagine, siteUrl), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};
