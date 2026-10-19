import type { Octokit } from '@octokit/rest';
import picomatch from 'picomatch';
import { MARCATORE } from './report';
import type { ChangedFile, PullRequestInput, Rules, Violazione } from './types';

// Parte "GitHub" della verifica di autonomia: legge la proposta (pull request)
// SOLO tramite l'API, come dato, e scrive il rapporto. Nulla di ciò che arriva
// dalla proposta viene mai eseguito, né finisce in una riga di comando.

/** Etichetta messa alle proposte della redazione che servono approvazione. */
export const ETICHETTA_LIVELLO_1 = 'livello-1-serve-approvazione';

/** Nomi dei controlli che devono essere verdi per unire su `main`. */
export const CONTROLLI_OBBLIGATORI = ['build', 'verifica-autonomia'] as const;

/**
 * Lunghezza massima del commento che pubblichiamo. GitHub rifiuta i commenti
 * oltre 65.536 caratteri: restiamo ben sotto, per lasciare margine.
 */
export const LIMITE_CORPO = 60_000;

/** Autore dei commenti pubblicati con il `GITHUB_TOKEN` di un workflow. */
const AUTORE_COMMENTO = 'github-actions[bot]';

/** Nome del servizio di anteprime: `<ramo>-alma-living.<sottodominio>.workers.dev`. */
const DOMINIO_ANTEPRIME = 'alma-living.sebjomuho.workers.dev';

const PER_PAGINA = 100;
/** GitHub elenca al massimo 3.000 file per proposta (30 pagine da 100). */
const PAGINE_MASSIME_FILE = 30;
/** Pagine di commenti lette prima di arrendersi (10.000 commenti). */
const PAGINE_MASSIME_COMMENTI = 100;
/** Letture dei file in parallelo: poche, per non incappare nei limiti di GitHub. */
const LETTURE_IN_PARALLELO = 6;

const NOTA_ACCORCIATO =
  "\n\n_L'elenco è stato accorciato perché troppo lungo: correggi le voci che vedi qui sopra e il controllo ripartirà da solo, mostrando le successive._\n";

const MESSAGGI = {
  elencoIncompleto:
    'Non è stato possibile controllare tutti i file della proposta: sono troppi, oppure GitHub non li ha elencati tutti. Per sicurezza la proposta non può andare online finché non viene controllata per intero.',
  elencoSconosciuto:
    'GitHub non ha indicato quanti file contiene la proposta, quindi non è possibile controllarli tutti. Riprova tra qualche minuto.',
  autoreSconosciuto:
    'Non è possibile sapere chi ha creato la proposta, quindi non può essere controllata.',
  propostaCambiata:
    'La proposta è cambiata durante la verifica: il controllo ripartirà da solo.',
  nonUnFile:
    'Questo elemento non è un file normale (per esempio è un collegamento o una cartella collegata): non è possibile verificarlo, quindi non può essere accettato.',
  descrizioneEtichetta:
    "Modifica nei limiti delle regole: serve l'approvazione prima di andare online",
  corpoSenzaMarcatore:
    'Il rapporto deve iniziare con il marcatore della verifica, altrimenti non si potrebbe aggiornare al controllo successivo.',
} as const;

export interface PullRef {
  owner: string;
  repo: string;
  pullNumber: number;
}

/**
 * La verifica non può dire se la proposta è valida (elenco dei file
 * incompleto, dati mancanti). Il messaggio è in italiano e pensato per chi
 * gestisce i contenuti: si può mostrare così com'è.
 */
export class VerificaNonPossibile extends Error {
  constructor(messaggio: string) {
    super(messaggio);
    this.name = 'VerificaNonPossibile';
  }
}

/**
 * La proposta è stata modificata mentre la verifica era in corso. Non è un
 * errore da segnalare nella proposta: il controllo dell'evento più recente
 * (la nuova versione) è quello che decide.
 */
export class PropostaCambiata extends VerificaNonPossibile {
  constructor(messaggio: string) {
    super(messaggio);
    this.name = 'PropostaCambiata';
  }
}

/** Una proposta letta da GitHub, con le informazioni che `evaluate` non usa. */
export interface PullRequestCaricata {
  input: PullRequestInput;
  /**
   * Ramo della proposta, per il link all'anteprima. È `null` se la proposta
   * arriva da un fork (o da un repository cancellato): lì Cloudflare non
   * costruisce nessuna anteprima, e la proposta va respinta per qualunque
   * autore (vedi `applicaControlli`).
   */
  ramo: string | null;
  /**
   * File che non sono file normali (collegamenti simbolici, sotto-moduli,
   * cartelle): vanno respinti prima di valutare, perché il loro contenuto
   * non è quello che sembra.
   */
  bloccati: Violazione[];
}

// ---------------------------------------------------------------------------
// Anteprima

/**
 * Indirizzo dell'anteprima di un ramo su Cloudflare Workers: minuscole, ogni
 * carattere fuori da `a-z0-9-` diventa `-`, i `-` ripetuti si riducono a uno
 * e si tolgono quelli ai bordi. Il nome del ramo è deciso da chi propone: ne
 * esce sempre e solo uno slug sicuro. Se non ne resta niente, restituisce `''`.
 */
export function previewUrl(branch: string): string {
  const slug = branch
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-|-$/g, '');
  return slug === '' ? '' : `https://${slug}-${DOMINIO_ANTEPRIME}/`;
}

// ---------------------------------------------------------------------------
// Errori HTTP

function statoHttp(errore: unknown): number | undefined {
  if (typeof errore !== 'object' || errore === null || !('status' in errore)) {
    return undefined;
  }
  return typeof errore.status === 'number' ? errore.status : undefined;
}

// ---------------------------------------------------------------------------
// Lettura della proposta

type Lettura =
  | {
      tipo: 'file';
      size: number | undefined;
      /** SHA del blob che l'API ha restituito per questo percorso. */
      sha: string | undefined;
      testo: string | null;
    }
  | { tipo: 'speciale' }
  | { tipo: 'assente' };

/**
 * Legge un file a una data versione. Per `conTesto: false` guarda solo tipo,
 * dimensione e SHA: il contenuto non viene nemmeno decodificato. Un file che
 * non esiste (404) è `assente`; qualunque altro errore interrompe il controllo.
 *
 * Si usa il formato `object` dell'API: per i file tra 1 e 100 MB risponde con
 * i soli metadati (contenuto vuoto, codifica `none`) invece di un errore 403,
 * così un'immagine da 1,2 MB si può misurare. Una cartella arriva come oggetto
 * di tipo `dir`, quindi non è mai un `file`.
 *
 * Attenzione: se il percorso è un collegamento simbolico verso un file DEL
 * REPOSITORY, l'API risponde con `type: "file"` e il contenuto del file di
 * destinazione. Per riconoscerlo chi chiama deve confrontare `sha` con lo SHA
 * che `pulls.listFiles` dichiara per quel percorso (vedi `coincide`).
 */
async function leggi(
  octokit: Octokit,
  ref: PullRef,
  path: string,
  sha: string,
  conTesto: boolean,
): Promise<Lettura> {
  let dati: unknown;
  try {
    const risposta = await octokit.rest.repos.getContent({
      owner: ref.owner,
      repo: ref.repo,
      path,
      ref: sha,
      mediaType: { format: 'object' },
    });
    dati = risposta.data;
  } catch (errore) {
    if (statoHttp(errore) === 404) return { tipo: 'assente' };
    throw errore;
  }

  // Cartella (elenco), collegamento simbolico, sotto-modulo: non è un file.
  if (typeof dati !== 'object' || dati === null || Array.isArray(dati)) {
    return { tipo: 'speciale' };
  }
  const voce = dati as {
    type?: unknown;
    size?: unknown;
    sha?: unknown;
    encoding?: unknown;
    content?: unknown;
  };
  if (voce.type !== 'file') return { tipo: 'speciale' };

  const size =
    typeof voce.size === 'number' && Number.isFinite(voce.size) && voce.size >= 0
      ? voce.size
      : undefined;
  const shaLetto = typeof voce.sha === 'string' ? voce.sha : undefined;
  if (!conTesto) return { tipo: 'file', size, sha: shaLetto, testo: null };

  // Sopra 1 MB l'API non include il contenuto (codifica `none`): per un file
  // di testo vale come illeggibile, e `evaluate` respinge la proposta.
  const testo =
    voce.encoding === 'base64' && typeof voce.content === 'string'
      ? Buffer.from(voce.content, 'base64').toString('utf8')
      : null;
  return { tipo: 'file', size, sha: shaLetto, testo };
}

/**
 * Il blob letto con `getContent` è proprio quello che `pulls.listFiles`
 * dichiara per il percorso? Se no (o se uno dei due SHA manca) il percorso è
 * un collegamento simbolico verso un altro file del repository: l'API ne
 * restituirebbe il contenuto spacciandolo per un file normale.
 */
function coincide(
  lettura: Extract<Lettura, { tipo: 'file' }>,
  elencato: string | null | undefined,
): boolean {
  return (
    typeof elencato === 'string' &&
    elencato !== '' &&
    lettura.sha !== undefined &&
    stessoNome(lettura.sha, elencato)
  );
}

/** Esegue `fn` su ogni voce, con al massimo `limite` richieste insieme. */
async function conLimite<T, R>(
  voci: readonly T[],
  limite: number,
  fn: (voce: T) => Promise<R>,
): Promise<R[]> {
  const risultati = new Array<R>(voci.length);
  let prossima = 0;
  let interrotto = false;
  const operai = Array.from(
    { length: Math.min(limite, voci.length) },
    async () => {
      while (!interrotto && prossima < voci.length) {
        const posizione = prossima++;
        try {
          risultati[posizione] = await fn(voci[posizione] as T);
        } catch (errore) {
          interrotto = true;
          throw errore;
        }
      }
    },
  );
  await Promise.all(operai);
  return risultati;
}

/** Percorsi con la stessa logica di `evaluate`: `/` come separatore, niente file nascosti. */
function creaVerificaMedia(percorsi: string[]): (percorso: string) => boolean {
  return percorsi.length === 0
    ? () => false
    : picomatch(percorsi, { windows: false, dot: false });
}

const stessoNome = (a: string, b: string): boolean =>
  a.toLowerCase() === b.toLowerCase();

/**
 * `evaluate` guarda il contenuto dei file solo per le proposte della
 * redazione già inviate. Per le altre (sviluppo, sconosciuti, bozze) leggerlo
 * sarebbe solo uno spreco: il `GITHUB_TOKEN` ha un limite di 1.000 richieste
 * l'ora per repository e ogni salvataggio dal pannello rilancia il controllo.
 */
function servonoIContenuti(
  autore: string,
  bozza: boolean,
  etichette: string[],
  rules: Rules,
): boolean {
  if (rules.ruoli.sviluppo.some((nome) => stessoNome(nome, autore))) return false;
  if (!rules.ruoli.redazione.some((nome) => stessoNome(nome, autore))) return false;
  const inviata = etichette.some((e) => rules.proposte.stati_inviati.includes(e));
  return !bozza && inviata;
}

interface FileGitHub {
  filename: string;
  status: string;
  /** SHA del blob del file alla testata, come lo dichiara `pulls.listFiles`. */
  sha?: string | null | undefined;
  previous_filename?: string | undefined;
}

async function elencaFile(
  octokit: Octokit,
  ref: PullRef,
  dichiarati: number,
): Promise<FileGitHub[]> {
  const elenco: FileGitHub[] = [];
  for (let pagina = 1; pagina <= PAGINE_MASSIME_FILE; pagina++) {
    const { data } = await octokit.rest.pulls.listFiles({
      owner: ref.owner,
      repo: ref.repo,
      pull_number: ref.pullNumber,
      per_page: PER_PAGINA,
      page: pagina,
    });
    elenco.push(...data);
    if (data.length < PER_PAGINA) break;
  }
  // Se GitHub ne dichiara di più (tetto di 3.000 file), l'elenco è incompleto:
  // controllarne solo una parte non basta, la verifica deve fallire.
  if (elenco.length < dichiarati) {
    throw new VerificaNonPossibile(MESSAGGI.elencoIncompleto);
  }
  return elenco;
}

export interface OpzioniLettura {
  /**
   * SHA della testata indicato dall'evento che ha fatto partire il controllo.
   * Se la proposta nel frattempo è cambiata (`pulls.get` ne dà un altro) la
   * lettura si interrompe con `PropostaCambiata`: decide il controllo
   * dell'evento più recente.
   */
  headShaAtteso?: string | undefined;
}

/**
 * Legge da GitHub la proposta e ciò che serve a valutarla. Oltre a
 * `PullRequestInput` restituisce il ramo (per l'anteprima) e i file che non
 * sono file normali (vedi `PullRequestCaricata`).
 *
 * Cosa si legge e quando:
 *
 * - `author`, `draft`, `labels`: sempre, da `pulls.get`.
 * - Elenco dei file (`files`, paginato): sempre, tranne per gli autori
 *   sconosciuti e per le proposte da un fork o da un repository cancellato.
 *   Questi si respingono comunque: nessuna richiesta di elenco né di
 *   contenuto, così chi non fa parte del progetto non può esaurire il limite
 *   di richieste. In quel caso `files` è vuoto.
 *   Se l'elenco è incompleto, o GitHub non dice quanti file sono, lancia
 *   `VerificaNonPossibile`; qualunque errore di rete si propaga.
 * - `before`, `after`, `sizeBytes`: solo per la redazione, con proposta non in
 *   bozza e con etichetta di invio (le condizioni in cui `evaluate` guarda i
 *   file). Per gli altri restano `null`/indefiniti.
 *   - `before`: testo alla versione di base (`null` se il file è `added`; per
 *     un `renamed` si legge dal vecchio percorso).
 *   - `after`: testo alla testata (`null` se `removed`).
 *   - `sizeBytes`: dimensione alla testata, da `getContent`, per ogni file
 *     aggiunto o modificato (non per un `removed`).
 *   - File dei media (`rules.media.percorsi`): si legge solo `sizeBytes`
 *     (metadati: il contenuto non si legge né si decodifica), mai
 *     `before`/`after`.
 *   - Un file inesistente (404), o non leggibile come testo (oltre 1 MB), dà
 *     `null` e `evaluate` respinge.
 * - Un file alla testata che non è un file normale finisce in `bloccati`:
 *   collegamento simbolico, sotto-modulo, cartella, oppure un percorso il
 *   cui blob (`getContent`) non coincide con lo SHA dichiarato da
 *   `pulls.listFiles` (un collegamento verso un file del repository: l'API ne
 *   restituisce il contenuto come se fosse un file). Di questi `after` resta
 *   `null` e `sizeBytes` indefinito.
 * - Gli stati che `evaluate` non conosce (`copied`, `changed`...) passano
 *   invariati, così `evaluate` li respinge.
 */
export async function fetchPullRequest(
  octokit: Octokit,
  ref: PullRef,
  rules: Rules,
  opzioni: OpzioniLettura = {},
): Promise<PullRequestCaricata> {
  const { data: pr } = await octokit.rest.pulls.get({
    owner: ref.owner,
    repo: ref.repo,
    pull_number: ref.pullNumber,
  });

  const headSha = pr.head.sha;
  if (
    opzioni.headShaAtteso !== undefined &&
    !stessoNome(headSha, opzioni.headShaAtteso)
  ) {
    throw new PropostaCambiata(MESSAGGI.propostaCambiata);
  }

  const author = pr.user?.login;
  if (typeof author !== 'string' || author === '') {
    throw new VerificaNonPossibile(MESSAGGI.autoreSconosciuto);
  }
  if (typeof pr.changed_files !== 'number') {
    throw new VerificaNonPossibile(MESSAGGI.elencoSconosciuto);
  }

  const draft = pr.draft === true;
  const labels = pr.labels.map((etichetta) => etichetta.name);
  const stessoRepository =
    pr.head.repo != null && stessoNome(pr.head.repo.full_name, pr.base.repo.full_name);
  const ramo = stessoRepository ? pr.head.ref : null;

  const conosciuto = [...rules.ruoli.sviluppo, ...rules.ruoli.redazione].some(
    (nome) => stessoNome(nome, author),
  );
  // Sconosciuti e fork sono respinti qualunque cosa contengano.
  if (!conosciuto || ramo === null) {
    return { input: { author, draft, labels, files: [] }, ramo, bloccati: [] };
  }

  const elenco = await elencaFile(octokit, ref, pr.changed_files);
  const leggiContenuti = servonoIContenuti(author, draft, labels, rules);
  const eMedia = creaVerificaMedia(rules.media.percorsi);
  const baseSha = pr.base.sha;

  const letti = await conLimite(elenco, LETTURE_IN_PARALLELO, async (voce) => {
    const file: ChangedFile = {
      path: voce.filename,
      // Può essere anche `copied` o `changed`: `evaluate` li respinge.
      status: voce.status as ChangedFile['status'],
      before: null,
      after: null,
    };
    if (voce.previous_filename) file.previousPath = voce.previous_filename;
    let bloccato: Violazione | undefined;
    const nonUnFile: Violazione = {
      file: voce.filename,
      azione: 'perimetro',
      messaggio: MESSAGGI.nonUnFile,
    };
    if (!leggiContenuti) return { file, bloccato };

    if (eMedia(voce.filename)) {
      if (voce.status === 'removed') return { file, bloccato };
      const lettura = await leggi(octokit, ref, voce.filename, headSha, false);
      if (lettura.tipo === 'speciale') bloccato = nonUnFile;
      else if (lettura.tipo === 'file') {
        if (!coincide(lettura, voce.sha)) bloccato = nonUnFile;
        else if (lettura.size !== undefined) file.sizeBytes = lettura.size;
      }
      return { file, bloccato };
    }

    if (voce.status !== 'added') {
      const prima = await leggi(
        octokit,
        ref,
        voce.previous_filename ?? voce.filename,
        baseSha,
        true,
      );
      if (prima.tipo === 'file') file.before = prima.testo;
    }
    if (voce.status !== 'removed') {
      const dopo = await leggi(octokit, ref, voce.filename, headSha, true);
      if (dopo.tipo === 'speciale') bloccato = nonUnFile;
      else if (dopo.tipo === 'file') {
        if (!coincide(dopo, voce.sha)) bloccato = nonUnFile;
        else {
          file.after = dopo.testo;
          if (dopo.size !== undefined) file.sizeBytes = dopo.size;
        }
      }
    }
    return { file, bloccato };
  });

  return {
    input: { author, draft, labels, files: letti.map((l) => l.file) },
    ramo,
    bloccati: letti.flatMap((l) => (l.bloccato ? [l.bloccato] : [])),
  };
}

/**
 * Versione compatta di `fetchPullRequest`: restituisce solo ciò che serve a
 * `evaluate`. Rispetto alla firma del piano ha un terzo parametro, `rules`:
 * serve a sapere chi è sconosciuto, quali file sono media (di cui si legge
 * solo la dimensione) e a evitare letture inutili.
 *
 * Quando sono valorizzati i campi di ogni file (stesse regole di
 * `fetchPullRequest`):
 * - `files` è l'elenco completo (paginato), ma è vuoto per gli autori
 *   sconosciuti e per i fork, che non si leggono affatto;
 * - `before`, `after` e `sizeBytes` si leggono solo per la redazione con una
 *   proposta inviata e non in bozza: `before` dalla base (null se `added`),
 *   `after` dalla testata (null se `removed`), `sizeBytes` dalla testata per
 *   ogni file aggiunto o modificato; per i media solo `sizeBytes`;
 * - un collegamento simbolico verso un file del repository dà `after` null e
 *   `sizeBytes` indefinito (lo SHA letto non coincide con quello elencato),
 *   quindi `evaluate` lo respinge anche senza `bloccati`.
 */
export async function fetchPullRequestInput(
  octokit: Octokit,
  ref: PullRef,
  rules: Rules,
): Promise<PullRequestInput> {
  return (await fetchPullRequest(octokit, ref, rules)).input;
}

// ---------------------------------------------------------------------------
// Rapporto nel commento della proposta

/**
 * Accorcia `testo` a `massimo` caratteri al massimo, tagliando a fine riga e
 * tenendo l'inizio (il marcatore) intatto. In coda aggiunge una nota in
 * italiano che avvisa che l'elenco è stato accorciato.
 */
export function limitaCorpo(testo: string, massimo: number = LIMITE_CORPO): string {
  if (testo.length <= massimo) return testo;
  const spazio = Math.max(0, massimo - NOTA_ACCORCIATO.length);
  const minimo = testo.startsWith(MARCATORE) ? MARCATORE.length : 0;

  let taglio = testo.lastIndexOf('\n', spazio);
  if (taglio <= minimo) {
    // Nessuna riga utile: taglio secco, senza spezzare una coppia di surrogati.
    taglio = spazio;
    const ultimo = testo.charCodeAt(taglio - 1);
    if (ultimo >= 0xd800 && ultimo <= 0xdbff) taglio -= 1;
  }
  return `${testo.slice(0, taglio)}${NOTA_ACCORCIATO}`.slice(0, massimo);
}

async function trovaCommento(
  octokit: Octokit,
  ref: PullRef,
): Promise<number | undefined> {
  for (let pagina = 1; pagina <= PAGINE_MASSIME_COMMENTI; pagina++) {
    const { data } = await octokit.rest.issues.listComments({
      owner: ref.owner,
      repo: ref.repo,
      issue_number: ref.pullNumber,
      per_page: PER_PAGINA,
      page: pagina,
    });
    // Solo i commenti scritti dal token del workflow (`github-actions[bot]`,
    // un nome che nessun utente può avere) che iniziano con il marcatore:
    // chiunque può scrivere il marcatore in un proprio commento, e altri bot
    // potrebbero imitarlo.
    const trovato = data.find(
      (commento) =>
        commento.user?.login === AUTORE_COMMENTO &&
        typeof commento.body === 'string' &&
        commento.body.startsWith(MARCATORE),
    );
    if (trovato) return trovato.id;
    if (data.length < PER_PAGINA) break;
  }
  return undefined;
}

/**
 * Pubblica il rapporto nella proposta: aggiorna il commento del bot che inizia
 * con il marcatore, oppure lo crea. Il testo deve iniziare con il marcatore;
 * se è troppo lungo per GitHub viene accorciato (`limitaCorpo`).
 */
export async function upsertReport(
  octokit: Octokit,
  ref: PullRef,
  body: string,
): Promise<void> {
  if (!body.startsWith(MARCATORE)) {
    throw new Error(MESSAGGI.corpoSenzaMarcatore);
  }
  const corpo = limitaCorpo(body);
  const esistente = await trovaCommento(octokit, ref);
  if (esistente === undefined) {
    await octokit.rest.issues.createComment({
      owner: ref.owner,
      repo: ref.repo,
      issue_number: ref.pullNumber,
      body: corpo,
    });
  } else {
    await octokit.rest.issues.updateComment({
      owner: ref.owner,
      repo: ref.repo,
      comment_id: esistente,
      body: corpo,
    });
  }
}

// ---------------------------------------------------------------------------
// Etichetta del livello

async function assicuraEtichetta(
  octokit: Octokit,
  ref: PullRef,
  nome: string,
): Promise<void> {
  try {
    await octokit.rest.issues.getLabel({ owner: ref.owner, repo: ref.repo, name: nome });
    return;
  } catch (errore) {
    if (statoHttp(errore) !== 404) throw errore;
  }
  try {
    await octokit.rest.issues.createLabel({
      owner: ref.owner,
      repo: ref.repo,
      name: nome,
      color: 'FBCA04',
      description: MESSAGGI.descrizioneEtichetta,
    });
  } catch (errore) {
    // 422: l'etichetta è stata creata nel frattempo da un altro controllo.
    if (statoHttp(errore) !== 422) throw errore;
  }
}

/**
 * Porta l'etichetta della proposta allo stato voluto. `presente` è lo stato
 * attuale (da `PullRequestInput.labels`): se coincide non fa nessuna chiamata.
 * Se l'etichetta non esiste ancora nel repository la crea.
 */
export async function sincronizzaEtichetta(
  octokit: Octokit,
  ref: PullRef,
  etichetta: string,
  desiderata: boolean,
  presente: boolean,
): Promise<void> {
  if (desiderata === presente) return;
  if (desiderata) {
    await assicuraEtichetta(octokit, ref, etichetta);
    await octokit.rest.issues.addLabels({
      owner: ref.owner,
      repo: ref.repo,
      issue_number: ref.pullNumber,
      labels: [etichetta],
    });
    return;
  }
  try {
    await octokit.rest.issues.removeLabel({
      owner: ref.owner,
      repo: ref.repo,
      issue_number: ref.pullNumber,
      name: etichetta,
    });
  } catch (errore) {
    // Già tolta nel frattempo: il risultato è quello voluto.
    if (statoHttp(errore) !== 404) throw errore;
  }
}
