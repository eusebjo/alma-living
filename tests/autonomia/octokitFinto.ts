import { createHash } from 'node:crypto';
import type { Octokit } from '@octokit/rest';

// Octokit finto per i test: simula solo le chiamate che usano `github.ts` e
// `verifica.ts`, registra ogni chiamata e tiene in memoria commenti ed
// etichette, così i test possono controllare lo stato finale.
//
// Comportamenti dell'API vera che il finto riproduce:
// - `pulls.listFiles` dà per ogni file lo SHA del blob alla testata;
// - `repos.getContent` dà lo SHA del blob che sta a quel percorso: per un
//   collegamento simbolico verso un file DEL REPOSITORY risponde con
//   `type: "file"` e lo SHA del file di destinazione (si simula con `sha`
//   diverso da quello elencato); `type: "symlink"` solo se la destinazione è
//   fuori dal repository;
// - oltre 1 MB senza `mediaType.format = "object"` risponde 403; con il formato
//   `object` dà i soli metadati (codifica `none`, contenuto vuoto);
// - `repos.compareCommitsWithBasehead` dà in `merge_base_commit` la versione da cui la
//   proposta si è staccata dal ramo base: per i test è `baseSha`, a meno che lo
//   scenario non indichi `mergeBaseSha` (la punta del ramo base nel frattempo
//   si è mossa) oppure `null` (risposta senza merge base).

/** SHA (finto ma stabile) del blob di un percorso. */
export function shaDiFile(percorso: string): string {
  return createHash('sha1').update(`blob:${percorso}`).digest('hex');
}

const UN_MEGABYTE = 1024 * 1024;

export interface ContenutoFinto {
  /** Tipo restituito da `repos.getContent`. Se manca vale `file`. */
  tipo?: 'file' | 'symlink' | 'submodule' | 'directory';
  testo?: string;
  /** Dimensione dichiarata; se manca è la lunghezza in byte del testo. */
  size?: number;
  /** SHA del blob restituito; se manca è `shaDiFile(percorso)`. */
  sha?: string;
  /** Oltre 1 MB l'API risponde con codifica `none` e contenuto vuoto. Se manca vale `size > 1 MB`. */
  troppoGrande?: boolean;
}

export interface FileFinto {
  filename: string;
  status: string;
  previous_filename?: string;
  /** SHA elencato da `pulls.listFiles`; se manca è `shaDiFile(filename)`, `null` lo toglie. */
  sha?: string | null;
}

export interface CommentoFinto {
  id: number;
  body: string;
  user: { login: string; type: string };
}

export interface ScenarioFinto {
  autore?: string;
  bozza?: boolean;
  etichette?: string[];
  baseSha?: string;
  /**
   * Versione da cui la proposta si è staccata dal ramo base (`merge_base_commit`
   * di `repos.compareCommitsWithBasehead`). Se manca è `baseSha`; `null` simula una risposta
   * senza merge base.
   */
  mergeBaseSha?: string | null;
  headSha?: string;
  ramo?: string;
  /** Repository della testata (`null` se è stato cancellato). */
  repoTestata?: string | null;
  repoBase?: string;
  files?: FileFinto[];
  /** Numero di file dichiarato da `pulls.get`; se manca è `files.length`. */
  fileDichiarati?: number | null;
  /** Contenuti per chiave `sha:percorso`. Quel che manca risponde 404. */
  contenuti?: Record<string, ContenutoFinto | Error>;
  commenti?: CommentoFinto[];
  /** Etichette già esistenti nel repository. */
  etichetteDelRepo?: string[];
  /** Errori da simulare per metodo (per esempio `pulls.listFiles`). */
  errori?: Record<string, Error>;
}

export interface Chiamata {
  metodo: string;
  params: Record<string, unknown>;
}

export interface StatoFinto {
  commenti: CommentoFinto[];
  etichette: string[];
  etichetteDelRepo: string[];
  /** Quante volte è stato letto il contenuto di un file. */
  letturaContenuto: number;
}

export const BASE_SHA = 'b'.repeat(40);
export const HEAD_SHA = 'a'.repeat(40);

export function erroreHttp(status: number, messaggio = `HTTP ${status}`): Error {
  return Object.assign(new Error(messaggio), { status });
}

export const chiave = (sha: string, percorso: string): string =>
  `${sha}:${percorso}`;

function rispostaContenuto(
  c: ContenutoFinto,
  stato: StatoFinto,
  percorso: string,
  formatoObject: boolean,
): unknown {
  const tipo = c.tipo ?? 'file';
  const testo = c.testo ?? '';
  const sha = c.sha ?? shaDiFile(percorso);
  if (tipo === 'directory') {
    const voci = [{ type: 'file', name: 'x', size: 1 }];
    // Con il formato `object` una cartella è un oggetto con `entries`.
    return formatoObject ? { type: 'dir', sha, entries: voci } : voci;
  }
  if (tipo === 'symlink') {
    return { type: 'symlink', sha, size: c.size ?? 12, target: '../../../x' };
  }
  if (tipo === 'submodule') {
    return {
      type: 'submodule',
      sha,
      size: 0,
      submodule_git_url: 'https://example.invalid/x.git',
    };
  }
  const size = c.size ?? Buffer.byteLength(testo);
  const grande = c.troppoGrande ?? size > UN_MEGABYTE;
  if (grande && !formatoObject) {
    throw erroreHttp(403, 'This API returns blobs up to 1 MB in size.');
  }
  const dati: Record<string, unknown> = {
    type: 'file',
    sha,
    size,
    encoding: grande ? 'none' : 'base64',
  };
  // Il contenuto si legge solo se serve: i test contano gli accessi.
  Object.defineProperty(dati, 'content', {
    enumerable: true,
    get() {
      stato.letturaContenuto += 1;
      return grande ? '' : Buffer.from(testo, 'utf8').toString('base64');
    },
  });
  return dati;
}

export function creaOctokitFinto(scenario: ScenarioFinto = {}): {
  octokit: Octokit;
  chiamate: Chiamata[];
  stato: StatoFinto;
} {
  const files = scenario.files ?? [];
  const repoBase = scenario.repoBase ?? 'eusebjo/alma-living';
  const chiamate: Chiamata[] = [];
  const stato: StatoFinto = {
    commenti: [...(scenario.commenti ?? [])],
    etichette: [...(scenario.etichette ?? [])],
    etichetteDelRepo: [...(scenario.etichetteDelRepo ?? [])],
    letturaContenuto: 0,
  };
  let prossimoId = 1000;

  const registra = async <T>(
    metodo: string,
    params: Record<string, unknown>,
    risposta: () => T,
  ): Promise<T> => {
    chiamate.push({ metodo, params });
    const errore = scenario.errori?.[metodo];
    if (errore) throw errore;
    return risposta();
  };

  const rest = {
    pulls: {
      get: (params: Record<string, unknown>) =>
        registra('pulls.get', params, () => ({
          data: {
            user: { login: scenario.autore ?? 'lei' },
            draft: scenario.bozza ?? false,
            labels: stato.etichette.map((name) => ({ name })),
            base: { sha: scenario.baseSha ?? BASE_SHA, repo: { full_name: repoBase } },
            head: {
              sha: scenario.headSha ?? HEAD_SHA,
              ref: scenario.ramo ?? 'cms/pagine/home',
              repo:
                scenario.repoTestata === null
                  ? null
                  : { full_name: scenario.repoTestata ?? repoBase },
            },
            changed_files:
              scenario.fileDichiarati === null
                ? undefined
                : (scenario.fileDichiarati ?? files.length),
          },
        })),
      listFiles: (params: Record<string, unknown>) =>
        registra('pulls.listFiles', params, () => {
          const perPagina = Number(params.per_page ?? 30);
          const pagina = Number(params.page ?? 1);
          return {
            data: files
              .slice((pagina - 1) * perPagina, pagina * perPagina)
              .map((f) => ({
                ...f,
                sha: f.sha === undefined ? shaDiFile(f.filename) : f.sha,
              })),
          };
        }),
    },
    repos: {
      compareCommitsWithBasehead: (params: Record<string, unknown>) =>
        registra('repos.compareCommitsWithBasehead', params, () => {
          const mergeBase =
            scenario.mergeBaseSha === undefined
              ? (scenario.baseSha ?? BASE_SHA)
              : scenario.mergeBaseSha;
          return {
            data: {
              merge_base_commit: mergeBase === null ? undefined : { sha: mergeBase },
            },
          };
        }),
      getContent: (params: Record<string, unknown>) =>
        registra('repos.getContent', params, () => {
          const trovato = scenario.contenuti?.[
            chiave(String(params.ref), String(params.path))
          ];
          if (trovato === undefined) throw erroreHttp(404, 'Not Found');
          if (trovato instanceof Error) throw trovato;
          const formato = (params.mediaType as { format?: string } | undefined)?.format;
          return {
            data: rispostaContenuto(
              trovato,
              stato,
              String(params.path),
              formato === 'object',
            ),
          };
        }),
    },
    issues: {
      listComments: (params: Record<string, unknown>) =>
        registra('issues.listComments', params, () => {
          const perPagina = Number(params.per_page ?? 30);
          const pagina = Number(params.page ?? 1);
          return {
            data: stato.commenti.slice((pagina - 1) * perPagina, pagina * perPagina),
          };
        }),
      createComment: (params: Record<string, unknown>) =>
        registra('issues.createComment', params, () => {
          const commento: CommentoFinto = {
            id: prossimoId++,
            body: String(params.body),
            user: { login: 'github-actions[bot]', type: 'Bot' },
          };
          stato.commenti.push(commento);
          return { data: commento };
        }),
      updateComment: (params: Record<string, unknown>) =>
        registra('issues.updateComment', params, () => {
          const commento = stato.commenti.find((c) => c.id === params.comment_id);
          if (!commento) throw erroreHttp(404);
          commento.body = String(params.body);
          return { data: commento };
        }),
      getLabel: (params: Record<string, unknown>) =>
        registra('issues.getLabel', params, () => {
          if (!stato.etichetteDelRepo.includes(String(params.name))) {
            throw erroreHttp(404, 'Not Found');
          }
          return { data: { name: params.name } };
        }),
      createLabel: (params: Record<string, unknown>) =>
        registra('issues.createLabel', params, () => {
          stato.etichetteDelRepo.push(String(params.name));
          return { data: { name: params.name } };
        }),
      addLabels: (params: Record<string, unknown>) =>
        registra('issues.addLabels', params, () => {
          for (const nome of params.labels as string[]) {
            if (!stato.etichette.includes(nome)) stato.etichette.push(nome);
          }
          return { data: [] };
        }),
      removeLabel: (params: Record<string, unknown>) =>
        registra('issues.removeLabel', params, () => {
          const posizione = stato.etichette.indexOf(String(params.name));
          if (posizione === -1) throw erroreHttp(404, 'Label does not exist');
          stato.etichette.splice(posizione, 1);
          return { data: [] };
        }),
    },
  };

  return { octokit: { rest } as unknown as Octokit, chiamate, stato };
}

export const quante = (chiamate: Chiamata[], metodo: string): number =>
  chiamate.filter((c) => c.metodo === metodo).length;
