import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';
import { CONTROLLI_OBBLIGATORI } from '../scripts/autonomia/github';

// Il workflow `verifica-autonomia` gira con `pull_request_target`: ha un token
// con permessi di scrittura e viene lanciato anche per le proposte di
// sconosciuti (fork). Per questo non deve mai eseguire codice che arriva
// dalla proposta: questi test fissano le regole che lo garantiscono.

interface Passo {
  name?: string;
  uses?: string;
  run?: string;
  with?: Record<string, unknown>;
  env?: Record<string, unknown>;
}

interface Lavoro {
  name?: string;
  'runs-on'?: string;
  permissions?: Record<string, string>;
  env?: Record<string, unknown>;
  steps: Passo[];
}

interface Workflow {
  on: Record<string, { types?: string[]; branches?: string[] } | null>;
  permissions?: Record<string, string>;
  env?: Record<string, unknown>;
  jobs: Record<string, Lavoro>;
}

const percorso = (relativo: string): string =>
  fileURLToPath(new URL(`../${relativo}`, import.meta.url));

const leggiTesto = (relativo: string): string =>
  readFileSync(percorso(relativo), 'utf8');

const leggiWorkflow = (nome: string): Workflow =>
  parse(leggiTesto(`.github/workflows/${nome}`)) as Workflow;

const passi = (workflow: Workflow): Passo[] =>
  Object.values(workflow.jobs).flatMap((lavoro) => lavoro.steps);

const comandi = (workflow: Workflow): string[] =>
  passi(workflow)
    .filter((passo) => passo.run !== undefined)
    .map((passo) => passo.run!.trim());

// Versione minima di Node: quella che richiede Astro, fissata in package.json.
const MINIMO_NODE = (
  JSON.parse(leggiTesto('package.json')) as { engines: { node: string } }
).engines.node.replace(/^>=/, '');

const parti = (versione: string): number[] =>
  versione.split('.').map((voce) => Number.parseInt(voce, 10));

function nonInferiore(versione: string, minimo: string): boolean {
  const a = parti(versione);
  const b = parti(minimo);
  for (let i = 0; i < 3; i++) {
    if ((a[i] ?? 0) !== (b[i] ?? 0)) return (a[i] ?? 0) > (b[i] ?? 0);
  }
  return true;
}

/**
 * La scelta di `setup-node` garantisce almeno `minimo`?
 * - una versione esatta, se non è inferiore;
 * - una maggiore generica (`22`, `22.x`) solo con `check-latest: true`, che
 *   prende l'ultima uscita di quella serie (oggi 22.23 o più) invece di una
 *   versione vecchia già presente sul runner.
 */
function garantisceMinimo(passo: Passo | undefined, minimo = MINIMO_NODE): boolean {
  const versione = String(passo?.with?.['node-version']);
  if (/^\d+\.\d+\.\d+$/.test(versione)) return nonInferiore(versione, minimo);
  const maggiore = /^(\d+)(?:\.x)?$/.exec(versione);
  if (maggiore) {
    return (
      passo?.with?.['check-latest'] === true &&
      Number.parseInt(maggiore[1]!, 10) >= (parti(minimo)[0] ?? 0)
    );
  }
  return false;
}

const SHA_COMPLETO = /^[a-z0-9._-]+\/[a-z0-9._-]+@[0-9a-f]{40}$/i;

describe('verifica-autonomia.yml (pull_request_target)', () => {
  const nome = 'verifica-autonomia.yml';
  const workflow = leggiWorkflow(nome);

  it("parte solo con l'evento pull_request_target", () => {
    expect(Object.keys(workflow.on)).toEqual(['pull_request_target']);
  });

  it('guarda solo le proposte dirette a main', () => {
    expect(workflow.on.pull_request_target?.branches).toEqual(['main']);
  });

  it('ascolta gli eventi che cambiano lo stato della proposta', () => {
    expect(workflow.on.pull_request_target?.types).toEqual([
      'opened',
      'reopened',
      'synchronize',
      'edited',
      'ready_for_review',
      'converted_to_draft',
      'labeled',
      'unlabeled',
    ]);
  });

  it('ha un solo lavoro, chiamato come il controllo obbligatorio', () => {
    expect(Object.keys(workflow.jobs)).toEqual(['verifica-autonomia']);
    const lavoro = workflow.jobs['verifica-autonomia']!;
    // Se `name` manca, il nome del controllo è l'identificativo del lavoro.
    expect(lavoro.name ?? 'verifica-autonomia').toBe('verifica-autonomia');
    expect(CONTROLLI_OBBLIGATORI).toContain('verifica-autonomia');
  });

  it('ha esattamente i permessi contents: read, pull-requests: write, issues: write', () => {
    expect(workflow.permissions).toEqual({
      contents: 'read',
      'pull-requests': 'write',
      issues: 'write',
    });
    // Nessun lavoro può allargarli.
    for (const lavoro of Object.values(workflow.jobs)) {
      expect(lavoro.permissions).toBeUndefined();
    }
  });

  it('lo step actions/checkout non ha with.ref né altro che punti al ramo della proposta', () => {
    const checkout = passi(workflow).filter((passo) =>
      passo.uses?.startsWith('actions/checkout@'),
    );
    expect(checkout).toHaveLength(1);
    const con = checkout[0]!.with ?? {};
    expect(con).not.toHaveProperty('ref');
    expect(con).not.toHaveProperty('repository');
    expect(con).not.toHaveProperty('allow-unsafe-pr-checkout');
    expect(con['persist-credentials']).toBe(false);
  });

  it('esegue solo npm ci e lo script di verifica dal ramo base', () => {
    expect(comandi(workflow)).toEqual([
      'npm ci',
      'npx tsx scripts/autonomia/main.ts',
    ]);
  });

  it('non lancia build, test né altri script npm', () => {
    for (const comando of comandi(workflow)) {
      expect(comando).not.toMatch(/npm\s+(run|test|t\b|start|exec|x\b)/);
      expect(comando).not.toMatch(/\bbuild\b/);
      expect(comando).not.toMatch(/vitest|astro|wrangler/);
    }
  });

  it('il testo del workflow non usa dati della proposta (ramo, titolo, testo, SHA)', () => {
    const testo = leggiTesto(`.github/workflows/${nome}`);
    expect(testo).not.toMatch(/github\.head_ref/);
    expect(testo).not.toMatch(/github\.event\.pull_request\.(head|title|body|user|labels)/);
    expect(testo).not.toMatch(/github\.event\.(head_commit|commits|issue|comment)/);
    // Nei comandi non c'è nessuna espressione `${{ }}`.
    for (const comando of comandi(workflow)) expect(comando).not.toContain('${{');
  });

  it('il token arriva solo allo step che esegue lo script di verifica', () => {
    const conToken = passi(workflow).filter(
      (passo) => JSON.stringify(passo).includes('secrets.GITHUB_TOKEN'),
    );
    expect(conToken).toHaveLength(1);
    expect(conToken[0]?.run).toBe('npx tsx scripts/autonomia/main.ts');
    expect(conToken[0]?.env).toEqual({ GITHUB_TOKEN: '${{ secrets.GITHUB_TOKEN }}' });
    expect(workflow.env).toBeUndefined();
  });

  it('non usa cache: il lavoro gira con un token di scrittura', () => {
    for (const passo of passi(workflow)) {
      if (passo.uses?.startsWith('actions/setup-node@')) {
        expect(passo.with).not.toHaveProperty('cache');
        expect(passo.with?.['package-manager-cache']).toBe(false);
      }
      expect(passo.uses ?? '').not.toMatch(/actions\/cache/);
    }
  });

  it('usa una versione di Node che garantisce il minimo richiesto da Astro', () => {
    const node = passi(workflow).find((passo) =>
      passo.uses?.startsWith('actions/setup-node@'),
    );
    expect(garantisceMinimo(node)).toBe(true);
  });
});

describe('versione di Node nei workflow', () => {
  it('il minimo è quello di Astro (>=22.22.0)', () => {
    expect(MINIMO_NODE).toBe('22.22.0');
  });

  it.each([
    [{ 'node-version': '22.x', 'check-latest': true }, true],
    [{ 'node-version': '22', 'check-latest': true }, true],
    [{ 'node-version': '24.1.0' }, true],
    [{ 'node-version': '22.22.0' }, true],
    [{ 'node-version': '22.21.9' }, false],
    // Senza check-latest il runner può usare una 22.x vecchia già installata.
    [{ 'node-version': '22.x' }, false],
    [{ 'node-version': 22 }, false],
    [{ 'node-version': '20.x', 'check-latest': true }, false],
    [{ 'node-version': 'lts/*', 'check-latest': true }, false],
  ] as Array<[Record<string, unknown>, boolean]>)(
    'garantisceMinimo(%j) = %s',
    (con, atteso) => {
      expect(garantisceMinimo({ uses: 'actions/setup-node@x', with: con })).toBe(atteso);
    },
  );
});

describe('ci.yml (build)', () => {
  const nome = 'ci.yml';
  const workflow = leggiWorkflow(nome);

  it('parte sulle pull request e sui push a main', () => {
    expect(Object.keys(workflow.on).sort()).toEqual(['pull_request', 'push']);
    expect(workflow.on.push?.branches).toEqual(['main']);
  });

  it('ha un solo lavoro, chiamato come il controllo obbligatorio', () => {
    expect(Object.keys(workflow.jobs)).toEqual(['build']);
    expect(workflow.jobs.build?.name ?? 'build').toBe('build');
    expect(CONTROLLI_OBBLIGATORI).toContain('build');
  });

  it('esegue nell’ordine npm ci, test, build e test sulla build', () => {
    expect(comandi(workflow)).toEqual([
      'npm ci',
      'npm test',
      'npm run build',
      'npm run test:dist',
    ]);
  });

  it('ha permessi di sola lettura', () => {
    expect(workflow.permissions).toEqual({ contents: 'read' });
  });

  it('fissa Node con setup-node (compatibile con Astro) e disattiva la telemetria', () => {
    const node = passi(workflow).find((passo) =>
      passo.uses?.startsWith('actions/setup-node@'),
    );
    expect(node).toBeDefined();
    expect(garantisceMinimo(node)).toBe(true);
    const ambiente = { ...workflow.env, ...workflow.jobs.build?.env };
    expect(String(ambiente.ASTRO_TELEMETRY_DISABLED)).toBe('1');
  });

  it('non imposta le variabili che rendono indicizzabile la build', () => {
    // I test sui file generati presuppongono una build non indicizzabile.
    const variabili = [
      ...Object.keys(workflow.env ?? {}),
      ...Object.values(workflow.jobs).flatMap((lavoro) => [
        ...Object.keys(lavoro.env ?? {}),
        ...lavoro.steps.flatMap((passo) => Object.keys(passo.env ?? {})),
      ]),
    ];
    expect(variabili).toEqual(['ASTRO_TELEMETRY_DISABLED']);
    for (const comando of comandi(workflow)) {
      expect(comando).not.toMatch(/SITE_LAUNCHED|WORKERS_CI_BRANCH/);
    }
  });

  it('non usa segreti né pull_request_target (gira anche per i fork)', () => {
    expect(Object.keys(workflow.on)).not.toContain('pull_request_target');
    expect(JSON.stringify(workflow)).not.toMatch(/secrets\./);
  });
});

describe.each(['ci.yml', 'verifica-autonomia.yml'])('%s: action di terzi', (nome) => {
  const workflow = leggiWorkflow(nome);

  it("ogni action è fissata allo SHA completo del commit, con il tag in un commento", () => {
    const usate = passi(workflow).filter((passo) => passo.uses !== undefined);
    expect(usate.length).toBeGreaterThan(0);
    for (const passo of usate) expect(passo.uses).toMatch(SHA_COMPLETO);

    const righe = leggiTesto(`.github/workflows/${nome}`)
      .split('\n')
      .filter((riga) => /^\s*-?\s*uses:/.test(riga));
    expect(righe).toHaveLength(usate.length);
    for (const riga of righe) expect(riga).toMatch(/@[0-9a-f]{40}\s+#\s*v\d+\.\d+\.\d+\s*$/);
  });
});

describe('package.json', () => {
  it('richiede la stessa versione minima di Node di Astro', () => {
    const pacchetto = JSON.parse(leggiTesto('package.json')) as {
      engines: { node: string };
    };
    expect(pacchetto.engines.node).toBe('>=22.22.0');
  });
});

describe('CODEOWNERS', () => {
  it('assegna tutto a eusebjo', () => {
    const regole = leggiTesto('.github/CODEOWNERS')
      .split('\n')
      .map((riga) => riga.trim())
      .filter((riga) => riga !== '' && !riga.startsWith('#'));
    expect(regole).toEqual(['* @eusebjo']);
  });
});

interface Regola {
  type: string;
  parameters?: Record<string, unknown>;
}

interface Ruleset {
  name: string;
  target: string;
  enforcement: string;
  bypass_actors: Array<Record<string, unknown>>;
  conditions: { ref_name: { include: string[]; exclude: string[] } };
  rules: Regola[];
}

const leggiRuleset = (nome: string): Ruleset =>
  JSON.parse(leggiTesto(`infra/github/${nome}`)) as Ruleset;

const regola = (ruleset: Ruleset, tipo: string): Regola | undefined =>
  ruleset.rules.find((voce) => voce.type === tipo);

describe.each([
  'ruleset-main-protezione.json',
  'ruleset-main-approvazione.json',
  'ruleset-rami-sviluppo.json',
])('%s: forma accettata dall’API di GitHub', (nome) => {
  const ruleset = leggiRuleset(nome);

  it('usa solo i campi previsti da "Create a repository ruleset"', () => {
    expect(Object.keys(ruleset).sort()).toEqual(
      ['bypass_actors', 'conditions', 'enforcement', 'name', 'rules', 'target'].sort(),
    );
  });

  it('è un ruleset sui rami ed è attivo', () => {
    expect(ruleset.target).toBe('branch');
    expect(ruleset.enforcement).toBe('active');
  });

  it('il nome corrisponde al file', () => {
    expect(nome).toBe(`ruleset-${ruleset.name}.json`);
  });

  it('ogni bypass ha id, tipo e modalità', () => {
    for (const bypass of ruleset.bypass_actors) {
      expect(Object.keys(bypass).sort()).toEqual(['actor_id', 'actor_type', 'bypass_mode']);
    }
  });
});

describe.each(['ruleset-main-protezione.json', 'ruleset-main-approvazione.json'])(
  '%s: regole sul ramo predefinito',
  (nome) => {
    const ruleset = leggiRuleset(nome);

    it('vale per il ramo predefinito', () => {
      expect(ruleset.conditions).toEqual({
        ref_name: { include: ['~DEFAULT_BRANCH'], exclude: [] },
      });
    });

    it('la regola pull_request ha tutti i parametri obbligatori', () => {
      const pullRequest = regola(ruleset, 'pull_request');
      expect(pullRequest).toBeDefined();
      expect(Object.keys(pullRequest?.parameters ?? {}).sort()).toEqual(
        [
          'dismiss_stale_reviews_on_push',
          'require_code_owner_review',
          'require_last_push_approval',
          'required_approving_review_count',
          'required_review_thread_resolution',
        ].sort(),
      );
    });
  },
);

describe('main-protezione', () => {
  const ruleset = leggiRuleset('ruleset-main-protezione.json');

  it('non ha nessun bypass', () => {
    expect(ruleset.bypass_actors).toEqual([]);
  });

  it('vieta cancellazione e force push', () => {
    expect(regola(ruleset, 'deletion')).toEqual({ type: 'deletion' });
    expect(regola(ruleset, 'non_fast_forward')).toEqual({ type: 'non_fast_forward' });
  });

  it('richiede la pull request, anche senza approvazioni', () => {
    expect(regola(ruleset, 'pull_request')?.parameters).toMatchObject({
      required_approving_review_count: 0,
    });
  });

  it('richiede i controlli build e verifica-autonomia', () => {
    const parametri = regola(ruleset, 'required_status_checks')?.parameters as {
      required_status_checks: Array<{ context: string; integration_id?: number }>;
      strict_required_status_checks_policy: boolean;
    };
    expect(parametri.required_status_checks.map((c) => c.context)).toEqual([
      ...CONTROLLI_OBBLIGATORI,
    ]);
    expect(typeof parametri.strict_required_status_checks_policy).toBe('boolean');
  });

  it('accetta i controlli solo dall’app GitHub Actions (id 15368)', () => {
    // Un'altra app non può far apparire verde un controllo chiamato `build`.
    const parametri = regola(ruleset, 'required_status_checks')?.parameters as {
      required_status_checks: Array<{ context: string; integration_id?: number }>;
    };
    expect(parametri.required_status_checks).toEqual([
      { context: 'build', integration_id: 15368 },
      { context: 'verifica-autonomia', integration_id: 15368 },
    ]);
  });

  it('contiene solo queste quattro regole', () => {
    expect(ruleset.rules.map((voce) => voce.type).sort()).toEqual(
      ['deletion', 'non_fast_forward', 'pull_request', 'required_status_checks'].sort(),
    );
  });
});

describe('main-approvazione', () => {
  const ruleset = leggiRuleset('ruleset-main-approvazione.json');

  it('lascia il bypass solo al ruolo admin, e solo tramite pull request', () => {
    expect(ruleset.bypass_actors).toEqual([
      { actor_id: 5, actor_type: 'RepositoryRole', bypass_mode: 'pull_request' },
    ]);
  });

  it("richiede un'approvazione del proprietario del codice, annullata da ogni nuovo push", () => {
    expect(regola(ruleset, 'pull_request')?.parameters).toEqual({
      required_approving_review_count: 1,
      require_code_owner_review: true,
      dismiss_stale_reviews_on_push: true,
      require_last_push_approval: true,
      required_review_thread_resolution: false,
    });
    expect(ruleset.rules).toHaveLength(1);
  });
});

describe('rami-sviluppo', () => {
  const ruleset = leggiRuleset('ruleset-rami-sviluppo.json');

  it('vale per tutti i rami tranne main e quelli del pannello (cms/**)', () => {
    expect(ruleset.conditions).toEqual({
      ref_name: {
        include: ['~ALL'],
        exclude: ['refs/heads/main', 'refs/heads/cms/**', 'refs/heads/cms/**/*'],
      },
    });
  });

  it('solo gli admin possono creare, aggiornare ed eliminare questi rami', () => {
    expect(ruleset.rules).toEqual([
      { type: 'creation' },
      { type: 'update' },
      { type: 'deletion' },
    ]);
    expect(ruleset.bypass_actors).toEqual([
      { actor_id: 5, actor_type: 'RepositoryRole', bypass_mode: 'always' },
    ]);
  });
});

describe('CLAUDE.md', () => {
  it('spiega che i rami di sviluppo sono solo per gli admin e il pannello usa cms/**', () => {
    const testo = leggiTesto('CLAUDE.md');
    expect(testo).toMatch(/rami-sviluppo/);
    expect(testo).toMatch(/solo gli admin/);
    expect(testo).toMatch(/cms\/\*\*/);
  });
});
