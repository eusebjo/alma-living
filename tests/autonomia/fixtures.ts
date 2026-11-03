import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { loadRules } from '../../scripts/autonomia/rules';
import type {
  ChangedFile,
  PullRequestInput,
  Rules,
} from '../../scripts/autonomia/types';
import { FOTO_BASE } from '../../src/content/foto';
import type { PostContenuto, Prodotto, StoriaContenuto } from '../../src/content/schemas';

// Fixture condivise dai test del motore di autonomia. Le regole sono quelle
// vere del repository (`autonomia.yml`), con `lei` nella redazione al posto
// dell'elenco vuoto: così i test falliscono se qualcuno cambia le regole senza
// pensare alle conseguenze.

const percorsoRegole = fileURLToPath(
  new URL('../../autonomia.yml', import.meta.url),
);

export const regoleDelRepository: Rules = loadRules(
  readFileSync(percorsoRegole, 'utf8'),
);

export const rules: Rules = {
  ...regoleDelRepository,
  ruoli: { sviluppo: ['eusebjo'], redazione: ['lei'] },
};

export const NEGOZIO = 'src/content/negozio/negozio.json';
export const POST = 'src/content/post/p1.json';
export const PRODOTTO = 'src/content/prodotti/sabbia.json';
export const STORIA = 'src/content/storie/oggi.json';
export const ETICHETTA_INVIATA = 'sveltia-cms/pending_review';

/** Indirizzo di una foto caricata dal pannello (cartella `cms/` del bucket). */
export const FOTO_DAL_PANNELLO = `${FOTO_BASE}/cms/cuscini.webp`;

export interface Negozio {
  nome: string;
  descrizione: string;
  indirizzo: {
    via: string;
    civico: string;
    cap: string;
    citta: string;
    provincia: string;
  };
  telefono: string;
  email?: string;
  orari: Array<{ giorno: string; apertura: string; chiusura: string }>;
}

const negozioBase: Negozio = {
  nome: 'Alma Living',
  descrizione: 'Negozio di biancheria per la casa nel centro di Livorno.',
  indirizzo: {
    via: 'Via Ricasoli',
    civico: '51-53',
    cap: '57125',
    citta: 'Livorno',
    provincia: 'LI',
  },
  telefono: '334 520 5451',
  orari: [],
};

/** JSON a due spazi con la riga finale, come lo scrive il pannello. */
function comeJson<T>(base: T, modifica?: (dati: T) => void): string {
  const copia = structuredClone(base);
  modifica?.(copia);
  return `${JSON.stringify(copia, null, 2)}\n`;
}

/** Testo di `negozio.json`, con una modifica facoltativa applicata al volo. */
export function negozioJson(modifica?: (n: Negozio) => void): string {
  return comeJson(negozioBase, modifica);
}

export const ORARI_LUNEDI = [
  { giorno: 'lunedi', apertura: '09:00', chiusura: '13:00' },
];

const postBase: PostContenuto = {
  data: '2026-10-28',
  testo: 'Sono arrivati i cuscini di Natale, in rosso, bianco, beige e verde.',
  foto: [
    {
      src: FOTO_DAL_PANNELLO,
      alt: 'Divano con cuscini natalizi rossi, bianchi e verdi',
      inquadratura: 'centro',
    },
  ],
  soggetto: 'sui cuscini di Natale',
};

/** Testo di un post valido (collection `post`), con una modifica facoltativa. */
export function postJson(modifica?: (p: PostContenuto) => void): string {
  return comeJson(postBase, modifica);
}

const prodottoBase: Prodotto = {
  nome: 'Lenzuola color sabbia',
  dettaglio: 'Cotone percalle, per letto matrimoniale',
  categorie: ['letto'],
  novita: false,
  data: '2026-10-20',
  foto: {
    src: `${FOTO_BASE}/prova/sabbia.jpg`,
    alt: 'Lenzuola color sabbia su un letto rifatto',
    inquadratura: 'centro',
  },
};

/** Testo di un prodotto valido (collection `prodotti`), con una modifica facoltativa. */
export function prodottoJson(modifica?: (p: Prodotto) => void): string {
  return comeJson(prodottoBase, modifica);
}

const storiaBase: StoriaContenuto = {
  nome: 'Oggi',
  data: '2026-10-28',
  etichetta: 'Oggi',
  invito: 'whatsapp',
  foto: [
    {
      src: `${FOTO_BASE}/prova/scaffale.jpg`,
      alt: 'Uno scaffale del negozio con plaid e cuscini in pelo',
      inquadratura: 'centro',
      frase: 'La parete dei plaid è pronta: bianchi, rosa e grigi.',
      soggetto: 'la parete dei plaid',
    },
  ],
};

/** Testo di una storia valida (collection `storie`), con una modifica facoltativa. */
export function storiaJson(modifica?: (s: StoriaContenuto) => void): string {
  return comeJson(storiaBase, modifica);
}

// --- Regole di prova: Markdown e immagini nel repository ---
//
// Oggi `autonomia.yml` non ha collection in Markdown né cartelle in cui
// caricare immagini (le foto stanno su R2: `media.percorsi` è vuoto). Il
// motore però le sa ancora controllare, e i test ne tengono provate le difese
// (frontmatter nascosti, tipi e pesi dei file) con queste regole: quelle vere
// più una collection di note in Markdown e la loro cartella di immagini.

export const NOTA = 'src/content/note/benvenuto.md';
export const IMMAGINI = 'src/content/note/immagini';

export const regoleConNoteEImmagini: Rules = {
  ...rules,
  contenuti: {
    ...rules.contenuti,
    note: {
      file: 'src/content/note/*.md',
      formato: 'markdown',
      azioni: { crea: 0, modifica: 1, elimina: 0 },
      campi: { titolo: 1, descrizione: 1, immagine: 1, immagine_alt: 1, corpo: 1 },
    },
  },
  media: {
    ...rules.media,
    percorsi: [`${IMMAGINI}/**`],
    azioni: { carica: 1, elimina: 0 },
  },
};

interface CampiNota {
  titolo?: string;
  descrizione?: string;
  immagine?: string;
  corpo?: string;
  fineRiga?: '\n' | '\r\n';
}

/** Testo di una nota in Markdown (frontmatter più corpo), per le regole di prova. */
export function notaMd({
  titolo = 'Alma Living, biancheria per la casa',
  descrizione = 'Negozio di biancheria per la casa in Via Ricasoli, a Livorno.',
  immagine = './immagini/nota.webp',
  corpo = 'Testo segnaposto della nota.',
  fineRiga = '\n',
}: CampiNota = {}): string {
  return [
    '---',
    `titolo: ${titolo}`,
    `descrizione: ${descrizione}`,
    `immagine: ${immagine}`,
    'immagine_alt: Immagine segnaposto della nota',
    '---',
    '',
    corpo,
    '',
  ].join(fineRiga);
}

export function modificato(
  path: string,
  before: string,
  after: string,
): ChangedFile {
  return { path, status: 'modified', before, after };
}

export function aggiunto(path: string, after: string): ChangedFile {
  return { path, status: 'added', before: null, after };
}

export function rimosso(path: string, before: string): ChangedFile {
  return { path, status: 'removed', before, after: null };
}

export function rinominato(
  previousPath: string,
  path: string,
  testo: string,
): ChangedFile {
  return { path, previousPath, status: 'renamed', before: testo, after: testo };
}

export function immagine(
  path: string,
  sizeBytes: number | undefined,
  status: ChangedFile['status'] = 'added',
): ChangedFile {
  return {
    path,
    status,
    before: null,
    after: null,
    ...(sizeBytes === undefined ? {} : { sizeBytes }),
  };
}

export const kb = (n: number): number => n * 1024;

export function proposta(
  files: ChangedFile[],
  altro: Partial<PullRequestInput> = {},
): PullRequestInput {
  return {
    author: 'lei',
    draft: false,
    labels: [ETICHETTA_INVIATA],
    files,
    ...altro,
  };
}
