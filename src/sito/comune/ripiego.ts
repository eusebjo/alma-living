// Il formato dell'`<img>` di ripiego dentro `<picture>` (dopo le `<source>` AVIF e
// WebP). Per le immagini importate Astro tiene il formato dell'originale solo per
// JPEG, GIF e SVG; per le remote ripiegherebbe sempre su PNG, che per una foto pesa
// molte volte un JPEG. Nessun import da Astro: lo leggono anche i test.

/**
 * Il formato di ripiego per una foto il cui formato vero è `formato` (quello che
 * restituisce `inferRemoteSize`: `jpg`, `png`, `webp`, `avif`, `gif`, `svg`…):
 * GIF e SVG restano come sono (un GIF può essere animato, un SVG non si converte in
 * pixel); ogni altro formato, WebP e PNG dei caricamenti compresi, ripiega su `jpg`.
 */
export function formatoDiRipiego(formato: string): 'jpg' | 'gif' | 'svg' {
  const f = formato.toLowerCase();
  return f === 'gif' || f === 'svg' ? f : 'jpg';
}
