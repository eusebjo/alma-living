// Quali caratteri carica il sito. Le famiglie vere (nomi, pesi, provider) sono in
// `caratteri-config.ts`, che legge solo astro.config.mjs; qui ci sono solo le
// variabili CSS, così una pagina può importare questo file senza portarsi dietro
// `astro/config`.

// Le variabili CSS dei caratteri della pagina, nell'ordine di caricamento: il
// primo è anche l'unico con `preload`.
export const CARATTERI_SITO: string[] = [
  '--font-libre-caslon-display',
  '--font-libre-caslon-text',
  '--font-instrument-sans',
];
