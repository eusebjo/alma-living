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

const SHA_COMPLETO = /^[a-z0-9._-]+\/[a-z0-9._-]+@[0-9a-f]{40}$/i;

describe('verifica-autonomia.yml (pull_request_target)', () => {
  const nome = 'verifica-autonomia.yml';
  const workflow = leggiWorkflow(nome);

  it("parte solo con l'evento pull_request_target", () => {
    expect(Object.keys(workflow.on)).toEqual(['pull_request_target']);
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

  it('usa una versione di Node compatibile con Astro', () => {
    const node = passi(workflow).find((passo) =>
      passo.uses?.startsWith('actions/setup-node@'),
    );
    expect(Number.parseInt(String(node?.with?.['node-version']), 10)).toBeGreaterThanOrEqual(22);
  });
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
    const versione = String(node?.with?.['node-version']);
    expect(Number.parseInt(versione, 10)).toBeGreaterThanOrEqual(22);
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

describe.each(['ruleset-main-protezione.json', 'ruleset-main-approvazione.json'])(
  '%s: forma accettata dall’API di GitHub',
  (nome) => {
    const ruleset = leggiRuleset(nome);

    it('usa solo i campi previsti da "Create a repository ruleset"', () => {
      expect(Object.keys(ruleset).sort()).toEqual(
        ['bypass_actors', 'conditions', 'enforcement', 'name', 'rules', 'target'].sort(),
      );
    });

    it('vale per il ramo predefinito ed è attivo', () => {
      expect(ruleset.target).toBe('branch');
      expect(ruleset.enforcement).toBe('active');
      expect(ruleset.conditions).toEqual({
        ref_name: { include: ['~DEFAULT_BRANCH'], exclude: [] },
      });
    });

    it('il nome corrisponde al file', () => {
      expect(nome).toBe(`ruleset-${ruleset.name}.json`);
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
      required_status_checks: Array<{ context: string }>;
      strict_required_status_checks_policy: boolean;
    };
    expect(parametri.required_status_checks.map((c) => c.context)).toEqual([
      ...CONTROLLI_OBBLIGATORI,
    ]);
    expect(typeof parametri.strict_required_status_checks_policy).toBe('boolean');
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
