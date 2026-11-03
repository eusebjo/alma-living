import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { elencoCartella } from './elenco-cartella';

// Quando la redazione toglie l'ultimo prodotto o l'ultimo post, Git toglie anche la
// cartella ormai vuota: i test che leggono le cartelle dei contenuti non devono
// diventare rossi per questo. Una cartella che manca è un elenco vuoto.
const radice = mkdtempSync(join(tmpdir(), 'alma-elenco-'));

afterAll(() => {
  rmSync(radice, { recursive: true, force: true });
});

describe('elencoCartella', () => {
  it('una cartella che non esiste è un elenco vuoto', () => {
    expect(elencoCartella(join(radice, 'non-esiste'))).toEqual([]);
  });

  it('una cartella vuota è un elenco vuoto', () => {
    const vuota = join(radice, 'vuota');
    mkdirSync(vuota);
    expect(elencoCartella(vuota)).toEqual([]);
  });

  it('una cartella con dei file dà i loro nomi, in ordine alfabetico', () => {
    const piena = join(radice, 'piena');
    mkdirSync(piena);
    for (const nome of ['b.json', 'a.json', 'c.txt']) writeFileSync(join(piena, nome), '{}');
    expect(elencoCartella(piena)).toEqual(['a.json', 'b.json', 'c.txt']);
  });

  it('un file al posto di una cartella resta un errore: non è una cartella mancata', () => {
    const file = join(radice, 'file.json');
    writeFileSync(file, '{}');
    expect(() => elencoCartella(file)).toThrow();
  });
});
