import picomatch from 'picomatch';
import { diffFields, levelForField } from './diff';
import { parseContent } from './parse';
import { codice, formattaNumero } from './testo';
import type {
  Azione,
  ChangedFile,
  CollectionRule,
  Livello,
  PullRequestInput,
  Rules,
  Verdict,
  Violazione,
} from './types';

// Valuta una proposta contro le regole di autonomia. È un controllo di
// sicurezza: nel dubbio una proposta si respinge (percorsi anomali, formato
// illeggibile, dimensione sconosciuta). Nessuna regola vuol dire livello 0.

// I messaggi sono per una persona che non conosce Git: niente gergo.
// Non contengono percorsi né nomi di campo, perché il rapporto li mostra già
// accanto a ogni messaggio (file e campo sono nella violazione).
const MESSAGGI = {
  autore: (autore: string) =>
    `L'utente ${codice(`@${autore}`)} non è autorizzato a proporre modifiche a questo sito.`,
  bozza:
    'La proposta è ancora una bozza: verrà controllata quando la invii per la revisione dal pannello dei contenuti.',
  nonInviata:
    'La proposta non è stata ancora inviata per la revisione: invia la proposta dal pannello dei contenuti perché venga controllata.',
  perimetro:
    'Questo file non rientra tra quelli che puoi modificare: dal pannello puoi cambiare solo i contenuti e le immagini del sito.',
  nomeNonValido:
    'Il nome di questo file non è valido, quindi non è possibile verificarlo.',
  origineSconosciuta:
    'Non si sa da quale file arrivi questo spostamento, quindi non è possibile verificarlo.',
  statoSconosciuto:
    'Questo tipo di modifica non è riconosciuto, quindi non è possibile verificarla.',
  crea: 'Non puoi creare nuovi contenuti.',
  elimina: 'Non puoi eliminare questo contenuto.',
  modifica: 'Non puoi modificare questo contenuto.',
  campo: 'Questo campo non può essere modificato.',
  carica: 'Non puoi caricare nuove immagini.',
  eliminaImmagine: 'Non puoi eliminare questa immagine.',
  rinominaCrea:
    'Non puoi rinominare o spostare i file: equivale a crearne uno nuovo.',
  rinominaElimina:
    'Non puoi rinominare o spostare i file: equivale a eliminare quello originale.',
  formato:
    'Il contenuto di questo file non è leggibile o non è valido, quindi non è possibile verificare la modifica.',
  tipoNonAmmesso: (estensioni: string[]) => {
    const formati = estensioni.map((voce) => voce.toUpperCase());
    const elenco =
      formati.length > 1
        ? `${formati.slice(0, -1).join(', ')} o ${formati[formati.length - 1]}`
        : formati.join('');
    return formati.length === 0
      ? 'Questo tipo di file non è ammesso: al momento non si possono caricare immagini.'
      : `Questo tipo di file non è ammesso: puoi caricare solo immagini ${elenco}.`;
  },
  dimensione: (kb: number, massimoKb: number) =>
    `Il file pesa ${formattaNumero(kb)} KB, più del massimo consentito di ${formattaNumero(massimoKb)} KB. Riduci le dimensioni dell'immagine e riprova.`,
  dimensioneSconosciuta:
    'Non è stato possibile verificare la dimensione di questo file, quindi non può essere accettato.',
} as const;

type Verifica = (percorso: string) => boolean;

interface Contesto {
  rules: Rules;
  collezioni: Array<{ regola: CollectionRule; corrisponde: Verifica }>;
  media: Verifica;
}

type Destinazione =
  | { tipo: 'collection'; regola: CollectionRule }
  | { tipo: 'media' }
  | { tipo: 'altro' };

/** Risultato parziale della valutazione di un file. */
interface Parziale {
  violazioni: Violazione[];
  livelli: Livello[];
}

// I percorsi sono quelli di GitHub, con `/` come separatore: `windows: false`
// li tiene tali anche se lo script gira su Windows, e un backslash resta un
// carattere qualunque (quindi fuori da ogni regola). I file che iniziano con
// un punto non corrispondono ai caratteri jolly.
const OPZIONI_GLOB = { windows: false, dot: false } as const;

function creaVerifica(glob: string | string[]): Verifica {
  const elenco = Array.isArray(glob) ? glob : [glob];
  if (elenco.length === 0) return () => false;
  return picomatch(elenco, OPZIONI_GLOB);
}

function creaContesto(rules: Rules): Contesto {
  return {
    rules,
    collezioni: Object.values(rules.contenuti).map((regola) => ({
      regola,
      corrisponde: creaVerifica(regola.file),
    })),
    media: creaVerifica(rules.media.percorsi),
  };
}

/** Percorso relativo, senza `.`, `..`, segmenti vuoti, backslash o byte nulli. */
function percorsoValido(percorso: string): boolean {
  if (percorso === '' || percorso.includes('\\') || percorso.includes('\0')) {
    return false;
  }
  return percorso
    .split('/')
    .every((segmento) => segmento !== '' && segmento !== '.' && segmento !== '..');
}

function classifica(percorso: string, ctx: Contesto): Destinazione {
  if (!percorsoValido(percorso)) return { tipo: 'altro' };
  const collezione = ctx.collezioni.find((c) => c.corrisponde(percorso));
  if (collezione) return { tipo: 'collection', regola: collezione.regola };
  if (ctx.media(percorso)) return { tipo: 'media' };
  return { tipo: 'altro' };
}

function viola(
  file: string,
  azione: Azione,
  messaggio: string,
  campo?: string,
): Violazione {
  return campo === undefined
    ? { file, azione, messaggio }
    : { file, campo, azione, messaggio };
}

const conViolazione = (violazione: Violazione): Parziale => ({
  violazioni: [violazione],
  livelli: [],
});

const unisci = (a: Parziale, b: Parziale): Parziale => ({
  violazioni: [...a.violazioni, ...b.violazioni],
  livelli: [...a.livelli, ...b.livelli],
});

function fuoriPerimetro(file: string, messaggio: string = MESSAGGI.perimetro): Parziale {
  return conViolazione(viola(file, 'perimetro', messaggio));
}

/** Un'azione ammessa tocca il suo livello; a livello 0 è una violazione. */
function conLivello(
  file: string,
  azione: Azione,
  livello: Livello,
  messaggio: string,
): Parziale {
  return livello === 0
    ? conViolazione(viola(file, azione, messaggio))
    : { violazioni: [], livelli: [livello] };
}

/** Minuscole solo per le lettere ASCII: niente sorprese con altri alfabeti. */
const minuscolo = (testo: string): string =>
  testo.replace(/[A-Z]/g, (lettera) => lettera.toLowerCase());

/** Estensione dopo l'ultimo punto del nome del file ('' se non c'è). */
function estensioneDi(percorso: string): string {
  const nome = percorso.slice(percorso.lastIndexOf('/') + 1);
  const punto = nome.lastIndexOf('.');
  return punto <= 0 ? '' : nome.slice(punto + 1);
}

/**
 * I file caricati devono avere una delle estensioni ammesse (immagini
 * raster): un SVG o un HTML caricato come "immagine" sarebbe servito dallo
 * stesso indirizzo del pannello di gestione e potrebbe eseguire codice. La
 * violazione ha azione `formato`.
 */
function controllaEstensione(file: ChangedFile, ctx: Contesto): Violazione[] {
  const ammesse = ctx.rules.media.estensioni.map(minuscolo);
  if (ammesse.includes(minuscolo(estensioneDi(file.path)))) return [];
  return [
    viola(
      file.path,
      'formato',
      MESSAGGI.tipoNonAmmesso(ctx.rules.media.estensioni),
    ),
  ];
}

/** Controlli sui file media caricati: tipo di file e dimensione. */
function controllaMedia(file: ChangedFile, ctx: Contesto): Violazione[] {
  return [...controllaEstensione(file, ctx), ...controllaDimensione(file, ctx)];
}

function controllaDimensione(file: ChangedFile, ctx: Contesto): Violazione[] {
  const dimensione = file.sizeBytes;
  if (
    dimensione === undefined ||
    !Number.isFinite(dimensione) ||
    dimensione < 0
  ) {
    return [viola(file.path, 'dimensione', MESSAGGI.dimensioneSconosciuta)];
  }
  const massimoKb = ctx.rules.media.dimensione_massima_kb;
  if (dimensione > massimoKb * 1024) {
    return [
      viola(
        file.path,
        'dimensione',
        MESSAGGI.dimensione(Math.ceil(dimensione / 1024), massimoKb),
      ),
    ];
  }
  return [];
}

function contenutoLeggibile(
  testo: string | null,
  regola: CollectionRule,
): boolean {
  if (testo === null) return false;
  try {
    parseContent(testo, regola.formato);
    return true;
  } catch {
    return false;
  }
}

/** File nuovo, oppure nuova destinazione di una rinomina: vale come `crea`/`carica`. */
function valutaNuovo(
  file: ChangedFile,
  ctx: Contesto,
  dopoRinomina: boolean,
): Parziale {
  const destinazione = classifica(file.path, ctx);
  switch (destinazione.tipo) {
    case 'altro':
      return fuoriPerimetro(file.path);
    case 'collection': {
      const esito = conLivello(
        file.path,
        'crea',
        destinazione.regola.azioni.crea,
        dopoRinomina ? MESSAGGI.rinominaCrea : MESSAGGI.crea,
      );
      if (esito.violazioni.length === 0 && !contenutoLeggibile(file.after, destinazione.regola)) {
        return conViolazione(viola(file.path, 'formato', MESSAGGI.formato));
      }
      return esito;
    }
    case 'media': {
      const esito = conLivello(
        file.path,
        'carica',
        ctx.rules.media.azioni.carica,
        dopoRinomina ? MESSAGGI.rinominaCrea : MESSAGGI.carica,
      );
      esito.violazioni.push(...controllaMedia(file, ctx));
      return esito;
    }
  }
}

/** File rimosso, oppure origine di una rinomina: vale come `elimina`. */
function valutaRimosso(
  percorso: string,
  ctx: Contesto,
  perRinomina: boolean,
): Parziale {
  const destinazione = classifica(percorso, ctx);
  switch (destinazione.tipo) {
    case 'altro':
      return fuoriPerimetro(percorso);
    case 'collection':
      return conLivello(
        percorso,
        'elimina',
        destinazione.regola.azioni.elimina,
        perRinomina ? MESSAGGI.rinominaElimina : MESSAGGI.elimina,
      );
    case 'media':
      return conLivello(
        percorso,
        'elimina',
        ctx.rules.media.azioni.elimina,
        perRinomina ? MESSAGGI.rinominaElimina : MESSAGGI.eliminaImmagine,
      );
  }
}

/** Campo per campo: vale il più basso tra il livello del campo e quello di `modifica`. */
function valutaCampi(file: ChangedFile, regola: CollectionRule): Parziale {
  const tetto = regola.azioni.modifica;
  if (tetto === 0) {
    return conViolazione(viola(file.path, 'modifica', MESSAGGI.modifica));
  }
  if (file.before === null || file.after === null) {
    return conViolazione(viola(file.path, 'formato', MESSAGGI.formato));
  }

  let campi: string[];
  try {
    campi = diffFields(
      parseContent(file.before, regola.formato),
      parseContent(file.after, regola.formato),
    );
  } catch {
    return conViolazione(viola(file.path, 'formato', MESSAGGI.formato));
  }

  const esito: Parziale = { violazioni: [], livelli: [] };
  for (const campo of campi) {
    const effettivo = Math.min(levelForField(regola.campi, campo), tetto) as Livello;
    if (effettivo === 0) {
      esito.violazioni.push(viola(file.path, 'modifica', MESSAGGI.campo, campo));
    } else {
      esito.livelli.push(effettivo);
    }
  }
  return esito;
}

function valutaModificato(file: ChangedFile, ctx: Contesto): Parziale {
  const destinazione = classifica(file.path, ctx);
  switch (destinazione.tipo) {
    case 'altro':
      return fuoriPerimetro(file.path);
    case 'collection':
      return valutaCampi(file, destinazione.regola);
    case 'media': {
      const esito = conLivello(
        file.path,
        'carica',
        ctx.rules.media.azioni.carica,
        MESSAGGI.carica,
      );
      esito.violazioni.push(...controllaMedia(file, ctx));
      return esito;
    }
  }
}

function valutaFile(file: ChangedFile, ctx: Contesto): Parziale {
  // Un percorso non valido (`..`, backslash) non è mai un file di contenuto.
  if (!percorsoValido(file.path)) {
    return fuoriPerimetro(file.path, MESSAGGI.nomeNonValido);
  }
  switch (file.status) {
    case 'added':
      return valutaNuovo(file, ctx, false);
    case 'removed':
      return valutaRimosso(file.path, ctx, false);
    case 'modified':
      return valutaModificato(file, ctx);
    case 'renamed': {
      const origine =
        file.previousPath === undefined || file.previousPath === ''
          ? fuoriPerimetro(file.path, MESSAGGI.origineSconosciuta)
          : valutaRimosso(file.previousPath, ctx, true);
      return unisci(origine, valutaNuovo(file, ctx, true));
    }
    default:
      // Per esempio `copied` o `changed` di GitHub: non si sa cosa significhino.
      return fuoriPerimetro(file.path, MESSAGGI.statoSconosciuto);
  }
}

function ruoloDi(autore: string, rules: Rules): Verdict['ruolo'] {
  const login = autore.toLowerCase();
  // I login di GitHub non distinguono maiuscole e minuscole.
  const contiene = (elenco: string[]) =>
    elenco.some((nome) => nome.toLowerCase() === login);
  if (contiene(rules.ruoli.sviluppo)) return 'sviluppo';
  if (contiene(rules.ruoli.redazione)) return 'redazione';
  return 'sconosciuto';
}

/**
 * Decide se una proposta è consentita, respinta o ancora in bozza.
 *
 * 1. Chi è nel ruolo `sviluppo` passa sempre (livello `null`).
 * 2. Chi non è in nessun ruolo viene respinto.
 * 3. Per la redazione, una proposta in bozza o senza un'etichetta di invio è `in_bozza`.
 * 4. Ogni file deve rientrare in una collection o nei media, con livelli > 0.
 * 5. Una sola violazione basta per respingere; altrimenti il livello è il
 *    minimo dei livelli toccati (1, il più prudente, se non ne è toccato nessuno).
 */
export function evaluate(input: PullRequestInput, rules: Rules): Verdict {
  const ruolo = ruoloDi(input.author, rules);

  if (ruolo === 'sviluppo') {
    return { ruolo, esito: 'consentito', livello: null, violazioni: [] };
  }

  if (ruolo === 'sconosciuto') {
    return {
      ruolo,
      esito: 'respinto',
      livello: null,
      violazioni: [viola('', 'autore', MESSAGGI.autore(input.author))],
    };
  }

  const inviata = input.labels.some((etichetta) =>
    rules.proposte.stati_inviati.includes(etichetta),
  );
  if (input.draft || !inviata) {
    return {
      ruolo,
      esito: 'in_bozza',
      livello: null,
      violazioni: [
        viola('', 'stato', input.draft ? MESSAGGI.bozza : MESSAGGI.nonInviata),
      ],
    };
  }

  const ctx = creaContesto(rules);
  const violazioni: Violazione[] = [];
  const livelli: Livello[] = [];
  for (const file of input.files) {
    const esito = valutaFile(file, ctx);
    violazioni.push(...esito.violazioni);
    livelli.push(...esito.livelli);
  }

  if (violazioni.length > 0) {
    return { ruolo, esito: 'respinto', livello: null, violazioni };
  }
  const minimo = livelli.reduce<Livello>((a, b) => (b < a ? b : a), 4);
  return {
    ruolo,
    esito: 'consentito',
    livello: livelli.length === 0 ? 1 : minimo,
    violazioni: [],
  };
}
