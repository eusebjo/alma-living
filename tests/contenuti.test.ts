import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import type { ZodType } from 'astro/zod';
import { negozioSchema, postSchema, prodottoSchema, storiaSchema } from '../src/content/schemas';
import type { PostContenuto, Prodotto, StoriaContenuto } from '../src/content/schemas';

// I contenuti veri, letti dai file JSON così come li legge la build: ogni file
// deve passare lo schema della sua collection (`src/content.config.ts`).
const RADICE = fileURLToPath(new URL('../src/content/', import.meta.url));

function nomiFile(cartella: string): string[] {
  return readdirSync(join(RADICE, cartella))
    .filter((file) => file.endsWith('.json'))
    .map((file) => file.slice(0, -'.json'.length))
    .sort();
}

function leggiGrezzo(cartella: string, id: string): unknown {
  return JSON.parse(readFileSync(join(RADICE, cartella, `${id}.json`), 'utf8'));
}

/** Il file `id` della cartella, già passato dallo schema (con i valori predefiniti). */
function leggi<T>(cartella: string, id: string, schema: ZodType<T>): T {
  return schema.parse(leggiGrezzo(cartella, id));
}

function leggiTutti<T extends { data: string }>(
  cartella: string,
  schema: ZodType<T>,
): (T & { id: string })[] {
  return nomiFile(cartella).map((id) => ({ id, ...leggi(cartella, id, schema) }));
}

/** Gli id in ordine di data decrescente (a parità di data, l'ordine alfabetico dell'id). */
function ordinePerData(voci: { id: string; data: string }[]): string[] {
  return [...voci]
    .sort((a, b) => b.data.localeCompare(a.data) || a.id.localeCompare(b.id))
    .map((voce) => voce.id);
}

const ID_PRODOTTI = [
  'sabbia',
  'abbracciami',
  'orsetto',
  'volant',
  'casetta',
  'tovaglia',
  'coperta',
  'saponi',
];
const ID_POST = Array.from({ length: 13 }, (_, i) => `p${i + 1}`);
const ID_STORIE = [
  'oggi',
  'arrivi',
  'vetrina',
  'casette',
  'candele',
  'bimbi',
  'tavola',
  'lenzuola',
];

// Lunedì-sabato, mattina e pomeriggio: 12 fasce, in ordine.
const ORARI_VERI = (
  ['lunedi', 'martedi', 'mercoledi', 'giovedi', 'venerdi', 'sabato'] as const
).flatMap((giorno) => [
  { giorno, apertura: '09:30', chiusura: '13:00' },
  { giorno, apertura: '16:00', chiusura: '19:30' },
]);

const collezioni = [
  { cartella: 'prodotti', schema: prodottoSchema, id: ID_PRODOTTI },
  { cartella: 'post', schema: postSchema, id: ID_POST },
  { cartella: 'storie', schema: storiaSchema, id: ID_STORIE },
] as const;

describe.each(collezioni)('collection $cartella', ({ cartella, schema, id }) => {
  it('ha esattamente i file attesi', () => {
    expect(nomiFile(cartella)).toEqual([...id].sort());
  });

  it.each(id)('%s passa lo schema', (nome) => {
    const risultato = schema.safeParse(leggiGrezzo(cartella, nome));
    expect(risultato.success ? null : risultato.error.issues).toBeNull();
  });
});

describe('prodotti', () => {
  const prodotti = leggiTutti<Prodotto>('prodotti', prodottoSchema);

  it('sono otto', () => {
    expect(prodotti).toHaveLength(8);
  });

  it('tengono l’ordine di oggi: date decrescenti da sabbia a saponi', () => {
    expect(ordinePerData(prodotti)).toEqual(ID_PRODOTTI);
    expect(prodotti.find((p) => p.id === 'sabbia')?.data).toBe('2026-10-28');
    expect(prodotti.find((p) => p.id === 'saponi')?.data).toBe('2026-10-21');
  });

  it('senza secondo scatto vero non hanno `secondaFoto` (era un ingrandimento)', () => {
    const conSecondaFoto = prodotti.filter((p) => p.secondaFoto !== undefined).map((p) => p.id);
    expect(conSecondaFoto.sort()).toEqual(['abbracciami', 'casetta', 'orsetto', 'volant']);
  });

  it('i colori hanno la foto tutti o nessuno', () => {
    const conFoto = prodotti
      .filter((p) => p.colori?.every((c) => c.foto !== undefined))
      .map((p) => p.id);
    expect(conFoto.sort()).toEqual(['abbracciami', 'casetta']);
    expect(prodotti.find((p) => p.id === 'orsetto')?.colori).toHaveLength(3);
  });
});

describe('post', () => {
  const post = leggiTutti<PostContenuto>('post', postSchema);

  it('sono tredici', () => {
    expect(post).toHaveLength(13);
  });

  it('hanno le date vere, dal più recente', () => {
    expect(leggi('post', 'p1', postSchema).data).toBe('2026-10-28');
    expect(leggi('post', 'p6', postSchema).data).toBe('2026-07-08');
    expect(leggi('post', 'p13', postSchema).data).toBe('2026-04-30');
    expect(ordinePerData(post)).toEqual(ID_POST);
  });

  it('il soggetto è quello che si legge nel messaggio WhatsApp', () => {
    expect(leggi('post', 'p1', postSchema).soggetto).toBe('sui cuscini di Natale');
  });
});

describe('storie', () => {
  const storie = leggiTutti<StoriaContenuto>('storie', storiaSchema);

  it('sono otto', () => {
    expect(storie).toHaveLength(8);
  });

  it('hanno la frase e le date di oggi', () => {
    const oggi = leggi('storie', 'oggi', storiaSchema);
    expect(oggi.foto[0]?.frase).toBe(
      'La parete dei plaid è pronta: bianchi, rosa e grigi, con i cuscini in pelo.',
    );
    expect(oggi.data).toBe('2026-10-28');
    expect(oggi.etichetta).toBe('Oggi');
    expect(ordinePerData(storie)).toEqual(ID_STORIE);
  });

  it('l’etichetta c’è solo su «oggi» e «arrivi»', () => {
    expect(
      storie
        .filter((s) => s.etichetta !== undefined)
        .map((s) => [s.id, s.etichetta])
        .sort(),
    ).toEqual([
      ['arrivi', 'Nuovo'],
      ['oggi', 'Oggi'],
    ]);
  });
});

describe('negozio', () => {
  it('ha gli orari veri: lunedì-sabato 09:30-13:00 e 16:00-19:30', () => {
    const negozio = leggi('negozio', 'negozio', negozioSchema);
    expect(negozio.orari).toEqual(ORARI_VERI);
  });
});
