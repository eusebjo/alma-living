import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { loadRules } from '../../scripts/autonomia/rules';
import type {
  ChangedFile,
  PullRequestInput,
  Rules,
} from '../../scripts/autonomia/types';

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
export const HOME = 'src/content/pagine/home.md';
export const ETICHETTA_INVIATA = 'sveltia-cms/pending_review';

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

/** Testo di `negozio.json`, con una modifica facoltativa applicata al volo. */
export function negozioJson(modifica?: (n: Negozio) => void): string {
  const copia = structuredClone(negozioBase);
  modifica?.(copia);
  return `${JSON.stringify(copia, null, 2)}\n`;
}

export const ORARI_LUNEDI = [
  { giorno: 'lunedi', apertura: '09:00', chiusura: '13:00' },
];

interface CampiHome {
  titolo?: string;
  descrizione?: string;
  immagine?: string;
  corpo?: string;
  fineRiga?: '\n' | '\r\n';
}

/** Testo di `home.md` (frontmatter più corpo). */
export function homeMd({
  titolo = 'Alma Living, biancheria per la casa',
  descrizione = 'Negozio di biancheria per la casa in Via Ricasoli, a Livorno.',
  immagine = './immagini/home.webp',
  corpo = 'Testo segnaposto della pagina principale.',
  fineRiga = '\n',
}: CampiHome = {}): string {
  return [
    '---',
    `titolo: ${titolo}`,
    `descrizione: ${descrizione}`,
    `immagine: ${immagine}`,
    'immagine_alt: Immagine segnaposto della pagina',
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
