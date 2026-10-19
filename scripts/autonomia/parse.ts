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

const BOM = /^﻿/;

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

function parseMarkdown(testo: string): Record<string, unknown> {
  const normalizzato = testo.replace(BOM, '').replaceAll('\r\n', '\n');

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

  let file: { data: unknown; content: string };
  try {
    file = matter(normalizzato, OPZIONI_MATTER);
  } catch (causa) {
    throw new Error('Il frontmatter non è un YAML valido.', { cause: causa });
  }
  if (!eOggettoSemplice(file.data)) {
    throw new Error('Il frontmatter deve essere un elenco di campi.');
  }
  if (Object.hasOwn(file.data, 'corpo')) {
    throw new Error(
      'Il frontmatter non può contenere un campo chiamato corpo: è il nome del testo della pagina.',
    );
  }
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
