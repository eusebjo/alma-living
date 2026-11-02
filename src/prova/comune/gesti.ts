// Gesti del puntatore (dito, penna, mouse), senza DOM: qui si decide cosa vuol
// dire un tocco o un trascinamento; `interazioni.ts` raccoglie gli eventi e agisce.

/** Oltre questa durata (in ms) una pressione è "lunga": ferma la storia e basta, non è un tocco. */
export const PRESSIONE_LUNGA_MS = 300;

/** Un trascinamento in giù di almeno questi px (e più verticale che orizzontale) chiude la storia. */
export const SOGLIA_CHIUDI_PX = 80;

/** Un trascinamento in su di almeno questi px (e più verticale che orizzontale) apre la scheda degli inviti. */
export const SOGLIA_INVITO_PX = 60;

/** Oltre questo spostamento (in px) su un asse, una pressione non è un tocco ma un trascinamento. */
export const SOGLIA_MOVIMENTO_PX = 10;

/** Cosa fa un tocco sulla storia: la foto prima, o la foto dopo. */
export type AzioneTocco = 'prec' | 'succ';

/** Cosa fa un trascinamento sulla storia: chiuderla, o aprire la scheda degli inviti. */
export type GestoStoria = 'chiudi' | 'invito';

/**
 * Cosa fa un tocco su una zona larga `larghezza` px, a `x` px dal suo bordo
 * sinistro, che è durato `durataMs` dalla pressione al rilascio: il quarto di
 * sinistra torna indietro, il resto va avanti (la pausa è un pulsante, non un
 * punto della zona). `null` se la pressione è lunga (oltre `PRESSIONE_LUNGA_MS`),
 * se la durata non è stata misurata (`NaN`) o se la zona non ha una larghezza.
 */
export function azioneDelTocco(x: number, larghezza: number, durataMs: number): AzioneTocco | null {
  if (!(durataMs <= PRESSIONE_LUNGA_MS) || !(larghezza > 0)) return null;
  return x < larghezza * 0.25 ? 'prec' : 'succ';
}

/**
 * Cosa fa un trascinamento che ha spostato il puntatore di `dx` px in orizzontale
 * e di `dy` px in verticale (`dy` positivo: verso il basso): in giù da
 * `SOGLIA_CHIUDI_PX` chiude, in su da `SOGLIA_INVITO_PX` apre la scheda. Conta solo
 * se il gesto è più verticale che orizzontale; con valori non numerici è `null`.
 */
export function gestoDellaStoria(dx: number, dy: number): GestoStoria | null {
  if (!(Math.abs(dy) > Math.abs(dx))) return null;
  if (dy >= SOGLIA_CHIUDI_PX) return 'chiudi';
  if (dy <= -SOGLIA_INVITO_PX) return 'invito';
  return null;
}
