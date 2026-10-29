import { describe, expect, it } from 'vitest';
import { filtra } from '../../src/prova/comune/filtra';

const voci = [
  { nome: 'Lenzuola', categorie: ['letto'] },
  { nome: 'Plaid', categorie: ['letto', 'salotto'] },
  { nome: 'Tovaglia', categorie: ['tavola'] },
];

describe('filtra', () => {
  it('"tutti" restituisce tutto', () => {
    expect(filtra(voci, 'tutti')).toEqual(voci);
  });

  it('"letto" restituisce solo le voci con letto', () => {
    expect(filtra(voci, 'letto').map((voce) => voce.nome)).toEqual(['Lenzuola', 'Plaid']);
  });

  it('un filtro senza voci restituisce []', () => {
    expect(filtra(voci, 'mare')).toEqual([]);
  });

  it("non modifica l'elenco ricevuto", () => {
    const copia = structuredClone(voci);
    filtra(voci, 'letto');
    expect(voci).toEqual(copia);
  });
});
