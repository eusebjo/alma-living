// Le varianti di design in prova (vedi docs/superpowers/specs/
// 2026-10-29-varianti-di-prova-design.md). Questo elenco alimenta la pagina
// /prova/: una variante nuova è una cartella in più in `src/prova/` e una voce qui.
export type VarianteId = 'salvia-social' | 'salvia-bianca' | 'cipria-app';

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
      'Bianco e verde salvia, titoli serif classici, storie tonde sotto l’header e la sezione di Martina come profilo con griglia di post.',
  },
  {
    id: 'salvia-bianca',
    nome: 'Salvia bianca',
    descrizione:
      'Molto bianco e aria, foto come stampe, saluto in forma di cartolina e un post in evidenza con le miniature degli altri.',
  },
  {
    id: 'cipria-app',
    nome: 'Cipria app',
    descrizione:
      'Interfaccia da app in cipria e cacao, con la sezione di Martina come feed e una colonna laterale.',
  },
];
