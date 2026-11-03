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

// Il nome di un file: lettere, cifre, punto, trattino, trattino basso e tilde,
// e non comincia con un punto. Niente `%` (una `..` nascosta come `%2e%2e`),
// spazi né barre. La tilde c'è perché il pannello può lasciarla nel nome di una
// foto caricata: lo slug ASCII di Sveltia tiene lettere, cifre, `_`, `-` e `~`
// (vedi `public/admin/config.yml`), e nell'indirizzo resta così com'è.
const NOME_FILE = /^[A-Za-z0-9_~][A-Za-z0-9._~-]*$/;

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

/**
 * Vero per un indirizzo del bucket fatto bene ma con un livello in più,
 * `/<cartella>/<sotto>/<nome>`, con una cartella di `CARTELLE_FOTO`: la foto è stata
 * caricata in una cartella creata dal selettore del pannello. Non è un indirizzo
 * valido (vedi `eIndirizzoFoto`), ma lo schema lo distingue dagli altri sbagliati per
 * dire cosa fare. Ogni segmento dopo la cartella deve essere un nome di file: un `..`,
 * una query o un indirizzo senza nome restano "foto non caricata dal pannello".
 */
export function eFotoInSottocartella(valore: string): boolean {
  if (!valore.startsWith(`${FOTO_BASE}/`)) return false;
  const [cartella, ...resto] = valore.slice(FOTO_BASE.length + 1).split('/');
  return (
    cartella !== undefined &&
    (CARTELLE_FOTO as readonly string[]).includes(cartella) &&
    resto.length >= 2 &&
    resto.every((segmento) => NOME_FILE.test(segmento) && !segmento.includes('..'))
  );
}

/**
 * Le inquadrature che la redazione sceglie dal pannello: ogni nome è un
 * `object-position` CSS. Si decide solo il punto verticale da tenere in vista
 * quando la foto è tagliata (in orizzontale resta al centro).
 */
export const INQUADRATURE = {
  alto: '50% 20%',
  'centro-alto': '50% 35%',
  centro: '50% 50%',
  'centro-basso': '50% 65%',
  basso: '50% 80%',
} as const;

export type Inquadratura = keyof typeof INQUADRATURE;

// La percentuale verticale di un `object-position` scritto come `X% Y%`.
const POSIZIONE_CON_PERCENTUALI = /^\s*[-+]?\d*\.?\d+%\s+([-+]?\d*\.?\d+)%\s*$/;

function percentualeVerticale(posizione: string): number | undefined {
  const testo = POSIZIONE_CON_PERCENTUALI.exec(posizione)?.[1];
  return testo === undefined ? undefined : Number(testo);
}

// Le inquadrature con la loro percentuale verticale, dalla più centrale: a parità
// di distanza vince la prima, cioè quella più vicina al centro.
const PUNTI_VERTICALI = (Object.keys(INQUADRATURE) as Inquadratura[])
  .map((nome) => ({ nome, y: percentualeVerticale(INQUADRATURE[nome]) ?? 50 }))
  .sort((a, b) => Math.abs(a.y - 50) - Math.abs(b.y - 50));

/**
 * L'inquadratura la cui percentuale verticale è la più vicina a quella di
 * `posizione` (per esempio `40% 68%` → `centro-basso`). A metà strada tra due
 * inquadrature vince quella più vicina al centro. Se `posizione` non ha una
 * percentuale verticale leggibile, è `centro`.
 */
export function inquadraturaVicina(posizione: string): Inquadratura {
  const voluta = percentualeVerticale(posizione);
  if (voluta === undefined) return 'centro';
  return PUNTI_VERTICALI.reduce(
    (migliore, punto) =>
      Math.abs(punto.y - voluta) < Math.abs(migliore.y - voluta) ? punto : migliore,
    { nome: 'centro' as Inquadratura, y: 50 },
  ).nome;
}
