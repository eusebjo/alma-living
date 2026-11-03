// Il limite delle voci visibili per misura dello schermo (protocollo "Limite" di
// `interazioni.ts`): quante voci filtrate si vedono prima di "Mostra tutti" e
// il testo di quel pulsante. Puro: le media query le valuta chi chiama.

/** Una regola: con `media` vera si vedono al più `limite` voci. */
export interface RegolaLimite {
  media: string;
  limite: number;
}

/** Il limite della prima regola la cui media query corrisponde; `null`: nessun limite. */
export function limiteAttivo(
  regole: readonly RegolaLimite[],
  corrisponde: (media: string) => boolean,
): number | null {
  return regole.find((regola) => corrisponde(regola.media))?.limite ?? null;
}

/** Quante delle `passano` voci si vedono: tutte se `tutte` o senza limite. */
export function quanteMostrare(passano: number, limite: number | null, tutte: boolean): number {
  return tutte || limite === null ? passano : Math.min(passano, limite);
}

/** "Mostra tutti gli 8", "Mostra tutti gli 11", "Mostra tutti i 5": `gli` davanti a una vocale. */
export function testoMostraTutti(quante: number): string {
  const articolo = String(quante).startsWith('8') || quante === 11 ? 'gli' : 'i';
  return `Mostra tutti ${articolo} ${quante}`;
}
