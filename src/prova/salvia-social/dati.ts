// Contenuti della variante Salvia social. Apertura, storie, collezioni e selezione
// sono esempi trascritti da `renderVals()` della tavola `SalviaSocial.dc.html`
// (tela di Claude Design) e aggiornati alla versione 3, la tavola
// `DiarioFascia.dc.html` (messaggi dei post con la preposizione articolata, diario
// dopo la selezione). I post del diario sono invece i 13 post veri del profilo
// Instagram di Alma Living (didascalie senza emoji né promozioni scadute).
// Le foto sono indicate per nome (`src/prova/foto/<nome>.jpg`, vedi
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
  'letto-giardino': 'Letto bianco allestito in giardino',
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

/** Le sezioni della pagina, per la navigazione dell'header e del piè di pagina. */
export const sezioni = [
  { nome: 'Collezioni', href: '#collezioni' },
  { nome: 'Selezione', href: '#selezione' },
  { nome: 'Dal negozio', href: '#diario' },
  { nome: 'Il negozio', href: '#negozio' },
] as const;

/** La foto dello scaffale nella sezione del negozio. */
export const fotoDelNegozio: Scatto = scatto('scaffale');

// --- Apertura: le tre foto che scorrono, ognuna con la sua frase ---

export interface Diapositiva extends Scatto {
  testo: string;
}

export const apertura: Diapositiva[] = [
  {
    ...scatto('righe-rosa', '50% 34%'),
    testo:
      'In vetrina oggi c’è la camera a righe rosa: lenzuola, federe e copriletto abbinati. Dal vivo il rosa è ancora più delicato.',
  },
  {
    ...scatto('letto-giardino', '50% 62%'),
    testo:
      'Abbiamo portato un letto in giardino per fotografare le lenzuola bianche nuove. In negozio le trovate piegate, pronte da portare a casa.',
  },
  {
    ...scatto('trapunta'),
    testo:
      'Il trapuntato bianco visto da vicino: leggero, caldo il giusto, perfetto per le sere di fine ottobre.',
  },
];

// --- Storie ---

export interface FotoStoria extends Scatto {
  testo: string;
}

export interface Storia {
  /** Unico nella pagina: lo usano i pulsanti che aprono la storia. */
  id: string;
  nome: string;
  /** Etichetta sul cerchio ("Oggi", "Nuovo"). */
  etichetta?: string;
  data: string;
  foto: FotoStoria[];
}

function fotoStoria(foto: NomeFoto, posizione: string, testo: string): FotoStoria {
  return { ...scatto(foto, posizione), testo };
}

/** Le storie della fila sotto l'header. */
export const storie: Storia[] = [
  {
    id: 'oggi',
    nome: 'Oggi',
    etichetta: 'Oggi',
    data: '28 ottobre',
    foto: [
      fotoStoria(
        'scaffale',
        '50% 45%',
        'Buongiorno da Via Ricasoli. La parete dei plaid è pronta: bianchi, rosa e grigi, con i cuscini in pelo.',
      ),
      fotoStoria(
        'camera-rosa',
        '50% 50%',
        'Nell’angolo romantico è arrivato il copriletto trapuntato rosa, con i cuscini abbinati.',
      ),
    ],
  },
  {
    id: 'arrivi',
    nome: 'Arrivi',
    etichetta: 'Nuovo',
    data: '27 ottobre',
    foto: [
      fotoStoria(
        'plaid-rosso',
        '50% 45%',
        'Sono arrivati i plaid delle feste, rossi e verdi, con le frange lunghe.',
      ),
      fotoStoria(
        'abbracciami-rosso',
        '50% 40%',
        'E gli Abbracciami in rosso e marrone: il regalo per chi sente sempre freddo.',
      ),
    ],
  },
  {
    id: 'vetrina',
    nome: 'Vetrina',
    data: '25 ottobre',
    foto: [
      fotoStoria(
        'gnomi',
        '50% 50%',
        'In vetrina sono comparsi gli gnomi di stoffa. Ognuno ha la sua faccia e il suo cappello.',
      ),
      fotoStoria('cuori', '50% 45%', 'Accanto, i cuori dorati sulle basi di legno e le stelle rosse.'),
    ],
  },
  {
    id: 'casette',
    nome: 'Casette',
    data: '24 ottobre',
    foto: [
      fotoStoria(
        'asciugamano-rosso',
        '50% 50%',
        'Asciugamani con la casetta ricamata: rosso per le feste.',
      ),
      fotoStoria(
        'asciugamano-verde',
        '50% 50%',
        'Verde per chi ama il bosco. E c’è anche il bianco, per tutto l’anno.',
      ),
    ],
  },
  {
    id: 'candele',
    nome: 'Candele',
    data: '22 ottobre',
    foto: [
      fotoStoria(
        'candele',
        '50% 55%',
        'Candele alla vaniglia nelle ciotole di legno, con lo spago e il cartellino.',
      ),
    ],
  },
  {
    id: 'bimbi',
    nome: 'Bimbi',
    data: '20 ottobre',
    foto: [
      fotoStoria(
        'neonato',
        '50% 40%',
        'Accappatoi con il cappuccio e l’orsetto ricamato, per i più piccoli di casa.',
      ),
      fotoStoria(
        'accappatoi-appesi',
        '50% 40%',
        'In rosa, bianco e azzurro. Belli anche da regalare per una nascita.',
      ),
    ],
  },
  {
    id: 'tavola',
    nome: 'Tavola',
    data: '18 ottobre',
    foto: [
      fotoStoria(
        'tovaglia-volant',
        '50% 50%',
        'La tovaglia color lino con il volant e il profilo rosso.',
      ),
      fotoStoria(
        'tavola',
        '40% 50%',
        'E la tavola delle domeniche lunghe, quando nessuno ha fretta di alzarsi.',
      ),
    ],
  },
  {
    id: 'lenzuola',
    nome: 'Lenzuola',
    data: '15 ottobre',
    foto: [
      fotoStoria(
        'lenzuola-beige',
        '50% 45%',
        'Lenzuola color sabbia: stanno bene con il bianco e con il rosa cipria.',
      ),
      fotoStoria(
        'volant',
        '50% 50%',
        'E le parure bianche con il volant, piegate per colore sugli scaffali.',
      ),
    ],
  },
];

// --- Collezioni e categorie degli articoli ---

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

export interface Stanza extends Scatto {
  id: Categoria;
  nome: string;
  frase: string;
}

/** Le collezioni per stanza: quattro riquadri di misure diverse, in quest'ordine. */
export const collezioni: Stanza[] = [
  {
    id: 'letto',
    nome: 'Per il letto',
    frase: 'Lenzuola, copriletti trapuntati e volant, dal bianco al rosa cipria.',
    ...scatto('camera-rosa', '50% 55%'),
  },
  {
    id: 'bagno',
    nome: 'Per il bagno',
    frase: 'Spugne morbide, accappatoi e set legati con lo spago.',
    ...scatto('bagno', '50% 58%'),
  },
  {
    id: 'tavola',
    nome: 'Per la tavola',
    frase: 'Tovaglie con il volant, runner e cuscini per le sedie.',
    ...scatto('tavola', '40% 55%'),
  },
  {
    id: 'bimbi',
    nome: 'Per i piccoli',
    frase: 'Accappatoi con il cappuccio e asciugamani ricamati.',
    ...scatto('accappatoi-appesi', '50% 24%'),
  },
];

export interface AltraCollezione extends Scatto {
  id: Categoria;
  nome: string;
}

/** Le pillole "In negozio trovi anche". */
export const altreCollezioni: AltraCollezione[] = [
  { id: 'profumi', nome: 'Profumi per la casa', ...scatto('candele', '50% 60%') },
  { id: 'natale', nome: 'Natale e regali', ...scatto('gnomi', '50% 45%') },
  { id: 'mare', nome: 'Mare', ...scatto('mare', '50% 60%') },
];

// --- Selezione dal negozio ---

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

/**
 * Quante schede della selezione si vedono prima di "Mostra tutti", per misura
 * (protocollo "Limite"): 4 sul telefono (due colonne), 6 sul tablet (tre
 * colonne), nessun limite da 1024 px (il carosello). Le media query di
 * `Selezione.astro` (e di `SchedaArticolo.astro`) sono le stesse: vanno
 * cambiate insieme.
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
  },
  {
    id: 'orsetto',
    nome: 'Accappatoio con orsetto',
    dettaglio: 'Con cappuccio · rosa, sabbia o azzurro',
    categorie: ['bimbi', 'bagno'],
    novita: false,
    scatti: [scatto('neonato', '50% 40%'), scatto('accappatoi-appesi', '50% 30%')],
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
  rubrica: string;
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
    rubrica: 'Arrivi',
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
    rubrica: 'Arrivi',
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
    rubrica: 'In vetrina',
    chiedi: 'sui plaid',
    testo:
      'L’inverno è alle porte e torna la voglia di casa. Soffici, caldi, avvolgenti: abbiamo scelto quattro plaid per le serate sul divano. Vi aspettiamo in negozio per scegliere il vostro.',
    foto: [scatto('scaffale'), scatto('copriletto-rosso'), scatto('mare'), scatto('coperta')],
  },
  {
    id: 'p4',
    data: '31 agosto',
    rubrica: 'Arrivi',
    chiedi: 'sulle novità d’autunno',
    testo:
      'È bello cominciare a sognare un po’ in anticipo. A metà settembre arrivano tante novità per vestire la casa con le sfumature calde dell’autunno, e le prime idee per le feste.',
    foto: [scatto('ig-autunno')],
  },
  {
    id: 'p5',
    data: '15 luglio',
    rubrica: 'Arrivi',
    chiedi: 'sulla linea Beach Therapy',
    testo:
      'La collezione Beach Therapy si allarga: oltre al verde menta ci sono il grigio chiaro e il beige. Potete prendere il set da tre pezzi o i singoli articoli.',
    foto: [scatto('ig-beach-therapy')],
  },
  {
    id: 'p6',
    data: '8 luglio',
    rubrica: 'Arrivi',
    chiedi: 'sulle essenze per il bucato',
    testo:
      'Sono arrivate le essenze concentrate per il bucato di Erbolinea Prestige Fragrances: profumi intensi che durano giorni e riempiono la casa di fresco. Tante fragranze e diversi formati, per lavatrice, asciugatrice e lavaggio a mano. Passate a provarle.',
    foto: [scatto('ig-erbolinea')],
  },
  {
    id: 'p7',
    data: '8 luglio',
    rubrica: 'Dettagli',
    chiedi: 'sul tris di asciugamani',
    testo:
      'Il tris di asciugamani, ospite, viso e telo, con la balza in puro lino. Fatto in Toscana, in tante sfumature: celeste, rosa, verde salvia, grigio.',
    foto: [scatto('bagno')],
  },
  {
    id: 'p8',
    data: '3 luglio',
    rubrica: 'Dettagli',
    chiedi: 'sulla tavola d’estate',
    testo:
      'Voglia d’estate anche a tavola? Legno caldo e ceramiche decorate, per rinnovare la tavola dei pranzi estivi.',
    foto: [scatto('ig-tavola-estate')],
  },
  {
    id: 'p9',
    data: '19 giugno',
    rubrica: 'Arrivi',
    chiedi: 'sui piatti per la tavola',
    testo:
      'Un nuovo arrivo in negozio che sa di colazioni lente, domeniche in famiglia e chiacchiere attorno alla tavola.',
    foto: [scatto('ig-tavola-1'), scatto('ig-tavola-2')],
  },
  {
    id: 'p10',
    data: '15 giugno',
    rubrica: 'Dietro il banco',
    chiedi: 'sui prodotti per i più piccoli',
    testo: 'Un piccolo angolo dedicato anche ai più piccoli.',
    foto: [scatto('ig-angolo-bimbi')],
  },
  {
    id: 'p11',
    data: '10 giugno',
    rubrica: 'Dietro il banco',
    chiedi: 'sugli scaffali del negozio',
    testo:
      'Ogni dettaglio sta prendendo il suo posto. Un piccolo spoiler di quello che vi aspetta da Alma Living. Ci vediamo sabato.',
    foto: [scatto('ig-spoiler')],
  },
  {
    id: 'p12',
    data: '28 maggio',
    rubrica: 'Dettagli',
    chiedi: 'sulle conchiglie in ceramica',
    testo:
      'Ogni pezzo è una storia unica: le conchiglie artigianali di Ceramica Viva racchiudono la bellezza del design fatto a mano. Noi stiamo sistemando gli ultimi dettagli per l’apertura, voi cominciate a scegliere la vostra preferita.',
    foto: [scatto('ig-conchiglie')],
  },
  {
    id: 'p13',
    data: '30 aprile',
    rubrica: 'Dietro il banco',
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
  /** La tessera "In negozio c’è molto di più" in fondo alla selezione. */
  cerco: 'Buongiorno, vi scrivo dal sito: sto cercando ',
  /** La tessera che sostituisce la selezione quando un filtro non ha articoli. */
  mare: 'Buongiorno, avete ancora qualcosa della collezione mare?',
};

export function messaggioStoria(storia: Storia): string {
  return `Buongiorno, ho visto la storia «${storia.nome}» sul sito. `;
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
