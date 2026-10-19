import type { APIRoute } from 'astro';
import { getCollection, getEntry } from 'astro:content';
import { absoluteUrl, getSiteConfig } from '../config/site';
import { llmsTxt } from '../lib/llms';

export const GET: APIRoute = async () => {
  const { siteUrl } = getSiteConfig(process.env);

  const negozioEntry = await getEntry('negozio', 'negozio');
  if (!negozioEntry) {
    throw new Error('Manca src/content/negozio/negozio.json (voce "negozio").');
  }

  // La pagina `home` è la radice del sito; ogni altra pagina `<id>.md` deve
  // avere la sua rotta `/<id>/`.
  const pagine = (await getCollection('pagine'))
    .sort((a, b) => {
      if (a.id === 'home') return -1;
      if (b.id === 'home') return 1;
      return a.id.localeCompare(b.id);
    })
    .map((pagina) => ({
      titolo: pagina.data.titolo,
      descrizione: pagina.data.descrizione,
      url: absoluteUrl(siteUrl, pagina.id === 'home' ? '/' : `/${pagina.id}/`),
    }));

  return new Response(llmsTxt(negozioEntry.data, pagine, siteUrl), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};
