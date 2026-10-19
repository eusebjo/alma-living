import type { Rules, Verdict } from './types';

// Chi è l'autore di una proposta, e con quali regole va valutata. Sta in un file
// a parte perché lo usano sia `evaluate` sia la lettura da GitHub (che decide
// se leggere i contenuti dei file): le due devono dare la stessa risposta.

/** Ruolo di una proposta: quello dell'autore, oppure `redazione` per i rami del pannello. */
export type Ruolo = Verdict['ruolo'];

/**
 * Il pannello dei contenuti lavora solo su rami `cms/<collection>/<id>`, e la
 * redazione può scrivere lì (non negli altri rami: vedi `infra/github/`).
 * Maiuscole e minuscole non contano: sbagliare dal lato prudente costa solo
 * regole più severe per un ramo di sviluppo chiamato `CMS/...`.
 */
const RAMO_DEL_PANNELLO = /^cms\//i;

/** `true` se `ramo` è un ramo del pannello dei contenuti (`cms/...`). */
export function eRamoDelPannello(ramo: string | null | undefined): boolean {
  return typeof ramo === 'string' && RAMO_DEL_PANNELLO.test(ramo);
}

/** Ruolo dell'autore secondo `autonomia.yml`. I login di GitHub non distinguono maiuscole e minuscole. */
export function ruoloDi(autore: string, rules: Rules): Ruolo {
  const login = autore.toLowerCase();
  const contiene = (elenco: string[]) =>
    elenco.some((nome) => nome.toLowerCase() === login);
  if (contiene(rules.ruoli.sviluppo)) return 'sviluppo';
  if (contiene(rules.ruoli.redazione)) return 'redazione';
  return 'sconosciuto';
}

/**
 * Ruolo con cui si valuta la proposta. Una proposta di un ramo `cms/` vale
 * come proposta della redazione anche se la apre chi è nello `sviluppo`: il
 * ramo è quello su cui scrive la redazione, quindi il suo contenuto va
 * controllato qualunque sia chi apre la pull request (altrimenti le modifiche
 * della redazione andrebbero online senza controlli, con l'approvazione
 * dell'admin). Chi non è in nessun ruolo resta `sconosciuto`.
 */
export function ruoloEffettivo(
  autore: string,
  ramo: string | null | undefined,
  rules: Rules,
): Ruolo {
  const ruolo = ruoloDi(autore, rules);
  return ruolo === 'sviluppo' && eRamoDelPannello(ramo) ? 'redazione' : ruolo;
}
