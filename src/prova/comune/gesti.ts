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
