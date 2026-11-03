// Quali pagine entrano nella sitemap (solo nelle build di lancio su `main`).
//
// Il pannello dei contenuti (/admin/) è una pagina Astro come le altre, quindi
// @astrojs/sitemap la includerebbe: ha `noindex`, ma non deve comparire nella
// sitemap. Il filtro guarda i segmenti del percorso, non il testo: una pagina
// come /administration/ resta dentro.
const SEGMENTI_ESCLUSI = ['admin'];

export function includiInSitemap(indirizzo: string): boolean {
  const segmenti = new URL(indirizzo).pathname.split('/').filter(Boolean);
  return !segmenti.some((segmento) => SEGMENTI_ESCLUSI.includes(segmento));
}
