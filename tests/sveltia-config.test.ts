import { existsSync, readdirSync, readFileSync } from 'node:fs';
import picomatch from 'picomatch';
import { describe, expect, it } from 'vitest';
import Ajv from 'ajv';
import { parse } from 'yaml';
import { z } from 'astro/zod';
import { CATEGORIE } from '../src/content/categorie';
import { CARTELLE_FOTO, FOTO_BASE, INQUADRATURE } from '../src/content/foto';
import { GIORNI, LIMITI } from '../src/content/limits';
import {
  negozioSchema,
  postSchema,
  prodottoSchema,
  storiaSchema,
} from '../src/content/schemas';
import { ORDINE_STORIE } from '../src/sito/contenuti';

// Il pannello Sveltia (public/admin/config.yml) e le regole di autonomia
// (autonomia.yml) descrivono gli stessi campi: questi test li tengono allineati
// fra loro e con gli schemi della build (src/content/schemas.ts, limits.ts).

interface Campo {
  name: string;
  label?: string;
  widget?: string;
  type?: string;
  format?: string;
  default?: unknown;
  required?: boolean;
  readonly?: boolean;
  multiple?: boolean;
  min?: number;
  max?: number;
  minlength?: number;
  maxlength?: number;
  pattern?: [string, string];
  options?: { label: string; value: string }[];
  fields?: Campo[];
  choose_url?: boolean;
  accept?: string;
  enableAlpha?: boolean;
  editor_components?: string[];
}

interface FileDelPannello {
  name: string;
  label: string;
  file: string;
  format?: string;
  fields: Campo[];
}

interface Collection {
  name: string;
  publish?: boolean;
  create?: boolean;
  delete?: boolean;
  folder?: string;
  extension?: string;
  format?: string;
  slug?: unknown;
  fields?: Campo[];
  files?: FileDelPannello[];
}

interface Config {
  backend: Record<string, unknown>;
  publish_mode: string;
  output: { omit_empty_optional_fields?: boolean };
  slug?: Record<string, unknown>;
  media_libraries: {
    all?: {
      slugify_filename?: boolean;
      filename_template?: string;
      transformations?: Record<string, Record<string, unknown>>;
    };
    default?: false | Record<string, unknown>;
    cloudflare_r2?: Record<string, unknown>;
    stock_assets?: false;
  };
  collections: Collection[];
}

interface Autonomia {
  contenuti: Record<
    string,
    {
      file: string;
      azioni: { crea: number; modifica: number; elimina: number };
      campi: Record<string, number>;
    }
  >;
  media: { percorsi: string[]; estensioni: string[] };
}

const leggi = (percorso: string) => readFileSync(percorso, 'utf8');
const testoConfig = leggi('public/admin/config.yml');
const config = parse(testoConfig) as Config;
const autonomia = parse(leggi('autonomia.yml')) as Autonomia;

const collection = (nome: string): Collection => {
  const trovata = config.collections.find((c) => c.name === nome);
  if (!trovata) throw new Error(`Collection "${nome}" assente da config.yml`);
  return trovata;
};

const campiNegozio = (): Campo[] => collection('negozio').files?.[0]?.fields ?? [];
const campiProdotti = (): Campo[] => collection('prodotti').fields ?? [];
const campiPost = (): Campo[] => collection('post').fields ?? [];
const fileStorie = (): FileDelPannello[] => collection('storie').files ?? [];
const campo = (campi: Campo[], nome: string): Campo => {
  const trovato = campi.find((c) => c.name === nome);
  if (!trovato) throw new Error(`Campo "${nome}" assente`);
  return trovato;
};
const nomi = (campi: Campo[]) => campi.map((c) => c.name);

/** Ogni campo, anche dentro oggetti ed elenchi, con il suo percorso puntato. */
function tuttiICampi(campi: Campo[], prefisso = ''): { percorso: string; campo: Campo }[] {
  return campi.flatMap((c) => [
    { percorso: `${prefisso}${c.name}`, campo: c },
    ...tuttiICampi(c.fields ?? [], `${prefisso}${c.name}.`),
  ]);
}

/** I campi di ogni collection e di ogni file del pannello, con lo schema della build. */
const gruppi: { nome: string; voce: string; campi: () => Campo[]; schema: z.ZodType }[] = [
  { nome: 'negozio', voce: 'negozio', campi: campiNegozio, schema: negozioSchema },
  { nome: 'prodotti', voce: 'prodotti', campi: campiProdotti, schema: prodottoSchema },
  { nome: 'post', voce: 'post', campi: campiPost, schema: postSchema },
  ...ORDINE_STORIE.map((id) => ({
    nome: `storie/${id}`,
    voce: 'storie',
    campi: () => fileStorie().find((f) => f.name === id)?.fields ?? [],
    schema: storiaSchema as z.ZodType,
  })),
];

/** Tutti i campi del pannello, di tutte le collection. */
const campiDelPannello = () => gruppi.flatMap((g) => tuttiICampi(g.campi()));

/** Ogni chiave dell'oggetto, a ogni livello (anche dentro gli elenchi). */
function tutteLeChiavi(valore: unknown): string[] {
  if (Array.isArray(valore)) return valore.flatMap(tutteLeChiavi);
  if (typeof valore !== 'object' || valore === null) return [];
  return Object.entries(valore).flatMap(([chiave, figlio]) => [chiave, ...tutteLeChiavi(figlio)]);
}

describe('backend e flusso editoriale', () => {
  it('usa GitHub su eusebjo/alma-living, ramo main, con flusso editoriale', () => {
    expect(config.backend).toMatchObject({
      name: 'github',
      repo: 'eusebjo/alma-living',
      branch: 'main',
    });
    expect(config.publish_mode).toBe('editorial_workflow');
  });

  it("l'accesso passa dal Worker sveltia-cms-auth: indirizzo https esatto, senza barra finale", () => {
    expect(config.backend.base_url).toBe('https://sveltia-cms-auth.sebjomuho.workers.dev');
    expect(new URL(String(config.backend.base_url)).protocol).toBe('https:');
    // Il Worker serve /auth: l'endpoint predefinito di Sveltia, da non cambiare.
    expect(config.backend).not.toHaveProperty('auth_endpoint');
  });

  it('omette i campi opzionali vuoti: email o etichetta "" farebbero fallire la build', () => {
    expect(config.output.omit_empty_optional_fields).toBe(true);
  });
});

describe('collection', () => {
  it('sono negozio, prodotti, post e storie', () => {
    expect(config.collections.map((c) => c.name)).toEqual(['negozio', 'prodotti', 'post', 'storie']);
    expect(collection('negozio').files).toHaveLength(1);
    expect(collection('prodotti').folder).toBeDefined();
    expect(collection('post').folder).toBeDefined();
    expect(collection('storie').files).toBeDefined();
  });

  it('hanno le etichette italiane del pannello', () => {
    expect(config.collections.map((c) => (c as { label?: string }).label)).toEqual([
      'Negozio',
      'Prodotti degli scaffali',
      'Post',
      'Storie',
    ]);
  });

  it('nessuna collection permette di pubblicare', () => {
    for (const c of config.collections) expect(c.publish, c.name).toBe(false);
  });

  it('le collection a cartella creano ed eliminano solo se autonomia.yml lo permette (livello ≥ 1)', () => {
    const aCartella = config.collections.filter((c) => c.folder);
    expect(aCartella.map((c) => c.name)).toEqual(['prodotti', 'post']);
    for (const c of aCartella) {
      const { azioni } = autonomia.contenuti[c.name]!;
      expect(c.create, c.name).toBe(azioni.crea >= 1);
      expect(c.delete, c.name).toBe(azioni.elimina >= 1);
    }
    // Oggi la redazione crea e toglie prodotti e post, con l'approvazione.
    expect(collection('prodotti')).toMatchObject({ create: true, delete: true });
    expect(collection('post')).toMatchObject({ create: true, delete: true });
  });

  it('le collection a file non hanno create/delete: per Sveltia non esistono', () => {
    // Un file listato si modifica soltanto; un'opzione sconosciuta darebbe solo
    // un avviso in console, senza effetto.
    for (const c of config.collections.filter((c) => c.files)) {
      expect(c, c.name).not.toHaveProperty('create');
      expect(c, c.name).not.toHaveProperty('delete');
    }
    // Le storie non si creano né si eliminano anche per le regole.
    expect(autonomia.contenuti.storie!.azioni).toMatchObject({ crea: 0, elimina: 0 });
  });

  it('puntano ai file che la build e autonomia.yml conoscono, in JSON', () => {
    expect(collection('negozio').files?.[0]?.file).toBe(autonomia.contenuti.negozio!.file);
    for (const nome of ['prodotti', 'post']) {
      const c = collection(nome);
      expect(`${c.folder}/*.${c.extension}`, nome).toBe(autonomia.contenuti[nome]!.file);
      expect(c.folder, nome).toBe(`src/content/${nome}`);
      expect(c.format, nome).toBe('json');
      expect(existsSync(c.folder!), nome).toBe(true);
    }
  });

  it('storie: gli otto file fissi, nell’ordine della fila, che le regole riconoscono', () => {
    const storie = fileStorie();
    expect(storie.map((f) => f.name)).toEqual([...ORDINE_STORIE]);
    const nelleRegole = picomatch(autonomia.contenuti.storie!.file, { windows: false, dot: false });
    for (const f of storie) {
      expect(f.file, f.name).toBe(`src/content/storie/${f.name}.json`);
      expect(f.format, f.name).toBe('json');
      expect(existsSync(f.file), f.file).toBe(true);
      expect(nelleRegole(f.file), f.file).toBe(true);
    }
    // Nessun file della cartella resta fuori dal pannello.
    expect(readdirSync('src/content/storie').sort()).toEqual(
      [...ORDINE_STORIE].map((id) => `${id}.json`).sort(),
    );
  });

  it('storie: ogni file si chiama nel pannello con il nome della storia', () => {
    for (const f of fileStorie()) {
      const { nome } = JSON.parse(leggi(f.file)) as { nome: string };
      expect(f.label, f.name).toBe(nome);
    }
  });
});

describe('nomi dei file nuovi (prodotti e post)', () => {
  // Il nome del file è l'id della voce: la build (tests/dist) vuole solo
  // minuscole, cifre e trattini, e un post non può chiamarsi `articolo-…`
  // (nella pagina gli articoli degli scaffali sono `articolo-<id>`, accanto ai
  // post). Il modello usa solo la data (`AAAA-MM-GG`, cifre e trattini); se il
  // nome c'è già, Sveltia aggiunge `-1`, `-2`… Un nome preso da un testo libero
  // potrebbe tenere `_` o `~`, che lo slug ASCII di Sveltia lascia passare.
  it.each(['prodotti', 'post'])('%s: il nome è la data, e non si scrive a mano', (nome) => {
    const c = collection(nome);
    expect(c.slug).toEqual({ template: '{{fields.data}}', editable: false });
    expect(campo(c.fields ?? [], 'data')).toMatchObject({
      widget: 'datetime',
      type: 'date',
      format: 'YYYY-MM-DD',
    });
  });

  it('lo slug globale è ASCII, senza accenti e in minuscolo (vale anche per i nomi delle foto)', () => {
    expect(config.slug).toEqual({ encoding: 'ascii', clean_accents: true, lowercase: true });
  });

  it.each(['prodotti', 'post'])('%s: i file di oggi hanno nomi che la build sa leggere', (cartella) => {
    for (const file of readdirSync(`src/content/${cartella}`)) {
      expect(file).toMatch(/^[a-z0-9-]+\.json$/);
      if (cartella === 'post') expect(file.startsWith('articolo-'), file).toBe(false);
    }
  });
});

describe('campi', () => {
  it('negozio: nome, descrizione, indirizzo, telefono, email, orari', () => {
    expect(nomi(campiNegozio())).toEqual([
      'nome',
      'descrizione',
      'indirizzo',
      'telefono',
      'email',
      'orari',
    ]);
  });

  it('prodotti: nome, dettaglio, categorie, novita, data, foto, secondaFoto, colori', () => {
    expect(nomi(campiProdotti())).toEqual([
      'nome',
      'dettaglio',
      'categorie',
      'novita',
      'data',
      'foto',
      'secondaFoto',
      'colori',
    ]);
  });

  it('post: data, testo, foto, soggetto', () => {
    expect(nomi(campiPost())).toEqual(['data', 'testo', 'foto', 'soggetto']);
  });

  it('storie: nome, data, etichetta, invito, foto (uguali per gli otto file)', () => {
    for (const f of fileStorie()) {
      expect(nomi(f.fields), f.name).toEqual(['nome', 'data', 'etichetta', 'invito', 'foto']);
    }
  });

  it('storie: il nome è di sola lettura, a livello 0 nelle regole', () => {
    for (const f of fileStorie()) expect(campo(f.fields, 'nome').readonly, f.name).toBe(true);
    expect(autonomia.contenuti.storie!.campi.nome).toBe(0);
  });

  for (const { nome, voce, campi } of gruppi) {
    it(`${nome}: livello 0 in autonomia.yml = readonly, livello 1 o più = modificabile`, () => {
      const livelli = autonomia.contenuti[voce]!.campi;
      for (const c of campi()) {
        const livello = livelli[c.name];
        expect(livello, `${c.name} manca in autonomia.yml`).toBeTypeOf('number');
        if (livello === 0) expect(c.readonly, c.name).toBe(true);
        else expect(c.readonly, c.name).not.toBe(true);
      }
    });

    it(`${nome}: autonomia.yml non elenca campi assenti dal pannello`, () => {
      expect(Object.keys(autonomia.contenuti[voce]!.campi).sort()).toEqual(nomi(campi()).sort());
    });
  }

  it("i sottocampi di un oggetto a livello 0 sono readonly anch'essi", () => {
    const indirizzo = campo(campiNegozio(), 'indirizzo');
    expect(indirizzo.fields?.length).toBeGreaterThan(0);
    for (const sotto of indirizzo.fields ?? []) {
      expect(sotto.readonly, sotto.name).toBe(true);
    }
  });

  it('email è opzionale, come nello schema', () => {
    expect(campo(campiNegozio(), 'email').required).toBe(false);
  });

  it('orari è opzionale (lo schema ha default []) e ha giorno, apertura, chiusura', () => {
    const orari = campo(campiNegozio(), 'orari');
    expect(orari.widget).toBe('list');
    expect(orari.required).toBe(false);
    expect(nomi(orari.fields ?? [])).toEqual(['giorno', 'apertura', 'chiusura']);
  });

  it('i giorni sono quelli dello schema, senza accenti', () => {
    const giorno = campo(campo(campiNegozio(), 'orari').fields ?? [], 'giorno');
    expect(giorno.widget).toBe('select');
    expect(giorno.options?.map((o) => o.value)).toEqual([...GIORNI]);
  });

  it('ogni data è un giorno del calendario, scritto AAAA-MM-GG come vuole lo schema', () => {
    const date = campiDelPannello().filter(({ campo: c }) => c.name === 'data');
    expect(date.length).toBe(2 + ORDINE_STORIE.length);
    for (const { campo: c } of date) {
      expect(c).toMatchObject({ widget: 'datetime', type: 'date', format: 'YYYY-MM-DD' });
    }
  });
});

describe('campi e schemi della build', () => {
  // Togli `optional` e `default` per arrivare all'oggetto o all'elenco.
  function nucleo(schema: z.ZodType): z.ZodType {
    let s: z.ZodType = schema;
    while (s instanceof z.ZodOptional || s instanceof z.ZodDefault) {
      s = s.unwrap() as z.ZodType;
    }
    return s;
  }

  function formaDi(schema: z.ZodType): Record<string, z.ZodType> | undefined {
    const s = nucleo(schema);
    if (s instanceof z.ZodObject) return s.shape as Record<string, z.ZodType>;
    if (s instanceof z.ZodArray) return formaDi(s.element as z.ZodType);
    return undefined;
  }

  /** Confronta i campi con lo schema, a ogni livello, e raccoglie le differenze. */
  function differenze(campi: Campo[], forma: Record<string, z.ZodType>, prefisso = ''): string[] {
    const problemi: string[] = [];
    const nomiPannello = nomi(campi).sort();
    const nomiSchema = Object.keys(forma).sort();
    if (JSON.stringify(nomiPannello) !== JSON.stringify(nomiSchema)) {
      problemi.push(`${prefisso || 'radice'}: pannello ${nomiPannello} / schema ${nomiSchema}`);
    }
    for (const c of campi) {
      const schema = forma[c.name];
      if (!schema) continue;
      const percorso = `${prefisso}${c.name}`;
      const vuotoAccettato = schema.safeParse(undefined).success;
      // Il pannello omette un campo facoltativo lasciato vuoto: lo schema deve accettarlo.
      if (c.required === false && !vuotoAccettato) {
        problemi.push(`${percorso}: facoltativo nel pannello, obbligatorio nello schema`);
      }
      // Un campo facoltativo dello schema (senza un valore predefinito) lo è anche nel pannello.
      if (schema instanceof z.ZodOptional && c.required !== false) {
        problemi.push(`${percorso}: facoltativo nello schema, obbligatorio nel pannello`);
      }
      const sotto = formaDi(schema);
      if (c.fields && sotto) problemi.push(...differenze(c.fields, sotto, `${percorso}.`));
      else if (c.fields || sotto) problemi.push(`${percorso}: struttura diversa`);
    }
    return problemi;
  }

  it.each(gruppi.map((g) => [g.nome, g] as const))(
    '%s: ogni campo dello schema è nel pannello (e viceversa), obbligatorio allo stesso modo',
    (_nome, { campi, schema }) => {
      expect(differenze(campi(), formaDi(schema)!)).toEqual([]);
    },
  );
});

describe('limiti dei campi (da LIMITI)', () => {
  const lunghezze = (c: Campo) => ({ min: c.minlength, max: c.maxlength });
  const quante = (c: Campo) => ({ min: c.min, max: c.max });

  it('negozio', () => {
    const campi = campiNegozio();
    const { nome, descrizione, civico } = LIMITI.negozio;
    expect(lunghezze(campo(campi, 'nome'))).toEqual({ min: undefined, max: nome.max });
    expect(lunghezze(campo(campi, 'descrizione'))).toEqual({
      min: descrizione.min,
      max: descrizione.max,
    });
    const indirizzo = campo(campi, 'indirizzo').fields ?? [];
    expect(lunghezze(campo(indirizzo, 'civico'))).toEqual({
      min: undefined,
      max: civico.max,
    });
  });

  it('prodotti', () => {
    const campi = campiProdotti();
    const { nome, dettaglio, colori, colore } = LIMITI.prodotto;
    expect(lunghezze(campo(campi, 'nome'))).toEqual({ min: undefined, max: nome.max });
    expect(lunghezze(campo(campi, 'dettaglio'))).toEqual({ min: undefined, max: dettaglio.max });
    expect(quante(campo(campi, 'categorie'))).toEqual({ min: 1, max: undefined });
    const elencoColori = campo(campi, 'colori');
    expect(quante(elencoColori)).toEqual({ min: undefined, max: colori.max });
    expect(lunghezze(campo(elencoColori.fields ?? [], 'nome'))).toEqual({
      min: undefined,
      max: colore.max,
    });
  });

  it('post', () => {
    const campi = campiPost();
    const { testo, foto, soggetto } = LIMITI.post;
    expect(lunghezze(campo(campi, 'testo'))).toEqual({ min: undefined, max: testo.max });
    expect(quante(campo(campi, 'foto'))).toEqual({ min: 1, max: foto.max });
    expect(lunghezze(campo(campi, 'soggetto'))).toEqual({ min: undefined, max: soggetto.max });
  });

  it('storie', () => {
    const { frase, soggetto, foto } = LIMITI.storia;
    for (const f of fileStorie()) {
      const elenco = campo(f.fields, 'foto');
      expect(quante(elenco), f.name).toEqual({ min: 1, max: foto.max });
      const sotto = elenco.fields ?? [];
      expect(lunghezze(campo(sotto, 'frase')), f.name).toEqual({ min: undefined, max: frase.max });
      expect(lunghezze(campo(sotto, 'soggetto')), f.name).toEqual({
        min: undefined,
        max: soggetto.max,
      });
    }
  });

  it('il testo alternativo di ogni foto', () => {
    const alt = campiDelPannello().filter(({ campo: c }) => c.name === 'alt');
    // Prodotti (foto, seconda foto, foto dei colori), post e otto storie.
    expect(alt.length).toBe(3 + 1 + ORDINE_STORIE.length);
    for (const { percorso, campo: c } of alt) {
      expect(lunghezze(c), percorso).toEqual({ min: LIMITI.foto.alt.min, max: LIMITI.foto.alt.max });
    }
  });
});

describe('scelte da un elenco (stesse dello schema)', () => {
  it('categorie: le sette di CATEGORIE, nel loro ordine, più di una insieme', () => {
    const categorie = campo(campiProdotti(), 'categorie');
    expect(categorie.widget).toBe('select');
    expect(categorie.multiple).toBe(true);
    expect(categorie.options).toEqual(CATEGORIE.map(({ id, nome }) => ({ label: nome, value: id })));
  });

  it('inquadratura: ogni foto ha le cinque posizioni di INQUADRATURE, "Al centro" se non si sceglie', () => {
    const inquadrature = campiDelPannello().filter(({ campo: c }) => c.name === 'inquadratura');
    expect(inquadrature.length).toBe(3 + 1 + ORDINE_STORIE.length);
    for (const { percorso, campo: c } of inquadrature) {
      expect(c.widget, percorso).toBe('select');
      expect(c.default, percorso).toBe('centro');
      expect(c.options, percorso).toEqual([
        { label: 'In alto', value: 'alto' },
        { label: "Un po' in alto", value: 'centro-alto' },
        { label: 'Al centro', value: 'centro' },
        { label: "Un po' in basso", value: 'centro-basso' },
        { label: 'In basso', value: 'basso' },
      ]);
      expect(c.options?.map((o) => o.value)).toEqual(Object.keys(INQUADRATURE));
    }
  });

  it('etichetta della storia: facoltativa, "Oggi" o "Nuovo", senza una scelta vuota che scriva ""', () => {
    const valori = storiaSchema.shape.etichetta.unwrap().options;
    for (const f of fileStorie()) {
      const etichetta = campo(f.fields, 'etichetta');
      expect(etichetta.widget, f.name).toBe('select');
      expect(etichetta.required, f.name).toBe(false);
      expect(etichetta.options?.map((o) => o.value), f.name).toEqual([...valori]);
      expect(etichetta.options?.some((o) => o.value === ''), f.name).toBe(false);
      expect(etichetta, f.name).not.toHaveProperty('default');
    }
    // Lasciata vuota, il pannello la omette invece di scrivere "" (che lo schema rifiuta).
    expect(config.output.omit_empty_optional_fields).toBe(true);
    expect(storiaSchema.shape.etichetta.safeParse('').success).toBe(false);
  });

  it("invito della storia: WhatsApp, Chiama o Indicazioni, i valori dello schema", () => {
    for (const f of fileStorie()) {
      const invito = campo(f.fields, 'invito');
      expect(invito.widget, f.name).toBe('select');
      expect(invito.options, f.name).toEqual([
        { label: 'WhatsApp', value: 'whatsapp' },
        { label: 'Chiama', value: 'chiama' },
        { label: 'Indicazioni', value: 'indicazioni' },
      ]);
      expect(invito.options?.map((o) => o.value)).toEqual([...storiaSchema.shape.invito.options]);
    }
  });

  it('tinta del colore: scelta con il selettore dei colori, senza trasparenza (#RRGGBB)', () => {
    const tinta = campo(campo(campiProdotti(), 'colori').fields ?? [], 'tinta');
    expect(tinta.widget).toBe('color');
    expect(tinta.enableAlpha).not.toBe(true);
  });

  it('novità: un interruttore, spento se non si tocca', () => {
    expect(campo(campiProdotti(), 'novita')).toMatchObject({
      widget: 'boolean',
      required: false,
      default: false,
    });
  });
});

describe('formati dei campi (stessi dello schema)', () => {
  // Il pannello deve accettare e rifiutare gli stessi valori dello schema:
  // altrimenti l'errore comparirebbe solo nella build.
  const regex = (c: Campo) => {
    if (!c.pattern) throw new Error(`${c.name}: manca il pattern`);
    return new RegExp(c.pattern[0]);
  };
  const messaggio = (c: Campo) => c.pattern?.[1] ?? '';

  const indirizzo = () => campo(campiNegozio(), 'indirizzo').fields ?? [];
  const orari = () => campo(campiNegozio(), 'orari').fields ?? [];

  const parita = (
    nomeCampo: string,
    trovato: () => Campo,
    schema: z.ZodType,
    valori: string[],
  ) => {
    it(`${nomeCampo}: pattern e schema concordano`, () => {
      const re = regex(trovato());
      for (const valore of valori) {
        expect(re.test(valore), `"${valore}"`).toBe(schema.safeParse(valore).success);
      }
      expect(messaggio(trovato()).length).toBeGreaterThan(5);
    });
  };

  const forma = negozioSchema.shape;
  parita('telefono', () => campo(campiNegozio(), 'telefono'), forma.telefono, [
    '334 520 5451',
    '+39 334 520 5451',
    '0586 123456',
    '12345678',
    '1234567890123456',
    '+',
    '334-520-5451',
    '33a 520 5451',
    '',
    '+39+334 520 5451',
  ]);
  parita('cap', () => campo(indirizzo(), 'cap'), forma.indirizzo.shape.cap, [
    '57125',
    '5712',
    '571255',
    '5712a',
    '',
  ]);
  parita('provincia', () => campo(indirizzo(), 'provincia'), forma.indirizzo.shape.provincia, [
    'LI',
    'li',
    'L',
    'LIV',
    'L1',
    '',
  ]);

  it('apertura e chiusura: HH:MM a 24 ore', () => {
    const valide = ['00:00', '09:30', '19:59', '23:59'];
    const errate = ['24:00', '9:30', '09:60', '09.30', '0930', '', '09:30:00'];
    for (const nomeCampo of ['apertura', 'chiusura']) {
      const re = regex(campo(orari(), nomeCampo));
      for (const v of valide) expect(re.test(v), v).toBe(true);
      for (const v of errate) expect(re.test(v), v).toBe(false);
    }
  });

  it('email: tipo email del pannello', () => {
    expect(campo(campiNegozio(), 'email').type).toBe('email');
  });
});

describe('foto: solo su Cloudflare R2', () => {
  const trasformazioni = () => config.media_libraries.all?.transformations;

  it('ogni immagine caricata diventa WebP, qualità 85, dentro un riquadro di 2400 x 2400 px', () => {
    // Larghezza e altezza insieme sono un riquadro: la foto si riduce (mai si
    // ingrandisce) finché sta dentro entrambi i limiti, mantenendo le proporzioni.
    expect(trasformazioni()?.raster_image).toEqual({
      format: 'webp',
      quality: 85,
      width: 2400,
      height: 2400,
    });
  });

  it('i nomi dei file diventano adatti agli URL (niente spazi, maiuscole, accenti)', () => {
    expect(config.media_libraries.all?.slugify_filename).toBe(true);
  });

  it('una foto caricata non sovrascrive mai un’altra: nome originale più un codice casuale', () => {
    // R2 sovrascrive senza chiedere un oggetto con lo stesso nome: due "IMG_1234"
    // da telefoni diversi cambierebbero anche la foto di un contenuto già
    // approvato. `{{filename}}` è il nome originale (poi reso adatto agli URL),
    // `{{uuid_shorter}}` 8 caratteri esadecimali casuali, nuovi per ogni file.
    expect(config.media_libraries.all?.filename_template).toBe('{{filename}}-{{uuid_shorter}}');
    // L'opzione vale per tutti: nessun campo la cambia (vedi sotto, niente
    // `media_libraries` nei campi), e R2 non ne ha una sua.
    expect(config.media_libraries.cloudflare_r2).not.toHaveProperty('filename_template');
  });

  it('niente foto di stock da servizi esterni', () => {
    expect(config.media_libraries.stock_assets).toBe(false);
  });

  it("R2: il bucket delle foto, l'indirizzo pubblico del sito e la cartella cms/", () => {
    expect(config.media_libraries.cloudflare_r2).toEqual({
      access_key_id: '8ff6b443631b5f4d1f51c7b6dd13ebee',
      account_id: 'ade1bdd8232fb26690d8fc2593289760',
      bucket: 'alma-living-prova',
      public_url: FOTO_BASE,
      prefix: 'cms/',
    });
    expect(CARTELLE_FOTO).toContain('cms');
  });

  it('nessuna chiave segreta nella configurazione, nemmeno il nome di un campo', () => {
    // La chiave segreta di R2 la inserisce ogni persona nel pannello e resta
    // nel suo browser.
    expect(testoConfig).not.toMatch(/secret/i);
    expect(tutteLeChiavi(config).filter((chiave) => /secret|password|token/i.test(chiave))).toEqual([]);
  });

  it('nessuna cartella per le immagini nel repository, e archivio interno spento', () => {
    expect(tutteLeChiavi(config)).not.toContain('media_folder');
    expect(tutteLeChiavi(config)).not.toContain('public_folder');
    expect(config.media_libraries.default).toBe(false);
    // Nessun campo cambia le librerie: vale per tutti la configurazione globale.
    for (const { percorso, campo: c } of campiDelPannello()) {
      expect(c, percorso).not.toHaveProperty('media_libraries');
      expect(c, percorso).not.toHaveProperty('media_library');
    }
  });

  it("ogni campo immagine accetta solo una foto caricata: niente URL, niente SVG", () => {
    const immagini = campiDelPannello().filter(({ campo: c }) => c.widget === 'image');
    expect(immagini.length).toBe(3 + 1 + ORDINE_STORIE.length);
    for (const { percorso, campo: c } of immagini) {
      expect(c.name, percorso).toBe('src');
      expect(c.choose_url, percorso).toBe(false);
      const accetta = (c.accept ?? '').split(',').map((s) => s.trim());
      expect(accetta.join(','), percorso).not.toMatch(/svg|html|gif|\*/i);
      // La conversione HEIC passa dallo stesso filtro: foto da iPhone e Android.
      expect(accetta, percorso).toEqual(expect.arrayContaining(['image/jpeg', '.heic', '.heif']));
    }
  });

  it('autonomia.yml non lascia caricare nessun file nel repository', () => {
    expect(autonomia.media.percorsi).toEqual([]);
  });
});

describe('lo schema JSON di Sveltia', () => {
  // Sveltia valida config.yml all'avvio contro questo schema e, se trova errori,
  // non lascia entrare: la stessa verifica vale la pena farla in CI. Un'opzione
  // sconosciuta (per esempio `create` su una collection a file) darebbe invece
  // solo un avviso in console, senza effetto.
  const schema = JSON.parse(
    leggi('node_modules/@sveltia/cms/schema/sveltia-cms.json'),
  );
  // `strict: false`: lo schema usa parole chiave per gli editor (markdownDescription).
  // `validateFormats: false`: i formati `regex` e `uri` non servono a questo controllo.
  const valida = new Ajv({
    strict: false,
    allErrors: true,
    validateFormats: false,
  }).compile(schema);

  it('accetta config.yml', () => {
    expect(valida(config) ? [] : valida.errors).toEqual([]);
  });

  it('segnala un errore vero (il controllo è attivo)', () => {
    const rotta = structuredClone(config) as unknown as Record<string, unknown>;
    (rotta.collections as Record<string, unknown>[])[0].create = false;
    expect(valida(rotta)).toBe(false);
  });
});


describe('src/pages/admin/index.astro', () => {
  const pagina = leggi('src/pages/admin/index.astro');

  it('non si indicizza', () => {
    expect(pagina).toContain('<meta name="robots" content="noindex" />');
  });

  it('è una pagina a sé: né layout del sito né SeoHead', () => {
    expect(pagina).not.toMatch(/^\s*import\b.*\b(LayoutSito|SeoHead)\b/m);
    expect(pagina).not.toMatch(/<(LayoutSito|SeoHead)\b/);
  });

  it('avvia il pannello dal pacchetto npm (build senza CDN), una sola volta', () => {
    const script = [...pagina.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)];
    expect(script).toHaveLength(1);
    const [, attributi, codice] = script[0];
    // Senza `is:inline` né `src`: Astro lo passa a Vite, che lo impacchetta.
    expect(attributi.trim()).toBe('');
    expect(codice).toContain("import CMS from '@sveltia/cms';");
    expect(codice.match(/CMS\.init\(/g)).toHaveLength(1);
  });

  it('indica dove sta la configurazione, sullo stesso sito', () => {
    expect(pagina).toContain(
      '<link href="/admin/config.yml" type="application/yaml" rel="cms-config-url" />',
    );
  });

  it('non cita nessun indirizzo esterno', () => {
    expect(pagina).not.toMatch(/https?:\/\//i);
    const link = [...pagina.matchAll(/<link\b[^>]*>/gi)].map((m) => m[0]);
    expect(link).toHaveLength(1);
  });
});

describe('public/admin e installazione di Sveltia', () => {
  const pacchetto = JSON.parse(leggi('package.json')) as {
    dependencies: Record<string, string>;
    scripts: Record<string, string>;
  };

  it('@sveltia/cms ha una versione esatta, senza ^ né ~', () => {
    expect(pacchetto.dependencies['@sveltia/cms']).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it("in public/admin c'è solo config.yml: il pannello non si copia da node_modules", () => {
    // La copia della build CDN (dist/sveltia-cms.js) carica font, traduzioni e
    // librerie da jsDelivr e unpkg: il pannello passa da Vite, col pacchetto npm.
    expect(readdirSync('public/admin')).toEqual(['config.yml']);
    expect(existsSync('scripts/copy-sveltia.mjs')).toBe(false);
    expect(pacchetto.scripts).not.toHaveProperty('prebuild');
    expect(pacchetto.scripts).not.toHaveProperty('predev');
  });
});
