// Le varianti di design in prova (vedi docs/superpowers/specs/
// 2026-10-29-varianti-di-prova-design.md). Questo elenco alimenta la pagina
// /prova/: una variante nuova è una cartella in più in `src/sito/` e una voce qui.
// Delle tre varianti pensate si costruisce solo Salvia social (decisione del
// 2026-10-30): Salvia bianca e Cipria app non si realizzano.
export type VarianteId = 'salvia-social';

export interface Variante {
  id: VarianteId;
  nome: string;
  descrizione: string;
}

export const VARIANTI: readonly Variante[] = [
  {
    id: 'salvia-social',
    nome: 'Salvia social',
    descrizione:
      'Bianco e verde salvia, titoli serif classici, apertura con le foto dei prodotti che scorrono da sole, storie tonde solo sul telefono, selezione dal negozio e diario con la griglia dei post.',
  },
];
