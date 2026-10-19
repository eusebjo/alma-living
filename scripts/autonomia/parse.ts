import { extractFrontmatter } from '@astrojs/markdown-remark';
import matter from 'gray-matter';
import { parseDocument } from 'yaml';

// Lettura dei contenuti di una proposta. Il testo arriva da un'altra persona:
// qui si legge soltanto, mai si esegue.

export type Formato = 'json' | 'markdown';

/** Un oggetto semplice, cioè né un array, né `null`, né un oggetto speciale. */
export function eOggettoSemplice(valore: unknown): valore is Record<string, unknown> {
  if (typeof valore !== 'object' || valore === null) return false;
  const prototipo = Object.getPrototypeOf(valore);
  return prototipo === Object.prototype || prototipo === null;
}

/**
 * Vero se il valore è fatto solo di dati semplici, come quelli di un JSON:
 * testo, numeri, booleani, `null`, elenchi e oggetti semplici, senza
 * riferimenti circolari. Il YAML permette anche dati binari, insiemi e
 * strutture che rimandano a sé stesse, che qui non servono e non si sanno
 * confrontare.
 */
function soloDatiSemplici(valore: unknown, antenati: Set<object>): boolean {
  if (valore === null) return true;
  if (typeof valore !== 'object') {
    return ['string', 'number', 'boolean'].includes(typeof valore);
  }
  if (antenati.has(valore)) return false;
  antenati.add(valore);
  const figli = Array.isArray(valore)
    ? valore
    : eOggettoSemplice(valore)
      ? Object.values(valore)
      : null;
  const semplice =
    figli !== null && figli.every((figlio) => soloDatiSemplici(figlio, antenati));
  antenati.delete(valore);
  return semplice;
}

/**
 * Legge un testo YAML in modo rigoroso: sia gli errori sia gli avvisi
 * (chiavi ripetute, tag sconosciuti) fanno lanciare, e così i valori che non
 * sono dati semplici. Con lo schema YAML 1.2 di base le date restano testo e
 * i tag con codice non esistono; un eccesso di rimandi (alias) è rifiutato.
 */
export function leggiYaml(testo: string): unknown {
  const documento = parseDocument(testo, { uniqueKeys: true });
  const problema = documento.errors[0] ?? documento.warnings[0];
  if (problema) throw problema;
  const dati: unknown = documento.toJS();
  if (!soloDatiSemplici(dati, new Set())) {
    throw new Error(
      'Il YAML contiene valori non supportati (dati binari, insiemi o riferimenti circolari).',
    );
  }
  return dati;
}

const BOM = /^\uFEFF/;

/**
 * I percorsi dei campi si scrivono con i punti (`indirizzo.via`): un nome di
 * campo che contenga un punto, o vuoto, si confonderebbe con un campo
 * annidato e finirebbe sotto la regola di un altro campo. Nessun contenuto
 * del sito ha nomi così, quindi a qualsiasi profondità si rifiutano.
 */
function controllaNomiDeiCampi(valore: unknown): void {
  if (Array.isArray(valore)) {
    for (const elemento of valore) controllaNomiDeiCampi(elemento);
  } else if (eOggettoSemplice(valore)) {
    for (const [nome, figlio] of Object.entries(valore)) {
      if (nome === '' || nome.includes('.')) {
        throw new Error(
          'Un campo ha un nome non valido: i nomi dei campi non possono essere vuoti né contenere punti.',
        );
      }
      controllaNomiDeiCampi(figlio);
    }
  }
}

function parseJson(testo: string): Record<string, unknown> {
  let valore: unknown;
  try {
    valore = JSON.parse(testo.replace(BOM, ''));
  } catch (causa) {
    throw new Error('Il contenuto non è un JSON valido.', { cause: causa });
  }
  if (!eOggettoSemplice(valore)) {
    throw new Error('Il contenuto JSON deve essere un oggetto.');
  }
  controllaNomiDeiCampi(valore);
  return valore;
}

function rifiutaLinguaggio(): never {
  throw new Error('Il frontmatter deve essere scritto in YAML.');
}

// gray-matter, di serie, esegue con `eval` il frontmatter dichiarato come
// `---js`. Qui il YAML lo legge `leggiYaml` e i linguaggi con codice sono
// disattivati.
const OPZIONI_MATTER = {
  engines: {
    yaml: { parse: (testo: string) => leggiYaml(testo) ?? {} },
    javascript: { parse: rifiutaLinguaggio },
    js: { parse: rifiutaLinguaggio },
  },
};

/**
 * Il frontmatter deve stare esattamente dove lo cerca anche la build di Astro.
 * Astro lo riconosce anche dopo righe vuote o spazi iniziali e anche in TOML
 * (`+++`), gray-matter no: un file così sembrerebbe senza campi al controllo
 * e con campi nascosti alla build (per esempio `slug`, che per Astro è
 * l'identificatore della pagina). Qui si accetta solo YAML tra `---`, con la
 * prima riga `---` all'inizio del file (al massimo preceduta da un BOM).
 */
function controllaPosizioneFrontmatter(normalizzato: string): void {
  if (normalizzato.startsWith('+++')) {
    throw new Error(
      'Il frontmatter deve essere scritto in YAML tra righe di tre trattini, non in TOML.',
    );
  }
  if (
    !normalizzato.startsWith('---') &&
    /^\s*(?:---|\+\+\+)/.test(normalizzato)
  ) {
    throw new Error(
      'Il frontmatter deve iniziare alla prima riga del file, senza righe vuote o spazi prima.',
    );
  }
  // Dopo i `---` iniziali non deve esserci il nome di un linguaggio
  // (`---js`, `--- toml`): si accetta solo YAML. Una riga di quattro o più
  // trattini non è un frontmatter e gray-matter la lascia nel corpo.
  if (normalizzato.startsWith('---') && normalizzato[3] !== '-') {
    const dopoTrattini = normalizzato.slice(3);
    const fineRiga = dopoTrattini.indexOf('\n');
    const rigaApertura =
      fineRiga === -1 ? dopoTrattini : dopoTrattini.slice(0, fineRiga);
    if (rigaApertura.trim() !== '') {
      throw new Error('Il frontmatter deve essere scritto in YAML.');
    }
  }
}

/**
 * Controprova: il blocco di frontmatter che vede gray-matter deve essere lo
 * stesso che estrae la build (`extractFrontmatter`, la funzione di Astro). Se
 * uno dei due ne vede uno e l'altro no, o lo delimitano in modo diverso (per
 * esempio una riga finale mancante o chiusa con `+++`), il file è rifiutato.
 */
function controllaAccordoConAstro(
  originale: string,
  normalizzato: string,
  bloccoLetto: string,
): void {
  // Una riga di quattro o più trattini non è un frontmatter per gray-matter.
  const letto = normalizzato.startsWith('---') && normalizzato[3] !== '-';
  const astro = extractFrontmatter(originale)?.replaceAll('\r\n', '\n');
  const concordano = letto ? astro === `${bloccoLetto}\n` : astro === undefined;
  if (!concordano) {
    throw new Error(
      'Il frontmatter non è scritto in modo chiaro: manca la riga finale di tre trattini o è ambiguo.',
    );
  }
}

function parseMarkdown(testo: string): Record<string, unknown> {
  const normalizzato = testo.replace(BOM, '').replaceAll('\r\n', '\n');
  controllaPosizioneFrontmatter(normalizzato);

  let file: { data: unknown; content: string; matter: string };
  try {
    file = matter(normalizzato, OPZIONI_MATTER);
  } catch (causa) {
    throw new Error('Il frontmatter non è un YAML valido.', { cause: causa });
  }
  controllaAccordoConAstro(testo, normalizzato, file.matter);

  if (!eOggettoSemplice(file.data)) {
    throw new Error('Il frontmatter deve essere un elenco di campi.');
  }
  if (Object.hasOwn(file.data, 'corpo')) {
    throw new Error(
      'Il frontmatter non può contenere un campo chiamato corpo: è il nome del testo della pagina.',
    );
  }
  controllaNomiDeiCampi(file.data);
  return { ...file.data, corpo: file.content.trim() };
}

/**
 * Legge un file di contenuto e ne restituisce i campi. Per il markdown sono i
 * campi del frontmatter più il testo della pagina (senza spazi iniziali e
 * finali) nel campo `corpo`. Lancia un `Error` se il contenuto non è valido.
 */
export function parseContent(
  text: string,
  formato: Formato,
): Record<string, unknown> {
  return formato === 'json' ? parseJson(text) : parseMarkdown(text);
}
