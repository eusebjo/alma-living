// I dati fissi della pagina e i tipi che usano i componenti. Prodotti, post e
// storie non stanno più qui: sono le collection `prodotti`, `post` e `storie`
// (`src/content/`), che la redazione cambia dal pannello; la pagina le legge e
// le traduce in `Articolo`, `Post` e `Storia` con `src/sito/contenuti.ts`.
// Restano nel codice la vetrina dell'apertura (la sequenza fissa della tavola
// `FotoGrande2.dc.html`, "La foto grande", 2 novembre 2026), le foto dei filtri,
// delle finestre e del negozio, le sezioni e i messaggi già scritti.
// Le foto fisse sono indicate per nome (`prova/<nome>.jpg` nel bucket delle foto)
// e ogni scatto porta l'indirizzo completo (`src`, vedi `src/content/foto.ts`): i
// componenti lo passano a `<Picture>`, che lo scarica e lo ottimizza alla build.
// Nessun import da Astro: questo file lo leggono anche i test sul sito generato.
import { CATEGORIE } from '../../content/categorie';
import type { Categoria } from '../../content/categorie';
import { indirizzoFoto } from '../../content/foto';
import type { RegolaLimite } from '../comune/limite';

/** Testo alternativo di ogni foto fissa della pagina, come sulla tavola. */
const ALT = {
  scaffale: 'Uno scaffale del negozio con plaid e cuscini in pelo bianchi, rosa e grigi',
  'righe-rosa': 'Letto con lenzuola e copriletto a righe rosa in una camera luminosa',
  'camera-rosa': 'Camera romantica con testiera capitonné e copriletto trapuntato rosa',
  bagno: 'Bagno luminoso con asciugamani piegati e un accappatoio appeso',
  'bagno-prodotti': 'Mobile di legno con saponi e profumi per la casa, alla luce del giorno',
  'lenzuola-beige': 'Lenzuola color sabbia in primo piano',
  volant: 'Lenzuola bianche e color panna con il volant',
  'tovaglia-volant': 'Tovaglia color lino con volant e profilo rosso',
  tavola: 'Tavola apparecchiata con tovaglia bianca e sedie bianche',
  coperta: 'Coperta in maglia grigia arrotolata, chiusa con fiocco e bottone',
  'abbracciami-verde': 'Plaid verde con la scritta Abbracciami ricamata e le frange',
  'copriletto-rosso': 'Copriletto rosso con volant e cuscini natalizi, all’aperto',
  'asciugamano-rosso': 'Asciugamano rosso con una casetta di Natale ricamata',
  neonato: 'Accappatoi da bimbo con cappuccio e orsetto ricamato',
  'accappatoi-appesi': 'Accappatoi da bimbo appesi, rosa, bianco e azzurro',
  candele: 'Candele in ciotole di legno legate con lo spago, con il cartellino',
  gnomi: 'Gnomi di stoffa natalizi su un’alzata bianca',
  mare: 'Lenzuola e plaid piegati in riva al mare',
  'ig-cuscini-1': 'Divano con cuscini natalizi rossi, bianchi e verdi con alberelli in rilievo',
} as const;

export type NomeFoto = keyof typeof ALT;

/** Una foto con il suo testo alternativo e il punto da tenere al centro del taglio. */
export interface Scatto {
  /** Indirizzo della foto su foto.almalivingviaricasoli.it (vedi `src/content/foto.ts`). */
  src: string;
  alt: string;
  /** `object-position` CSS, per esempio `50% 40%`. */
  posizione: string;
}

function scatto(nome: NomeFoto, posizione = '50% 50%'): Scatto {
  return { src: indirizzoFoto('prova', `${nome}.jpg`), alt: ALT[nome], posizione };
}

/**
 * Le sezioni della pagina, per la navigazione dell'header e del piè di pagina.
 * Le collezioni sono i filtri degli scaffali: «Collezioni» porta alla selezione.
 */
export const sezioni = [
  { nome: 'Collezioni', href: '#selezione' },
  { nome: 'Dal negozio', href: '#diario' },
  { nome: 'Il negozio', href: '#negozio' },
] as const;

/** La foto dello scaffale nella sezione del negozio. */
export const fotoDelNegozio: Scatto = scatto('scaffale');

// --- Apertura: la vetrina, dodici prodotti in un ordine fisso ---

export interface ProdottoInVetrina {
  nome: string;
  /** Nella cornice del computer (le cinque foto più larghe). */
  grande: boolean;
  /** Lo scatto: `posizione` è quella del computer. */
  scatto: Scatto;
  /** `object-position` sul telefono e sul tablet. */
  posizioneTelefono: string;
}

function inVetrina(
  nome: string,
  foto: NomeFoto,
  posizione: string,
  posizioneTelefono: string,
  grande = false,
): ProdottoInVetrina {
  return { nome, grande, scatto: scatto(foto, posizione), posizioneTelefono };
}

/**
 * I dodici prodotti dell'apertura, nell'ordine in cui si sfogliano. Sotto i 1024
 * px la cornice li mostra tutti; sul computer la cornice ha solo i cinque
 * `grande` e le due colonne di miniature gli altri sette (3-6 a sinistra, 8-10 a
 * destra), nello stesso ordine.
 */
export const vetrina: ProdottoInVetrina[] = [
  inVetrina('Lenzuola e copriletto a righe rosa', 'righe-rosa', '50% 24%', '50% 40%', true),
  inVetrina('Coperta in maglia', 'coperta', '50% 52%', '50% 50%', true),
  inVetrina('Plaid Abbracciami', 'abbracciami-verde', '50% 50%', '50% 50%'),
  inVetrina('Asciugamano con casetta', 'asciugamano-rosso', '50% 50%', '50% 50%'),
  inVetrina('Lenzuola color sabbia', 'lenzuola-beige', '50% 40%', '50% 40%'),
  inVetrina('Accappatoio con orsetto', 'neonato', '50% 40%', '50% 40%'),
  inVetrina('Tovaglia con volant', 'tovaglia-volant', '50% 45%', '50% 50%', true),
  inVetrina('Parure con volant', 'volant', '50% 50%', '50% 50%'),
  inVetrina('Candele nelle ciotole di legno', 'candele', '50% 60%', '50% 60%'),
  inVetrina('Copriletto rosso con volant', 'copriletto-rosso', '50% 50%', '50% 50%'),
  inVetrina('Cuscini delle feste', 'ig-cuscini-1', '50% 62%', '50% 55%', true),
  inVetrina('Saponi e profumi', 'bagno-prodotti', '50% 62%', '50% 78%', true),
];

// --- Storie (dalla collection `storie`, vedi `src/sito/contenuti.ts`) ---

/** L'invito che la scheda di una storia mette in evidenza: WhatsApp, telefono o indicazioni. */
export type InvitoStoria = 'whatsapp' | 'chiama' | 'indicazioni';

export interface FotoStoria extends Scatto {
  testo: string;
  /**
   * Di che cosa parla la foto, nella scheda degli inviti e nel messaggio WhatsApp:
   * con l'articolo e in minuscolo ("i plaid delle feste"), senza il punto finale.
   */
  soggetto: string;
}

export interface Storia {
  /** Unico nella pagina: lo usano i pulsanti che aprono la storia. */
  id: string;
  nome: string;
  /** Etichetta sul cerchio ("Oggi", "Nuovo"). */
  etichetta?: string;
  data: string;
  /** L'invito che la scheda mette in evidenza per questa storia. */
  invito: InvitoStoria;
  foto: FotoStoria[];
}

// --- Categorie degli articoli ---

// L'elenco sta in `src/content/categorie.ts` (lo leggono anche gli schemi dei
// contenuti): qui si riesporta con i nomi che usano i componenti.
export type { Categoria };

/** Le categorie, nell'ordine dei filtri della selezione. */
export const categorie = CATEGORIE;

// --- Selezione dal negozio ---

/**
 * Il cerchietto foto di ogni filtro della selezione: "Tutto" ha lo scaffale, ogni
 * categoria la foto della sua stanza (le stesse dei riquadri di "Per ogni stanza
 * della casa", che non c'è più). Nei filtri è decorativo (`alt` vuoto): il nome
 * è il testo.
 */
export const fotoDeiFiltri: Readonly<Record<'tutti' | Categoria, Scatto>> = {
  tutti: scatto('scaffale', '50% 45%'),
  letto: scatto('camera-rosa', '50% 55%'),
  bagno: scatto('bagno', '50% 58%'),
  bimbi: scatto('accappatoi-appesi', '50% 24%'),
  tavola: scatto('tavola', '40% 55%'),
  profumi: scatto('candele', '50% 60%'),
  natale: scatto('gnomi', '50% 45%'),
  mare: scatto('mare', '50% 60%'),
};

/** Le foto delle due finestre della selezione: quella dello scaffale e quella del filtro Mare. */
export const fotoFinestra: { scaffale: Scatto; mare: Scatto } = {
  scaffale: scatto('scaffale', '50% 45%'),
  mare: scatto('mare', '50% 35%'),
};

/** Di quanto si ingrandisce un dettaglio, dove manca un secondo scatto vero. */
export const SCALA_DETTAGLIO = 1.7;

/** Un ingrandimento: la scala e il punto intorno a cui si ingrandisce. */
export interface Ingrandimento {
  scala: number;
  /** `transform-origin` CSS, per esempio `40% 68%`. */
  origine: string;
}

/** Uno scatto di una scheda: una foto vera, o la stessa foto ingrandita su un dettaglio. */
export interface ScattoArticolo extends Scatto {
  ingrandimento?: Ingrandimento;
}

/** Un colore in cui si trova un articolo, scelto con un pallino nella scheda rapida. */
export interface Colore {
  nome: string;
  /**
   * La tinta del pallino: un dato dell'articolo (il colore vero del prodotto), non
   * un gettone del tema, quindi sta qui e non in `tema.css`.
   */
  tinta: string;
  /**
   * La foto di questo colore. Un articolo ha la foto per tutti i suoi colori o per
   * nessuno: con le foto il pallino cambia anche la foto, senza no.
   */
  foto?: Scatto;
}

export interface Articolo {
  /** Unico nella pagina: ne derivano gli id dell'articolo (il titolo della scheda). */
  id: string;
  nome: string;
  dettaglio: string;
  /** La prima dà il nome della categoria mostrato sulla scheda. */
  categorie: Categoria[];
  novita: boolean;
  /** Le due foto della scheda: il secondo scatto si vede con l'interruttore o al passaggio del mouse. */
  scatti: readonly [ScattoArticolo, ScattoArticolo];
  /** I colori si scelgono solo nella scheda rapida: sulla scheda sono scritti nel dettaglio. */
  colori?: readonly Colore[];
}

/** L'occhiello della scheda: «Novità» al posto della categoria, se l'articolo è nuovo. */
export function occhielloArticolo(articolo: Articolo): string {
  if (articolo.novita) return 'Novità';
  return categorie.find((c) => c.id === articolo.categorie[0])?.nome ?? '';
}

/** Il nome dell'articolo con il colore scelto, come lo scrive la scheda rapida: «Plaid Abbracciami · verde». */
export function nomeConColore(nome: string, colore: Colore): string {
  return `${nome} · ${colore.nome}`;
}

/**
 * Il testo accanto a «Colore:» quando nessun colore è scelto: «scegli tra verde e
 * rosso», «scegli tra rosso, bianco e verde»; con un colore solo il suo nome, senza
 * colori niente.
 */
export function testoColori(colori: readonly Colore[]): string {
  const nomi = colori.map((c) => c.nome);
  if (nomi.length < 2) return nomi[0] ?? '';
  return `scegli tra ${nomi.slice(0, -1).join(', ')} e ${nomi[nomi.length - 1]}`;
}

/**
 * Il nome della scheda rapida "Chiedi disponibilità" di un articolo (protocollo
 * "Post"): lo usano il link della scheda (`data-post-apri`) e il dialog
 * (`data-post`); ne derivano anche gli id del titolo e del nome nel dialog.
 */
export function idSchedaRapida(articolo: Articolo): string {
  return `articolo-${articolo.id}`;
}

/**
 * Quante schede della selezione si vedono prima di "Mostra tutti", per misura
 * (protocollo "Limite"): 4 sul telefono (due colonne), 6 sul tablet (tre
 * colonne), nessun limite da 1024 px (quattro colonne). Le stesse media query
 * sono in `Selezione.astro`, `SchedaArticolo.astro` e `SchedaRapida.astro`:
 * vanno cambiate insieme.
 */
export const LIMITI_SELEZIONE: readonly RegolaLimite[] = [
  { media: '(max-width: 767px)', limite: 4 },
  { media: '(max-width: 1023px)', limite: 6 },
];

// --- Post del diario (dalla collection `post`, vedi `src/sito/contenuti.ts`) ---

export interface Post {
  /** Unico nella pagina: lo usano il pulsante della griglia e il suo dialog. */
  id: string;
  data: string;
  /**
   * Di che cosa parla il post, nel messaggio WhatsApp: comincia con la
   * preposizione articolata ("sui cuscini di Natale"), che si legge dopo la data
   * ("…il vostro post del 28 ottobre sui cuscini di Natale"). Senza, il messaggio
   * dice solo la data.
   */
  chiedi?: string;
  testo: string;
  foto: Scatto[];
}

/** Quanti post si vedono nella griglia prima di "Mostra altri post". */
export const POST_VISIBILI = 9;

// --- Messaggi WhatsApp già scritti (quello di disponibilità è in `comune/contatti.ts`) ---

export const messaggi = {
  /** I pulsanti "Scrivici" generici. */
  generico: 'Buongiorno, vi scrivo dal sito di Alma Living.',
  /** La finestra "Non lo trovi qui?" sullo scaffale, in fondo alla selezione. */
  cerco: 'Buongiorno, vi scrivo dal sito: sto cercando ',
  /** La finestra che sostituisce quella dello scaffale quando un filtro non ha articoli (Mare). */
  mare: 'Buongiorno, avete ancora qualcosa della collezione mare?',
};

/** Il messaggio WhatsApp della scheda di una storia: il suo nome e il soggetto della foto vista. */
export function messaggioStoria(storia: Storia, foto: FotoStoria): string {
  return `Buongiorno, ho visto la storia «${storia.nome}» sul sito: ${foto.soggetto}. `;
}

/**
 * La data preceduta da "del": "del 28 ottobre", ma "dell’8 luglio" e "dell’11
 * ottobre", perché otto e undici cominciano con una vocale. `data` comincia con il
 * giorno ("8 luglio"); gli altri giorni (1, 18, 28…) si leggono con la consonante.
 */
export function delData(data: string): string {
  const giorno = data.split(' ')[0];
  return giorno === '8' || giorno === '11' ? `dell’${data}` : `del ${data}`;
}

/** Il messaggio WhatsApp di un post: la data e, se c'è, di che cosa parla. */
export function messaggioPost(voce: Post): string {
  const argomento = voce.chiedi ? ` ${voce.chiedi}` : '';
  return `Buongiorno, ho visto sul sito il vostro post ${delData(voce.data)}${argomento}. Mi date qualche informazione in più?`;
}
