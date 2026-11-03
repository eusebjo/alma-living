// Le larghezze di una foto, senza quelle oltre l'originale. Per le immagini
// importate lo fa Astro da sé; per quelle remote no (le misure dell'originale
// non le conosce, e lascia a chi scrive la pagina il compito di non chiedere
// versioni più grandi): ne uscirebbero descrittori `Nw` che l'immagine non ha.
// Nessun import da Astro: lo leggono anche i test.

/**
 * Le `larghezze` in ordine crescente, senza doppioni e senza quelle maggiori di
 * `originale`; se qualcuna cade, si aggiunge la larghezza dell'originale, come fa
 * Astro con le foto importate (`[400, 600, 800, 1000]` su 896 px dà
 * `[400, 600, 800, 896]`). L'elenco ricevuto non viene toccato.
 */
export function limitaLarghezze(larghezze: number[], originale: number): number[] {
  const crescenti = [...larghezze].sort((a, b) => a - b);
  const entro = crescenti.filter((larghezza) => larghezza <= originale);
  if (entro.length < crescenti.length) entro.push(originale);
  return [...new Set(entro)];
}
