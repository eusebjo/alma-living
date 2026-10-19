import type { Octokit } from '@octokit/rest';

// Octokit finto per i test: simula solo le chiamate che usano `github.ts` e
// `verifica.ts`, registra ogni chiamata e tiene in memoria commenti ed
// etichette, così i test possono controllare lo stato finale.

export interface ContenutoFinto {
  /** Tipo restituito da `repos.getContent`. Se manca vale `file`. */
  tipo?: 'file' | 'symlink' | 'submodule' | 'directory';
  testo?: string;
  /** Dimensione dichiarata; se manca è la lunghezza in byte del testo. */
  size?: number;
  /** Per i file oltre 1 MB l'API risponde con codifica `none` e contenuto vuoto. */
  troppoGrande?: boolean;
}

export interface FileFinto {
  filename: string;
  status: string;
  previous_filename?: string;
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

function rispostaContenuto(c: ContenutoFinto, stato: StatoFinto): unknown {
  const tipo = c.tipo ?? 'file';
  const testo = c.testo ?? '';
  if (tipo === 'directory') return [{ type: 'file', name: 'x', size: 1 }];
  if (tipo === 'symlink') {
    return { type: 'symlink', size: c.size ?? 12, target: '../../../x' };
  }
  if (tipo === 'submodule') {
    return { type: 'submodule', size: 0, submodule_git_url: 'https://example.invalid/x.git' };
  }
  const dati: Record<string, unknown> = {
    type: 'file',
    size: c.size ?? Buffer.byteLength(testo),
    encoding: c.troppoGrande ? 'none' : 'base64',
  };
  // Il contenuto si legge solo se serve: i test contano gli accessi.
  Object.defineProperty(dati, 'content', {
    enumerable: true,
    get() {
      stato.letturaContenuto += 1;
      return c.troppoGrande ? '' : Buffer.from(testo, 'utf8').toString('base64');
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
            data: files.slice((pagina - 1) * perPagina, pagina * perPagina),
          };
        }),
    },
    repos: {
      getContent: (params: Record<string, unknown>) =>
        registra('repos.getContent', params, () => {
          const trovato = scenario.contenuti?.[
            chiave(String(params.ref), String(params.path))
          ];
          if (trovato === undefined) throw erroreHttp(404, 'Not Found');
          if (trovato instanceof Error) throw trovato;
          return { data: rispostaContenuto(trovato, stato) };
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
