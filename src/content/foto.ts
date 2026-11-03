// Dove stanno le foto del sito. Fonte unica dell'indirizzo: `astro.config.mjs`
// (che autorizza Astro a scaricare le immagini da questo host), `dati.ts` (che
// scrive l'indirizzo di ogni foto fissa) e, più avanti, gli schemi dei contenuti.
//
// Le foto vivono nel bucket R2 `alma-living-prova`, servito da
// `foto.almalivingviaricasoli.it`. La build le scarica e Astro le ottimizza
// (AVIF, WebP, misure adatte): a pagina aperta il browser non contatta mai
// questo host, perché ogni `<img>` punta a `/_astro/`.
//
// Nessun import da Astro: questo file lo leggono anche `astro.config.mjs` e i test.

/** Indirizzo pubblico del bucket delle foto, senza barra finale. Non è un segreto. */
export const FOTO_BASE = 'https://foto.almalivingviaricasoli.it';

/**
 * Le cartelle del bucket: `prova` per le foto fisse del sito, `cms` per quelle
 * che la redazione carica dal pannello.
 */
export const CARTELLE_FOTO = ['prova', 'cms'] as const;

export type CartellaFoto = (typeof CARTELLE_FOTO)[number];

/** L'indirizzo della foto `nome` (con estensione) nella cartella `cartella` del bucket. */
export function indirizzoFoto(cartella: CartellaFoto, nome: string): string {
  return `${FOTO_BASE}/${cartella}/${nome}`;
}

// Il nome di un file: lettere, cifre, punto, trattino e trattino basso, e non
// comincia con un punto. Niente `%` (una `..` nascosta come `%2e%2e`), spazi né barre.
const NOME_FILE = /^[A-Za-z0-9_][A-Za-z0-9._-]*$/;

/**
 * Vero solo per l'indirizzo di una foto del bucket: `https:` su `FOTO_BASE`,
 * percorso `/<cartella>/<nome>` con una cartella di `CARTELLE_FOTO`, senza `..`,
 * query né frammento. Si confronta il testo così com'è, senza normalizzarlo:
 * un indirizzo che l'URL parser sistemerebbe (`/cms/../prova/a.jpg`) è rifiutato.
 */
export function eIndirizzoFoto(valore: string): boolean {
  if (!valore.startsWith(`${FOTO_BASE}/`)) return false;
  const [cartella, nome, ...altro] = valore.slice(FOTO_BASE.length + 1).split('/');
  return (
    cartella !== undefined &&
    (CARTELLE_FOTO as readonly string[]).includes(cartella) &&
    nome !== undefined &&
    altro.length === 0 &&
    NOME_FILE.test(nome) &&
    !nome.includes('..')
  );
}
