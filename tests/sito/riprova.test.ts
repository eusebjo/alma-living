import { afterEach, describe, expect, it, vi } from 'vitest';
import { conRiprova, unaVoltaPerChiave } from '../../src/sito/comune/riprova';

// Niente attese vere nei test: dove non serve provarle si passa `senzaAttesa`.
const senzaAttesa = () => 0;

/** Una funzione che fallisce `fallimenti` volte con "errore 1", "errore 2"…, poi riesce. */
function instabile(fallimenti: number) {
  const fai = vi.fn(async () => {
    if (fai.mock.calls.length <= fallimenti) throw new Error(`errore ${fai.mock.calls.length}`);
    return 'ok';
  });
  return fai;
}

describe('conRiprova', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('se riesce al primo colpo non riprova', async () => {
    const fai = instabile(0);
    await expect(conRiprova(fai, 3, senzaAttesa)).resolves.toBe('ok');
    expect(fai).toHaveBeenCalledTimes(1);
  });

  it('riesce al secondo tentativo dopo un errore passeggero', async () => {
    const fai = instabile(1);
    await expect(conRiprova(fai, 3, senzaAttesa)).resolves.toBe('ok');
    expect(fai).toHaveBeenCalledTimes(2);
  });

  it('dopo tutti i tentativi rilancia l’ultimo errore', async () => {
    const fai = instabile(10);
    await expect(conRiprova(fai, 3, senzaAttesa)).rejects.toThrow('errore 3');
    expect(fai).toHaveBeenCalledTimes(3);
  });

  it('i tentativi predefiniti sono tre', async () => {
    const fai = instabile(10);
    await expect(conRiprova(fai, undefined, senzaAttesa)).rejects.toThrow('errore 3');
    expect(fai).toHaveBeenCalledTimes(3);
  });

  it('con un solo tentativo non riprova e non aspetta', async () => {
    const fai = instabile(10);
    const attesa = vi.fn(() => 0);
    await expect(conRiprova(fai, 1, attesa)).rejects.toThrow('errore 1');
    expect(fai).toHaveBeenCalledTimes(1);
    expect(attesa).not.toHaveBeenCalled();
  });

  it('meno di un tentativo vale come uno: la funzione gira almeno una volta', async () => {
    const fai = instabile(0);
    await expect(conRiprova(fai, 0, senzaAttesa)).resolves.toBe('ok');
    expect(fai).toHaveBeenCalledTimes(1);
  });

  it('un errore sincrono della funzione conta come un rifiuto', async () => {
    let chiamate = 0;
    const fai = () => {
      chiamate += 1;
      if (chiamate === 1) throw new Error('subito');
      return Promise.resolve('ok');
    };
    await expect(conRiprova(fai, 2, senzaAttesa)).resolves.toBe('ok');
    expect(chiamate).toBe(2);
  });

  it('tra un tentativo e l’altro aspetta, dando all’attesa il numero del tentativo appena fallito', async () => {
    const attesa = vi.fn((i: number) => i * 10);
    const fai = instabile(2);
    await expect(conRiprova(fai, 3, attesa)).resolves.toBe('ok');
    // Due fallimenti, due attese: nessuna dopo l'ultimo tentativo.
    expect(attesa.mock.calls.map(([i]) => i)).toEqual([1, 2]);
  });

  it('dopo l’ultimo tentativo non aspetta più', async () => {
    const attesa = vi.fn(() => 0);
    await expect(conRiprova(instabile(10), 3, attesa)).rejects.toThrow('errore 3');
    expect(attesa).toHaveBeenCalledTimes(2);
  });

  it('l’attesa predefinita cresce con i tentativi: un secondo, poi due', async () => {
    vi.useFakeTimers();
    const fai = instabile(2);
    const finito = conRiprova(fai);
    // Il primo tentativo parte subito e fallisce; si aspetta 1 s.
    await vi.advanceTimersByTimeAsync(999);
    expect(fai).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(fai).toHaveBeenCalledTimes(2);
    // Il secondo fallisce; si aspettano 2 s.
    await vi.advanceTimersByTimeAsync(1999);
    expect(fai).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(1);
    expect(fai).toHaveBeenCalledTimes(3);
    await expect(finito).resolves.toBe('ok');
  });
});

describe('unaVoltaPerChiave', () => {
  it('due richieste con la stessa chiave fanno una sola chiamata', async () => {
    const fai = vi.fn(async (chiave: string) => chiave.toUpperCase());
    const misura = unaVoltaPerChiave(fai);
    const [a, b] = await Promise.all([misura('x'), misura('x')]);
    expect(a).toBe('X');
    expect(b).toBe('X');
    expect(await misura('x')).toBe('X');
    expect(fai).toHaveBeenCalledTimes(1);
  });

  it('due richieste insieme condividono la stessa promessa, anche prima che finisca', () => {
    const misura = unaVoltaPerChiave(() => new Promise<string>(() => {}));
    expect(misura('x')).toBe(misura('x'));
  });

  it('chiavi diverse fanno chiamate diverse', async () => {
    const fai = vi.fn(async (chiave: string) => chiave);
    const misura = unaVoltaPerChiave(fai);
    expect(await misura('a')).toBe('a');
    expect(await misura('b')).toBe('b');
    expect(fai.mock.calls.map(([chiave]) => chiave)).toEqual(['a', 'b']);
  });

  it('una chiave rifiutata si riprova alla richiesta dopo', async () => {
    const fai = vi.fn(async (chiave: string) => {
      if (fai.mock.calls.length === 1) throw new Error('rete');
      return chiave;
    });
    const misura = unaVoltaPerChiave(fai);
    await expect(misura('x')).rejects.toThrow('rete');
    await expect(misura('x')).resolves.toBe('x');
    expect(fai).toHaveBeenCalledTimes(2);
    // Una volta riuscita, resta in memoria.
    await expect(misura('x')).resolves.toBe('x');
    expect(fai).toHaveBeenCalledTimes(2);
  });

  it('chi aspettava la stessa chiave vede lo stesso rifiuto, senza una seconda chiamata', async () => {
    const fai = vi.fn(async () => {
      throw new Error('rete');
    });
    const misura = unaVoltaPerChiave(fai);
    const risultati = await Promise.allSettled([misura('x'), misura('x')]);
    expect(risultati.map((r) => r.status)).toEqual(['rejected', 'rejected']);
    expect(fai).toHaveBeenCalledTimes(1);
  });

  it('un errore sincrono della funzione diventa un rifiuto e la chiave si riprova', async () => {
    let chiamate = 0;
    const misura = unaVoltaPerChiave((chiave: string) => {
      chiamate += 1;
      if (chiamate === 1) throw new Error('subito');
      return Promise.resolve(chiave);
    });
    await expect(misura('x')).rejects.toThrow('subito');
    await expect(misura('x')).resolves.toBe('x');
  });

  it('insieme a conRiprova: un errore passeggero non arriva a chi chiede', async () => {
    const fai = instabile(1);
    const misura = unaVoltaPerChiave(() => conRiprova(fai, 3, senzaAttesa));
    await expect(Promise.all([misura('x'), misura('x'), misura('x')])).resolves.toEqual(['ok', 'ok', 'ok']);
    expect(fai).toHaveBeenCalledTimes(2);
  });
});
