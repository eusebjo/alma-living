// Piccoli aiuti per scrivere testi in Markdown a partire da dati che arrivano
// da una proposta altrui (percorsi, campi, nomi utente): vanno sempre
// neutralizzati prima di finire in un commento pubblico.

const LUNGHEZZA_MASSIMA = 200;

/**
 * Racchiude un valore in un blocco di codice in linea, a prova di Markdown e
 * HTML: niente backtick, parentesi angolari, caratteri di controllo o di
 * direzione del testo, e una lunghezza limitata. Dentro un blocco di codice
 * una menzione (`@utente`) non avvisa nessuno.
 */
export function codice(valore: string): string {
  const pulito = valore
    .replace(/[\p{Cc}\p{Cf}\p{Zl}\p{Zp}]/gu, ' ')
    .replaceAll('`', "'")
    .replaceAll('<', '‹')
    .replaceAll('>', '›')
    .trim();
  const corto =
    pulito.length > LUNGHEZZA_MASSIMA
      ? `${pulito.slice(0, LUNGHEZZA_MASSIMA)}…`
      : pulito;
  return `\`${corto === '' ? ' ' : corto}\``;
}

/** Numero intero con il punto come separatore delle migliaia: 9000 diventa 9.000. */
export function formattaNumero(numero: number): string {
  return String(Math.round(numero)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}
