import type { Octokit } from '@octokit/rest';
import { evaluate } from './evaluate';
import {
  ETICHETTA_LIVELLO_1,
  LIMITE_CORPO,
  PropostaCambiata,
  VerificaNonPossibile,
  fetchPullRequest,
  limitaCorpo,
  previewUrl,
  sincronizzaEtichetta,
  upsertReport,
  type PullRef,
  type PullRequestCaricata,
} from './github';
import { MARCATORE, formatReport } from './report';
import type { Rules, Verdict } from './types';

// Orchestrazione della verifica: legge la proposta, applica le regole, pubblica
// il rapporto e aggiorna l'etichetta. Separata da `main.ts` (che legge solo
// l'ambiente di GitHub Actions) per poterla provare con un Octokit finto.
//
// Principio: nel dubbio il controllo fallisce. Se qualcosa non si riesce a
// leggere o a scrivere, l'esito è "non superato", mai "consentito".

const MESSAGGI = {
  daFork:
    'La proposta non arriva da questo sito ma da una copia esterna (o da una copia che non esiste più): per sicurezza non può essere accettata. Le modifiche si propongono dal pannello dei contenuti.',
  nessunFile:
    'Nella proposta non risulta nessun file modificato, quindi non c’è nulla da verificare.',
  erroreGenerico:
    'Non è stato possibile leggere i dati della proposta da GitHub. Riprova tra qualche minuto.',
  anteprimaConLink:
    'Per vedere il sito con le modifiche di questa proposta apri:',
  anteprimaFallback:
    'Se il link non si apre, cerca in questa pagina il controllo "Workers Builds: alma-living" di Cloudflare e apri "Dettagli": lì trovi l’indirizzo aggiornato. L’anteprima può impiegare un paio di minuti per essere pronta.',
  anteprimaSenzaLink:
    'L’indirizzo dell’anteprima si trova in "Dettagli", nel controllo "Workers Builds: alma-living" di Cloudflare che vedi in questa pagina. L’anteprima può impiegare un paio di minuti per essere pronta.',
} as const;

export interface EsitoVerifica {
  /** `true` solo se la proposta è consentita: il controllo resta verde. */
  superato: boolean;
  /** `null` se la verifica non si è potuta completare. */
  verdict: Verdict | null;
}

/**
 * Aggiunge a `evaluate` i controlli che dipendono da come è stata letta la
 * proposta:
 * - per OGNI ruolo, una proposta che arriva da un fork (o da un repository
 *   cancellato) è respinta: il suo codice non è quello del repository, e un
 *   autore "di sviluppo" non deve passare solo perché apre la proposta da una
 *   copia altrui;
 * - solo per la redazione (lo sviluppo non ha limiti sui contenuti):
 *   - un file che non è un file normale (collegamento, sotto-modulo) è
 *     respinto, con un solo messaggio per file;
 *   - una proposta senza nessun file non è mai "consentita".
 */
export function applicaControlli(
  verdict: Verdict,
  caricata: PullRequestCaricata,
): Verdict {
  if (caricata.ramo === null) {
    return {
      ruolo: verdict.ruolo,
      esito: 'respinto',
      livello: null,
      violazioni: [
        { file: '', azione: 'perimetro', messaggio: MESSAGGI.daFork },
        ...verdict.violazioni,
      ],
    };
  }

  if (verdict.ruolo !== 'redazione') return verdict;

  if (caricata.bloccati.length > 0) {
    const bloccati = new Set(caricata.bloccati.map((voce) => voce.file));
    return {
      ruolo: verdict.ruolo,
      esito: 'respinto',
      livello: null,
      violazioni: [
        ...caricata.bloccati,
        ...verdict.violazioni.filter((voce) => !bloccati.has(voce.file)),
      ],
    };
  }

  if (verdict.esito === 'consentito' && caricata.input.files.length === 0) {
    return {
      ruolo: verdict.ruolo,
      esito: 'respinto',
      livello: null,
      violazioni: [{ file: '', azione: 'perimetro', messaggio: MESSAGGI.nessunFile }],
    };
  }
  return verdict;
}

/** Sezione con il link all'anteprima ('' se non c'è un'anteprima da mostrare). */
function sezioneAnteprima(verdict: Verdict, ramo: string | null): string {
  // Per gli sconosciuti e per i fork Cloudflare non costruisce l'anteprima.
  if (ramo === null || verdict.ruolo === 'sconosciuto') return '';
  const url = previewUrl(ramo);
  const righe =
    url === ''
      ? ['### Anteprima del sito', '', MESSAGGI.anteprimaSenzaLink]
      : [
          '### Anteprima del sito',
          '',
          `${MESSAGGI.anteprimaConLink} ${url}`,
          '',
          MESSAGGI.anteprimaFallback,
        ];
  return `${righe.join('\n')}\n`;
}

/**
 * Testo del commento: il rapporto delle regole seguito dal link
 * all'anteprima. Se l'elenco è troppo lungo si accorcia il rapporto, non il
 * link, e il tutto resta sotto `LIMITE_CORPO`.
 */
export function componiRapporto(
  verdict: Verdict,
  caricata: PullRequestCaricata,
): string {
  const rapporto = formatReport(verdict);
  const anteprima = sezioneAnteprima(verdict, caricata.ramo);
  if (anteprima === '') return limitaCorpo(rapporto);
  const spazio = LIMITE_CORPO - anteprima.length - 2;
  return `${limitaCorpo(rapporto, spazio).trimEnd()}\n\n${anteprima}`;
}

/** Commento per un controllo che non si è potuto completare. */
export function rapportoErrore(messaggio: string): string {
  return [
    MARCATORE,
    '',
    '## Verifica delle regole: controllo non completato',
    '',
    'Non è stato possibile completare la verifica, quindi per ora la proposta non può andare online:',
    '',
    `- ${messaggio.replace(/\s+/g, ' ').trim()}`,
    '',
    'Il controllo riparte da solo a ogni modifica della proposta. Se il problema resta, avvisa il responsabile del sito.',
    '',
  ].join('\n');
}

/**
 * Registra l'errore nel log (con i dettagli tecnici) e prova a spiegarlo nella
 * proposta, con un messaggio senza dettagli tecnici. Non lancia mai: se anche
 * il commento fallisce, resta il log.
 */
export async function pubblicaErrore(
  octokit: Octokit,
  ref: PullRef,
  errore: unknown,
): Promise<void> {
  console.error('Verifica non completata:', errore);
  const messaggio =
    errore instanceof VerificaNonPossibile ? errore.message : MESSAGGI.erroreGenerico;
  try {
    await upsertReport(octokit, ref, rapportoErrore(messaggio));
  } catch (causa) {
    console.error('Non è stato possibile scrivere il commento di errore:', causa);
  }
}

export interface OpzioniVerifica {
  /** SHA della testata indicato dall'evento (vedi `OpzioniLettura`). */
  headShaAtteso?: string | undefined;
}

/**
 * Esegue l'intera verifica di una proposta. Non lancia: ogni problema diventa
 * `superato: false`. L'etichetta è solo un aiuto per chi legge: se non si
 * riesce ad aggiornare, il controllo non cambia esito e il problema viene
 * segnalato come avviso nel log di GitHub Actions.
 *
 * Se la proposta è cambiata durante la verifica (`PropostaCambiata`) il
 * controllo fallisce senza scrivere nulla nella proposta: un commento di
 * questo controllo ormai superato potrebbe sovrascrivere il rapporto di
 * quello più recente, che è l'unico a decidere.
 */
export async function eseguiVerifica(
  octokit: Octokit,
  ref: PullRef,
  rules: Rules,
  opzioni: OpzioniVerifica = {},
): Promise<EsitoVerifica> {
  let caricata: PullRequestCaricata;
  let verdict: Verdict;
  try {
    caricata = await fetchPullRequest(octokit, ref, rules, opzioni);
    verdict = applicaControlli(evaluate(caricata.input, rules), caricata);
  } catch (errore) {
    if (errore instanceof PropostaCambiata) {
      console.log(`::warning title=Proposta cambiata::${errore.message}`);
      return { superato: false, verdict: null };
    }
    await pubblicaErrore(octokit, ref, errore);
    return { superato: false, verdict: null };
  }

  try {
    await upsertReport(octokit, ref, componiRapporto(verdict, caricata));
  } catch (errore) {
    console.error('Non è stato possibile scrivere il rapporto:', errore);
    return { superato: false, verdict };
  }

  const conEtichetta = verdict.esito === 'consentito' && verdict.ruolo === 'redazione';
  try {
    await sincronizzaEtichetta(
      octokit,
      ref,
      ETICHETTA_LIVELLO_1,
      conEtichetta,
      caricata.input.labels.includes(ETICHETTA_LIVELLO_1),
    );
  } catch (errore) {
    console.error('Non è stato possibile aggiornare l’etichetta:', errore);
    console.log(
      `::warning title=Etichetta non aggiornata::L’etichetta ${ETICHETTA_LIVELLO_1} non è stata aggiornata. Il controllo non è cambiato.`,
    );
  }

  return { superato: verdict.esito === 'consentito', verdict };
}
