import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { negozioSchema, postSchema, prodottoSchema, storiaSchema } from '../src/content/schemas';

// I contenuti veri, letti dai file JSON così come li legge la build. Questi
// test fissano solo ciò che vale dopo qualunque modifica legittima della
// redazione (aggiungere o togliere un post o un prodotto, cambiare testi, date
// e orari): ogni file passa lo schema della sua collection e le cartelle
// contengono solo file JSON. I valori modificabili non si fissano qui, altrimenti
// una proposta della redazione farebbe fallire il controllo `build`.
const RADICE = fileURLToPath(new URL('../src/content/', import.meta.url));

/** Tutto ciò che sta nella cartella (file e sottocartelle), in ordine alfabetico. */
function voci(cartella: string): string[] {
  return readdirSync(join(RADICE, cartella)).sort();
}

function leggiGrezzo(cartella: string, file: string): unknown {
  return JSON.parse(readFileSync(join(RADICE, cartella, file), 'utf8'));
}

// Le storie sono otto e fisse: nel pannello non si creano né si eliminano.
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

const collezioni = [
  { cartella: 'prodotti', schema: prodottoSchema },
  { cartella: 'post', schema: postSchema },
  { cartella: 'storie', schema: storiaSchema },
] as const;

describe.each(collezioni)('collection $cartella', ({ cartella, schema }) => {
  it('contiene solo file JSON', () => {
    expect(voci(cartella).filter((nome) => !nome.endsWith('.json'))).toEqual([]);
  });

  it.each(voci(cartella).filter((nome) => nome.endsWith('.json')))(
    '%s passa lo schema',
    (file) => {
      // `safeParse` e non `parse`: se un file è sbagliato il test dice quali
      // campi, invece di fermare tutto con un errore grezzo.
      const risultato = schema.safeParse(leggiGrezzo(cartella, file));
      expect(risultato.success ? null : risultato.error.issues).toBeNull();
    },
  );
});

describe('storie', () => {
  it('sono esattamente le otto fisse', () => {
    const id = voci('storie')
      .filter((nome) => nome.endsWith('.json'))
      .map((nome) => nome.slice(0, -'.json'.length));
    expect(id).toEqual([...ID_STORIE].sort());
  });
});

describe('negozio', () => {
  it('negozio.json passa lo schema', () => {
    const risultato = negozioSchema.safeParse(leggiGrezzo('negozio', 'negozio.json'));
    expect(risultato.success ? null : risultato.error.issues).toBeNull();
  });
});
