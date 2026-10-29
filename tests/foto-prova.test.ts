import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { preparaFoto } from '../scripts/foto-prova/prepara.mjs';

const BASE = 'https://esempio.r2.dev';

// Una risposta finta: basta quello che legge lo script (`ok`, `status`, `arrayBuffer`).
function risposta(byte: number[] | null) {
  return byte === null
    ? { ok: false, status: 404, arrayBuffer: async () => new ArrayBuffer(0) }
    : { ok: true, status: 200, arrayBuffer: async () => new Uint8Array(byte).buffer };
}

describe('preparaFoto', () => {
  let radice: string;
  let destinazione: string;
  let sorgenteLocale: string;

  beforeEach(() => {
    radice = mkdtempSync(join(tmpdir(), 'foto-prova-'));
    destinazione = join(radice, 'destinazione');
    sorgenteLocale = join(radice, 'locale');
    mkdirSync(sorgenteLocale);
  });

  afterEach(() => {
    rmSync(radice, { recursive: true, force: true });
  });

  it('salta le foto già presenti e non scarica nulla', async () => {
    mkdirSync(destinazione);
    writeFileSync(join(destinazione, 'mare.jpg'), Buffer.from([1, 2, 3]));
    // Anche con una copia locale diversa: quella già in destinazione vince.
    writeFileSync(join(sorgenteLocale, 'mare.jpg'), Buffer.from([9, 9, 9]));
    const fetchFn = vi.fn();

    const esito = await preparaFoto({
      elenco: ['mare.jpg'],
      destinazione,
      sorgenteLocale,
      base: BASE,
      fetchFn,
    });

    expect(fetchFn).not.toHaveBeenCalled();
    expect(esito.presenti).toContain('mare.jpg');
    expect(esito.copiate).toEqual([]);
    expect(esito.scaricate).toEqual([]);
    expect([...readFileSync(join(destinazione, 'mare.jpg'))]).toEqual([1, 2, 3]);
  });

  it('copia dalla cartella locale prima di scaricare', async () => {
    writeFileSync(join(sorgenteLocale, 'mare.jpg'), Buffer.from([4, 5, 6]));
    const fetchFn = vi.fn();

    const esito = await preparaFoto({
      elenco: ['mare.jpg'],
      destinazione,
      sorgenteLocale,
      base: BASE,
      fetchFn,
    });

    expect(fetchFn).not.toHaveBeenCalled();
    expect(esito.copiate).toContain('mare.jpg');
    expect(esito.presenti).toEqual([]);
    expect(esito.scaricate).toEqual([]);
    expect([...readFileSync(join(destinazione, 'mare.jpg'))]).toEqual([4, 5, 6]);
  });

  it('scarica dal bucket quello che manca in locale', async () => {
    const fetchFn = vi.fn(async () => risposta([7, 8, 9]));

    const esito = await preparaFoto({
      elenco: ['mare.jpg'],
      destinazione,
      sorgenteLocale,
      base: BASE,
      fetchFn,
    });

    expect(fetchFn).toHaveBeenCalledTimes(1);
    expect(fetchFn).toHaveBeenCalledWith('https://esempio.r2.dev/mare.jpg');
    expect(esito.scaricate).toContain('mare.jpg');
    expect(esito.copiate).toEqual([]);
    expect([...readFileSync(join(destinazione, 'mare.jpg'))]).toEqual([7, 8, 9]);
  });

  it('si ferma nominando tutte le foto introvabili', async () => {
    const fetchFn = vi.fn(async () => risposta(null));

    await expect(
      preparaFoto({
        elenco: ['a.jpg', 'b.jpg'],
        destinazione,
        sorgenteLocale,
        base: BASE,
        fetchFn,
      }),
    ).rejects.toThrow(/Foto di prova mancanti: .*a\.jpg.*b\.jpg/);
  });

  it('non lascia file a metà quando un download fallisce', async () => {
    const fetchFn = vi.fn(async () => risposta(null));

    await expect(
      preparaFoto({
        elenco: ['a.jpg'],
        destinazione,
        sorgenteLocale,
        base: BASE,
        fetchFn,
      }),
    ).rejects.toThrow(/Foto di prova mancanti/);

    expect(existsSync(join(destinazione, 'a.jpg'))).toBe(false);
  });

  it('una rete che non risponde conta come foto mancante, senza altri errori', async () => {
    const fetchFn = vi.fn(async () => {
      throw new TypeError('fetch failed');
    });

    await expect(
      preparaFoto({
        elenco: ['a.jpg'],
        destinazione,
        sorgenteLocale,
        base: BASE,
        fetchFn,
      }),
    ).rejects.toThrow(/Foto di prova mancanti: a\.jpg/);
  });
});

describe('elenco.json', () => {
  it('elenco.json e la banca foto coincidono', () => {
    const elenco: string[] = JSON.parse(
      readFileSync('scripts/foto-prova/elenco.json', 'utf8'),
    );

    expect(elenco).toHaveLength(27);
    expect(new Set(elenco).size).toBe(27);
    for (const nome of elenco) expect(nome).toMatch(/^[a-z0-9-]+\.jpg$/);
  });
});

describe('foto()', () => {
  it('lancia un errore chiaro per una foto che non c\'è', async () => {
    const { foto } = await import('../src/prova/comune/foto');

    expect(() => foto('non-esiste')).toThrow('Foto di prova non trovata: non-esiste');
  });
});
