// Quali caratteri carica ogni variante di prova. Le famiglie vere (nomi, pesi,
// provider) sono in `caratteri-config.ts`, che legge solo astro.config.mjs; qui
// ci sono solo le variabili CSS, così una pagina può importare questo file
// senza portarsi dietro `astro/config`.
import type { VarianteId } from '../varianti';

// Le variabili CSS dei caratteri di ogni variante, nell'ordine di caricamento:
// il primo è anche l'unico con `preload`.
export const CARATTERI_PER_VARIANTE: Record<VarianteId, string[]> = {
  'salvia-social': [
    '--font-libre-caslon-display',
    '--font-libre-caslon-text',
    '--font-instrument-sans',
    '--font-beth-ellen',
  ],
  'salvia-bianca': [
    '--font-dm-serif-display',
    '--font-instrument-sans',
    '--font-beth-ellen',
  ],
  'cipria-app': ['--font-plus-jakarta-sans'],
};
