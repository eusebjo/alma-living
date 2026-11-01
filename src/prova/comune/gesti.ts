// Gesti del puntatore (dito, penna, mouse), senza DOM: qui si decide cosa vuol
// dire uno spostamento; `interazioni.ts` raccoglie gli eventi e agisce.

/** Quanto si deve trascinare in orizzontale (in px) perché conti come un gesto. */
export const SOGLIA_TRASCINAMENTO_PX = 40;

/**
 * Cosa vuol dire un trascinamento di `dx` e `dy` pixel dal punto di partenza:
 * `1` la foto dopo (dito verso sinistra), `-1` quella prima (verso destra), `0`
 * niente. Non conta uno spostamento sotto la soglia né uno più verticale che
 * orizzontale: è lo scorrimento della pagina.
 */
export function versoTrascinamento(dx: number, dy: number): -1 | 0 | 1 {
  if (Math.abs(dx) < SOGLIA_TRASCINAMENTO_PX || Math.abs(dx) < Math.abs(dy)) return 0;
  return dx < 0 ? 1 : -1;
}

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
