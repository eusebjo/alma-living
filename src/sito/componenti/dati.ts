// Contenuti della variante Salvia social. Storie e selezione sono esempi
// trascritti da `renderVals()` della tavola `SalviaSocial.dc.html` (tela di Claude
// Design) e aggiornati alla versione 3, la tavola `DiarioFascia.dc.html` (messaggi
// dei post con la preposizione articolata, diario dopo la selezione). La vetrina
// dell'apertura è la sequenza fissa della tavola `FotoGrande2.dc.html` ("La foto
// grande", 2 novembre 2026). I post del diario sono invece i 13 post veri del
// profilo Instagram di Alma Living (didascalie senza emoji né promozioni scadute).
// Le foto sono indicate per nome (`src/sito/foto/<nome>.jpg`, vedi
// `scripts/foto-prova/elenco.json`); i componenti le passano a `foto()`.
// Nessun import da Astro: questo file lo leggono anche i test sul sito generato.
import type { RegolaLimite } from '../comune/limite';

/** Testo alternativo di ogni foto di prova, come sulla tavola. */
const ALT = {
  scaffale: 'Uno scaffale del negozio con plaid e cuscini in pelo bianchi, rosa e grigi',
  'righe-rosa': 'Letto con lenzuola e copriletto a righe rosa in una camera luminosa',
  'camera-rosa': 'Camera romantica con testiera capitonné e copriletto trapuntato rosa',
  bagno: 'Bagno luminoso con asciugamani piegati e un accappatoio appeso',
  'bagno-prodotti': 'Mobile di legno con saponi e profumi per la casa, alla luce del giorno',
  'lenzuola-beige': 'Lenzuola color sabbia in primo piano',
  volant: 'Lenzuola bianche e color panna con il volant',
  trapunta: 'Primo piano di un trapuntato bianco',
  'tovaglia-volant': 'Tovaglia color lino con volant e profilo rosso',
  tavola: 'Tavola apparecchiata con tovaglia bianca e sedie bianche',
  coperta: 'Coperta in maglia grigia arrotolata, chiusa con fiocco e bottone',
  'abbracciami-verde': 'Plaid verde con la scritta Abbracciami ricamata e le frange',
  'abbracciami-rosso': 'Plaid rosso e marrone con la scritta Abbracciami, appesi',
  'plaid-rosso': 'Plaid rosso con le frange e palline di Natale',
  'plaid-verde': 'Plaid verde con decorazioni natalizie',
  'copriletto-rosso': 'Copriletto rosso con volant e cuscini natalizi, all’aperto',
  'asciugamano-rosso': 'Asciugamano rosso con una casetta di Natale ricamata',
  'asciugamano-bianco': 'Asciugamano bianco con una casetta ricamata',
  'asciugamano-verde': 'Asciugamano verde con una casetta ricamata',
  neonato: 'Accappatoi da bimbo con cappuccio e orsetto ricamato',
  'accappatoi-appesi': 'Accappatoi da bimbo appesi, rosa, bianco e azzurro',
  'asciugamani-bimbo': 'Asciugamani e accappatoi da bimbo con l’orsetto ricamato',
  candele: 'Candele in ciotole di legno legate con lo spago, con il cartellino',
  cuori: 'Cuori dorati su basi di legno con stelle rosse di stoffa',
  gnomi: 'Gnomi di stoffa natalizi su un’alzata bianca',
  mare: 'Lenzuola e plaid piegati in riva al mare',
  // Le foto dei post veri di Alma Living (profilo Instagram del negozio).
  'ig-assaggio':
    'Camera con testiera capitonné e copriletto rosa con balza di pizzo, una donna legge sul letto',
  'ig-conchiglie': 'Vasi in ceramica a forma di conchiglia con piante grasse, su un tavolo di legno',
  'ig-spoiler':
    'Scaffali del negozio con biancheria piegata, tovaglie a quadretti e diffusori per la casa',
  'ig-angolo-bimbi':
    'Scaffale del negozio con cuscini a righe, biancheria rosa e prodotti per i più piccoli',
  'ig-tavola-1':
    'Tavola apparecchiata in negozio con piatti a spirale grigi e bicchieri, davanti agli scaffali',
  'ig-tavola-2': 'Piatti con decoro a spirale grigio e una ciotola sul tavolo del negozio',
  'ig-tavola-estate': 'Ciotole di legno decorate, vassoi con piastrelle blu e posate di legno',
  'ig-erbolinea':
    'Flaconi di essenze per il bucato su un vassoio di legno, davanti a una finestra ad arco',
  'ig-beach-therapy': 'Telo mare a righe verde menta e borsa Beach Therapy sulla spiaggia',
  'ig-autunno':
    'Camera con testiera capitonné bianca, copriletto trapuntato rosa cipria e carta da parati a fiori',
  'ig-parure-1': 'Letto matrimoniale con parure copripiumino a piccole macchie su fondo beige',
  'ig-parure-2': 'Letto matrimoniale con parure copripiumino maculata nei toni del marrone',
  'ig-parure-3': 'Letto con parure copripiumino a quadri beige, panna e rosso',
  'ig-parure-4': 'Letto con parure copripiumino a motivo geometrico blu e bianco',
  'ig-parure-5': 'Letto con copripiumino in jersey di cotone verde',
  'ig-cuscini-1': 'Divano con cuscini natalizi rossi, bianchi e verdi con alberelli in rilievo',
  'ig-cuscini-2': 'Divano con cuscini natalizi ad alberelli e un plaid rosso con fiocchi di neve',
  'ig-cuscini-3': 'Sei cuscini con gattini natalizi stampati',
  'ig-cuscini-4': 'Cuscini con baite innevate e boschi di abeti su un divano chiaro',
} as const;

export type NomeFoto = keyof typeof ALT;

/** Una foto con il suo testo alternativo e il punto da tenere al centro del taglio. */
export interface Scatto {
  foto: NomeFoto;
  alt: string;
  /** `object-position` CSS, per esempio `50% 40%`. */
  posizione: string;
}

function scatto(foto: NomeFoto, posizione = '50% 50%'): Scatto {
  return { foto, alt: ALT[foto], posizione };
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

// --- Storie ---

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

function fotoStoria(
  foto: NomeFoto,
  posizione: string,
  testo: string,
  soggetto: string,
): FotoStoria {
  return { ...scatto(foto, posizione), testo, soggetto };
}

/** Le storie della fila sotto l'header. */
export const storie: Storia[] = [
  {
    id: 'oggi',
    nome: 'Oggi',
    etichetta: 'Oggi',
    data: '28 ottobre',
    invito: 'whatsapp',
    foto: [
      fotoStoria(
        'scaffale',
        '50% 45%',
        'La parete dei plaid è pronta: bianchi, rosa e grigi, con i cuscini in pelo.',
        'la parete dei plaid',
      ),
      fotoStoria(
        'camera-rosa',
        '50% 50%',
        'Nell’angolo romantico è arrivato il copriletto trapuntato rosa, con i cuscini abbinati.',
        'il copriletto trapuntato rosa',
      ),
    ],
  },
  {
    id: 'arrivi',
    nome: 'Arrivi',
    etichetta: 'Nuovo',
    data: '27 ottobre',
    invito: 'whatsapp',
    foto: [
      fotoStoria(
        'plaid-rosso',
        '50% 45%',
        'Sono arrivati i plaid delle feste, rossi e verdi, con le frange lunghe.',
        'i plaid delle feste',
      ),
      fotoStoria(
        'abbracciami-rosso',
        '50% 40%',
        'E gli Abbracciami in rosso e marrone: il regalo per chi sente sempre freddo.',
        'gli Abbracciami rossi e marroni',
      ),
    ],
  },
  {
    id: 'vetrina',
    nome: 'Vetrina',
    data: '25 ottobre',
    invito: 'indicazioni',
    foto: [
      fotoStoria(
        'gnomi',
        '50% 50%',
        'In vetrina sono comparsi gli gnomi di stoffa. Ognuno ha la sua faccia e il suo cappello.',
        'gli gnomi di stoffa',
      ),
      fotoStoria(
        'cuori',
        '50% 45%',
        'Accanto, i cuori dorati sulle basi di legno e le stelle rosse.',
        'i cuori dorati',
      ),
    ],
  },
  {
    id: 'casette',
    nome: 'Casette',
    data: '24 ottobre',
    invito: 'whatsapp',
    foto: [
      fotoStoria(
        'asciugamano-rosso',
        '50% 50%',
        'Asciugamani con la casetta ricamata: rosso per le feste.',
        'l’asciugamano rosso con la casetta',
      ),
      fotoStoria(
        'asciugamano-verde',
        '50% 50%',
        'Verde per chi ama il bosco. E c’è anche il bianco, per tutto l’anno.',
        'l’asciugamano verde con la casetta',
      ),
    ],
  },
  {
    id: 'candele',
    nome: 'Candele',
    data: '22 ottobre',
    invito: 'indicazioni',
    foto: [
      fotoStoria(
        'candele',
        '50% 55%',
        'Candele alla vaniglia nelle ciotole di legno, con lo spago e il cartellino.',
        'le candele alla vaniglia',
      ),
    ],
  },
  {
    id: 'bimbi',
    nome: 'Bimbi',
    data: '20 ottobre',
    invito: 'chiama',
    foto: [
      fotoStoria(
        'neonato',
        '50% 40%',
        'Accappatoi con il cappuccio e l’orsetto ricamato, per i più piccoli di casa.',
        'gli accappatoi con l’orsetto',
      ),
      fotoStoria(
        'accappatoi-appesi',
        '50% 40%',
        'In rosa, bianco e azzurro. Belli anche da regalare per una nascita.',
        'gli accappatoi rosa, bianchi e azzurri',
      ),
    ],
  },
  {
    id: 'tavola',
    nome: 'Tavola',
    data: '18 ottobre',
    invito: 'whatsapp',
    foto: [
      fotoStoria(
        'tovaglia-volant',
        '50% 50%',
        'La tovaglia color lino con il volant e il profilo rosso.',
        'la tovaglia con il volant',
      ),
      fotoStoria(
        'tavola',
        '40% 50%',
        'E la tavola delle domeniche lunghe, quando nessuno ha fretta di alzarsi.',
        'la tavola delle domeniche',
      ),
    ],
  },
  {
    id: 'lenzuola',
    nome: 'Lenzuola',
    data: '15 ottobre',
    invito: 'whatsapp',
    foto: [
      fotoStoria(
        'lenzuola-beige',
        '50% 45%',
        'Lenzuola color sabbia: stanno bene con il bianco e con il rosa cipria.',
        'le lenzuola color sabbia',
      ),
      fotoStoria(
        'volant',
        '50% 50%',
        'E le parure bianche con il volant, piegate per colore sugli scaffali.',
        'le parure con il volant',
      ),
    ],
  },
];

// --- Categorie degli articoli ---

export type Categoria = 'letto' | 'bagno' | 'bimbi' | 'tavola' | 'profumi' | 'natale' | 'mare';

/** Le categorie, nell'ordine dei filtri della selezione. */
export const categorie: { id: Categoria; nome: string }[] = [
  { id: 'letto', nome: 'Letto' },
  { id: 'bagno', nome: 'Bagno' },
  { id: 'bimbi', nome: 'Bimbi' },
  { id: 'tavola', nome: 'Tavola e cucina' },
  { id: 'profumi', nome: 'Profumi per la casa' },
  { id: 'natale', nome: 'Natale e regali' },
  { id: 'mare', nome: 'Mare' },
];

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

/** Il secondo scatto come dettaglio ingrandito di `base`, che ne tiene la posizione. */
function ingrandito(base: Scatto, origine: string, alt: string): ScattoArticolo {
  return { ...base, alt, ingrandimento: { scala: SCALA_DETTAGLIO, origine } };
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

export const articoli: Articolo[] = [
  {
    id: 'sabbia',
    nome: 'Lenzuola color sabbia',
    dettaglio: 'Cotone con balza bianca · matrimoniale',
    categorie: ['letto'],
    novita: true,
    scatti: [
      scatto('lenzuola-beige', '50% 40%'),
      ingrandito(
        scatto('lenzuola-beige', '50% 40%'),
        '40% 68%',
        'Dettaglio della balza bianca sulle lenzuola color sabbia',
      ),
    ],
  },
  {
    id: 'abbracciami',
    nome: 'Plaid Abbracciami',
    dettaglio: 'Pile ricamato con frange, verde o rosso',
    categorie: ['natale', 'letto'],
    novita: true,
    scatti: [scatto('abbracciami-verde', '50% 58%'), scatto('abbracciami-rosso', '50% 40%')],
    colori: [
      { nome: 'verde', tinta: '#5e654f', foto: scatto('abbracciami-verde', '50% 58%') },
      { nome: 'rosso', tinta: '#b8263a', foto: scatto('abbracciami-rosso', '50% 40%') },
    ],
  },
  {
    id: 'orsetto',
    nome: 'Accappatoio con orsetto',
    dettaglio: 'Con cappuccio · rosa, sabbia o azzurro',
    categorie: ['bimbi', 'bagno'],
    novita: false,
    scatti: [scatto('neonato', '50% 40%'), scatto('accappatoi-appesi', '50% 30%')],
    // Senza una foto per colore: la scheda rapida tiene i due scatti.
    colori: [
      { nome: 'rosa', tinta: '#ddb3b8' },
      { nome: 'sabbia', tinta: '#cdb896' },
      { nome: 'azzurro', tinta: '#a9c7e0' },
    ],
  },
  {
    id: 'volant',
    nome: 'Parure con volant',
    dettaglio: 'Bianco e panna, copriletto a rilievo',
    categorie: ['letto'],
    novita: false,
    scatti: [scatto('volant'), scatto('trapunta')],
  },
  {
    id: 'casetta',
    nome: 'Asciugamano con casetta',
    dettaglio: 'Spugna ricamata · rosso, bianco o verde',
    categorie: ['bagno', 'natale'],
    novita: true,
    scatti: [scatto('asciugamano-rosso'), scatto('asciugamano-verde')],
    colori: [
      { nome: 'rosso', tinta: '#a62630', foto: scatto('asciugamano-rosso') },
      { nome: 'bianco', tinta: '#f4f1ea', foto: scatto('asciugamano-bianco') },
      { nome: 'verde', tinta: '#2f5734', foto: scatto('asciugamano-verde') },
    ],
  },
  {
    id: 'tovaglia',
    nome: 'Tovaglia con volant',
    dettaglio: 'Effetto lino con profilo rosso',
    categorie: ['tavola'],
    novita: false,
    scatti: [
      scatto('tovaglia-volant'),
      ingrandito(
        scatto('tovaglia-volant'),
        '63% 48%',
        'Dettaglio del volant e del profilo rosso della tovaglia',
      ),
    ],
  },
  {
    id: 'coperta',
    nome: 'Coperta in maglia',
    dettaglio: 'Grigia, chiusa con fiocco e bottone',
    categorie: ['letto', 'natale'],
    novita: false,
    scatti: [
      scatto('coperta'),
      ingrandito(
        scatto('coperta'),
        '54% 45%',
        'Dettaglio del fiocco e del cartellino sulla coperta in maglia',
      ),
    ],
  },
  {
    id: 'saponi',
    nome: 'Saponi e profumi',
    dettaglio: 'Saponette e diffusori per la casa',
    categorie: ['profumi', 'bagno'],
    novita: false,
    scatti: [
      scatto('bagno-prodotti', '50% 72%'),
      ingrandito(
        scatto('bagno-prodotti', '50% 72%'),
        '70% 64%',
        'Dettaglio del cesto di saponi legato con lo spago e il cartellino',
      ),
    ],
  },
];

// --- Post del diario: i post veri di Alma Living, dal più recente ---

export interface Post {
  /** Unico nella pagina: lo usano il pulsante della griglia e il suo dialog. */
  id: string;
  data: string;
  /**
   * Di che cosa parla il post, nel messaggio WhatsApp: comincia con la
   * preposizione articolata ("sui cuscini di Natale"), che si legge dopo la data
   * ("…il vostro post del 28 ottobre sui cuscini di Natale").
   */
  chiedi: string;
  testo: string;
  foto: Scatto[];
}

/** Quanti post si vedono nella griglia prima di "Mostra altri post". */
export const POST_VISIBILI = 9;

export const post: Post[] = [
  {
    id: 'p1',
    data: '28 ottobre',
    chiedi: 'sui cuscini di Natale',
    testo:
      'Sono arrivati i cuscini di Natale. Brinì, in jacquard con gli alberelli in punto spugna: copricuscino 45 x 45 in rosso, bianco, beige e verde, oppure cuscino imbottito 30 x 50. Meid, con baite innevate e boschi, negli stessi due formati, in rosso, beige e verde. E per chi ama i gatti, Zigrì: cotone stampato fronte e retro.',
    foto: [
      scatto('ig-cuscini-1'),
      scatto('ig-cuscini-2'),
      scatto('ig-cuscini-3'),
      scatto('ig-cuscini-4'),
    ],
  },
  {
    id: 'p2',
    data: '27 ottobre',
    chiedi: 'sulle nuove parure',
    testo:
      'Nuove parure copripiumino matrimoniali in puro cotone: Vara in percallino; Rudy, maculata, in grigio o marrone; i quadri in cotone tinto in filo; il motivo geometrico in grigio, blu e tortora. E Antigua, il copripiumino in jersey che non si stira, in nove colori: bianco, naturale, fumo, salvia, sabbia, grigio, ottanio, bordeaux e blu.',
    foto: [
      scatto('ig-parure-1'),
      scatto('ig-parure-2'),
      scatto('ig-parure-3'),
      scatto('ig-parure-4'),
      scatto('ig-parure-5'),
    ],
  },
  {
    id: 'p3',
    data: '11 ottobre',
    chiedi: 'sui plaid',
    testo:
      'L’inverno è alle porte e torna la voglia di casa. Soffici, caldi, avvolgenti: abbiamo scelto quattro plaid per le serate sul divano. Vi aspettiamo in negozio per scegliere il vostro.',
    foto: [scatto('scaffale'), scatto('copriletto-rosso'), scatto('mare'), scatto('coperta')],
  },
  {
    id: 'p4',
    data: '31 agosto',
    chiedi: 'sulle novità d’autunno',
    testo:
      'È bello cominciare a sognare un po’ in anticipo. A metà settembre arrivano tante novità per vestire la casa con le sfumature calde dell’autunno, e le prime idee per le feste.',
    foto: [scatto('ig-autunno')],
  },
  {
    id: 'p5',
    data: '15 luglio',
    chiedi: 'sulla linea Beach Therapy',
    testo:
      'La collezione Beach Therapy si allarga: oltre al verde menta ci sono il grigio chiaro e il beige. Potete prendere il set da tre pezzi o i singoli articoli.',
    foto: [scatto('ig-beach-therapy')],
  },
  {
    id: 'p6',
    data: '8 luglio',
    chiedi: 'sulle essenze per il bucato',
    testo:
      'Sono arrivate le essenze concentrate per il bucato di Erbolinea Prestige Fragrances: profumi intensi che durano giorni e riempiono la casa di fresco. Tante fragranze e diversi formati, per lavatrice, asciugatrice e lavaggio a mano. Passate a provarle.',
    foto: [scatto('ig-erbolinea')],
  },
  {
    id: 'p7',
    data: '8 luglio',
    chiedi: 'sul tris di asciugamani',
    testo:
      'Il tris di asciugamani, ospite, viso e telo, con la balza in puro lino. Fatto in Toscana, in tante sfumature: celeste, rosa, verde salvia, grigio.',
    foto: [scatto('bagno')],
  },
  {
    id: 'p8',
    data: '3 luglio',
    chiedi: 'sulla tavola d’estate',
    testo:
      'Voglia d’estate anche a tavola? Legno caldo e ceramiche decorate, per rinnovare la tavola dei pranzi estivi.',
    foto: [scatto('ig-tavola-estate')],
  },
  {
    id: 'p9',
    data: '19 giugno',
    chiedi: 'sui piatti per la tavola',
    testo:
      'Un nuovo arrivo in negozio che sa di colazioni lente, domeniche in famiglia e chiacchiere attorno alla tavola.',
    foto: [scatto('ig-tavola-1'), scatto('ig-tavola-2')],
  },
  {
    id: 'p10',
    data: '15 giugno',
    chiedi: 'sui prodotti per i più piccoli',
    testo: 'Un piccolo angolo dedicato anche ai più piccoli.',
    foto: [scatto('ig-angolo-bimbi')],
  },
  {
    id: 'p11',
    data: '10 giugno',
    chiedi: 'sugli scaffali del negozio',
    testo:
      'Ogni dettaglio sta prendendo il suo posto. Un piccolo spoiler di quello che vi aspetta da Alma Living. Ci vediamo sabato.',
    foto: [scatto('ig-spoiler')],
  },
  {
    id: 'p12',
    data: '28 maggio',
    chiedi: 'sulle conchiglie in ceramica',
    testo:
      'Ogni pezzo è una storia unica: le conchiglie artigianali di Ceramica Viva racchiudono la bellezza del design fatto a mano. Noi stiamo sistemando gli ultimi dettagli per l’apertura, voi cominciate a scegliere la vostra preferita.',
    foto: [scatto('ig-conchiglie')],
  },
  {
    id: 'p13',
    data: '30 aprile',
    chiedi: 'su quello che sta arrivando',
    testo:
      'Un assaggio di ciò che sta arrivando: dettagli che fanno casa, atmosfere da vivere. Quasi pronti ad accogliervi.',
    foto: [scatto('ig-assaggio')],
  },
];

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

export function messaggioPost(voce: Post): string {
  return `Buongiorno, ho visto sul sito il vostro post ${delData(voce.data)} ${voce.chiedi}. Mi date qualche informazione in più?`;
}
