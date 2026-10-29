import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { eseguitoComeComando, preparaFoto } from '../scripts/foto-prova/prepara.mjs';

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
    expect(fetchFn).toHaveBeenCalledWith('https://esempio.r2.dev/mare.jpg', {
      signal: expect.any(AbortSignal),
    });
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

  it('un bucket che non risponde entro il tempo massimo conta come foto mancante', async () => {
    // Come `fetch`: la richiesta resta appesa finché il segnale non la interrompe.
    const fetchFn = vi.fn(
      (_indirizzo: string, { signal }: { signal: AbortSignal }) =>
        new Promise((_risolvi, rifiuta) => {
          signal.addEventListener('abort', () => rifiuta(signal.reason));
        }),
    );

    await expect(
      preparaFoto({
        elenco: ['a.jpg'],
        destinazione,
        sorgenteLocale,
        base: BASE,
        fetchFn,
        attesaMs: 20,
      }),
    ).rejects.toThrow(/Foto di prova mancanti: a\.jpg \(nessuna risposta entro 0,02 s\)/);
    expect(existsSync(join(destinazione, 'a.jpg'))).toBe(false);
  });
});

describe('eseguitoComeComando', () => {
  let radice: string;
  let vera: string;
  let script: string;

  beforeEach(() => {
    radice = mkdtempSync(join(tmpdir(), 'foto-prova-main-'));
    vera = join(radice, 'vera');
    mkdirSync(vera);
    script = join(vera, 'prepara.mjs');
    writeFileSync(script, '');
  });

  afterEach(() => {
    rmSync(radice, { recursive: true, force: true });
  });

  it('riconosce il file lanciato, con il percorso diretto', () => {
    expect(eseguitoComeComando(pathToFileURL(script).href, script)).toBe(true);
  });

  it('riconosce il file lanciato da una giunzione o da un collegamento simbolico', () => {
    // Su Windows una giunzione non chiede permessi da amministratore; altrove
    // `junction` è ignorato e si crea un collegamento simbolico alla cartella.
    const collegamento = join(radice, 'collegamento');
    symlinkSync(vera, collegamento, 'junction');

    expect(eseguitoComeComando(pathToFileURL(script).href, join(collegamento, 'prepara.mjs'))).toBe(
      true,
    );
  });

  it('non scambia per comando un altro file, un file che non esiste o nessun file', () => {
    const altro = join(vera, 'altro.mjs');
    writeFileSync(altro, '');
    const url = pathToFileURL(script).href;

    expect(eseguitoComeComando(url, altro)).toBe(false);
    expect(eseguitoComeComando(url, join(vera, 'manca.mjs'))).toBe(false);
    expect(eseguitoComeComando(url, undefined)).toBe(false);
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
