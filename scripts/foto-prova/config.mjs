// Dove stanno le foto delle pagine di prova (/prova/…). Le foto non entrano mai
// in git: `prepara.mjs` le mette in `FOTO_PROVA_DESTINAZIONE` prima della build,
// prendendole da `FOTO_PROVA_LOCALE` (sul computer di chi sviluppa) oppure dal
// bucket R2 (alla build di Cloudflare e nelle anteprime). `carica.mjs` fa il
// percorso inverso: manda nel bucket le foto che ci mancano.

// Indirizzo pubblico `r2.dev` del bucket R2 `alma-living-prova` (prefisso
// `prova/`), senza barra finale. Non è un segreto.
export const FOTO_PROVA_BASE = 'https://pub-02e2834056a84517a87c5431c6904c14.r2.dev/prova';

// Nome del bucket R2 e prefisso delle foto al suo interno, come li vuole
// `wrangler r2 object put <bucket>/<prefisso>/<nome>`. `FOTO_PROVA_BASE` è
// l'indirizzo pubblico dello stesso prefisso: i due vanno cambiati insieme.
export const FOTO_PROVA_BUCKET = 'alma-living-prova';
export const FOTO_PROVA_PREFISSO = 'prova';

// Cartella (esclusa da git, vedi `.gitignore`) da cui `src/prova/comune/foto.ts`
// legge le foto che Astro ottimizza.
export const FOTO_PROVA_DESTINAZIONE = 'src/prova/foto';

// Cartella locale con gli originali, anch'essa fuori da git (`.gitignore`).
export const FOTO_PROVA_LOCALE = 'foto/prova';
