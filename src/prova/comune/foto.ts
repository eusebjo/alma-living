// Le foto delle pagine di prova. Non sono in git: `npm run build` e `npm run dev`
// le preparano in `src/prova/foto/` con `scripts/foto-prova/prepara.mjs`. Qui
// Vite le importa come immagini, così Astro le ottimizza (AVIF, WebP, misure
// adatte) e le serve dal sito stesso.
import type { ImageMetadata } from 'astro';

const immagini = import.meta.glob<ImageMetadata>('../foto/*.jpg', {
  eager: true,
  import: 'default',
});

/** La foto di prova `nome` (senza estensione), per esempio `foto('righe-rosa')`. */
export function foto(nome: string): ImageMetadata {
  const immagine = immagini[`../foto/${nome}.jpg`];
  if (!immagine) throw new Error(`Foto di prova non trovata: ${nome}`);
  return immagine;
}
