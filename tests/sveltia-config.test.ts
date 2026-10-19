import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import Ajv from 'ajv';
import { parse } from 'yaml';
import { z } from 'astro/zod';
import { GIORNI, LIMITI } from '../src/content/limits';
import { negozioSchema } from '../src/content/schemas';

// Il pannello Sveltia (public/admin/config.yml) e le regole di autonomia
// (autonomia.yml) descrivono gli stessi campi: questi test li tengono allineati
// fra loro e con gli schemi della build (src/content/schemas.ts, limits.ts).

interface Campo {
  name: string;
  widget?: string;
  type?: string;
  required?: boolean;
  readonly?: boolean;
  minlength?: number;
  maxlength?: number;
  pattern?: [string, string];
  options?: { label: string; value: string }[];
  fields?: Campo[];
  choose_url?: boolean;
  accept?: string;
  editor_components?: string[];
}

interface Collection {
  name: string;
  publish?: boolean;
  create?: boolean;
  delete?: boolean;
  folder?: string;
  extension?: string;
  media_folder?: string;
  public_folder?: string;
  fields?: Campo[];
  files?: { name: string; file: string; fields: Campo[] }[];
}

interface Config {
  backend: Record<string, unknown>;
  publish_mode: string;
  output: { omit_empty_optional_fields?: boolean };
  media_folder: string;
  media_libraries: {
    all?: {
      slugify_filename?: boolean;
      transformations?: Record<string, Record<string, unknown>>;
    };
    stock_assets?: false;
  };
  collections: Collection[];
}

interface Autonomia {
  contenuti: Record<string, { file: string; campi: Record<string, number> }>;
  media: { percorsi: string[]; estensioni: string[] };
}

const leggi = (percorso: string) => readFileSync(percorso, 'utf8');
const config = parse(leggi('public/admin/config.yml')) as Config;
const autonomia = parse(leggi('autonomia.yml')) as Autonomia;

const collection = (nome: string): Collection => {
  const trovata = config.collections.find((c) => c.name === nome);
  if (!trovata) throw new Error(`Collection "${nome}" assente da config.yml`);
  return trovata;
};

const campiNegozio = (): Campo[] => collection('negozio').files?.[0]?.fields ?? [];
const campiPagine = (): Campo[] => collection('pagine').fields ?? [];
const campo = (campi: Campo[], nome: string): Campo => {
  const trovato = campi.find((c) => c.name === nome);
  if (!trovato) throw new Error(`Campo "${nome}" assente`);
  return trovato;
};
const nomi = (campi: Campo[]) => campi.map((c) => c.name);

// Nel pannello il corpo della pagina si chiama `body`; in autonomia.yml `corpo`.
const nomeInAutonomia = (nome: string) => (nome === 'body' ? 'corpo' : nome);

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

  it('omette i campi opzionali vuoti: email "" farebbe fallire la build', () => {
    expect(config.output.omit_empty_optional_fields).toBe(true);
  });
});

describe('collection', () => {
  it('sono negozio (a file) e pagine (a cartella)', () => {
    expect(config.collections.map((c) => c.name)).toEqual(['negozio', 'pagine']);
    expect(collection('negozio').files).toHaveLength(1);
    expect(collection('pagine').folder).toBeDefined();
  });

  it('nessuna collection permette di pubblicare', () => {
    for (const c of config.collections) expect(c.publish, c.name).toBe(false);
  });

  it('le collection a cartella non permettono di creare né eliminare', () => {
    for (const c of config.collections.filter((c) => c.folder)) {
      expect(c.create, c.name).toBe(false);
      expect(c.delete, c.name).toBe(false);
    }
  });

  it('le collection a file non hanno create/delete: per Sveltia non esistono', () => {
    // Un file listato si modifica soltanto; un'opzione sconosciuta darebbe solo
    // un avviso in console, senza effetto.
    for (const c of config.collections.filter((c) => c.files)) {
      expect(c, c.name).not.toHaveProperty('create');
      expect(c, c.name).not.toHaveProperty('delete');
    }
  });

  it('puntano ai file che la build e autonomia.yml conoscono', () => {
    expect(collection('negozio').files?.[0]?.file).toBe(
      autonomia.contenuti.negozio.file,
    );
    expect(`${collection('pagine').folder}/*.${collection('pagine').extension}`).toBe(
      autonomia.contenuti.pagine.file,
    );
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

  it('pagine: titolo, descrizione, immagine, immagine_alt, body', () => {
    expect(nomi(campiPagine())).toEqual([
      'titolo',
      'descrizione',
      'immagine',
      'immagine_alt',
      'body',
    ]);
  });

  const casi: [string, () => Campo[], string][] = [
    ['negozio', campiNegozio, 'negozio'],
    ['pagine', campiPagine, 'pagine'],
  ];

  for (const [etichetta, campi, voce] of casi) {
    it(`${etichetta}: livello 0 in autonomia.yml = readonly, livello 1 o più = modificabile`, () => {
      const livelli = autonomia.contenuti[voce].campi;
      for (const c of campi()) {
        const livello = livelli[nomeInAutonomia(c.name)];
        expect(livello, `${c.name} manca in autonomia.yml`).toBeTypeOf('number');
        if (livello === 0) expect(c.readonly, c.name).toBe(true);
        else expect(c.readonly, c.name).not.toBe(true);
      }
    });

    it(`${etichetta}: autonomia.yml non elenca campi assenti dal pannello`, () => {
      const nomiPannello = campi().map((c) => nomeInAutonomia(c.name));
      expect(Object.keys(autonomia.contenuti[voce].campi).sort()).toEqual(
        [...nomiPannello].sort(),
      );
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

  it('il corpo è un campo Markdown', () => {
    expect(campo(campiPagine(), 'body').widget).toBe('markdown');
  });

  it("il corpo non offre componenti dell'editor: niente immagini inserite nel testo", () => {
    // Senza questa opzione Sveltia offre i componenti `image` e `code-block`:
    // un'immagine con indirizzo esterno sarebbe una risorsa di terzi sul sito.
    // L'elenco vuoto vale davvero: Sveltia usa l'elenco predefinito solo se
    // l'opzione manca (`editor_components ?? [...predefiniti]`). L'immagine di
    // una pagina si carica dal campo `immagine`, non dal testo.
    const corpo = campo(campiPagine(), 'body');
    expect(corpo).toHaveProperty('editor_components');
    expect(corpo.editor_components).toEqual([]);
  });
});

describe('limiti dei campi (da LIMITI)', () => {
  const lunghezze = (c: Campo) => ({ min: c.minlength, max: c.maxlength });

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

  it('pagine', () => {
    const campi = campiPagine();
    const { titolo, descrizione, immagine_alt } = LIMITI.pagina;
    expect(lunghezze(campo(campi, 'titolo'))).toEqual({ min: undefined, max: titolo.max });
    expect(lunghezze(campo(campi, 'descrizione'))).toEqual({
      min: descrizione.min,
      max: descrizione.max,
    });
    expect(lunghezze(campo(campi, 'immagine_alt'))).toEqual({
      min: immagine_alt.min,
      max: immagine_alt.max,
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

describe('immagini', () => {
  const trasformazioni = () => config.media_libraries.all?.transformations;

  it('ogni immagine caricata diventa WebP, qualità 85, dentro un riquadro di 2400 x 2400 px', () => {
    // Larghezza e altezza insieme sono un riquadro: la foto si riduce (mai si
    // ingrandisce) finché sta dentro entrambi i limiti, mantenendo le proporzioni.
    // Con la sola larghezza una foto verticale 3:4 diventerebbe 2400 x 3200 px e
    // potrebbe superare il peso massimo di autonomia.yml.
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

  it('niente foto di stock da servizi esterni', () => {
    expect(config.media_libraries.stock_assets).toBe(false);
  });

  it("l'immagine delle pagine è solo un file caricato: niente URL, niente SVG", () => {
    const immagine = campo(campiPagine(), 'immagine');
    expect(immagine.widget).toBe('image');
    expect(immagine.choose_url).toBe(false);
    const accetta = (immagine.accept ?? '').split(',').map((s) => s.trim());
    expect(accetta.length).toBeGreaterThan(0);
    expect(accetta.join(',')).not.toMatch(/svg|html|gif|\*/i);
    // La conversione HEIC passa dallo stesso filtro: foto da iPhone e Android.
    expect(accetta).toEqual(expect.arrayContaining(['.heic', '.heif']));
  });

  it('i file stanno dove autonomia.yml consente di caricare (media.percorsi)', () => {
    const pagine = collection('pagine');
    const cartella = `${pagine.folder}/${pagine.media_folder}`;
    expect(autonomia.media.percorsi).toEqual([`${cartella}/**`]);
    // Il percorso scritto nel frontmatter è relativo alla pagina (image() di Astro).
    expect(pagine.public_folder).toBe(pagine.media_folder);
    // La cartella globale (Libreria dei file) ricade nello stesso percorso.
    expect(config.media_folder).toBe(cartella);
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
    expect(pagina).not.toMatch(/^\s*import\b.*\b(BaseLayout|SeoHead)\b/m);
    expect(pagina).not.toMatch(/<(BaseLayout|SeoHead)\b/);
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
