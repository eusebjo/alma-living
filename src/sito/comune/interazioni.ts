// Script comune delle pagine di prova. Le varianti non hanno JavaScript proprio:
// scrivono il markup con attributi `data-*` (i "protocolli" qui sotto) e questo
// script lo fa funzionare, per delega sulla radice (un ascoltatore per tipo di
// evento, quanti che siano i pulsanti). Nessuna libreria.
//
// Lo stato sta nel DOM (`hidden`, `aria-*`, `data-*`): il CSS delle varianti lo
// legge da lì. Miglioramento progressivo: senza JavaScript la pagina si legge
// (i dialog restano chiusi, ma il loro contenuto è nell'HTML; fa eccezione il
// contenuto di `data-altro`, che è `hidden` finché lo script non lo mostra).
// Gli elementi nascosti con `hidden` non devono avere un `display` che lo vinca
// (`Interazioni.astro` aggiunge `[hidden] { display: none !important }`).
//
// Protocolli. Ogni `<x>` è un nome scelto dalla variante, uguale sui due lati.
//
// - Menu: `button[data-menu-apri][aria-controls]` apre e chiude il pannello
//   `[data-menu]` (con `hidden`) e aggiorna `aria-expanded`. Si chiude con Esc o
//   toccando un link del pannello. Il nome del pulsante non cambia con lo stato
//   (niente "Menu" che diventa "Chiudi"): lo stato lo dice `aria-expanded`.
// - Stato del negozio: `[data-stato-negozio][data-orari]` (JSON di `Fascia[]`):
//   il suo testo, che va tenuto solo per questo, diventa "Aperto ora, chiude
//   alle 19:30" e si aggiorna ogni minuto; porta anche `data-aperto="true|false"`
//   per colorare il puntino. `[data-orario-giorno="<giorno>"]`: la riga di oggi
//   (a Roma) riceve `data-oggi`.
// - Filtri: `[data-filtri="<nome>"]` con `button[data-filtro="<id>"]`
//   (`aria-pressed`; `tutti` non filtra); voci `[data-filtrabile="<nome>"]` con
//   `data-categorie="a b"`; `[data-filtro-vuoto="<nome>"]` si vede solo con zero
//   voci. Un filtro diverso da `tutti` mostra anche le voci piegate da "Mostra
//   altri" e ne nasconde il pulsante.
// - Interruttore: `button[data-interruttore]` con `aria-pressed="true|false"`: un
//   clic ne inverte il valore. Il resto lo fa il CSS della variante, che legge lo
//   stato (per esempio con `:has()` sul contenitore): lo script non sposta nulla.
//   Senza JavaScript il pulsante non fa nulla, e la variante lo nasconde con
//   `@media (scripting: none)`.
// - Galleria: `[data-galleria]` con `[data-galleria-foto]` (una alla volta, le
//   altre `hidden`), `button[data-galleria-prec|succ]` (a giro),
//   `button[data-galleria-punto]` (`aria-current`) e `[data-galleria-contatore]`
//   ("1 di 3"). Un `[data-galleria-punto]` che non è un `button` è solo un
//   indicatore: riceve `aria-current` (e `--avanzamento`, vedi Giro) ma un clic
//   non fa nulla.
//   Una galleria può anche saltare foto, avere didascalie e girare da sola, con
//   gli attributi qui sotto; una che non li usa fa solo quello che c'è scritto
//   sopra (schede rapide, post e colori non cambiano).
//   Foto attive. `[data-galleria-foto][data-galleria-salta="<media>"]`: finché la
//   `matchMedia` è vera la foto non fa parte della galleria. Frecce, tacche, giro e
//   contatore ("3 di 12") contano solo le foto attive e lo script non mostra una
//   foto saltata, a meno che lo siano tutte: allora mostra quella richiesta.
//   Quando una di queste media cambia, se la foto attuale non è più attiva si
//   passa alla prima attiva dopo di lei (`fotoDelGiro`, in `giro.ts`): gli
//   ascoltatori di `matchMedia` si registrano all'avvio e coprono solo le foto
//   presenti allora. `data-galleria-punto="<n>"`, con un numero, è la foto n
//   dell'elenco completo, contando da 0 (senza valore la tacca vale per la sua
//   posizione). `[data-galleria-didascalia]`, nello stesso ordine delle foto, si
//   vede solo per la foto attuale (le altre `hidden`).
//   Precarico. Una galleria con giro o con foto saltate, quando una foto diventa
//   attuale, fa caricare subito le `img[loading="lazy"]` della foto attiva
//   successiva, ma solo quando le `img` della foto attuale hanno finito di caricare
//   (`complete`, o al loro `load` o `error`): all'avvio la foto dopo non ruba la
//   rete alla prima, che ha la priorità alta. Un giro fuori dal riquadro della
//   finestra non precarica; ci riprova quando ci torna.
//   Giro. `[data-galleria][data-galleria-auto="<ms>"]` avanza da solo di una foto
//   ogni `<ms>`, a giro. Il giro è in corsa quando è avviato, la galleria non è
//   ferma, la pagina è visibile e la galleria è nel riquadro della
//   finestra (un `IntersectionObserver` per giro). Solo allora gira l'orologio,
//   un `requestAnimationFrame` come quello delle storie (`passoDelGiro`, in
//   `giro.ts`): fuori corsa non si chiede nessun fotogramma, il tempo non conta e
//   non si avanza. Quando il giro torna in corsa l'orologio riparte dal tempo che
//   la foto aveva già fatto e il tempo da fermo non si recupera: nessuna foto
//   saltata. Ogni foto resta `<ms>` di tempo in corsa dopo ogni cambio. All'avvio
//   lo script dà alla galleria `data-galleria-avviata` e scrive `--avanzamento`
//   (da 0 a 1) sulla tacca della foto attuale. Il valore si legge con `Number`:
//   se non è un numero finito e positivo ("5000ms", "0"), nessun giro.
//   Pausa. `data-galleria-ferma`, scritto dallo script, vuol dire ferma per scelta
//   o per "riduci movimento": all'avvio segue `prefers-reduced-motion`; se la
//   preferenza passa a `reduce` a pagina aperta la galleria si ferma, e se torna a
//   `no-preference` resta com'è (la fa ripartire chi guarda, con la pausa).
//   `button[data-galleria-pausa]` alterna con un clic. È il controllo di rotazione
//   del carosello W3C APG: niente `aria-pressed`, cambia il testo ("Metti in
//   pausa" / "Riprendi"); lo stato sta solo in `data-galleria-ferma` sulla
//   galleria. Lo script non scrive testi: la variante mette nel pulsante i due
//   testi e mostra con il CSS quello giusto secondo `data-galleria-ferma`
//   (l'altro con `display: none`, perché non si legga). `[data-galleria-annuncio]`
//   riceve `aria-live="polite"` a galleria ferma e `"off"` mentre gira; la variante
//   lo scrive già nell'HTML con `aria-live="off"`, perché alcuni lettori di schermo
//   registrano le regioni live solo al caricamento.
//   Comandi, con il giro. `[data-galleria-prec|succ]` e
//   `button[data-galleria-punto]` fermano il giro e poi cambiano foto: l'annuncio
//   è già `polite` quando la foto cambia, e il cambio si sente.
// - Colori: un contenitore `[data-colori="<nome>"]` con i pulsanti
//   `button[data-colore="<colore>"]` (`aria-pressed`): premerne uno lo sceglie, ed
//   è l'unico premuto; ripremerlo non fa nulla. Ogni pulsante porta i testi del suo
//   colore, già scritti nella pagina: `data-colore-nome`, `data-colore-testo`,
//   `data-colore-messaggio` e `data-colore-href`. Scelto un colore, gli elementi
//   del contenitore con `[data-colore-dove="nome"]`, `"testo"` o `"messaggio"`
//   ricevono come testo il valore corrispondente, e ogni `a[data-colore-dove="link"]`
//   riceve `data-colore-href` come `href`. Con `data-colore-foto="<n>"` la galleria
//   del contenitore (`[data-galleria]`) mostra la foto n, contando da 0. Lo script
//   non compone testi: li copia da questi attributi, e li scrive la variante.
// - Storie: `button[data-storia-apri="<g>"]` apre `dialog[data-storie]`, che ha i
//   gruppi `[data-storia-gruppo="<g>"]` (uno visibile alla volta), in ognuno le
//   foto `[data-storia-foto]` e, nello stesso ordine, le barre
//   `[data-storia-barra]` (avanzamento in `--avanzamento`, da 0 a 1). Pulsanti
//   `[data-storia-prec|succ|chiudi]`, frecce della tastiera; alla fine
//   dell'ultima foto si chiude. Il pulsante di un gruppo mostrato riceve
//   `data-vista`. Ogni foto resta il tempo della sua `data-storia-durata`, in ms,
//   letto con `Number`: se non è un numero finito e positivo, 6000.
//   Pausa. Il tempo di una foto conta solo se nulla lo ferma. Lo fermano: tenere
//   premuto sulla storia con il puntatore primario (sulla foto o sulla zona dei
//   tocchi, qui sotto: un secondo dito non la fa ripartire sotto il primo); la frase
//   o la scheda degli inviti aperte (qui sotto); `button[data-storia-pausa]`
//   (`aria-pressed`, da mettere in ogni storia: ferma e riprende); e la tastiera,
//   perché portare il focus su un controllo della storia la mette in pausa (si
//   riprende con quel pulsante).
//   Frase. In ogni foto `[data-storia-frase]`, con dentro il testo visibile
//   `[data-storia-frase-testo]` e, dopo, `button[data-storia-altro]`
//   (`aria-expanded="false"` e `hidden` nell'HTML). La variante limita l'altezza
//   della frase chiusa (per esempio a due righe, con `overflow: hidden`). Quando
//   la foto diventa attuale, se la frase non ci sta tutta (`scrollHeight` oltre
//   `clientHeight` + 1) lo script mostra "altro" e accorcia il testo visibile a
//   parole intere, con «…» (`fraseTagliata`, in `frase.ts`), finché testo e
//   "altro" ci stanno; il testo intero lo legge la prima volta dal testo visibile.
//   Per i lettori di schermo la variante lascia il testo intero fuori da
//   `[data-storia-frase-testo]`. Dalla frase non deve uscire in basso nulla di
//   posizionato (un velo in `::before`): `scrollHeight` lo conterebbe. Un clic su
//   "altro" alterna `data-aperta` sulla frase della sua foto e `aria-expanded`:
//   aperta, la frase ha il testo intero; richiusa, di nuovo quello accorciato. Al
//   cambio di foto la frase si richiude.
//   Scheda degli inviti. In ogni gruppo la pillola
//   `button[data-storia-invito-apri]` (in Salvia social il link "Chiedi
//   informazioni" sotto la frase; `aria-expanded="false"`) e tanti
//   `[data-storia-invito]` quante le foto, nello stesso ordine: lo script mostra
//   quello della foto attuale (gli altri `hidden`), con i suoi link e un
//   `button[data-storia-invito-chiudi]`. La pillola apre la scheda e, se è
//   aperta, la chiude (serve alle varianti in cui la scheda non copre la
//   pillola: Salvia social la nasconde). La apre anche un trascinamento in su che
//   parte dalla zona dei tocchi o dalla pillola (qui sotto). Aperta, il dialog
//   riceve `data-storia-invito-aperto` (la variante la mostra con il CSS), le
//   pillole `aria-expanded="true"` e il focus va subito al primo `a[href]` o
//   `button` della scheda. Per questo la variante rende la scheda focalizzabile
//   appena c'è l'attributo (niente `visibility` ritardata da una transizione) e,
//   chiusa, la tiene fuori dal tab e dai lettori di schermo (per esempio con
//   `display: none`). La chiudono anche `[data-storia-invito-chiudi]`, Esc
//   (l'evento `cancel` del dialog: a scheda aperta Esc chiude solo lei, non il
//   lettore), un trascinamento in giù (qui sotto) e un clic nel dialog fuori da
//   link e pulsanti: sul velo della scheda, sulla zona dei tocchi o sullo sfondo
//   del dialog, che a scheda aperta non chiude il lettore. Non la chiude un clic
//   dentro `[data-storia-invito-resta]` (in Salvia social il gruppo dei link:
//   chi manca di poco un link non perde la scheda), né uno la cui pressione è
//   cominciata su un link o un pulsante. Il focus torna alla pillola del gruppo.
//   Al cambio di foto la scheda si richiude. Se la foto attuale non
//   ha la sua scheda, né la pillola né il trascinamento aprono nulla.
//   Focus al cambio di foto. Resta dov'è, a meno che sia su un elemento che si
//   nasconde: nel gruppo che si lascia (la pillola, "altro"; per esempio con le
//   frecce della tastiera), nella foto che si lascia ("altro") o nella scheda che
//   si chiude. Allora va alla pillola del gruppo attuale.
//   Tocchi. Un elemento `[data-storia-tocchi]` per dialog, sopra le foto e sotto i
//   controlli, con `aria-hidden="true"` e non focalizzabile (da tastiera e con i
//   lettori di schermo restano i pulsanti e le frecce), raccoglie i tocchi. Non
//   deve coprire tutto il dialog: dove non c'è (per esempio una fascia attorno
//   alla pillola) un tocco non cambia foto. Un
//   clic o un tocco su di lui fa quello che dice `azioneDelTocco` (in `gesti.ts`)
//   per il punto toccato, misurato dal bordo sinistro della zona, e per la durata
//   dalla pressione al rilascio. Nel 25% di sinistra fa come
//   `[data-storia-prec]`, nel resto come `[data-storia-succ]`: la pausa non è un
//   punto della zona, è il pulsante `[data-storia-pausa]`, che riflette lo stato
//   con `aria-pressed`. A scheda aperta un tocco sulla zona chiude la scheda e non
//   cambia foto (serve alle varianti in cui la scheda non copre la zona: in Salvia
//   social la copre).
//   Tenere premuto. La storia si ferma alla pressione del puntatore primario e
//   riprende al suo rilascio (o annullamento): gli altri puntatori non contano.
//   Oltre 300 ms la pressione non è un tocco, e il rilascio
//   non cambia foto. Dopo 500 ms di pressione sulla zona dei tocchi il dialog
//   riceve `data-storia-nascosta` (la variante nasconde testata, frase e pillola:
//   resta la foto), che il rilascio o l'annullamento tolgono. Un trascinamento
//   non nasconde nulla: appena si sposta oltre 10 px su un asse, il timer si
//   ferma e l'attributo se ne va. A scheda aperta la pressione non nasconde nulla.
//   Trascinamenti. Un trascinamento parte dalla zona dei tocchi, dalla pillola a
//   scheda chiusa o dalla scheda aperta; non da altri link o pulsanti (per il
//   mouse, solo con il tasto principale). Al rilascio `gestoDellaStoria` (in
//   `gesti.ts`) dice cosa fare. Dalla zona dei tocchi, in giù chiude il dialog e
//   in su apre la scheda; a scheda aperta in giù chiude solo la scheda e in su non
//   fa nulla (anche questo serve alle varianti in cui la scheda non copre la
//   zona). Dalla pillola, in su apre la scheda: la pressione sulla pillola non
//   ferma la storia e non nasconde nulla. Dalla scheda, in giù la chiude. Un
//   trascinamento che si è spostato oltre 10 px su un asse non è un tocco: il clic
//   che lo segue (entro mezzo secondo dal rilascio; uno più tardi conta) non fa
//   nulla, né sulla zona, né sulla pillola, né sulla scheda (che
//   così non si richiude appena aperta, né dopo un trascinamento in su o di
//   lato). Il dito arriva al rilascio solo dove la variante
//   toglie lo scorrimento al browser (`touch-action: none` sulla zona dei tocchi,
//   sulla pillola, e sulla scheda se non deve scorrere): altrimenti il browser si
//   prende il trascinamento e lo annulla con `pointercancel`. La variante lascia
//   passare i tocchi attraverso ciò che sta sopra la zona e non si usa
//   (`pointer-events: none`).
//   Menu del browser. Tenendo premuto su una foto il browser aprirebbe il menu
//   dell'immagine: lo script annulla `contextmenu` in tutto `dialog[data-storie]`,
//   tranne che su link e pulsanti. Su iPhone `contextmenu` non arriva: lì basta la
//   variante, con `pointer-events: none` e `-webkit-touch-callout: none` sulle
//   `img`.
// - Post: `[data-post-apri="<id>"]` apre `dialog[data-post="<id>"]`; dentro può
//   esserci una galleria; `button[data-post-chiudi]` lo chiude. Chi apre è un
//   `button`, oppure un link `a[href]` (per esempio a WhatsApp). Con lo script, un
//   clic sul link senza Ctrl, Cmd, Maiusc o Alt apre il dialog e annulla la
//   navigazione (`preventDefault`); con un tasto modificatore, o se il dialog
//   manca o il browser non ha `showModal()` (Safari prima del 15.4), il link fa il
//   suo. Senza JavaScript porta al suo `href`. All'avvio lo
//   script dà `aria-haspopup="dialog"` ai link `a[data-post-apri]` che hanno il
//   loro dialog: nell'HTML sono link semplici.
// - Mostra altri: `button[data-mostra-altri="<nome>"]` toglie `hidden` a
//   `[data-altro="<nome>"]` e poi sparisce.
// - Limite: `[data-limite="<nome>"]` con `data-limite-regole` (JSON di
//   `RegolaLimite[]`, in `limite.ts`: la prima `media` vera per `matchMedia` dà
//   il limite). Delle voci `[data-filtrabile="<nome>"]` che passano il filtro (e
//   non sono piegate da "Mostra altri") si vedono solo le prime
//   `quanteMostrare(passano, limiteAttivo(…), aperto)`, nell'ordine della pagina.
//   Regole illeggibili, o nessuna media vera: nessun limite.
//   `button[data-limite-mostra="<nome>"]`, `hidden` nella pagina, si mostra solo
//   se resta fuori qualche voce, e lo script scrive `testoMostraTutti(passano)`
//   ("Mostra tutti gli 8") nel suo `[data-limite-testo]`. Premuto, il nome resta
//   aperto per ogni filtro successivo: il pulsante sparisce e il focus va al
//   primo `a[href]` o `button` della prima voce comparsa. Il limite si ricalcola
//   con i filtri e con "Mostra altri", e quando cambia una delle media query
//   delle regole (non a ogni `resize`): gli ascoltatori di `matchMedia` si
//   registrano all'avvio e coprono solo i `[data-limite]` presenti allora.
//   Senza JavaScript si vedono tutte le voci.
//
// I dialog si aprono con `showModal()`, si chiudono con Esc (o con un clic sullo
// sfondo: il `dialog` non deve avere un riempimento) e restituiscono il focus al
// pulsante, o al link, da cui si sono aperti.
import { filtra } from './filtra';
import { fraseTagliata, paroleCheStanno } from './frase';
import { azioneDelTocco, gestoDellaStoria, SOGLIA_MOVIMENTO_PX } from './gesti';
import { fotoDelGiro, passoDelGiro } from './giro';
import { limiteAttivo, quanteMostrare, testoMostraTutti, type RegolaLimite } from './limite';
import { oraDiRoma, statoNegozio, testoStato, type Fascia } from './orari';
import { avanti, indietro, type Posizione } from './sequenza';

/** Quanto resta ferma una foto di una storia senza una `data-storia-durata` valida. */
const DURATA_FOTO_MS = 6000;
/** Dopo quanto, tenendo premuto sulla zona dei tocchi, il dialog riceve `data-storia-nascosta`. */
const NASCONDI_DOPO_MS = 500;
/**
 * Per quanto, dopo il rilascio di un trascinamento, il clic che lo segue non conta:
 * il browser lo manda subito. Un clic più tardi (per esempio di un lettore di
 * schermo, senza pressione) conta sempre.
 */
const CLIC_DOPO_TRASCINAMENTO_MS = 500;
/** Ogni quanto si ricalcola "aperto ora". */
const RICALCOLO_STATO_MS = 60_000;

const PANNELLI = '[data-menu]';
const APRITORI = '[data-menu-apri]';
const DIALOG = 'dialog[data-post], dialog[data-storie]';

type GruppoStoria = {
  gruppo: HTMLElement;
  foto: HTMLElement[];
  barre: HTMLElement[];
  /** Le schede degli inviti, una per foto e nello stesso ordine (anche nessuna). */
  inviti: HTMLElement[];
};

type StatoStoria = {
  dialog: HTMLDialogElement;
  gruppi: GruppoStoria[];
  posizione: Posizione;
  /** Millisecondi passati sulla foto corrente. */
  trascorso: number;
  /** Quanto resta la foto corrente, in ms (da `data-storia-durata`, o `DURATA_FOTO_MS`). */
  durata: number;
  /** Vero mentre si tiene premuto sulla foto. */
  premuto: boolean;
  /** Pausa scelta: dal pulsante, o da un focus arrivato con la tastiera. */
  pausaUtente: boolean;
  /** Vero mentre la scheda degli inviti è aperta. */
  invitoAperto: boolean;
  /** Vero mentre la frase della foto corrente è aperta da "altro". */
  fraseAperta: boolean;
  /** Il timer che, tenendo premuto, nasconde l'interfaccia (0: nessuno). */
  nascondi: number;
  frame: number;
  ultimoFrame: number;
};

/** L'orologio di una galleria che gira da sola (`data-galleria-auto`). */
type StatoGiro = {
  /** Millisecondi passati sulla foto attuale, contando solo il tempo in corsa. */
  trascorso: number;
  ultimoFrame: number;
  /** Il fotogramma chiesto a `requestAnimationFrame` (0: nessuno, l'orologio è spento). */
  frame: number;
  /** Quanto resta ferma ogni foto, in ms. */
  durata: number;
  /** Vero se la galleria è nel riquadro della finestra (lo dice l'`IntersectionObserver`). */
  visibile: boolean;
};

type Contesto = {
  radice: ParentNode;
  /** Nomi dei gruppi per cui è stato premuto "Mostra altri". */
  altriMostrati: Set<string>;
  /** Nomi dei limiti per cui è stato premuto "Mostra tutti": valgono per ogni filtro. */
  limiteAperto: Set<string>;
  /** Da quale pulsante si è aperto ogni dialog, per restituirgli il focus. */
  apertoDa: WeakMap<HTMLDialogElement, HTMLElement>;
  storia: StatoStoria | null;
  /** Le gallerie che girano da sole, con il loro orologio. */
  giri: Map<HTMLElement, StatoGiro>;
  /** Dove è cominciata l'ultima pressione del puntatore (per il clic sullo sfondo e quello che chiude la scheda). */
  inizioPressione: EventTarget | null;
  /** Quando è cominciata la pressione sulla zona dei tocchi della storia (`NaN`: nessuna). */
  inizioTocco: number;
  /** Quanto è durata l'ultima pressione sulla zona dei tocchi, finché il clic non la usa (`NaN`: nessuna). */
  durataTocco: number;
  /**
   * Il trascinamento in corso sulla storia (`null`: nessuno): il puntatore, dove e
   * da cosa è partito, e se si è già spostato oltre `SOGLIA_MOVIMENTO_PX`.
   */
  inizioTrascinamento: {
    id: number;
    x: number;
    y: number;
    da: 'tocchi' | 'pillola' | 'invito';
    mosso: boolean;
  } | null;
  /**
   * Dopo un trascinamento oltre `SOGLIA_MOVIMENTO_PX`, fino a quando (in
   * `timeStamp` degli eventi) il clic che segue non apre né chiude la scheda
   * (`-Infinity`: nessun clic da annullare). Lo azzerano quel clic, la pressione
   * successiva o un tasto.
   */
  clicAnnullatoFino: number;
};

const avviate = new WeakSet<object>();

function elementi<T extends HTMLElement = HTMLElement>(da: ParentNode, selettore: string): T[] {
  return [...da.querySelectorAll<T>(selettore)];
}

/** Selettore `[attributo="valore"]` con il valore protetto. */
function conValore(attributo: string, valore: string): string {
  return `[${attributo}="${CSS.escape(valore)}"]`;
}

function movimentoRidotto(): boolean {
  return matchMedia('(prefers-reduced-motion: reduce)').matches;
}

// --- Menu: un pulsante che apre e chiude un pannello con `hidden` ---

function pannelloDelBottone(c: Contesto, bottone: HTMLElement): HTMLElement | null {
  const id = bottone.getAttribute('aria-controls');
  return id ? c.radice.querySelector<HTMLElement>(`#${CSS.escape(id)}`) : null;
}

function bottoniDelPannello(c: Contesto, pannello: HTMLElement): HTMLElement[] {
  return elementi(c.radice, APRITORI).filter((b) => pannelloDelBottone(c, b) === pannello);
}

/** I pulsanti fuori dal pannello: hanno `aria-expanded` e, alla chiusura, il focus. */
function apritoriEsterni(c: Contesto, pannello: HTMLElement): HTMLElement[] {
  return bottoniDelPannello(c, pannello).filter((b) => !pannello.contains(b));
}

function impostaAperto(c: Contesto, pannello: HTMLElement, aperto: boolean): void {
  pannello.hidden = !aperto;
  // Un pulsante dentro il pannello si vede solo a pannello aperto e lo chiude
  // soltanto: `aria-expanded` direbbe sempre "espanso", non serve.
  for (const bottone of apritoriEsterni(c, pannello)) {
    bottone.setAttribute('aria-expanded', String(aperto));
  }
}

function alternaPannello(c: Contesto, bottone: HTMLElement): void {
  const pannello = pannelloDelBottone(c, bottone);
  if (!pannello) return;
  const apri = pannello.hidden;
  impostaAperto(c, pannello, apri);
  if (!apri && pannello.contains(bottone)) {
    // Chiuso da dentro: il pulsante premuto sparisce, il focus torna a quello di fuori.
    apritoriEsterni(c, pannello)[0]?.focus();
  }
}

/** Allinea `aria-expanded` dei pulsanti di fuori allo stato scritto nella pagina. */
function sincronizzaPannelli(c: Contesto): void {
  for (const pannello of elementi(c.radice, PANNELLI)) {
    for (const bottone of apritoriEsterni(c, pannello)) {
      bottone.setAttribute('aria-expanded', String(!pannello.hidden));
    }
  }
}

/** Esc chiude i pannelli aperti; il focus torna al pulsante solo se era lì dentro. */
function chiudiPannelliAperti(c: Contesto): void {
  const attivo = document.activeElement;
  for (const pannello of elementi(c.radice, PANNELLI).filter((p) => !p.hidden)) {
    const bottoni = bottoniDelPannello(c, pannello);
    const aveva = !!attivo && (pannello.contains(attivo) || bottoni.includes(attivo as HTMLElement));
    impostaAperto(c, pannello, false);
    if (aveva) apritoriEsterni(c, pannello)[0]?.focus();
  }
}

// --- Interruttore: un pulsante con `aria-pressed`, che il clic inverte ---

function alternaInterruttore(bottone: HTMLElement): void {
  bottone.setAttribute('aria-pressed', String(bottone.getAttribute('aria-pressed') !== 'true'));
}

// --- Stato del negozio ---

function aggiornaStato(c: Contesto): void {
  const adesso = new Date();
  for (const el of elementi(c.radice, '[data-stato-negozio]')) {
    try {
      const stato = statoNegozio(JSON.parse(el.dataset.orari ?? '') as Fascia[], adesso);
      const testo = testoStato(stato);
      if (el.textContent !== testo) el.textContent = testo;
      el.dataset.aperto = String(stato.aperto);
    } catch {
      // Orari illeggibili: resta il testo scritto nella pagina.
    }
  }
  const { giorno } = oraDiRoma(adesso);
  for (const riga of elementi(c.radice, '[data-orario-giorno]')) {
    riga.toggleAttribute('data-oggi', riga.dataset.orarioGiorno === giorno);
  }
}

// --- Filtri, "Mostra altri" e limite ---
//
// Una voce può essere filtrabile, piegata da "Mostra altri" e contata da un
// limite: la sua visibilità la decidono insieme `applicaFiltri`,
// `altriMostrati` e `limiteAperto`.

function categorieDi(voce: HTMLElement): string[] {
  return (voce.dataset.categorie ?? '').split(/\s+/).filter(Boolean);
}

function filtroAttivo(c: Contesto, nome: string): string {
  const contenitore = c.radice.querySelector<HTMLElement>(conValore('data-filtri', nome));
  const premuto = contenitore?.querySelector<HTMLElement>('[data-filtro][aria-pressed="true"]');
  return premuto?.dataset.filtro ?? 'tutti';
}

/** Le regole di un contenitore `data-limite`; illeggibili: nessuna (quindi nessun limite). */
function regoleDi(contenitore: HTMLElement): RegolaLimite[] {
  try {
    const regole: unknown = JSON.parse(contenitore.dataset.limiteRegole ?? '');
    if (
      Array.isArray(regole) &&
      regole.every((r) => typeof r?.media === 'string' && typeof r?.limite === 'number')
    ) {
      return regole as RegolaLimite[];
    }
  } catch {
    // JSON illeggibile.
  }
  return [];
}

/** Il limite di adesso per il nome (`null`: nessun contenitore, o nessuna regola vera). */
function limiteDi(c: Contesto, nome: string): number | null {
  const contenitore = c.radice.querySelector<HTMLElement>(conValore('data-limite', nome));
  if (!contenitore) return null;
  return limiteAttivo(regoleDi(contenitore), (media) => matchMedia(media).matches);
}

/** Il primo comando (`a[href]` o `button`) di una voce, o la voce se è lei il comando. */
function primoComando(voce: HTMLElement | undefined): HTMLElement | null {
  if (!voce) return null;
  return voce.matches('a[href], button')
    ? voce
    : voce.querySelector<HTMLElement>('a[href], button');
}

function applicaFiltri(c: Contesto): void {
  const nomi = new Set(
    elementi(c.radice, '[data-filtri], [data-filtrabile], [data-filtro-vuoto]').flatMap((el) => {
      const nome = el.dataset.filtri ?? el.dataset.filtrabile ?? el.dataset.filtroVuoto;
      return nome === undefined ? [] : [nome];
    }),
  );
  // Gruppi di "Mostra altri" le cui voci sono tutte visibili per un filtro attivo.
  const altriInutili = new Set<string>();

  for (const nome of nomi) {
    const filtro = filtroAttivo(c, nome);
    const voci = elementi(c.radice, conValore('data-filtrabile', nome)).map((el) => ({
      el,
      categorie: categorieDi(el),
    }));
    const corrispondenti = new Set(filtra(voci, filtro).map((voce) => voce.el));
    // Le voci che passano: corrispondono al filtro e non sono piegate.
    const passano: HTMLElement[] = [];
    for (const { el } of voci) {
      const gruppoAltri = el.dataset.altro;
      const piegata =
        gruppoAltri !== undefined && filtro === 'tutti' && !c.altriMostrati.has(gruppoAltri);
      if (corrispondenti.has(el) && !piegata) passano.push(el);
      if (gruppoAltri !== undefined && filtro !== 'tutti') altriInutili.add(gruppoAltri);
    }
    // Di quelle si vedono le prime, quante ne lascia il limite.
    const quante = quanteMostrare(passano.length, limiteDi(c, nome), c.limiteAperto.has(nome));
    const visibili = new Set(passano.slice(0, quante));
    for (const { el } of voci) el.hidden = !visibili.has(el);
    for (const vuoto of elementi(c.radice, conValore('data-filtro-vuoto', nome))) {
      vuoto.hidden = corrispondenti.size > 0;
    }
    for (const bottone of elementi(c.radice, conValore('data-limite-mostra', nome))) {
      bottone.hidden = quante >= passano.length;
      if (bottone.hidden) continue;
      const testo = testoMostraTutti(passano.length);
      for (const dove of elementi(bottone, '[data-limite-testo]')) {
        if (dove.textContent !== testo) dove.textContent = testo;
      }
    }
  }

  for (const bottone of elementi(c.radice, '[data-mostra-altri]')) {
    const nome = bottone.dataset.mostraAltri ?? '';
    bottone.hidden = c.altriMostrati.has(nome) || altriInutili.has(nome);
  }
}

function scegliFiltro(c: Contesto, bottone: HTMLElement): void {
  const contenitore = bottone.closest<HTMLElement>('[data-filtri]');
  if (!contenitore) return;
  for (const altro of elementi(contenitore, '[data-filtro]')) {
    altro.setAttribute('aria-pressed', String(altro === bottone));
  }
  applicaFiltri(c);
}

function mostraAltri(c: Contesto, bottone: HTMLElement): void {
  const nome = bottone.dataset.mostraAltri ?? '';
  c.altriMostrati.add(nome);
  const voci = elementi(c.radice, conValore('data-altro', nome));
  for (const voce of voci) voce.hidden = false;
  applicaFiltri(c); // una voce che non passa il filtro torna nascosta
  // Il pulsante sparisce: il focus passa alla prima voce comparsa.
  primoComando(voci.find((voce) => !voce.hidden))?.focus();
}

function mostraTutti(c: Contesto, bottone: HTMLElement): void {
  const nome = bottone.dataset.limiteMostra ?? '';
  const voci = elementi(c.radice, conValore('data-filtrabile', nome));
  const giaVisibili = new Set(voci.filter((voce) => !voce.hidden));
  c.limiteAperto.add(nome);
  applicaFiltri(c);
  // Il pulsante sparisce: il focus passa alla prima voce comparsa.
  primoComando(voci.find((voce) => !voce.hidden && !giaVisibili.has(voce)))?.focus();
}

// --- Galleria ---
//
// Le foto "attive" sono quelle che non hanno una `data-galleria-salta` con la
// media vera: solo loro si mostrano, si contano e fanno parte del giro. Una
// galleria senza foto saltate le ha tutte attive, e fa quello che ha sempre fatto.

/** Vero se una media query di `data-galleria-salta` esclude la foto, adesso. */
function saltata(foto: HTMLElement): boolean {
  const media = foto.dataset.galleriaSalta;
  return !!media && matchMedia(media).matches;
}

/** Gli indici, sull'elenco completo, delle foto attive. */
function fotoAttive(foto: HTMLElement[]): number[] {
  return foto.flatMap((una, i) => (saltata(una) ? [] : [i]));
}

function conFotoSaltate(galleria: HTMLElement): boolean {
  return galleria.querySelector('[data-galleria-salta]') !== null;
}

/** L'indice del punto sull'elenco completo delle foto: il suo valore, se è un numero, o la posizione. */
function fotoDelPunto(punto: HTMLElement, posizione: number): number {
  const valore = punto.dataset.galleriaPunto ?? '';
  return /^\d+$/.test(valore) ? Number(valore) : posizione;
}

/** Quanto della foto attuale è passato, da 0 a 1, scritto nella tacca che la rappresenta. */
function scriviAvanzamento(punto: HTMLElement, giro: StatoGiro): void {
  punto.style.setProperty('--avanzamento', String(Math.min(giro.trascorso / giro.durata, 1)));
}

function fotoCorrente(galleria: HTMLElement): number {
  return Math.max(0, elementi(galleria, '[data-galleria-foto]').findIndex((foto) => !foto.hidden));
}

/**
 * Fa caricare subito le `img[loading="lazy"]` della foto attiva dopo quella
 * attuale, perché al cambio sia già pronta. Prima aspetta che la foto attuale abbia
 * finito di caricare (all'avvio è la foto principale, ad alta priorità: la
 * successiva non le ruba la rete). Un giro fuori dal riquadro della finestra non
 * precarica: ci riprova quando ci torna.
 */
function precaricaProssima(c: Contesto, galleria: HTMLElement): void {
  if (c.giri.get(galleria)?.visibile === false) return;
  const foto = elementi(galleria, '[data-galleria-foto]');
  const attuale = fotoCorrente(galleria);
  const corrente = foto[attuale];
  if (!corrente) return;
  const inCarica = elementi<HTMLImageElement>(corrente, 'img').find((img) => !img.complete);
  if (inCarica) {
    // Riprova a caricamento finito (anche se non va a buon fine). Se intanto la foto
    // è cambiata, conta quella del momento.
    const riprova = () => precaricaProssima(c, galleria);
    inCarica.addEventListener('load', riprova, { once: true });
    inCarica.addEventListener('error', riprova, { once: true });
    return;
  }
  const prossima = foto[fotoDelGiro(fotoAttive(foto), attuale, 1)];
  if (!prossima) return;
  for (const img of elementi(prossima, 'img[loading="lazy"]')) {
    img.setAttribute('loading', 'eager');
  }
}

/**
 * Mostra la foto `indice` (dell'elenco completo, a giro). Se è saltata si mostra la
 * prima attiva dopo di lei; se sono saltate tutte, quella richiesta. Aggiorna anche
 * tacche, contatore (sulle foto attive) e didascalie, e fa caricare la foto dopo.
 */
function mostraFoto(c: Contesto, galleria: HTMLElement, indice: number): void {
  const foto = elementi(galleria, '[data-galleria-foto]');
  if (foto.length === 0) return;
  const attive = fotoAttive(foto);
  const richiesta = ((indice % foto.length) + foto.length) % foto.length;
  const attuale = attive.includes(richiesta) ? richiesta : fotoDelGiro(attive, richiesta, 1);
  const giro = c.giri.get(galleria);
  // Ogni foto resta ferma la sua durata: con una foto nuova il tempo riparte da zero.
  if (giro && fotoCorrente(galleria) !== attuale) giro.trascorso = 0;
  foto.forEach((una, i) => {
    una.hidden = i !== attuale;
  });
  elementi(galleria, '[data-galleria-punto]').forEach((punto, i) => {
    const corrente = fotoDelPunto(punto, i) === attuale;
    if (corrente) punto.setAttribute('aria-current', 'true');
    else punto.removeAttribute('aria-current');
    if (giro) {
      if (corrente) scriviAvanzamento(punto, giro);
      else punto.style.removeProperty('--avanzamento');
    }
  });
  const totale = attive.length > 0 ? attive.length : foto.length;
  const posizione = attive.length > 0 ? attive.indexOf(attuale) : attuale;
  for (const contatore of elementi(galleria, '[data-galleria-contatore]')) {
    contatore.textContent = `${posizione + 1} di ${totale}`;
  }
  elementi(galleria, '[data-galleria-didascalia]').forEach((didascalia, i) => {
    didascalia.hidden = i !== attuale;
  });
  if (giro || conFotoSaltate(galleria)) precaricaProssima(c, galleria);
}

/** La foto attiva dopo (`1`) o prima (`-1`) di quella attuale, a giro. */
function cambiaFoto(c: Contesto, galleria: HTMLElement, passo: 1 | -1): void {
  const foto = elementi(galleria, '[data-galleria-foto]');
  mostraFoto(c, galleria, fotoDelGiro(fotoAttive(foto), fotoCorrente(galleria), passo));
}

/**
 * Vero se il giro è in corsa: avviato, non fermo, con la pagina
 * visibile e la galleria nel riquadro della finestra.
 */
function giroInCorsa(galleria: HTMLElement, giro: StatoGiro): boolean {
  return (
    galleria.hasAttribute('data-galleria-avviata') &&
    !galleria.hasAttribute('data-galleria-ferma') &&
    !document.hidden &&
    giro.visibile
  );
}

/**
 * Accende o spegne l'orologio di un giro secondo `giroInCorsa`: il fotogramma si
 * chiede solo mentre il giro corre. Va chiamata a ogni cambio di una delle
 * condizioni. Quando l'orologio riparte, l'ultimo fotogramma si riallinea ad
 * adesso: il tempo passato da fermo non conta e nessuna foto si salta.
 */
function aggiornaOrologio(c: Contesto, galleria: HTMLElement): void {
  const giro = c.giri.get(galleria);
  if (!giro) return;
  if (!giroInCorsa(galleria, giro)) {
    cancelAnimationFrame(giro.frame);
    giro.frame = 0;
  } else if (giro.frame === 0) {
    giro.ultimoFrame = performance.now();
    giro.frame = requestAnimationFrame((ora) => fotogrammaGiro(c, galleria, ora));
  }
}

/**
 * Ferma (o fa ripartire) il giro di una galleria e lo scrive nella pagina: lo
 * stato (`data-galleria-ferma`, da cui la variante sceglie il testo della pausa) e
 * l'annuncio. Poi spegne o riaccende l'orologio.
 */
function impostaFerma(c: Contesto, galleria: HTMLElement, ferma: boolean): void {
  galleria.toggleAttribute('data-galleria-ferma', ferma);
  for (const annuncio of elementi(galleria, '[data-galleria-annuncio]')) {
    annuncio.setAttribute('aria-live', ferma ? 'polite' : 'off');
  }
  aggiornaOrologio(c, galleria);
}

/** Un clic sul pulsante della pausa: ferma il giro, o lo fa ripartire. Senza giro non fa nulla. */
function alternaGiro(c: Contesto, galleria: HTMLElement): void {
  if (!c.giri.has(galleria)) return;
  impostaFerma(c, galleria, !galleria.hasAttribute('data-galleria-ferma'));
}

/**
 * Dopo un comando dato a mano il giro si ferma: ora decide chi guarda. Si chiama
 * prima di cambiare foto: così l'annuncio è già `polite` e il cambio si sente.
 */
function fermaGiro(c: Contesto, galleria: HTMLElement): void {
  if (c.giri.has(galleria)) impostaFerma(c, galleria, true);
}

function spostaGalleria(c: Contesto, bottone: HTMLElement, passo: 1 | -1): void {
  const galleria = bottone.closest<HTMLElement>('[data-galleria]');
  if (!galleria) return;
  fermaGiro(c, galleria);
  cambiaFoto(c, galleria, passo);
}

function vaiAlPunto(c: Contesto, bottone: HTMLElement): void {
  const galleria = bottone.closest<HTMLElement>('[data-galleria]');
  if (!galleria) return;
  const posizione = elementi(galleria, '[data-galleria-punto]').indexOf(bottone);
  fermaGiro(c, galleria);
  mostraFoto(c, galleria, fotoDelPunto(bottone, posizione));
}

function alternaPausaGalleria(c: Contesto, bottone: HTMLElement): void {
  const galleria = bottone.closest<HTMLElement>('[data-galleria]');
  if (galleria) alternaGiro(c, galleria);
}

/** Registra il giro di una galleria `data-galleria-auto`, ferma se il movimento è ridotto. */
function registraGiro(c: Contesto, galleria: HTMLElement): void {
  // Solo un numero finito e positivo: "5e3" vale 5000; "5000ms", "" o "0" nessun giro.
  const durata = Number(galleria.dataset.galleriaAuto ?? '');
  if (!Number.isFinite(durata) || durata <= 0) return; // la galleria resta a mano
  // Visibile solo dove manca l'`IntersectionObserver`: altrimenti lo dice lui, subito dopo l'avvio.
  const visibile = typeof IntersectionObserver !== 'function';
  c.giri.set(galleria, { trascorso: 0, ultimoFrame: 0, frame: 0, durata, visibile });
  impostaFerma(c, galleria, movimentoRidotto());
}

/**
 * Fa partire un giro già registrato (quando la galleria ha già la sua foto
 * attuale): la segna avviata e ne segue la presenza nel riquadro della finestra.
 * Quando torna visibile riprende anche il precarico.
 */
function avviaGiro(c: Contesto, galleria: HTMLElement, giro: StatoGiro): void {
  galleria.setAttribute('data-galleria-avviata', '');
  if (typeof IntersectionObserver === 'function') {
    new IntersectionObserver((voci) => {
      const ultima = voci[voci.length - 1];
      if (!ultima) return;
      giro.visibile = ultima.isIntersecting;
      if (giro.visibile) precaricaProssima(c, galleria);
      aggiornaOrologio(c, galleria);
    }).observe(galleria);
  }
  aggiornaOrologio(c, galleria);
}

/** Un fotogramma dell'orologio, chiesto solo mentre il giro è in corsa (vedi `aggiornaOrologio`). */
function fotogrammaGiro(c: Contesto, galleria: HTMLElement, ora: number): void {
  const giro = c.giri.get(galleria);
  if (!giro) return;
  giro.frame = 0;
  // Un fotogramma rimasto da prima che il giro si fermasse: l'orologio resta spento.
  if (!giroInCorsa(galleria, giro)) return;
  const passo = passoDelGiro(giro.trascorso, ora - giro.ultimoFrame, true, giro.durata);
  giro.trascorso = passo.trascorso;
  giro.ultimoFrame = ora;
  if (passo.avanza) {
    cambiaFoto(c, galleria, 1);
  } else {
    const punto = galleria.querySelector<HTMLElement>('[data-galleria-punto][aria-current="true"]');
    if (punto) scriviAvanzamento(punto, giro);
  }
  giro.frame = requestAnimationFrame((prossimo) => fotogrammaGiro(c, galleria, prossimo));
}

// --- Colori: un pulsante sceglie il colore, e i testi già scritti sul suo conto vanno al loro posto ---

function scegliColore(c: Contesto, pulsante: HTMLElement): void {
  const contenitore = pulsante.closest<HTMLElement>('[data-colori]');
  // Un colore già scelto non fa nulla.
  if (!contenitore || pulsante.getAttribute('aria-pressed') === 'true') return;
  for (const altro of elementi(contenitore, 'button[data-colore]')) {
    altro.setAttribute('aria-pressed', String(altro === pulsante));
  }
  // Lo script copia, non compone: un testo che il pulsante non porta lascia l'elemento com'è.
  const testi = new Map([
    ['nome', pulsante.dataset.coloreNome],
    ['testo', pulsante.dataset.coloreTesto],
    ['messaggio', pulsante.dataset.coloreMessaggio],
  ]);
  for (const dove of elementi(contenitore, '[data-colore-dove]')) {
    const cosa = dove.dataset.coloreDove ?? '';
    if (cosa === 'link') {
      if (dove instanceof HTMLAnchorElement && pulsante.dataset.coloreHref !== undefined) {
        dove.setAttribute('href', pulsante.dataset.coloreHref);
      }
      continue;
    }
    const testo = testi.get(cosa);
    if (testo !== undefined && dove.textContent !== testo) dove.textContent = testo;
  }
  const galleria = contenitore.querySelector<HTMLElement>('[data-galleria]');
  const foto = Number.parseInt(pulsante.dataset.coloreFoto ?? '', 10);
  if (galleria && Number.isFinite(foto)) mostraFoto(c, galleria, foto);
}

// --- Dialog (storie e post) ---

function apriDialog(c: Contesto, dialog: HTMLDialogElement, da: HTMLElement): void {
  if (dialog.open) return;
  c.apertoDa.set(dialog, da);
  dialog.showModal();
}

function chiudiDialog(bottone: HTMLElement): void {
  bottone.closest<HTMLDialogElement>('dialog')?.close();
}

/** Alla chiusura, in qualunque modo (Esc compreso): ferma la storia e rende il focus. */
function allaChiusura(c: Contesto, dialog: HTMLDialogElement): void {
  if (c.storia?.dialog === dialog) fermaStoria(c);
  const origine = c.apertoDa.get(dialog);
  c.apertoDa.delete(dialog);
  if (origine?.isConnected) origine.focus();
}

/** Il dialog che `apri` (un `[data-post-apri]`) apre, o `null` se manca. */
function dialogDelPost(c: Contesto, apri: HTMLElement): HTMLDialogElement | null {
  return c.radice.querySelector<HTMLDialogElement>(
    `dialog${conValore('data-post', apri.dataset.postApri ?? '')}`,
  );
}

/**
 * Apre il post. Da un link, apre il dialog e annulla la navigazione solo se il
 * dialog c'è, il browser sa aprirlo (`showModal`) e il clic è senza tasti
 * modificatori: con Ctrl, Cmd, Maiusc o Alt (nuova scheda, nuova finestra,
 * scarica) il link fa il suo.
 */
function apriPost(c: Contesto, apri: HTMLElement, evento: MouseEvent): void {
  const dialog = dialogDelPost(c, apri);
  // Prima di annullare il link: senza `showModal` la scheda non si aprirebbe e il
  // clic non farebbe niente. Così il link va comunque a WhatsApp.
  if (!dialog || typeof dialog.showModal !== 'function') return;
  if (apri instanceof HTMLAnchorElement) {
    if (evento.ctrlKey || evento.metaKey || evento.shiftKey || evento.altKey) return;
    evento.preventDefault();
  }
  apriDialog(c, dialog, apri);
}

// --- Storie ---

function apriStoria(c: Contesto, bottone: HTMLElement): void {
  const gruppo = c.radice.querySelector<HTMLElement>(
    conValore('data-storia-gruppo', bottone.dataset.storiaApri ?? ''),
  );
  const dialog = gruppo?.closest<HTMLDialogElement>('dialog[data-storie]');
  if (!gruppo || !dialog || dialog.open) return;
  const gruppi = elementi(dialog, '[data-storia-gruppo]')
    .map((g) => ({
      gruppo: g,
      foto: elementi(g, '[data-storia-foto]'),
      barre: elementi(g, '[data-storia-barra]'),
      inviti: elementi(g, '[data-storia-invito]'),
    }))
    .filter((g) => g.foto.length > 0);
  const indice = gruppi.findIndex((g) => g.gruppo === gruppo);
  if (indice < 0) return;
  c.storia = {
    dialog,
    gruppi,
    posizione: { gruppo: indice, foto: 0 },
    trascorso: 0,
    durata: DURATA_FOTO_MS,
    premuto: false,
    pausaUtente: false,
    invitoAperto: false,
    fraseAperta: false,
    nascondi: 0,
    frame: 0,
    ultimoFrame: 0,
  };
  // Aperta con la tastiera, il focus arriva sul primo controllo e la mette già in pausa.
  apriDialog(c, dialog, bottone);
  sincronizzaPausa(c.storia);
  mostraStoria(c, { gruppo: indice, foto: 0 });
}

function sincronizzaPausa(s: StatoStoria): void {
  for (const pulsante of elementi(s.dialog, '[data-storia-pausa]')) {
    pulsante.setAttribute('aria-pressed', String(s.pausaUtente));
  }
}

function alternaPausa(c: Contesto): void {
  if (!c.storia) return;
  c.storia.pausaUtente = !c.storia.pausaUtente;
  sincronizzaPausa(c.storia);
}

/** Vero se il tempo della foto non conta: si tiene premuto, c'è una pausa scelta, la scheda o la frase sono aperte. */
function storiaFerma(s: StatoStoria): boolean {
  return s.premuto || s.pausaUtente || s.invitoAperto || s.fraseAperta;
}

/** Quanto resta una foto: la sua `data-storia-durata` se è un numero finito e positivo, se no `DURATA_FOTO_MS`. */
function durataDi(foto: HTMLElement | undefined): number {
  const durata = Number(foto?.dataset.storiaDurata ?? '');
  return Number.isFinite(durata) && durata > 0 ? durata : DURATA_FOTO_MS;
}

/** Scrive lo stato della scheda degli inviti: `data-storia-invito-aperto` sul dialog e `aria-expanded` delle pillole. */
function scriviInvito(s: StatoStoria, aperto: boolean): void {
  s.invitoAperto = aperto;
  s.dialog.toggleAttribute('data-storia-invito-aperto', aperto);
  for (const pillola of elementi(s.dialog, '[data-storia-invito-apri]')) {
    pillola.setAttribute('aria-expanded', String(aperto));
  }
}

/**
 * Chi guarda apre la scheda (la pillola, o un trascinamento in su): il focus va al
 * primo comando della scheda della foto attuale. Senza quella scheda non fa nulla.
 */
function apriInvito(c: Contesto): void {
  const s = c.storia;
  if (!s || s.invitoAperto) return;
  const invito = s.gruppi[s.posizione.gruppo]?.inviti[s.posizione.foto];
  if (!invito) return;
  scriviInvito(s, true);
  primoComando(invito)?.focus();
}

/** La pillola del gruppo attuale, dove torna il focus quando la scheda si chiude. */
function pillolaAttuale(s: StatoStoria): HTMLElement | null {
  const gruppo = s.gruppi[s.posizione.gruppo]?.gruppo;
  return gruppo?.querySelector<HTMLElement>('[data-storia-invito-apri]') ?? null;
}

/**
 * Chi guarda chiude la scheda (la pillola, "Torna alla storia", Esc, un
 * trascinamento in giù): il focus torna alla pillola.
 */
function chiudiInvito(c: Contesto): void {
  const s = c.storia;
  if (!s?.invitoAperto) return;
  scriviInvito(s, false);
  pillolaAttuale(s)?.focus();
}

/** La pillola: apre la scheda, o la chiude se è aperta. */
function alternaInvito(c: Contesto): void {
  if (c.storia?.invitoAperto) chiudiInvito(c);
  else apriInvito(c);
}

/**
 * Vero se il clic è la fine di un trascinamento (arriva entro
 * `CLIC_DOPO_TRASCINAMENTO_MS` dal rilascio): allora non conta. Vale una volta sola.
 */
function fineDiTrascinamento(c: Contesto, evento: MouseEvent): boolean {
  const annullato = evento.timeStamp <= c.clicAnnullatoFino;
  c.clicAnnullatoFino = Number.NEGATIVE_INFINITY;
  return annullato;
}

/** Il clic sulla pillola, se non è la fine di un trascinamento. */
function clicSullaPillola(c: Contesto, evento: MouseEvent): void {
  if (fineDiTrascinamento(c, evento)) return;
  alternaInvito(c);
}

/**
 * Vero se il clic chiude la scheda aperta: la pressione e il clic sono nel dialog
 * della storia (lo sfondo del dialog compreso), tutti e due fuori da link,
 * pulsanti e `[data-storia-invito-resta]`, e non è la fine di un trascinamento.
 */
function clicChiudeInvito(c: Contesto, bersaglio: Element, evento: MouseEvent): boolean {
  const s = c.storia;
  if (!s?.invitoAperto) return false;
  const fuori = (el: EventTarget | null) =>
    el instanceof Element &&
    s.dialog.contains(el) &&
    !el.closest('a, button, [data-storia-invito-resta]');
  if (!fuori(bersaglio) || !fuori(c.inizioPressione)) return false;
  return !fineDiTrascinamento(c, evento);
}

/** Il testo intero di ogni `[data-storia-frase-testo]`, letto la prima volta che lo si accorcia. */
const testiInteri = new WeakMap<HTMLElement, string>();

/** Il testo visibile di una frase e il suo testo intero. */
function testoDellaFrase(frase: HTMLElement): { testo: HTMLElement; intero: string } | null {
  const testo = frase.querySelector<HTMLElement>('[data-storia-frase-testo]');
  if (!testo) return null;
  const intero = testiInteri.get(testo) ?? testo.textContent ?? '';
  testiInteri.set(testo, intero);
  return { testo, intero };
}

/**
 * La frase chiusa di una foto visibile: se il testo intero non ci sta, "altro" si
 * mostra e il testo si accorcia a parole intere, con «…», finché ci stanno tutti e due.
 */
function accorciaFrase(frase: HTMLElement): void {
  const letto = testoDellaFrase(frase);
  const altro = frase.querySelector<HTMLElement>('[data-storia-altro]');
  if (!letto || !altro) return;
  const { testo, intero } = letto;
  const ciSta = () => frase.scrollHeight <= frase.clientHeight + 1;
  testo.textContent = intero;
  altro.hidden = true;
  if (ciSta()) return;
  altro.hidden = false;
  const parole = intero.trim().split(/\s+/).filter(Boolean).length;
  const quante = paroleCheStanno(parole, (n) => {
    testo.textContent = fraseTagliata(intero, n);
    return ciSta();
  });
  testo.textContent = fraseTagliata(intero, quante);
}

/** "altro" in fondo a una frase: la apre (testo intero) o la richiude. Aperta, la storia è ferma. */
function alternaFrase(c: Contesto, bottone: HTMLElement): void {
  const frase = bottone
    .closest<HTMLElement>('[data-storia-foto]')
    ?.querySelector<HTMLElement>('[data-storia-frase]');
  if (!c.storia || !frase) return;
  const aperta = !frase.hasAttribute('data-aperta');
  frase.toggleAttribute('data-aperta', aperta);
  bottone.setAttribute('aria-expanded', String(aperta));
  c.storia.fraseAperta = aperta;
  const letto = testoDellaFrase(frase);
  if (aperta && letto) letto.testo.textContent = letto.intero;
  if (!aperta) accorciaFrase(frase);
}

/** Richiude la frase aperta da "altro", se c'è. */
function chiudiFrase(s: StatoStoria): void {
  s.fraseAperta = false;
  for (const frase of elementi(s.dialog, '[data-storia-frase][data-aperta]')) {
    frase.removeAttribute('data-aperta');
  }
  for (const altro of elementi(s.dialog, '[data-storia-altro][aria-expanded="true"]')) {
    altro.setAttribute('aria-expanded', 'false');
  }
}

/** Rimette l'interfaccia nascosta tenendo premuto, e ferma il timer che la nasconde. */
function mostraInterfaccia(s: StatoStoria): void {
  clearTimeout(s.nascondi);
  s.nascondi = 0;
  s.dialog.removeAttribute('data-storia-nascosta');
}

function mostraStoria(c: Contesto, posizione: Posizione): void {
  const s = c.storia;
  const corrente = s?.gruppi[posizione.gruppo];
  if (!s || !corrente) return;
  // Il focus su un elemento che qui si nasconde andrebbe perso: nel gruppo che si
  // lascia (la pillola, "altro"), nella foto che si lascia ("altro") o nella
  // scheda che si chiude.
  const lasciato = s.gruppi[s.posizione.gruppo];
  const attivo = document.activeElement;
  const altroGruppo = posizione.gruppo !== s.posizione.gruppo;
  const altraFoto = altroGruppo || posizione.foto !== s.posizione.foto;
  const focusDaSpostare =
    (altroGruppo && !!lasciato?.gruppo.contains(attivo)) ||
    (altraFoto && !!lasciato?.foto[s.posizione.foto]?.contains(attivo)) ||
    (s.invitoAperto && !!lasciato?.inviti[s.posizione.foto]?.contains(attivo));
  s.posizione = posizione;
  s.trascorso = 0;
  s.durata = durataDi(corrente.foto[posizione.foto]);
  // Una foto nuova riparte pulita: scheda e frase chiuse.
  scriviInvito(s, false);
  chiudiFrase(s);
  s.gruppi.forEach((g, i) => {
    g.gruppo.hidden = i !== posizione.gruppo;
  });
  corrente.foto.forEach((foto, i) => {
    foto.hidden = i !== posizione.foto;
  });
  corrente.inviti.forEach((invito, i) => {
    invito.hidden = i !== posizione.foto;
  });
  // "altro" e il testo accorciato solo se la frase non ci sta tutta: si misura a foto visibile.
  const frase = corrente.foto[posizione.foto]?.querySelector<HTMLElement>('[data-storia-frase]');
  if (frase) accorciaFrase(frase);
  // Il focus resta dov'è, se non era su qualcosa che si è nascosto: allora va alla pillola.
  if (focusDaSpostare) pillolaAttuale(s)?.focus();
  // Barre: le foto già viste piene, la corrente da riempire (o piena, se il
  // movimento è ridotto: allora non c'è avanzamento e si passa a mano).
  corrente.barre.forEach((barra, i) => {
    const pieno = i < posizione.foto || (i === posizione.foto && movimentoRidotto());
    barra.style.setProperty('--avanzamento', pieno ? '1' : '0');
  });
  const id = corrente.gruppo.dataset.storiaGruppo;
  if (id !== undefined) {
    for (const apri of elementi(c.radice, conValore('data-storia-apri', id))) {
      apri.setAttribute('data-vista', '');
    }
  }
  cancelAnimationFrame(s.frame);
  if (movimentoRidotto()) return;
  s.ultimoFrame = performance.now();
  s.frame = requestAnimationFrame((ora) => fotogramma(c, ora));
}

function fotogramma(c: Contesto, ora: number): void {
  const s = c.storia;
  if (!s) return;
  if (!storiaFerma(s)) s.trascorso += Math.max(0, ora - s.ultimoFrame);
  s.ultimoFrame = ora;
  const avanzamento = Math.min(s.trascorso / s.durata, 1);
  s.gruppi[s.posizione.gruppo]?.barre[s.posizione.foto]?.style.setProperty(
    '--avanzamento',
    String(avanzamento),
  );
  if (avanzamento >= 1) avantiStoria(c);
  else s.frame = requestAnimationFrame((prossimo) => fotogramma(c, prossimo));
}

function avantiStoria(c: Contesto): void {
  const s = c.storia;
  if (!s) return;
  const prossima = avanti(
    s.posizione,
    s.gruppi.map((g) => g.foto.length),
  );
  if (prossima) {
    mostraStoria(c, prossima);
  } else {
    cancelAnimationFrame(s.frame);
    s.dialog.close();
  }
}

function indietroStoria(c: Contesto): void {
  const s = c.storia;
  if (!s) return;
  mostraStoria(
    c,
    indietro(
      s.posizione,
      s.gruppi.map((g) => g.foto.length),
    ),
  );
}

/** Il dialog si è chiuso: niente più fotogrammi né timer, e il dialog non resta con la scheda aperta o l'interfaccia nascosta. */
function fermaStoria(c: Contesto): void {
  const s = c.storia;
  if (s) {
    cancelAnimationFrame(s.frame);
    mostraInterfaccia(s);
    scriviInvito(s, false);
  }
  c.storia = null;
  c.inizioTrascinamento = null;
}

/** Pressione del puntatore primario: sulla zona dei tocchi parte il cronometro del tocco. */
function iniziaTocco(c: Contesto, evento: PointerEvent): void {
  if (!evento.isPrimary) return;
  const bersaglio = evento.target;
  c.inizioTocco =
    bersaglio instanceof Element && bersaglio.closest('[data-storia-tocchi]')
      ? evento.timeStamp
      : Number.NaN;
}

/** Rilascio del puntatore primario: si misura quanto è durata la pressione (`NaN` se non era sulla zona). */
function finisciTocco(c: Contesto, evento: PointerEvent): void {
  if (!evento.isPrimary) return;
  c.durataTocco = evento.timeStamp - c.inizioTocco;
  c.inizioTocco = Number.NaN;
}

/**
 * Il clic che segue il rilascio sulla zona dei tocchi: indietro nel 25% di
 * sinistra, avanti nel resto. A scheda aperta non fa nulla (il clic, prima,
 * chiude la scheda: vedi `clicChiudeInvito`).
 */
function toccoSullaStoria(c: Contesto, zona: HTMLElement, evento: MouseEvent): void {
  const durata = c.durataTocco;
  c.durataTocco = Number.NaN; // un tocco vale una volta sola
  if (c.storia?.invitoAperto) return;
  const { left, width } = zona.getBoundingClientRect();
  const azione = azioneDelTocco(evento.clientX - left, width, durata);
  if (azione === 'prec') indietroStoria(c);
  else if (azione === 'succ') avantiStoria(c);
}

/**
 * Pressione del puntatore primario (per il mouse, il tasto principale) sulla
 * storia: dalla zona dei tocchi, dalla pillola a scheda chiusa, o dalla scheda
 * aperta fuori dai suoi link e pulsanti, comincia un trascinamento. Sulla zona
 * dei tocchi, a scheda chiusa, parte anche il timer che dopo `NASCONDI_DOPO_MS`
 * nasconde l'interfaccia; dalla pillola no.
 */
function iniziaTrascinamento(c: Contesto, evento: PointerEvent): void {
  if (!evento.isPrimary) return;
  c.inizioTrascinamento = null;
  c.clicAnnullatoFino = Number.NEGATIVE_INFINITY;
  const s = c.storia;
  const bersaglio = evento.target;
  if (!s || evento.button !== 0 || !(bersaglio instanceof Element)) return;
  if (!s.dialog.contains(bersaglio)) return;
  const punto = { id: evento.pointerId, x: evento.clientX, y: evento.clientY, mosso: false };
  // Dalla pillola un trascinamento in su apre la scheda; un tocco resta un clic.
  if (!s.invitoAperto && bersaglio.closest('button[data-storia-invito-apri]')) {
    c.inizioTrascinamento = { ...punto, da: 'pillola' };
    return;
  }
  if (bersaglio.closest('a, button')) return;
  if (bersaglio.closest('[data-storia-tocchi]')) {
    c.inizioTrascinamento = { ...punto, da: 'tocchi' };
    // A scheda aperta la storia è già ferma: la pressione non nasconde nulla.
    if (s.invitoAperto) return;
    clearTimeout(s.nascondi);
    s.nascondi = window.setTimeout(() => {
      s.nascondi = 0;
      if (c.storia === s && s.premuto) s.dialog.setAttribute('data-storia-nascosta', '');
    }, NASCONDI_DOPO_MS);
  } else if (s.invitoAperto && bersaglio.closest('[data-storia-invito]:not([hidden])')) {
    c.inizioTrascinamento = { ...punto, da: 'invito' };
  }
}

/** Vero se il puntatore, in (`x`, `y`), è oltre `SOGLIA_MOVIMENTO_PX` su un asse dall'inizio. */
function oltreSoglia(inizio: { x: number; y: number }, x: number, y: number): boolean {
  return (
    Math.abs(x - inizio.x) > SOGLIA_MOVIMENTO_PX || Math.abs(y - inizio.y) > SOGLIA_MOVIMENTO_PX
  );
}

/**
 * Il puntatore si sposta durante un trascinamento dalla zona dei tocchi o dalla
 * pillola: oltre `SOGLIA_MOVIMENTO_PX` non è più un tocco (né un clic), e un
 * trascinamento lento dalla zona non nasconde l'interfaccia. Senza trascinamento
 * in corso non fa nulla.
 */
function muoviTrascinamento(c: Contesto, evento: PointerEvent): void {
  const inizio = c.inizioTrascinamento;
  if (!inizio || inizio.mosso || inizio.da === 'invito' || evento.pointerId !== inizio.id) return;
  if (!oltreSoglia(inizio, evento.clientX, evento.clientY)) return;
  inizio.mosso = true;
  if (inizio.da === 'tocchi' && c.storia) mostraInterfaccia(c.storia);
}

/**
 * Rilascio del puntatore primario: il trascinamento cominciato da
 * `iniziaTrascinamento` finisce. Se si è spostato oltre `SOGLIA_MOVIMENTO_PX` su
 * un asse non era un tocco (il clic che segue non fa nulla); il gesto lo dice
 * `gestoDellaStoria`. Va chiamata dopo `finisciTocco`, che misura la durata del tocco.
 */
function finisciTrascinamento(c: Contesto, evento: PointerEvent): void {
  if (!evento.isPrimary) return;
  const inizio = c.inizioTrascinamento;
  c.inizioTrascinamento = null;
  const s = c.storia;
  if (!inizio || !s) return;
  const mosso = inizio.mosso || oltreSoglia(inizio, evento.clientX, evento.clientY);
  // Non era un clic: quello che segue non apre, né chiude, la scheda.
  if (mosso) {
    c.durataTocco = Number.NaN;
    c.clicAnnullatoFino = evento.timeStamp + CLIC_DOPO_TRASCINAMENTO_MS;
  }
  const gesto = gestoDellaStoria(evento.clientX - inizio.x, evento.clientY - inizio.y);
  if (inizio.da === 'pillola') {
    if (gesto === 'invito') apriInvito(c);
  } else if (inizio.da === 'tocchi' && !s.invitoAperto) {
    if (gesto === 'chiudi') s.dialog.close();
    else if (gesto === 'invito') apriInvito(c);
  } else if (gesto === 'chiudi') {
    // Dalla scheda, o dalla zona dei tocchi a scheda aperta: si chiude solo la scheda.
    chiudiInvito(c);
  }
}

// --- Avvio ---

const AZIONI: [
  selettore: string,
  azione: (c: Contesto, el: HTMLElement, evento: MouseEvent) => void,
][] = [
  // Un link del menu porta altrove nella pagina: il menu si richiude.
  [
    '[data-menu] a[href]',
    (c, link) => {
      const pannello = link.closest<HTMLElement>('[data-menu]');
      if (pannello) impostaAperto(c, pannello, false);
    },
  ],
  [APRITORI, alternaPannello],
  ['[data-interruttore]', (_c, el) => alternaInterruttore(el)],
  ['[data-filtro]', scegliFiltro],
  ['[data-mostra-altri]', mostraAltri],
  ['[data-limite-mostra]', mostraTutti],
  ['[data-galleria-prec]', (c, el) => spostaGalleria(c, el, -1)],
  ['[data-galleria-succ]', (c, el) => spostaGalleria(c, el, 1)],
  ['button[data-galleria-punto]', vaiAlPunto],
  ['button[data-galleria-pausa]', alternaPausaGalleria],
  ['button[data-colore]', scegliColore],
  ['[data-storia-apri]', apriStoria],
  ['[data-storia-tocchi]', toccoSullaStoria],
  ['button[data-storia-altro]', alternaFrase],
  ['button[data-storia-invito-apri]', (c, _el, evento) => clicSullaPillola(c, evento)],
  ['button[data-storia-invito-chiudi]', (c) => chiudiInvito(c)],
  ['[data-storia-prec]', (c) => indietroStoria(c)],
  ['[data-storia-succ]', (c) => avantiStoria(c)],
  ['[data-storia-pausa]', (c) => alternaPausa(c)],
  ['[data-storia-chiudi], [data-post-chiudi]', (_c, el) => chiudiDialog(el)],
  ['[data-post-apri]', apriPost],
];

/**
 * Fa funzionare il markup dei protocolli dentro `radice` (per delega: vale anche
 * per gli elementi aggiunti dopo). Fa eccezione il protocollo Limite: i suoi
 * ascoltatori di `matchMedia` si registrano all'avvio e coprono solo i
 * `[data-limite]` presenti allora. Chiamarla due volte sulla stessa radice non fa nulla.
 */
export function avviaInterazioni(radice: ParentNode = document): void {
  if (avviate.has(radice)) return;
  avviate.add(radice);
  const c: Contesto = {
    radice,
    altriMostrati: new Set(),
    limiteAperto: new Set(),
    apertoDa: new WeakMap(),
    storia: null,
    giri: new Map(),
    inizioPressione: null,
    inizioTocco: Number.NaN,
    durataTocco: Number.NaN,
    inizioTrascinamento: null,
    clicAnnullatoFino: Number.NEGATIVE_INFINITY,
  };

  // Stato iniziale: la pagina può arrivare con più o meno già scritto.
  sincronizzaPannelli(c);
  aggiornaStato(c);
  if (elementi(radice, '[data-stato-negozio]').length > 0) {
    setInterval(() => aggiornaStato(c), RICALCOLO_STATO_MS);
  }
  for (const contenitore of elementi(radice, '[data-filtri]')) {
    const attivo = filtroAttivo(c, contenitore.dataset.filtri ?? '');
    for (const bottone of elementi(contenitore, '[data-filtro]')) {
      bottone.setAttribute('aria-pressed', String(bottone.dataset.filtro === attivo));
    }
  }
  applicaFiltri(c);
  // I giri si registrano prima di disegnare la foto attuale (che ne scrive l'avanzamento) e partono dopo.
  for (const galleria of elementi(radice, '[data-galleria][data-galleria-auto]')) {
    registraGiro(c, galleria);
  }
  for (const galleria of elementi(radice, '[data-galleria]')) {
    mostraFoto(c, galleria, fotoCorrente(galleria));
  }
  for (const [galleria, giro] of c.giri) avviaGiro(c, galleria, giro);
  // Un link che apre un post: con lo script apre un dialog, e i lettori di schermo lo sanno.
  for (const link of elementi(radice, 'a[data-post-apri]')) {
    if (dialogDelPost(c, link)) link.setAttribute('aria-haspopup', 'dialog');
  }

  radice.addEventListener('click', (evento) => {
    const bersaglio = evento.target;
    if (!(bersaglio instanceof Element)) return;
    // A scheda aperta un clic fuori dai suoi link chiude solo la scheda, anche sullo sfondo del dialog.
    if (clicChiudeInvito(c, bersaglio, evento as MouseEvent)) {
      chiudiInvito(c);
      return;
    }
    // Clic sullo sfondo del dialog (e non la fine di un trascinamento che parte da dentro).
    if (bersaglio instanceof HTMLDialogElement) {
      if (bersaglio.matches(DIALOG) && c.inizioPressione === bersaglio) bersaglio.close();
      return;
    }
    for (const [selettore, azione] of AZIONI) {
      const el = bersaglio.closest<HTMLElement>(selettore);
      if (el) {
        azione(c, el, evento as MouseEvent);
        return;
      }
    }
  });

  radice.addEventListener('keydown', (evento) => {
    const tasto = evento as KeyboardEvent;
    // Un clic da tastiera (Invio, Spazio) non è la fine di un trascinamento.
    c.clicAnnullatoFino = Number.NEGATIVE_INFINITY;
    if (tasto.key === 'Escape') {
      // Con un dialog aperto ci pensa lui.
      if (!radice.querySelector('dialog[open]')) chiudiPannelliAperti(c);
    } else if (
      c.storia &&
      (tasto.key === 'ArrowRight' || tasto.key === 'ArrowLeft') &&
      !tasto.altKey &&
      !tasto.ctrlKey &&
      !tasto.metaKey
    ) {
      tasto.preventDefault();
      if (tasto.key === 'ArrowRight') avantiStoria(c);
      else indietroStoria(c);
    }
  });

  // Il puntatore (dito, penna, mouse): pressione, rilascio, annullamento, per le
  // storie (tenere premuto, misurare un tocco, trascinare).
  radice.addEventListener('pointerdown', (evento) => {
    c.inizioPressione = evento.target;
    const bersaglio = evento.target;
    // Tenendo premuto sulla storia (la foto o la zona dei tocchi, che le sta sopra)
    // l'avanzamento si ferma. Solo il puntatore primario: un secondo dito non conta.
    if (
      c.storia &&
      (evento as PointerEvent).isPrimary &&
      bersaglio instanceof Element &&
      c.storia.dialog.contains(bersaglio) &&
      !bersaglio.closest('button, a')
    ) {
      c.storia.premuto = true;
    }
    iniziaTocco(c, evento as PointerEvent);
    iniziaTrascinamento(c, evento as PointerEvent);
  });
  radice.addEventListener('pointermove', (evento) => {
    if (c.inizioTrascinamento) muoviTrascinamento(c, evento as PointerEvent);
  });
  // Il rilascio, o l'annullamento, del puntatore primario fa ripartire la storia
  // e rimette l'interfaccia: alzare un secondo dito non la fa ripartire sotto il primo.
  const rilascia = (evento: PointerEvent) => {
    if (!c.storia || !evento.isPrimary) return;
    c.storia.premuto = false;
    mostraInterfaccia(c.storia);
  };
  radice.addEventListener('pointerup', (evento) => {
    rilascia(evento as PointerEvent);
    finisciTocco(c, evento as PointerEvent);
    finisciTrascinamento(c, evento as PointerEvent);
  });
  radice.addEventListener('pointercancel', (evento) => {
    if (!(evento as PointerEvent).isPrimary) return;
    rilascia(evento as PointerEvent);
    c.inizioTrascinamento = null;
  });

  // Tenendo premuto su una foto il browser aprirebbe il menu dell'immagine: nel
  // dialog delle storie si annulla, tranne che su link e pulsanti.
  radice.addEventListener('contextmenu', (evento) => {
    const bersaglio = evento.target;
    if (
      bersaglio instanceof Element &&
      bersaglio.closest('dialog[data-storie]') &&
      !bersaglio.closest('a, button')
    ) {
      evento.preventDefault();
    }
  });

  // Un focus arrivato con la tastiera (`:focus-visible`: non un clic) su un
  // controllo della storia la ferma, perché si possa leggere e usare senza
  // rincorrere il tempo. Il pulsante `data-storia-pausa` la riprende e il focus
  // che non si sposta non la ferma di nuovo (le frecce continuano a funzionare).
  radice.addEventListener('focusin', (evento) => {
    const bersaglio = evento.target;
    if (
      c.storia &&
      bersaglio instanceof Element &&
      c.storia.dialog.contains(bersaglio) &&
      bersaglio.matches(':focus-visible')
    ) {
      c.storia.pausaUtente = true;
      sincronizzaPausa(c.storia);
    }
  });

  // Una scheda in secondo piano non avanza (il browser ferma i fotogrammi): al
  // ritorno il tempo di assenza non conta, né per le storie né per i giri. L'orologio
  // dei giri si spegne quando la scheda si nasconde e si riaccende, riallineato, al ritorno.
  document.addEventListener('visibilitychange', () => {
    if (c.storia) c.storia.ultimoFrame = performance.now();
    for (const galleria of c.giri.keys()) aggiornaOrologio(c, galleria);
  });

  // `close` non risale: si ascolta in cattura.
  radice.addEventListener(
    'close',
    (evento) => {
      const dialog = evento.target;
      if (dialog instanceof HTMLDialogElement && dialog.matches(DIALOG)) allaChiusura(c, dialog);
    },
    true,
  );
  // Esc con la scheda degli inviti aperta chiude solo lei, non il lettore. Anche
  // `cancel` non risale: si ascolta in cattura. Se il browser non lo lascia
  // annullare (Esc ripetuto senza altri gesti), il dialog si chiude e basta.
  radice.addEventListener(
    'cancel',
    (evento) => {
      if (!c.storia?.invitoAperto || evento.target !== c.storia.dialog) return;
      if (!evento.cancelable) return;
      evento.preventDefault();
      chiudiInvito(c);
    },
    true,
  );
  // Il limite dipende dalla misura dello schermo: si ricalcola quando cambia una
  // delle sue media query (il telefono ruotato, la finestra allargata), non a
  // ogni `resize`. Un ascoltatore per media query distinta.
  const medie = new Set(
    elementi(radice, '[data-limite]').flatMap((el) => regoleDi(el).map((r) => r.media)),
  );
  for (const media of medie) {
    matchMedia(media).addEventListener('change', () => applicaFiltri(c));
  }
  // Le foto saltate dipendono dalla misura dello schermo, come il limite: quando
  // cambia una loro media query, se la foto attuale non è più attiva si passa a
  // un'altra, e il contatore si ricalcola. Solo le gallerie presenti all'avvio.
  const medieSalta = new Set(
    elementi(radice, '[data-galleria-salta]').map((foto) => foto.dataset.galleriaSalta ?? ''),
  );
  medieSalta.delete('');
  for (const media of medieSalta) {
    matchMedia(media).addEventListener('change', () => {
      for (const galleria of elementi(radice, '[data-galleria]').filter(conFotoSaltate)) {
        mostraFoto(c, galleria, fotoCorrente(galleria));
      }
    });
  }
  // Con "riduci movimento" le gallerie che girano da sole stanno ferme: se la
  // preferenza passa a `reduce` a pagina aperta, si fermano. Se torna a
  // `no-preference` non ripartono da sole (e una pausa scelta resta): le fa
  // ripartire chi guarda, con la pausa.
  if (c.giri.size > 0) {
    matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', (evento) => {
      if (!evento.matches) return;
      for (const galleria of c.giri.keys()) impostaFerma(c, galleria, true);
    });
  }
}
