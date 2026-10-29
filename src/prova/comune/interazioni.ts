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
//   toccando un link del pannello.
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
// - Chiedi: `button[data-chiedi="<id>"]` (`aria-expanded`) mostra o nasconde
//   `[data-chiedi-pannello="<id>"]`. Altri pulsanti con lo stesso `<id>`, anche
//   dentro il pannello, fanno lo stesso. Esc lo chiude.
// - Galleria: `[data-galleria]` con `[data-galleria-foto]` (una alla volta, le
//   altre `hidden`), `button[data-galleria-prec|succ]` (a giro),
//   `button[data-galleria-punto]` (`aria-current`) e `[data-galleria-contatore]`
//   ("1 di 3").
// - Carosello: `[data-carosello]` con `[data-carosello-binario]` (scroll-snap) e
//   `button[data-carosello-prec|succ]`: scorrono di una larghezza visibile e
//   hanno `aria-disabled="true"` agli estremi.
// - Storie: `button[data-storia-apri="<g>"]` apre `dialog[data-storie]`, che ha i
//   gruppi `[data-storia-gruppo="<g>"]` (uno visibile alla volta), in ognuno le
//   foto `[data-storia-foto]` e, nello stesso ordine, le barre
//   `[data-storia-barra]` (avanzamento in `--avanzamento`, da 0 a 1). Pulsanti
//   `[data-storia-prec|succ|chiudi]`, frecce della tastiera; alla fine
//   dell'ultima foto si chiude. Il pulsante di un gruppo mostrato riceve
//   `data-vista`.
// - Post: `button[data-post-apri="<id>"]` apre `dialog[data-post="<id>"]`; dentro
//   può esserci una galleria; `button[data-post-chiudi]` lo chiude.
// - Mostra altri: `button[data-mostra-altri="<nome>"]` toglie `hidden` a
//   `[data-altro="<nome>"]` e poi sparisce.
//
// I dialog si aprono con `showModal()`, si chiudono con Esc (o con un clic sullo
// sfondo: il `dialog` non deve avere un riempimento) e restituiscono il focus al
// pulsante da cui si sono aperti.
import { filtra } from './filtra';
import { oraDiRoma, statoNegozio, testoStato, type Fascia } from './orari';
import { avanti, indietro, type Posizione } from './sequenza';

/** Quanto resta ferma ogni foto di una storia prima di passare alla successiva. */
const DURATA_FOTO_MS = 6000;
/** Ogni quanto si ricalcola "aperto ora". */
const RICALCOLO_STATO_MS = 60_000;

const PANNELLI = '[data-menu], [data-chiedi-pannello]';
const APRITORI = '[data-menu-apri], [data-chiedi]';
const DIALOG = 'dialog[data-post], dialog[data-storie]';

type GruppoStoria = { gruppo: HTMLElement; foto: HTMLElement[]; barre: HTMLElement[] };

type StatoStoria = {
  dialog: HTMLDialogElement;
  gruppi: GruppoStoria[];
  posizione: Posizione;
  /** Millisecondi passati sulla foto corrente. */
  trascorso: number;
  /** Vero mentre si tiene premuto sulla foto. */
  inPausa: boolean;
  frame: number;
  ultimoFrame: number;
};

type Contesto = {
  radice: ParentNode;
  /** Nomi dei gruppi per cui è stato premuto "Mostra altri". */
  altriMostrati: Set<string>;
  /** Da quale pulsante si è aperto ogni dialog, per restituirgli il focus. */
  apertoDa: WeakMap<HTMLDialogElement, HTMLElement>;
  storia: StatoStoria | null;
  /** Dove è cominciata l'ultima pressione del puntatore (per il clic sullo sfondo). */
  inizioPressione: EventTarget | null;
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

// --- Menu e "Chiedi": un pulsante che apre e chiude un pannello con `hidden` ---

function pannelloDelBottone(c: Contesto, bottone: HTMLElement): HTMLElement | null {
  if (bottone.dataset.chiedi !== undefined) {
    return c.radice.querySelector<HTMLElement>(
      conValore('data-chiedi-pannello', bottone.dataset.chiedi),
    );
  }
  const id = bottone.getAttribute('aria-controls');
  return id ? c.radice.querySelector<HTMLElement>(`#${CSS.escape(id)}`) : null;
}

function bottoniDelPannello(c: Contesto, pannello: HTMLElement): HTMLElement[] {
  return elementi(c.radice, APRITORI).filter((b) => pannelloDelBottone(c, b) === pannello);
}

function impostaAperto(c: Contesto, pannello: HTMLElement, aperto: boolean): void {
  pannello.hidden = !aperto;
  for (const bottone of bottoniDelPannello(c, pannello)) {
    bottone.setAttribute('aria-expanded', String(aperto));
  }
}

function alternaPannello(c: Contesto, bottone: HTMLElement): void {
  const pannello = pannelloDelBottone(c, bottone);
  if (pannello) impostaAperto(c, pannello, pannello.hidden);
}

/** Allinea `aria-expanded` di ogni pulsante allo stato scritto nella pagina. */
function sincronizzaPannelli(c: Contesto): void {
  for (const bottone of elementi(c.radice, APRITORI)) {
    const pannello = pannelloDelBottone(c, bottone);
    if (pannello) bottone.setAttribute('aria-expanded', String(!pannello.hidden));
  }
}

/** Esc chiude i pannelli aperti; il focus torna al pulsante solo se era lì dentro. */
function chiudiPannelliAperti(c: Contesto): void {
  const attivo = document.activeElement;
  for (const pannello of elementi(c.radice, PANNELLI).filter((p) => !p.hidden)) {
    const bottoni = bottoniDelPannello(c, pannello);
    const aveva = !!attivo && (pannello.contains(attivo) || bottoni.includes(attivo as HTMLElement));
    impostaAperto(c, pannello, false);
    if (aveva) bottoni.find((b) => !pannello.contains(b))?.focus();
  }
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

// --- Filtri e "Mostra altri" ---
//
// Una voce può essere filtrabile e anche piegata da "Mostra altri": la sua
// visibilità la decidono insieme `applicaFiltri` e `altriMostrati`.

function categorieDi(voce: HTMLElement): string[] {
  return (voce.dataset.categorie ?? '').split(/\s+/).filter(Boolean);
}

function filtroAttivo(c: Contesto, nome: string): string {
  const contenitore = c.radice.querySelector<HTMLElement>(conValore('data-filtri', nome));
  const premuto = contenitore?.querySelector<HTMLElement>('[data-filtro][aria-pressed="true"]');
  return premuto?.dataset.filtro ?? 'tutti';
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
    for (const { el } of voci) {
      const gruppoAltri = el.dataset.altro;
      const piegata =
        gruppoAltri !== undefined && filtro === 'tutti' && !c.altriMostrati.has(gruppoAltri);
      el.hidden = !corrispondenti.has(el) || piegata;
      if (gruppoAltri !== undefined && filtro !== 'tutti') altriInutili.add(gruppoAltri);
    }
    for (const vuoto of elementi(c.radice, conValore('data-filtro-vuoto', nome))) {
      vuoto.hidden = corrispondenti.size > 0;
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
  // Un carosello filtrato riparte dalla prima voce che resta.
  const nome = contenitore.dataset.filtri ?? '';
  const binari = new Set(
    elementi(c.radice, conValore('data-filtrabile', nome)).map((voce) =>
      voce.closest<HTMLElement>('[data-carosello-binario]'),
    ),
  );
  for (const binario of binari) binario?.scrollTo({ left: 0 });
  aggiornaCaroselli(c);
}

function mostraAltri(c: Contesto, bottone: HTMLElement): void {
  const nome = bottone.dataset.mostraAltri ?? '';
  c.altriMostrati.add(nome);
  const voci = elementi(c.radice, conValore('data-altro', nome));
  for (const voce of voci) voce.hidden = false;
  applicaFiltri(c); // una voce che non passa il filtro torna nascosta
  // Il pulsante sparisce: il focus passa alla prima voce comparsa.
  const prima = voci.find((voce) => !voce.hidden);
  const comando = prima?.matches('a[href], button')
    ? prima
    : prima?.querySelector<HTMLElement>('a[href], button');
  comando?.focus();
}

// --- Galleria ---

function fotoCorrente(galleria: HTMLElement): number {
  return Math.max(0, elementi(galleria, '[data-galleria-foto]').findIndex((foto) => !foto.hidden));
}

function mostraFoto(galleria: HTMLElement, indice: number): void {
  const foto = elementi(galleria, '[data-galleria-foto]');
  if (foto.length === 0) return;
  const attuale = ((indice % foto.length) + foto.length) % foto.length;
  foto.forEach((una, i) => {
    una.hidden = i !== attuale;
  });
  elementi(galleria, '[data-galleria-punto]').forEach((punto, i) => {
    if (i === attuale) punto.setAttribute('aria-current', 'true');
    else punto.removeAttribute('aria-current');
  });
  for (const contatore of elementi(galleria, '[data-galleria-contatore]')) {
    contatore.textContent = `${attuale + 1} di ${foto.length}`;
  }
}

function spostaGalleria(bottone: HTMLElement, passo: number): void {
  const galleria = bottone.closest<HTMLElement>('[data-galleria]');
  if (galleria) mostraFoto(galleria, fotoCorrente(galleria) + passo);
}

function vaiAlPunto(bottone: HTMLElement): void {
  const galleria = bottone.closest<HTMLElement>('[data-galleria]');
  if (!galleria) return;
  mostraFoto(galleria, elementi(galleria, '[data-galleria-punto]').indexOf(bottone));
}

// --- Carosello ---

function aggiornaCarosello(binario: HTMLElement): void {
  const carosello = binario.closest<HTMLElement>('[data-carosello]');
  if (!carosello) return;
  const alInizio = binario.scrollLeft <= 1;
  const allaFine = binario.scrollLeft + binario.clientWidth >= binario.scrollWidth - 1;
  for (const b of elementi(carosello, '[data-carosello-prec]')) {
    b.setAttribute('aria-disabled', String(alInizio));
  }
  for (const b of elementi(carosello, '[data-carosello-succ]')) {
    b.setAttribute('aria-disabled', String(allaFine));
  }
}

function aggiornaCaroselli(c: Contesto): void {
  for (const binario of elementi(c.radice, '[data-carosello-binario]')) aggiornaCarosello(binario);
}

function scorriCarosello(bottone: HTMLElement, verso: 1 | -1): void {
  if (bottone.getAttribute('aria-disabled') === 'true') return;
  const binario = bottone
    .closest<HTMLElement>('[data-carosello]')
    ?.querySelector<HTMLElement>('[data-carosello-binario]');
  binario?.scrollBy({
    left: verso * binario.clientWidth,
    behavior: movimentoRidotto() ? 'auto' : 'smooth',
  });
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

function apriPost(c: Contesto, bottone: HTMLElement): void {
  const dialog = c.radice.querySelector<HTMLDialogElement>(
    `dialog${conValore('data-post', bottone.dataset.postApri ?? '')}`,
  );
  if (dialog) apriDialog(c, dialog, bottone);
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
    }))
    .filter((g) => g.foto.length > 0);
  const indice = gruppi.findIndex((g) => g.gruppo === gruppo);
  if (indice < 0) return;
  c.storia = {
    dialog,
    gruppi,
    posizione: { gruppo: indice, foto: 0 },
    trascorso: 0,
    inPausa: false,
    frame: 0,
    ultimoFrame: 0,
  };
  apriDialog(c, dialog, bottone);
  mostraStoria(c, { gruppo: indice, foto: 0 });
}

function mostraStoria(c: Contesto, posizione: Posizione): void {
  const s = c.storia;
  const corrente = s?.gruppi[posizione.gruppo];
  if (!s || !corrente) return;
  s.posizione = posizione;
  s.trascorso = 0;
  s.gruppi.forEach((g, i) => {
    g.gruppo.hidden = i !== posizione.gruppo;
  });
  corrente.foto.forEach((foto, i) => {
    foto.hidden = i !== posizione.foto;
  });
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
  if (!s.inPausa) s.trascorso += Math.max(0, ora - s.ultimoFrame);
  s.ultimoFrame = ora;
  const avanzamento = Math.min(s.trascorso / DURATA_FOTO_MS, 1);
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

function fermaStoria(c: Contesto): void {
  if (c.storia) cancelAnimationFrame(c.storia.frame);
  c.storia = null;
}

// --- Avvio ---

const AZIONI: [selettore: string, azione: (c: Contesto, el: HTMLElement) => void][] = [
  // Un link del menu porta altrove nella pagina: il menu si richiude.
  [
    '[data-menu] a[href]',
    (c, link) => {
      const pannello = link.closest<HTMLElement>('[data-menu]');
      if (pannello) impostaAperto(c, pannello, false);
    },
  ],
  [APRITORI, alternaPannello],
  ['[data-filtro]', scegliFiltro],
  ['[data-mostra-altri]', mostraAltri],
  ['[data-galleria-prec]', (_c, el) => spostaGalleria(el, -1)],
  ['[data-galleria-succ]', (_c, el) => spostaGalleria(el, 1)],
  ['[data-galleria-punto]', (_c, el) => vaiAlPunto(el)],
  ['[data-carosello-prec]', (_c, el) => scorriCarosello(el, -1)],
  ['[data-carosello-succ]', (_c, el) => scorriCarosello(el, 1)],
  ['[data-storia-apri]', apriStoria],
  ['[data-storia-prec]', (c) => indietroStoria(c)],
  ['[data-storia-succ]', (c) => avantiStoria(c)],
  ['[data-storia-chiudi], [data-post-chiudi]', (_c, el) => chiudiDialog(el)],
  ['[data-post-apri]', apriPost],
];

/**
 * Fa funzionare il markup dei protocolli dentro `radice` (per delega: vale anche
 * per gli elementi aggiunti dopo). Chiamarla due volte sulla stessa radice non fa nulla.
 */
export function avviaInterazioni(radice: ParentNode = document): void {
  if (avviate.has(radice)) return;
  avviate.add(radice);
  const c: Contesto = {
    radice,
    altriMostrati: new Set(),
    apertoDa: new WeakMap(),
    storia: null,
    inizioPressione: null,
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
  for (const galleria of elementi(radice, '[data-galleria]')) {
    mostraFoto(galleria, fotoCorrente(galleria));
  }
  aggiornaCaroselli(c);

  radice.addEventListener('click', (evento) => {
    const bersaglio = evento.target;
    if (!(bersaglio instanceof Element)) return;
    // Clic sullo sfondo del dialog (e non la fine di un trascinamento che parte da dentro).
    if (bersaglio instanceof HTMLDialogElement) {
      if (bersaglio.matches(DIALOG) && c.inizioPressione === bersaglio) bersaglio.close();
      return;
    }
    for (const [selettore, azione] of AZIONI) {
      const el = bersaglio.closest<HTMLElement>(selettore);
      if (el) {
        azione(c, el);
        return;
      }
    }
  });

  radice.addEventListener('keydown', (evento) => {
    const tasto = evento as KeyboardEvent;
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

  // Tenendo premuto su una foto della storia l'avanzamento si ferma.
  radice.addEventListener('pointerdown', (evento) => {
    c.inizioPressione = evento.target;
    const bersaglio = evento.target;
    if (
      c.storia &&
      bersaglio instanceof Element &&
      c.storia.dialog.contains(bersaglio) &&
      !bersaglio.closest('button, a')
    ) {
      c.storia.inPausa = true;
    }
  });
  const rilascia = () => {
    if (c.storia) c.storia.inPausa = false;
  };
  radice.addEventListener('pointerup', rilascia);
  radice.addEventListener('pointercancel', rilascia);

  // Una scheda in secondo piano non avanza (il browser ferma i fotogrammi): al
  // ritorno il tempo di assenza non conta.
  document.addEventListener('visibilitychange', () => {
    if (c.storia) c.storia.ultimoFrame = performance.now();
  });

  // `close` e `scroll` non risalgono: si ascoltano in cattura.
  radice.addEventListener(
    'close',
    (evento) => {
      const dialog = evento.target;
      if (dialog instanceof HTMLDialogElement && dialog.matches(DIALOG)) allaChiusura(c, dialog);
    },
    true,
  );
  radice.addEventListener(
    'scroll',
    (evento) => {
      const binario = evento.target;
      if (binario instanceof HTMLElement && binario.matches('[data-carosello-binario]')) {
        aggiornaCarosello(binario);
      }
    },
    true,
  );
  addEventListener('resize', () => aggiornaCaroselli(c));
}
