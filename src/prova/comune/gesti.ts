// Gesti del puntatore (dito, penna, mouse), senza DOM: qui si decide cosa vuol
// dire un tocco; `interazioni.ts` raccoglie gli eventi e agisce.

/** Oltre questa durata (in ms) una pressione è "lunga": ferma la storia e basta, non è un tocco. */
export const PRESSIONE_LUNGA_MS = 300;

/** Cosa fa un tocco sulla storia: la foto prima, la pausa, la foto dopo. */
export type AzioneTocco = 'prec' | 'pausa' | 'succ';

/**
 * Cosa fa un tocco su una zona larga `larghezza` px, a `x` px dal suo bordo
 * sinistro, che è durato `durataMs` dalla pressione al rilascio: la zona è divisa
 * in tre terzi uguali (sinistra indietro, centro pausa, destra avanti). `null`
 * se la pressione è lunga (oltre `PRESSIONE_LUNGA_MS`), se la durata non è stata
 * misurata (`NaN`) o se la zona non ha una larghezza.
 */
export function azioneDelTocco(x: number, larghezza: number, durataMs: number): AzioneTocco | null {
  if (!(durataMs <= PRESSIONE_LUNGA_MS) || !(larghezza > 0)) return null;
  if (x < larghezza / 3) return 'prec';
  if (x < (2 * larghezza) / 3) return 'pausa';
  return 'succ';
}
