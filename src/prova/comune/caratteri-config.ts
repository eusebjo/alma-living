// Famiglie di caratteri delle varianti di prova, per `fonts` di
// astro.config.mjs: Astro le scarica alla build e le serve dal sito stesso (da
// /_astro/fonts/), senza richieste a Google a pagina aperta.
//
// Questo file importa `astro/config`, quindi lo legge solo la configurazione:
// una pagina o un componente che lo importasse porterebbe Astro dentro il
// proprio bundle e la build si romperebbe. Le pagine usano `caratteri.ts`.
import type { AstroUserConfig } from 'astro';
import { fontProviders } from 'astro/config';

const google = fontProviders.google();

export const CARATTERI_PROVA: NonNullable<AstroUserConfig['fonts']> = [
  {
    provider: google,
    name: 'Libre Caslon Display',
    cssVariable: '--font-libre-caslon-display',
    fallbacks: ['serif'],
    weights: [400],
    styles: ['normal'],
    subsets: ['latin'],
  },
  {
    provider: google,
    name: 'Libre Caslon Text',
    cssVariable: '--font-libre-caslon-text',
    fallbacks: ['serif'],
    weights: [400],
    styles: ['italic'],
    subsets: ['latin'],
  },
  {
    provider: google,
    name: 'Instrument Sans',
    cssVariable: '--font-instrument-sans',
    weights: [400, 500, 600],
    styles: ['normal'],
    subsets: ['latin'],
  },
  {
    provider: google,
    name: 'Beth Ellen',
    cssVariable: '--font-beth-ellen',
    fallbacks: ['cursive'],
    weights: [400],
    styles: ['normal'],
    subsets: ['latin'],
  },
  {
    provider: google,
    name: 'DM Serif Display',
    cssVariable: '--font-dm-serif-display',
    fallbacks: ['serif'],
    weights: [400],
    styles: ['normal', 'italic'],
    subsets: ['latin'],
  },
  {
    provider: google,
    name: 'Plus Jakarta Sans',
    cssVariable: '--font-plus-jakarta-sans',
    // Carattere variabile: un solo file per l'intero intervallo di pesi.
    weights: ['400 700'],
    styles: ['normal'],
    subsets: ['latin'],
  },
];
