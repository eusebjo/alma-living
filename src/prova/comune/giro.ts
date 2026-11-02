// Il giro di una galleria che avanza da sola, senza DOM: qui si decide quando
// passare alla foto dopo e quale sia; `interazioni.ts` gestisce l'orologio
// (`requestAnimationFrame`) e scrive sulla pagina.

/**
 * Un passo dell'orologio del giro. `trascorso` sono i millisecondi passati sulla
 * foto attuale, `dt` quelli dall'ultimo fotogramma, `inCorsa` dice se il tempo
 * conta (non in pausa, non in sosta, pagina visibile), `durata` è quanto resta
 * ferma ogni foto. Fermo, non cambia nulla. In corsa, `dt` si somma (un `dt`
 * negativo non toglie tempo) e raggiunta la durata si avanza di una foto sola,
 * qualunque sia l'eccesso, e si riparte da zero: dopo una lunga assenza il giro
 * non salta più foto.
 */
export function passoDelGiro(
  trascorso: number,
  dt: number,
  inCorsa: boolean,
  durata: number,
): { trascorso: number; avanza: boolean } {
  if (!inCorsa) return { trascorso, avanza: false };
  const t = trascorso + Math.max(0, dt);
  return t >= durata ? { trascorso: 0, avanza: true } : { trascorso: t, avanza: false };
}

/**
 * La foto del giro dopo (`passo` 1) o prima (-1) di `attuale`, a giro. `attive`
 * sono gli indici, sull'elenco completo delle foto, di quelle che fanno parte del
 * giro; il risultato è uno di loro. Se `attuale` non è tra le attive (una foto
 * saltata da una media query) si va alla prima attiva dopo di lei, a giro, o,
 * con -1, all'ultima prima. Senza foto attive resta `attuale`.
 */
export function fotoDelGiro(attive: readonly number[], attuale: number, passo: 1 | -1): number {
  if (attive.length === 0) return attuale;
  if (passo === 1) {
    const dopo = attive.filter((i) => i > attuale);
    return Math.min(...(dopo.length > 0 ? dopo : attive));
  }
  const prima = attive.filter((i) => i < attuale);
  return Math.max(...(prima.length > 0 ? prima : attive));
}
