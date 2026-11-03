import { describe, expect, it } from 'vitest';
import { limitaLarghezze } from '../../src/sito/comune/larghezze';

describe('limitaLarghezze', () => {
  it('toglie le larghezze oltre l’originale e aggiunge la larghezza dell’originale', () => {
    expect(limitaLarghezze([400, 600, 800, 1000], 896)).toEqual([400, 600, 800, 896]);
    expect(limitaLarghezze([400, 600, 800, 1000], 533)).toEqual([400, 533]);
  });

  it('lascia com’è l’elenco se nessuna larghezza supera l’originale', () => {
    expect(limitaLarghezze([400, 600], 896)).toEqual([400, 600]);
    expect(limitaLarghezze([400, 600], 600)).toEqual([400, 600]);
  });

  it('senza duplicati e in ordine crescente', () => {
    expect(limitaLarghezze([1000, 400, 800], 800)).toEqual([400, 800]);
    expect(limitaLarghezze([800, 400, 400, 1000], 1000)).toEqual([400, 800, 1000]);
  });

  it('se tutte le larghezze superano l’originale resta solo l’originale', () => {
    expect(limitaLarghezze([64, 128], 40)).toEqual([40]);
  });

  it('non modifica l’elenco ricevuto', () => {
    const larghezze = [1000, 400];
    limitaLarghezze(larghezze, 500);
    expect(larghezze).toEqual([1000, 400]);
  });

  it('un elenco vuoto resta vuoto', () => {
    expect(limitaLarghezze([], 500)).toEqual([]);
  });
});
