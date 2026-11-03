// Le sette categorie dei prodotti, nell'ordine dei filtri degli scaffali. Fonte
// unica: la leggono gli schemi dei contenuti (`schemas.ts`), la pagina (`dati.ts`
// la riesporta come `categorie`) e, più avanti, la configurazione del pannello.
//
// Nessun import da Astro: questo file lo leggono anche i test e gli script.
export const CATEGORIE = [
  { id: 'letto', nome: 'Letto' },
  { id: 'bagno', nome: 'Bagno' },
  { id: 'bimbi', nome: 'Bimbi' },
  { id: 'tavola', nome: 'Tavola e cucina' },
  { id: 'profumi', nome: 'Profumi per la casa' },
  { id: 'natale', nome: 'Natale e regali' },
  { id: 'mare', nome: 'Mare' },
] as const;

export type Categoria = (typeof CATEGORIE)[number]['id'];
