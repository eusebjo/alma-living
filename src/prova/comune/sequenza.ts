// Navigazione delle storie: una posizione è un gruppo (una storia) e una foto al
// suo interno. `fotoPerGruppo[g]` è il numero di foto del gruppo `g`.
export type Posizione = { gruppo: number; foto: number };

/** La posizione successiva, o `null` dopo l'ultima foto dell'ultimo gruppo (si chiude). */
export function avanti(p: Posizione, fotoPerGruppo: number[]): Posizione | null {
  if (p.foto + 1 < (fotoPerGruppo[p.gruppo] ?? 0)) {
    return { gruppo: p.gruppo, foto: p.foto + 1 };
  }
  if (p.gruppo + 1 < fotoPerGruppo.length) return { gruppo: p.gruppo + 1, foto: 0 };
  return null;
}

/** La posizione precedente; sulla prima foto del primo gruppo resta dov'è. */
export function indietro(p: Posizione, fotoPerGruppo: number[]): Posizione {
  if (p.foto > 0) return { gruppo: p.gruppo, foto: p.foto - 1 };
  if (p.gruppo > 0) {
    const ultima = (fotoPerGruppo[p.gruppo - 1] ?? 1) - 1;
    return { gruppo: p.gruppo - 1, foto: ultima };
  }
  return { gruppo: 0, foto: 0 };
}
