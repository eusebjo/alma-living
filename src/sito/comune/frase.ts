// Il taglio della frase di una storia: chiusa, la frase mostra solo le parole che
// stanno nelle sue righe, seguite da «…» e da "altro" (vedi il protocollo "Storie"
// in `interazioni.ts`, che misura cosa sta).

/** Le prime `parole` parole della frase, con «…» al posto della punteggiatura che le starebbe attaccata. */
export function fraseTagliata(testo: string, parole: number): string {
  const tenute = testo.trim().split(/\s+/).filter(Boolean).slice(0, parole).join(' ');
  return `${tenute.replace(/[\s,;:.!?…–—-]+$/u, '')}…`;
}

/**
 * Quante parole stanno: la più grande `n` tra 0 e `totale` per cui `stanno(n)` è
 * vero, con una ricerca a metà (`stanno` deve passare da vero a falso al crescere
 * di `n`). Se non ne sta nemmeno una, 0.
 */
export function paroleCheStanno(totale: number, stanno: (n: number) => boolean): number {
  let min = 0;
  let max = totale;
  while (min < max) {
    const mezzo = Math.ceil((min + max) / 2);
    if (stanno(mezzo)) min = mezzo;
    else max = mezzo - 1;
  }
  return min;
}
