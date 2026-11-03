// Filtro per categoria degli articoli. `'tutti'` non filtra.
export function filtra<T extends { categorie: readonly string[] }>(
  voci: readonly T[],
  filtro: string,
): T[] {
  if (filtro === 'tutti') return [...voci];
  return voci.filter((voce) => voce.categorie.includes(filtro));
}
