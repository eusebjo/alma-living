// Le sette categorie dei prodotti, nell'ordine dei filtri degli scaffali. Fonte
// unica: la leggono gli schemi dei contenuti (`schemas.ts`) e la pagina (`dati.ts`
// la riesporta come `categorie`); il pannello (`public/admin/config.yml`) ne
// ripete id e nomi tra le scelte, e tests/sveltia-config.test.ts li tiene uguali.
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
