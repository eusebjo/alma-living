import type { RehypePlugins } from '@astrojs/markdown-remark';
import rehypeSanitize from 'rehype-sanitize';

// Albero rehype (hast), nella parte che serve qui: tipi minimi per non dipendere
// da pacchetti di tipi che il progetto non dichiara.
interface NodoHast {
  type: string;
  tagName?: string;
  properties?: Record<string, unknown>;
  children?: NodoHast[];
}

// Il browser, leggendo un indirizzo, ignora tabulazioni e a capo, toglie i
// caratteri di controllo e gli spazi ai bordi e tratta `\` come `/`.
const IGNORATI_OVUNQUE = /[\t\n\r]/g;
// Caratteri di controllo (da U+0000 a U+0020) all'inizio e alla fine.
const BORDI = /^[\u0000- ]+|[\u0000- ]+$/g;
// Uno schema (`https:`, `data:`, `javascript:`...) è lettere, cifre, `+`, `-`, `.`
// seguite da due punti, all'inizio dell'indirizzo.
const SCHEMA = /^[A-Za-z][A-Za-z0-9+.-]*:/;

/**
 * Un indirizzo di immagine è "del sito" se il browser lo cercherebbe sullo
 * stesso sito: un percorso (`immagini/a.jpg`, `./a.jpg`, `/immagini/a.jpg`).
 * Non lo è se ha uno schema (`https:`, `data:`, `javascript:`...), se comincia
 * con `//` (indirizzo "senza schema", che punta a un altro sito) o se è vuoto.
 * Si guarda l'indirizzo come lo leggerebbe il browser: `\\host\x.jpg` o
 * `/<tab>/host/x.jpg` valgono come `//host/x.jpg`.
 */
export function eIndirizzoLocale(src: unknown): boolean {
  if (typeof src !== 'string') return false;
  const indirizzo = src
    .replace(IGNORATI_OVUNQUE, '')
    .replace(BORDI, '')
    .replaceAll('\\', '/');
  if (indirizzo === '') return false;
  if (indirizzo.startsWith('//')) return false;
  return !SCHEMA.test(indirizzo);
}

function togliImmaginiEsterne(nodo: NodoHast): void {
  if (!nodo.children) return;
  nodo.children = nodo.children.filter(
    (figlio) =>
      !(
        figlio.type === 'element' &&
        figlio.tagName === 'img' &&
        !eIndirizzoLocale(figlio.properties?.src)
      ),
  );
  for (const figlio of nodo.children) togliImmaginiEsterne(figlio);
}

/**
 * Plugin rehype: toglie dal testo ogni immagine il cui indirizzo non è del
 * sito (vedi `eIndirizzoLocale`). `rehype-sanitize` lascia passare `https:` e
 * `//host`, ma una pagina non deve caricare risorse di terzi: nel testo
 * restano solo immagini dello stesso sito. Va messo dopo `rehype-sanitize`.
 */
export function rimuoviImmaginiEsterne() {
  return (albero: NodoHast): void => {
    togliImmaginiEsterne(albero);
  };
}

// Plugin rehype applicati al testo Markdown delle pagine. Lo schema di default
// di rehype-sanitize toglie `<script>`, `<iframe>`, gli attributi `style` e
// `on*`, e gli URL `javascript:`. Subito dopo `rimuoviImmaginiEsterne` toglie
// le immagini che non sono del sito. Si collega in astro.config.mjs tramite
// `markdown.processor`.
export const rehypePlugins: RehypePlugins = [rehypeSanitize, rimuoviImmaginiEsterne];
