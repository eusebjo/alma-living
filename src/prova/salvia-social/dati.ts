// Contenuti di esempio della variante Salvia social, trascritti da
// `renderVals()` della tavola `SalviaSocial.dc.html` (tela di Claude Design).
// Le foto sono indicate per nome (`src/prova/foto/<nome>.jpg`, vedi
// `scripts/foto-prova/elenco.json`); i componenti le passano a `foto()`.
// Nessun import da Astro: questo file lo leggono anche i test sul sito generato.

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
  { nome: 'Dal negozio', href: '#diario' },
  { nome: 'Selezione', href: '#selezione' },
  { nome: 'Il negozio', href: '#negozio' },
] as const;

/** La foto dello scaffale nella sezione del negozio. */
export const fotoDelNegozio: Scatto = scatto('scaffale');

// --- Apertura: le tre foto che scorrono, ognuna con la frase di Martina ---

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

/** Le storie in evidenza del profilo di Martina. */
export const storieInEvidenza: Storia[] = [
  {
    id: 'confezioni',
    nome: 'Confezioni',
    etichetta: 'Nuovo',
    data: '26 ottobre',
    foto: [
      fotoStoria(
        'asciugamano-bianco',
        '50% 50%',
        'Ogni regalo esce dal negozio con lo spago e il cartellino scritto a mano.',
      ),
      fotoStoria(
        'candele',
        '50% 55%',
        'Anche le cose piccole: una candela, un sapone, un biglietto.',
      ),
    ],
  },
  {
    id: 'il-negozio',
    nome: 'Il negozio',
    data: '20 ottobre',
    foto: [
      fotoStoria(
        'scaffale',
        '50% 45%',
        'Gli scaffali bianchi fino al soffitto, pieni di biancheria piegata per colore.',
      ),
      fotoStoria(
        'bagno-prodotti',
        '50% 60%',
        'Il mobile di legno dei saponi e dei profumi per la casa.',
      ),
    ],
  },
  {
    id: 'natale',
    nome: 'Natale',
    data: '25 ottobre',
    foto: [
      fotoStoria(
        'plaid-verde',
        '50% 50%',
        'In negozio il Natale è già cominciato: plaid verdi e decorazioni.',
      ),
      fotoStoria('gnomi', '50% 50%', 'Gli gnomi di stoffa vi aspettano sull’alzata.'),
      fotoStoria(
        'copriletto-rosso',
        '50% 50%',
        'E il copriletto rosso con il volant, per la camera delle feste.',
      ),
    ],
  },
  {
    id: 'letto',
    nome: 'Letto',
    data: '12 ottobre',
    foto: [
      fotoStoria(
        'righe-rosa',
        '50% 40%',
        'Righe rosa e copriletto abbinato: a volte, per cambiare la camera, basta il letto.',
      ),
      fotoStoria(
        'camera-rosa',
        '50% 50%',
        'Testiera capitonné e trapuntato rosa, per chi ama le camere romantiche.',
      ),
      fotoStoria(
        'trapunta',
        '50% 50%',
        'Il trapuntato bianco visto da vicino: leggero e caldo il giusto.',
      ),
    ],
  },
  {
    id: 'bagno',
    nome: 'Bagno',
    data: '8 ottobre',
    foto: [
      fotoStoria(
        'bagno',
        '45% 50%',
        'Asciugamani piegati, un accappatoio morbido e tanta luce: il bagno come piace a noi.',
      ),
      fotoStoria(
        'bagno-prodotti',
        '50% 60%',
        'E per finire, saponi e profumi sul mobile di legno.',
      ),
    ],
  },
  {
    id: 'mare',
    nome: 'Mare',
    data: '28 settembre',
    foto: [
      fotoStoria(
        'mare',
        '50% 55%',
        'Lenzuola e plaid in riva al mare: a Livorno anche la biancheria sa di sale. Tornano in primavera.',
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

export interface Articolo extends Scatto {
  /** Unico nella pagina: lo usano "Chiedi disponibilità" e il suo pannello. */
  id: string;
  nome: string;
  dettaglio: string;
  /** La prima dà il nome della categoria mostrato sulla scheda. */
  categorie: Categoria[];
  novita: boolean;
}

export const articoli: Articolo[] = [
  {
    id: 'sabbia',
    nome: 'Lenzuola color sabbia',
    dettaglio: 'Cotone con balza bianca · matrimoniale',
    categorie: ['letto'],
    novita: true,
    ...scatto('lenzuola-beige', '50% 40%'),
  },
  {
    id: 'abbracciami',
    nome: 'Plaid Abbracciami',
    dettaglio: 'Pile ricamato con frange, verde o rosso',
    categorie: ['natale', 'letto'],
    novita: true,
    ...scatto('abbracciami-verde', '50% 58%'),
  },
  {
    id: 'orsetto',
    nome: 'Accappatoio con orsetto',
    dettaglio: 'Con cappuccio · rosa, sabbia o azzurro',
    categorie: ['bimbi', 'bagno'],
    novita: false,
    ...scatto('neonato', '50% 40%'),
  },
  {
    id: 'volant',
    nome: 'Parure con volant',
    dettaglio: 'Bianco e panna, copriletto a rilievo',
    categorie: ['letto'],
    novita: false,
    ...scatto('volant'),
  },
  {
    id: 'casetta',
    nome: 'Asciugamano con casetta',
    dettaglio: 'Spugna ricamata · rosso, bianco o verde',
    categorie: ['bagno', 'natale'],
    novita: true,
    ...scatto('asciugamano-rosso'),
  },
  {
    id: 'tovaglia',
    nome: 'Tovaglia con volant',
    dettaglio: 'Effetto lino con profilo rosso',
    categorie: ['tavola'],
    novita: false,
    ...scatto('tovaglia-volant'),
  },
  {
    id: 'coperta',
    nome: 'Coperta in maglia',
    dettaglio: 'Grigia, chiusa con fiocco e bottone',
    categorie: ['letto', 'natale'],
    novita: false,
    ...scatto('coperta'),
  },
  {
    id: 'saponi',
    nome: 'Saponi e profumi',
    dettaglio: 'Saponette e diffusori per la casa',
    categorie: ['profumi', 'bagno'],
    novita: false,
    ...scatto('bagno-prodotti', '50% 72%'),
  },
];

// --- Post del profilo di Martina ---

export interface Post {
  /** Unico nella pagina: lo usano il pulsante della griglia e il suo dialog. */
  id: string;
  data: string;
  rubrica: string;
  /** Di che cosa parla il post, nel messaggio WhatsApp ("…il vostro post del 27 ottobre su <chiedi>"). */
  chiedi: string;
  testo: string;
  foto: Scatto[];
}

/** Quanti post si vedono nella griglia prima di "Mostra altri post". */
export const POST_VISIBILI = 9;

export const post: Post[] = [
  {
    id: 'p1',
    data: '27 ottobre',
    rubrica: 'Arrivi',
    chiedi: 'i plaid delle feste',
    testo:
      'Sono arrivati i plaid delle feste: rossi, verdi e gli Abbracciami con la scritta ricamata. Sono morbidissimi, passate a toccarli.',
    foto: [
      scatto('plaid-rosso', '50% 45%'),
      scatto('plaid-verde', '50% 50%'),
      scatto('abbracciami-rosso', '50% 40%'),
    ],
  },
  {
    id: 'p2',
    data: '25 ottobre',
    rubrica: 'In vetrina',
    chiedi: 'gli gnomi di stoffa',
    testo:
      'La vetrina di Natale è cominciata con gli gnomi di stoffa sull’alzata bianca. Ognuno ha la sua faccia e il suo cappello.',
    foto: [scatto('gnomi', '50% 50%')],
  },
  {
    id: 'p3',
    data: '24 ottobre',
    rubrica: 'Confezioni',
    chiedi: 'gli asciugamani con la casetta',
    testo:
      'Asciugamani con la casetta ricamata, in bianco, verde e rosso. Ve li confezioniamo con lo spago e il cartellino, pronti da regalare.',
    foto: [
      scatto('asciugamano-bianco', '50% 50%'),
      scatto('asciugamano-verde', '50% 50%'),
      scatto('asciugamano-rosso', '50% 50%'),
    ],
  },
  {
    id: 'p4',
    data: '22 ottobre',
    rubrica: 'Dettagli',
    chiedi: 'i cuori dorati',
    testo:
      'Cuori dorati su basi di legno e stelle rosse di stoffa: piccoli pensieri per chi ha già tutto.',
    foto: [scatto('cuori', '50% 45%')],
  },
  {
    id: 'p5',
    data: '20 ottobre',
    rubrica: 'Dietro il banco',
    chiedi: 'la parete dei plaid',
    testo:
      'Abbiamo rifatto la parete dei plaid: bianchi, rosa e grigi, con i cuscini in pelo. Dal vivo viene voglia di toccarli tutti.',
    foto: [scatto('scaffale', '50% 45%')],
  },
  {
    id: 'p6',
    data: '18 ottobre',
    rubrica: 'Arrivi',
    chiedi: 'i copriletti',
    testo:
      'Rosso per le feste, bianco per tutto l’anno: copriletti con il volant e trapuntati morbidi, appena arrivati.',
    foto: [scatto('copriletto-rosso', '50% 50%'), scatto('trapunta', '50% 50%')],
  },
  {
    id: 'p7',
    data: '15 ottobre',
    rubrica: 'Dettagli',
    chiedi: 'le candele alla vaniglia',
    testo:
      'Candele alla vaniglia nelle ciotole di legno, legate con lo spago e con il cartellino. Un regalo piccolo e già pronto.',
    foto: [scatto('candele', '50% 60%')],
  },
  {
    id: 'p8',
    data: '13 ottobre',
    rubrica: 'Arrivi',
    chiedi: 'gli accappatoi per i più piccoli',
    testo:
      'Nuovi accappatoi e asciugamani per i più piccoli, con l’orsetto ricamato. In rosa, azzurro e bianco.',
    foto: [scatto('asciugamani-bimbo', '50% 45%'), scatto('neonato', '50% 40%')],
  },
  {
    id: 'p9',
    data: '10 ottobre',
    rubrica: 'In vetrina',
    chiedi: 'la tavola della domenica',
    testo:
      'In vetrina abbiamo apparecchiato la tavola della domenica: tovaglia color lino con il volant e il profilo rosso, sedie bianche.',
    foto: [scatto('tovaglia-volant', '50% 50%'), scatto('tavola', '40% 50%')],
  },
  {
    id: 'p10',
    data: '6 ottobre',
    rubrica: 'Dietro il banco',
    chiedi: 'i saponi e i profumi',
    testo:
      'Il mobile di legno dei saponi e dei profumi per la casa. Quando lo apriamo, profuma tutto il negozio.',
    foto: [scatto('bagno-prodotti', '50% 72%')],
  },
  {
    id: 'p11',
    data: '2 ottobre',
    rubrica: 'Arrivi',
    chiedi: 'le lenzuola color sabbia',
    testo:
      'Lenzuola color sabbia e parure bianche con il volant: stanno bene insieme, e anche con il rosa cipria.',
    foto: [scatto('lenzuola-beige', '50% 45%'), scatto('volant', '50% 50%')],
  },
  {
    id: 'p12',
    data: '28 settembre',
    rubrica: 'Dettagli',
    chiedi: 'la biancheria per il mare',
    testo:
      'Ultimi giorni di settembre: lenzuola e plaid piegati in riva al mare, prima di metterli via fino alla prossima estate.',
    foto: [scatto('mare', '50% 60%')],
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

export function messaggioPost(voce: Post): string {
  return `Buongiorno, ho visto sul sito il vostro post del ${voce.data} su ${voce.chiedi}. Mi date qualche informazione in più?`;
}
