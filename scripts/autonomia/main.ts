import { readFileSync } from 'node:fs';
import { Octokit } from '@octokit/rest';
import { VerificaNonPossibile, type PullRef } from './github';
import { loadRules } from './rules';
import { eseguiVerifica, pubblicaErrore } from './verifica';
import type { Rules } from './types';

// Punto d'ingresso del controllo `verifica-autonomia` (GitHub Actions, evento
// `pull_request_target`). Gira sempre dal ramo base: la proposta si legge solo
// tramite l'API, come dato, e non viene mai scaricata né eseguita.
//
//   GITHUB_TOKEN       token del workflow (permessi: contents read,
//                      pull-requests write, issues write)
//   GITHUB_REPOSITORY  `proprietario/repository`
//   GITHUB_EVENT_PATH  file JSON dell'evento, da cui si prendono il numero della
//                      proposta e lo SHA della sua testata (se la proposta nel
//                      frattempo è cambiata, il controllo si ferma)
//   GITHUB_API_URL     (facoltativa) indirizzo dell'API di GitHub
//
// Le regole si leggono da `autonomia.yml` nel checkout del ramo base.

const FILE_REGOLE = new URL('../../autonomia.yml', import.meta.url);

function variabile(nome: string): string {
  const valore = process.env[nome];
  if (valore === undefined || valore.trim() === '') {
    throw new Error(`Manca la variabile d'ambiente ${nome}.`);
  }
  return valore;
}

interface Evento {
  ref: PullRef;
  /** SHA della testata della proposta al momento dell'evento. */
  headSha: string;
}

function leggiEvento(): Evento {
  const repository = /^([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)$/.exec(
    variabile('GITHUB_REPOSITORY'),
  );
  if (!repository) {
    throw new Error('GITHUB_REPOSITORY deve avere la forma proprietario/repository.');
  }
  const evento: unknown = JSON.parse(readFileSync(variabile('GITHUB_EVENT_PATH'), 'utf8'));
  const proposta = (
    evento as { pull_request?: { number?: unknown; head?: { sha?: unknown } } } | null
  )?.pull_request;
  const numero = proposta?.number;
  if (typeof numero !== 'number' || !Number.isInteger(numero) || numero <= 0) {
    throw new Error("L'evento non riguarda una pull request.");
  }
  const headSha = proposta?.head?.sha;
  if (typeof headSha !== 'string' || !/^[0-9a-f]{40}$/i.test(headSha)) {
    throw new Error("L'evento non indica la versione della proposta da controllare.");
  }
  return {
    ref: { owner: repository[1]!, repo: repository[2]!, pullNumber: numero },
    headSha,
  };
}

async function main(): Promise<void> {
  let octokit: Octokit;
  let ref: PullRef;
  let headSha: string;
  try {
    const token = variabile('GITHUB_TOKEN');
    ({ ref, headSha } = leggiEvento());
    const apiUrl = process.env.GITHUB_API_URL;
    octokit = new Octokit({
      auth: token,
      userAgent: 'alma-living-verifica-autonomia',
      ...(apiUrl ? { baseUrl: apiUrl } : {}),
    });
  } catch (errore) {
    // Senza token o senza proposta non c'è nemmeno dove scrivere un commento.
    console.error(errore instanceof Error ? errore.message : errore);
    process.exitCode = 1;
    return;
  }

  let rules: Rules;
  try {
    rules = loadRules(readFileSync(FILE_REGOLE, 'utf8'));
  } catch (errore) {
    // Un file di regole sbagliato non si "aggiusta": il controllo fallisce.
    console.error(errore);
    await pubblicaErrore(
      octokit,
      ref,
      new VerificaNonPossibile(
        'Il file delle regole di autonomia non è valido, quindi non è possibile controllare la proposta: avvisa il responsabile del sito.',
      ),
    );
    process.exitCode = 1;
    return;
  }

  const esito = await eseguiVerifica(octokit, ref, rules, { headShaAtteso: headSha });
  if (!esito.superato) process.exitCode = 1;
}

await main();
