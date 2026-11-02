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
import {
  caricaFoto,
  controllaFoto,
  daCaricare,
  inviaConWrangler,
  leggiOpzioni,
} from '../scripts/foto-prova/carica.mjs';
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

describe('daCaricare', () => {
  it('carica quello che non è nel bucket ma c\'è in locale, e segnala il resto', () => {
    const esito = daCaricare(
      ['a.jpg', 'b.jpg', 'c.jpg'],
      new Set(['a.jpg']),
      new Set(['b.jpg']),
    );

    expect(esito).toEqual({ carica: ['b.jpg'], mancanti: ['c.jpg'] });
  });

  it('con tutte le foto già nel bucket non resta nulla da fare', () => {
    const esito = daCaricare(
      ['a.jpg', 'b.jpg'],
      new Set(['a.jpg', 'b.jpg']),
      new Set(['a.jpg']),
    );

    expect(esito).toEqual({ carica: [], mancanti: [] });
  });

  it('tiene l\'ordine dell\'elenco, non quello degli insiemi', () => {
    const esito = daCaricare(
      ['d.jpg', 'c.jpg', 'b.jpg', 'a.jpg'],
      new Set(),
      new Set(['a.jpg', 'c.jpg']),
    );

    expect(esito).toEqual({ carica: ['c.jpg', 'a.jpg'], mancanti: ['d.jpg', 'b.jpg'] });
  });
});

describe('caricaFoto', () => {
  let radice: string;
  let locale: string;

  // Il bucket finto: `controlla` guarda in questo insieme, `invia` ci aggiunge la foto.
  let nelBucket: Set<string>;
  let controlla: ReturnType<typeof vi.fn<(url: string) => Promise<boolean>>>;
  let invia: ReturnType<typeof vi.fn<(nome: string, percorso: string) => Promise<void>>>;
  let log: ReturnType<typeof vi.fn<(riga: string) => void>>;

  function opzioni(elenco: string[], extra: Record<string, unknown> = {}) {
    return {
      elenco,
      locale,
      base: BASE,
      bucket: 'bucket-finto',
      prefisso: 'prova',
      controlla,
      invia,
      log,
      ...extra,
    };
  }

  beforeEach(() => {
    radice = mkdtempSync(join(tmpdir(), 'foto-prova-carica-'));
    locale = join(radice, 'locale');
    mkdirSync(locale);
    nelBucket = new Set();
    controlla = vi.fn(async (url: string) => nelBucket.has(url.slice(`${BASE}/`.length)));
    invia = vi.fn(async (nome: string) => {
      nelBucket.add(nome);
    });
    log = vi.fn();
  });

  afterEach(() => {
    rmSync(radice, { recursive: true, force: true });
  });

  it('carica solo le foto assenti dal bucket e presenti in locale, poi le ricontrolla', async () => {
    writeFileSync(join(locale, 'gia.jpg'), Buffer.from([1]));
    writeFileSync(join(locale, 'nuova.jpg'), Buffer.from([2]));
    nelBucket.add('gia.jpg');
    nelBucket.add('solo-bucket.jpg');

    const esito = await caricaFoto(
      opzioni(['gia.jpg', 'nuova.jpg', 'solo-bucket.jpg', 'persa.jpg']),
    );

    expect(esito).toEqual({
      caricate: ['nuova.jpg'],
      giaPresenti: ['gia.jpg', 'solo-bucket.jpg'],
      mancanti: ['persa.jpg'],
    });
    expect(invia).toHaveBeenCalledTimes(1);
    expect(invia).toHaveBeenCalledWith('nuova.jpg', join(locale, 'nuova.jpg'));
    // Il controllo dopo l'invio guarda l'indirizzo pubblico della foto.
    expect(controlla).toHaveBeenCalledWith(`${BASE}/nuova.jpg`);
    expect(controlla.mock.calls.filter(([url]) => url === `${BASE}/nuova.jpg`)).toHaveLength(2);
  });

  it('con prova: true elenca le foto da caricare e non invia nulla', async () => {
    writeFileSync(join(locale, 'nuova.jpg'), Buffer.from([2]));

    const esito = await caricaFoto(opzioni(['nuova.jpg', 'persa.jpg'], { prova: true }));

    expect(invia).not.toHaveBeenCalled();
    expect(nelBucket.size).toBe(0);
    expect(esito).toEqual({ caricate: [], giaPresenti: [], mancanti: ['persa.jpg'] });
    expect(log.mock.calls.map(([riga]) => riga).join('\n')).toContain('nuova.jpg');
  });

  it('non fa nulla quando le foto sono già tutte nel bucket', async () => {
    nelBucket.add('a.jpg');

    const esito = await caricaFoto(opzioni(['a.jpg']));

    expect(esito).toEqual({ caricate: [], giaPresenti: ['a.jpg'], mancanti: [] });
    expect(invia).not.toHaveBeenCalled();
  });

  it('se il bucket risponde con un errore (HTTP 500) si ferma senza inviare nulla', async () => {
    writeFileSync(join(locale, 'nuova.jpg'), Buffer.from([2]));
    controlla.mockRejectedValue(new Error('Il bucket ha risposto HTTP 500'));

    await expect(caricaFoto(opzioni(['nuova.jpg']))).rejects.toThrow(/HTTP 500/);

    expect(invia).not.toHaveBeenCalled();
  });

  it('se dopo l\'invio la foto risulta ancora assente fallisce', async () => {
    writeFileSync(join(locale, 'nuova.jpg'), Buffer.from([2]));
    // L'invio finto non mette la foto nel bucket.
    invia.mockResolvedValue(undefined);

    await expect(caricaFoto(opzioni(['nuova.jpg']))).rejects.toThrow(
      /nuova\.jpg.*ancora assente dal bucket/,
    );
  });

  it('se l\'invio fallisce non prosegue con le altre foto', async () => {
    writeFileSync(join(locale, 'a.jpg'), Buffer.from([1]));
    writeFileSync(join(locale, 'b.jpg'), Buffer.from([2]));
    invia.mockRejectedValue(new Error('Caricamento non riuscito: a.jpg.'));

    await expect(caricaFoto(opzioni(['a.jpg', 'b.jpg']))).rejects.toThrow(
      'Caricamento non riuscito: a.jpg.',
    );

    expect(invia).toHaveBeenCalledTimes(1);
  });
});

describe('controllaFoto', () => {
  const INDIRIZZO = `${BASE}/mare.jpg`;

  it('200: la foto c\'è; la richiesta è una HEAD con un tempo massimo', async () => {
    const fetchFn = vi.fn(async () => ({ status: 200 }));

    await expect(controllaFoto(INDIRIZZO, { fetchFn })).resolves.toBe(true);

    expect(fetchFn).toHaveBeenCalledWith(INDIRIZZO, {
      method: 'HEAD',
      signal: expect.any(AbortSignal),
    });
  });

  it('404: la foto non c\'è', async () => {
    const fetchFn = vi.fn(async () => ({ status: 404 }));

    await expect(controllaFoto(INDIRIZZO, { fetchFn })).resolves.toBe(false);
  });

  it('qualsiasi altro stato lancia un errore in italiano', async () => {
    for (const status of [403, 429, 500, 503]) {
      const fetchFn = vi.fn(async () => ({ status }));

      await expect(controllaFoto(INDIRIZZO, { fetchFn })).rejects.toThrow(
        new RegExp(`Controllo del bucket non riuscito.*mare\\.jpg.*HTTP ${status}`),
      );
    }
  });

  it('un errore di rete lancia un errore in italiano', async () => {
    const fetchFn = vi.fn(async () => {
      throw new TypeError('fetch failed');
    });

    await expect(controllaFoto(INDIRIZZO, { fetchFn })).rejects.toThrow(
      /Controllo del bucket non riuscito.*mare\.jpg.*fetch failed/,
    );
  });

  it('un bucket che non risponde entro il tempo massimo lancia un errore', async () => {
    const fetchFn = vi.fn(
      (_indirizzo: string, { signal }: { signal: AbortSignal }) =>
        new Promise((_risolvi, rifiuta) => {
          signal.addEventListener('abort', () => rifiuta(signal.reason));
        }),
    );

    await expect(controllaFoto(INDIRIZZO, { fetchFn, attesaMs: 20 })).rejects.toThrow(
      /Controllo del bucket non riuscito.*nessuna risposta entro 0,02 s/,
    );
  });
});

describe('inviaConWrangler', () => {
  it('lancia wrangler con i parametri giusti, senza shell', async () => {
    const spawn = vi.fn(() => ({ status: 0 }));
    const invia = inviaConWrangler('bucket-finto', 'prova', { spawn, shell: false });

    await invia('mare.jpg', '/radice/foto/prova/mare.jpg');

    expect(spawn).toHaveBeenCalledWith(
      'npx',
      [
        'wrangler',
        'r2',
        'object',
        'put',
        'bucket-finto/prova/mare.jpg',
        '--file=/radice/foto/prova/mare.jpg',
        '--content-type=image/jpeg',
        '--remote',
      ],
      { stdio: 'inherit', shell: false },
    );
  });

  it('con la shell (Windows) mette tra virgolette i percorsi con gli spazi', async () => {
    const spawn = vi.fn(() => ({ status: 0 }));
    const invia = inviaConWrangler('bucket-finto', 'prova', { spawn, shell: true });

    await invia('mare.jpg', 'C:\\Mia cartella\\foto\\mare.jpg');

    const [, argomenti, opzioni] = spawn.mock.calls[0] as unknown as [string, string[], object];
    expect(argomenti).toContain('"--file=C:\\Mia cartella\\foto\\mare.jpg"');
    expect(argomenti).toContain('bucket-finto/prova/mare.jpg');
    expect(opzioni).toEqual({ stdio: 'inherit', shell: true });
  });

  it('un codice di uscita diverso da 0 lancia l\'errore col login da fare', async () => {
    const spawn = vi.fn(() => ({ status: 1 }));
    const invia = inviaConWrangler('bucket-finto', 'prova', { spawn, shell: false });

    await expect(invia('mare.jpg', '/x/mare.jpg')).rejects.toThrow(
      'Caricamento non riuscito: mare.jpg. Serve `npx wrangler login` (lo fa eusebjo).',
    );
  });

  it('un comando che non parte (nessun codice di uscita) lancia lo stesso errore', async () => {
    const spawn = vi.fn(() => ({ status: null, error: new Error('spawn npx ENOENT') }));
    const invia = inviaConWrangler('bucket-finto', 'prova', { spawn, shell: false });

    await expect(invia('mare.jpg', '/x/mare.jpg')).rejects.toThrow(/Caricamento non riuscito: mare\.jpg/);
  });
});

describe('leggiOpzioni', () => {
  it('senza argomenti carica davvero', () => {
    expect(leggiOpzioni([])).toEqual({ prova: false });
  });

  it('--prova chiede solo l\'elenco', () => {
    expect(leggiOpzioni(['--prova'])).toEqual({ prova: true });
  });

  it('un argomento sconosciuto (anche un refuso di --prova) si rifiuta: niente caricamenti per sbaglio', () => {
    expect(() => leggiOpzioni(['--prov'])).toThrow(/Opzione sconosciuta: --prov/);
    expect(() => leggiOpzioni(['--prova', 'altro'])).toThrow(/Opzione sconosciuta: altro/);
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
  const elenco: string[] = JSON.parse(readFileSync('scripts/foto-prova/elenco.json', 'utf8'));

  // Il bucket ne ha una in più, `letto-giardino.jpg`: dal 2026-11-02 la prova non la
  // usa e non si prepara più, ma nel bucket resta.
  it('elenco.json ha le 45 foto della prova, ognuna una volta', () => {
    expect(elenco).toHaveLength(45);
    expect(new Set(elenco).size).toBe(45);
    for (const nome of elenco) expect(nome).toMatch(/^[a-z0-9-]+\.jpg$/);
  });

  it('contiene le 19 foto dei post veri di Alma Living, in ordine alfabetico', () => {
    const postVeri = [
      'ig-angolo-bimbi',
      'ig-assaggio',
      'ig-autunno',
      'ig-beach-therapy',
      'ig-conchiglie',
      'ig-cuscini-1',
      'ig-cuscini-2',
      'ig-cuscini-3',
      'ig-cuscini-4',
      'ig-erbolinea',
      'ig-parure-1',
      'ig-parure-2',
      'ig-parure-3',
      'ig-parure-4',
      'ig-parure-5',
      'ig-spoiler',
      'ig-tavola-1',
      'ig-tavola-2',
      'ig-tavola-estate',
    ].map((nome) => `${nome}.jpg`);

    expect(postVeri).toHaveLength(19);
    expect(elenco.filter((nome) => nome.startsWith('ig-'))).toEqual(postVeri);
    expect(elenco).toEqual([...elenco].sort());
  });
});

describe('foto()', () => {
  it('lancia un errore chiaro per una foto che non c\'è', async () => {
    const { foto } = await import('../src/prova/comune/foto');

    expect(() => foto('non-esiste')).toThrow('Foto di prova non trovata: non-esiste');
  });
});
