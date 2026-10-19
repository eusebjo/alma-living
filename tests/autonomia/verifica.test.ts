import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  ETICHETTA_LIVELLO_1,
  LIMITE_CORPO,
} from '../../scripts/autonomia/github';
import { MARCATORE } from '../../scripts/autonomia/report';
import { eseguiVerifica, rapportoErrore } from '../../scripts/autonomia/verifica';
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
const URL_ANTEPRIMA = 'https://cms-pagine-home-alma-living.sebjomuho.workers.dev/';

/** Proposta di `lei` che cambia solo la descrizione del negozio: consentita, livello 1. */
function modificaConsentita(extra: ScenarioFinto = {}): ScenarioFinto {
  return {
    autore: 'lei',
    etichette: [ETICHETTA_INVIATA],
    files: [{ filename: NEGOZIO, status: 'modified' }],
    contenuti: {
      [chiave(BASE_SHA, NEGOZIO)]: { testo: negozioJson() },
      [chiave(HEAD_SHA, NEGOZIO)]: {
        testo: negozioJson((n) => {
          n.descrizione = 'Una descrizione nuova.';
        }),
      },
    },
    ...extra,
  };
}

function corpoDelRapporto(stato: { commenti: Array<{ body: string }> }): string {
  expect(stato.commenti).toHaveLength(1);
  return stato.commenti[0]?.body ?? '';
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('eseguiVerifica', () => {
  describe('proposta della redazione consentita', () => {
    it('pubblica il rapporto con l’anteprima e mette l’etichetta del livello', async () => {
      const { octokit, stato } = creaOctokitFinto(modificaConsentita());

      const esito = await eseguiVerifica(octokit, ref, rules);

      expect(esito.superato).toBe(true);
      expect(esito.verdict).toMatchObject({ ruolo: 'redazione', esito: 'consentito', livello: 1 });
      const corpo = corpoDelRapporto(stato);
      expect(corpo.startsWith(`${MARCATORE}\n`)).toBe(true);
      expect(corpo).toMatch(/modifica consentita/);
      expect(corpo).toContain(URL_ANTEPRIMA);
      expect(corpo).toMatch(/Dettagli/);
      expect(corpo).toMatch(/Cloudflare/);
      expect(corpo).not.toMatch(GERGO);
      expect(stato.etichette).toEqual([ETICHETTA_INVIATA, ETICHETTA_LIVELLO_1]);
    });

    it("crea l'etichetta se nel repository non esiste ancora", async () => {
      const { octokit, chiamate, stato } = creaOctokitFinto(modificaConsentita());

      await eseguiVerifica(octokit, ref, rules);

      expect(quante(chiamate, 'issues.createLabel')).toBe(1);
      expect(stato.etichetteDelRepo).toEqual([ETICHETTA_LIVELLO_1]);
    });

    it('un secondo controllo aggiorna lo stesso commento e non ripete le etichette', async () => {
      const { octokit, chiamate, stato } = creaOctokitFinto(modificaConsentita());

      await eseguiVerifica(octokit, ref, rules);
      await eseguiVerifica(octokit, ref, rules);

      expect(stato.commenti).toHaveLength(1);
      expect(quante(chiamate, 'issues.createComment')).toBe(1);
      expect(quante(chiamate, 'issues.updateComment')).toBe(1);
      expect(quante(chiamate, 'issues.addLabels')).toBe(1);
      expect(quante(chiamate, 'issues.createLabel')).toBe(1);
    });

    it("se l'etichetta non si riesce a mettere il controllo resta valido e il problema viene segnalato", async () => {
      const avvisi = vi.spyOn(console, 'log').mockImplementation(() => {});
      vi.spyOn(console, 'error').mockImplementation(() => {});
      const { octokit, stato } = creaOctokitFinto(
        modificaConsentita({
          errori: { 'issues.getLabel': erroreHttp(403, 'Resource not accessible by integration') },
        }),
      );

      const esito = await eseguiVerifica(octokit, ref, rules);

      expect(esito.superato).toBe(true);
      expect(stato.commenti).toHaveLength(1);
      expect(avvisi).toHaveBeenCalledWith(expect.stringMatching(/^::warning/));
    });
  });

  describe('proposta respinta', () => {
    const respinta = (extra: ScenarioFinto = {}): ScenarioFinto => ({
      autore: 'lei',
      etichette: [ETICHETTA_INVIATA, ETICHETTA_LIVELLO_1],
      etichetteDelRepo: [ETICHETTA_LIVELLO_1],
      files: [{ filename: 'src/layouts/BaseLayout.astro', status: 'modified' }],
      contenuti: {
        [chiave(BASE_SHA, 'src/layouts/BaseLayout.astro')]: { testo: 'a' },
        [chiave(HEAD_SHA, 'src/layouts/BaseLayout.astro')]: { testo: 'b' },
      },
      ...extra,
    });

    it('non supera il controllo, spiega il motivo in italiano e toglie l’etichetta', async () => {
      const { octokit, stato } = creaOctokitFinto(respinta());

      const esito = await eseguiVerifica(octokit, ref, rules);

      expect(esito.superato).toBe(false);
      expect(esito.verdict?.esito).toBe('respinto');
      const corpo = corpoDelRapporto(stato);
      expect(corpo).toMatch(/modifica non consentita/);
      expect(corpo).toContain('BaseLayout.astro');
      expect(corpo).not.toMatch(GERGO);
      expect(stato.etichette).toEqual([ETICHETTA_INVIATA]);
    });

    it('una bozza non supera il controllo e non ha l’etichetta', async () => {
      const { octokit, stato } = creaOctokitFinto(
        modificaConsentita({
          bozza: true,
          etichette: [ETICHETTA_INVIATA, ETICHETTA_LIVELLO_1],
        }),
      );

      const esito = await eseguiVerifica(octokit, ref, rules);

      expect(esito.superato).toBe(false);
      expect(esito.verdict?.esito).toBe('in_bozza');
      expect(stato.etichette).toEqual([ETICHETTA_INVIATA]);
    });

    it('un autore sconosciuto è respinto, senza anteprima e senza leggere i file', async () => {
      const { octokit, chiamate, stato } = creaOctokitFinto(
        modificaConsentita({ autore: 'estraneo' }),
      );

      const esito = await eseguiVerifica(octokit, ref, rules);

      expect(esito.superato).toBe(false);
      expect(esito.verdict?.ruolo).toBe('sconosciuto');
      // Deciso prima di elencare i file: nessuna richiesta che un estraneo possa moltiplicare.
      expect(quante(chiamate, 'pulls.listFiles')).toBe(0);
      expect(quante(chiamate, 'repos.getContent')).toBe(0);
      const corpo = corpoDelRapporto(stato);
      expect(corpo).not.toMatch(/workers\.dev/);
      expect(corpo).not.toMatch(/Anteprima/);
    });

    it('un file che è un collegamento viene respinto con un solo messaggio per file', async () => {
      const { octokit, stato } = creaOctokitFinto(
        modificaConsentita({
          files: [{ filename: FOTO, status: 'added' }],
          contenuti: { [chiave(HEAD_SHA, FOTO)]: { tipo: 'symlink', size: 18 } },
        }),
      );

      const esito = await eseguiVerifica(octokit, ref, rules);

      expect(esito.superato).toBe(false);
      expect(esito.verdict?.esito).toBe('respinto');
      expect(esito.verdict?.violazioni).toHaveLength(1);
      const corpo = corpoDelRapporto(stato);
      expect(corpo).toMatch(/collegamento|non è un file/i);
      expect(corpo).not.toMatch(/dimensione/i);
      expect(corpo).not.toMatch(GERGO);
      expect(stato.etichette).not.toContain(ETICHETTA_LIVELLO_1);
    });

    it('un collegamento si aggiunge alle altre violazioni senza nasconderle', async () => {
      const { octokit } = creaOctokitFinto(
        respinta({
          files: [
            { filename: 'src/layouts/BaseLayout.astro', status: 'modified' },
            { filename: HOME, status: 'modified' },
          ],
          contenuti: {
            [chiave(BASE_SHA, HOME)]: { testo: 'prima' },
            [chiave(HEAD_SHA, HOME)]: { tipo: 'symlink' },
          },
        }),
      );

      const esito = await eseguiVerifica(octokit, ref, rules);

      expect(esito.verdict?.violazioni.map((v) => v.file).sort()).toEqual(
        [HOME, 'src/layouts/BaseLayout.astro'].sort(),
      );
    });

    it('una proposta della redazione senza file non è mai consentita', async () => {
      const { octokit, stato } = creaOctokitFinto(
        modificaConsentita({ files: [], contenuti: {} }),
      );

      const esito = await eseguiVerifica(octokit, ref, rules);

      expect(esito.superato).toBe(false);
      expect(esito.verdict?.esito).toBe('respinto');
      const corpo = corpoDelRapporto(stato);
      expect(corpo).toMatch(/nessun file/i);
      expect(corpo).not.toMatch(GERGO);
      expect(stato.etichette).not.toContain(ETICHETTA_LIVELLO_1);
    });
  });

  describe('sviluppo', () => {
    it('è consentito senza leggere i file e senza etichetta di livello', async () => {
      const { octokit, chiamate, stato } = creaOctokitFinto({
        autore: 'eusebjo',
        ramo: 'fase1/2-anteprime',
        files: [{ filename: 'astro.config.mjs', status: 'modified' }],
      });

      const esito = await eseguiVerifica(octokit, ref, rules);

      expect(esito.superato).toBe(true);
      expect(esito.verdict).toMatchObject({ ruolo: 'sviluppo', esito: 'consentito' });
      expect(quante(chiamate, 'repos.getContent')).toBe(0);
      expect(quante(chiamate, 'issues.addLabels')).toBe(0);
      expect(corpoDelRapporto(stato)).toContain(
        'https://fase1-2-anteprime-alma-living.sebjomuho.workers.dev/',
      );
    });

    it('una proposta senza file resta consentita', async () => {
      const { octokit } = creaOctokitFinto({ autore: 'eusebjo', files: [] });

      expect((await eseguiVerifica(octokit, ref, rules)).superato).toBe(true);
    });

  });

  describe('proposte da un fork (o da un repository cancellato)', () => {
    it.each([
      ['redazione', modificaConsentita({ repoTestata: 'altro/alma-living' }), 'redazione'],
      [
        'sviluppo',
        {
          autore: 'eusebjo',
          repoTestata: 'eusebjo-fork/alma-living',
          files: [{ filename: 'README.md', status: 'modified' }],
        },
        'sviluppo',
      ],
      [
        'sconosciuto',
        modificaConsentita({ autore: 'estraneo', repoTestata: 'altro/alma-living' }),
        'sconosciuto',
      ],
      [
        'sviluppo con repository cancellato',
        {
          autore: 'eusebjo',
          repoTestata: null,
          files: [{ filename: 'README.md', status: 'modified' }],
        },
        'sviluppo',
      ],
    ] as Array<[string, ScenarioFinto, string]>)(
      'è sempre respinta, anche per %s',
      async (_nome, scenario, ruolo) => {
        const { octokit, chiamate, stato } = creaOctokitFinto(scenario);

        const esito = await eseguiVerifica(octokit, ref, rules);

        expect(esito.superato).toBe(false);
        expect(esito.verdict).toMatchObject({ ruolo, esito: 'respinto', livello: null });
        expect(esito.verdict?.violazioni[0]).toMatchObject({ azione: 'perimetro' });
        const corpo = corpoDelRapporto(stato);
        expect(corpo).toMatch(/modifica non consentita/);
        expect(corpo).toMatch(/copia esterna/);
        expect(corpo).not.toMatch(GERGO);
        // Niente anteprima (non esiste) e nessuna lettura dei file.
        expect(corpo).not.toMatch(/workers\.dev/);
        expect(quante(chiamate, 'pulls.listFiles')).toBe(0);
        expect(quante(chiamate, 'repos.getContent')).toBe(0);
        expect(stato.etichette).not.toContain(ETICHETTA_LIVELLO_1);
      },
    );

    it('uno sconosciuto da un fork vede anche il motivo dell’autore', async () => {
      const { octokit, stato } = creaOctokitFinto(
        modificaConsentita({ autore: 'estraneo', repoTestata: 'altro/alma-living' }),
      );

      await eseguiVerifica(octokit, ref, rules);

      expect(corpoDelRapporto(stato)).toMatch(/non è autorizzato/);
    });

    it('la stessa proposta dallo stesso repository è consentita (nessun falso allarme)', async () => {
      const { octokit } = creaOctokitFinto(modificaConsentita());

      expect((await eseguiVerifica(octokit, ref, rules)).superato).toBe(true);
    });
  });

  describe('collegamenti simbolici verso file del repository', () => {
    it('un media che è un collegamento a un altro file viene respinto', async () => {
      const { octokit, stato } = creaOctokitFinto(
        modificaConsentita({
          files: [{ filename: FOTO, status: 'added' }],
          contenuti: {
            // L'API risponde `file` con il contenuto (e lo SHA) della destinazione.
            [chiave(HEAD_SHA, FOTO)]: { sha: 'e'.repeat(40), size: 4_000 },
          },
        }),
      );

      const esito = await eseguiVerifica(octokit, ref, rules);

      expect(esito.superato).toBe(false);
      expect(esito.verdict?.esito).toBe('respinto');
      expect(esito.verdict?.violazioni).toHaveLength(1);
      expect(corpoDelRapporto(stato)).toMatch(/non è un file normale/);
      expect(stato.etichette).not.toContain(ETICHETTA_LIVELLO_1);
    });

    it('un file di contenuto che è un collegamento viene respinto', async () => {
      const { octokit } = creaOctokitFinto(
        modificaConsentita({
          contenuti: {
            [chiave(BASE_SHA, NEGOZIO)]: { testo: negozioJson() },
            [chiave(HEAD_SHA, NEGOZIO)]: {
              testo: negozioJson((n) => {
                n.descrizione = 'Una descrizione nuova.';
              }),
              sha: 'd'.repeat(40),
            },
          },
        }),
      );

      const esito = await eseguiVerifica(octokit, ref, rules);

      expect(esito.superato).toBe(false);
      expect(esito.verdict?.violazioni.map((v) => v.file)).toEqual([NEGOZIO]);
    });
  });

  describe('proposta cambiata durante la verifica', () => {
    it('fallisce senza scrivere nulla nella proposta e lo segnala nel log', async () => {
      const avvisi = vi.spyOn(console, 'log').mockImplementation(() => {});
      const { octokit, chiamate, stato } = creaOctokitFinto(modificaConsentita());

      const esito = await eseguiVerifica(octokit, ref, rules, {
        headShaAtteso: 'c'.repeat(40),
      });

      expect(esito.superato).toBe(false);
      expect(esito.verdict).toBeNull();
      expect(stato.commenti).toEqual([]);
      expect(quante(chiamate, 'issues.createComment')).toBe(0);
      expect(quante(chiamate, 'issues.addLabels')).toBe(0);
      expect(avvisi).toHaveBeenCalledWith(
        expect.stringMatching(/^::warning .*cambiata durante la verifica.*ripartirà/),
      );
    });

    it('con lo SHA giusto la verifica procede normalmente', async () => {
      const { octokit } = creaOctokitFinto(modificaConsentita());

      const esito = await eseguiVerifica(octokit, ref, rules, { headShaAtteso: HEAD_SHA });

      expect(esito.superato).toBe(true);
    });
  });

  describe('controllo che non si riesce a completare', () => {
    it("se l'elenco dei file è incompleto fallisce con un messaggio chiaro", async () => {
      const { octokit, chiamate, stato } = creaOctokitFinto({
        autore: 'eusebjo',
        files: [{ filename: 'README.md', status: 'modified' }],
        fileDichiarati: 4000,
      });

      const esito = await eseguiVerifica(octokit, ref, rules);

      expect(esito.superato).toBe(false);
      expect(esito.verdict).toBeNull();
      const corpo = corpoDelRapporto(stato);
      expect(corpo.startsWith(`${MARCATORE}\n`)).toBe(true);
      expect(corpo).toMatch(/controllo non completato/i);
      expect(corpo).toMatch(/tutti i file/i);
      expect(corpo).not.toMatch(GERGO);
      expect(quante(chiamate, 'issues.addLabels')).toBe(0);
    });

    it('se GitHub non risponde fallisce senza mostrare dettagli tecnici nel commento', async () => {
      const errore = vi.spyOn(console, 'error').mockImplementation(() => {});
      const { octokit, stato } = creaOctokitFinto({
        autore: 'eusebjo',
        errori: { 'pulls.listFiles': erroreHttp(502, 'Bad Gateway segreto-interno') },
      });

      const esito = await eseguiVerifica(octokit, ref, rules);

      expect(esito.superato).toBe(false);
      const corpo = corpoDelRapporto(stato);
      expect(corpo).toMatch(/controllo non completato/i);
      expect(corpo).not.toMatch(/502|Bad Gateway|segreto-interno/);
      expect(corpo).not.toMatch(GERGO);
      expect(errore).toHaveBeenCalled();
    });

    it('fallisce comunque se nemmeno il commento si riesce a scrivere', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => {});
      const { octokit } = creaOctokitFinto({
        autore: 'eusebjo',
        errori: {
          'pulls.listFiles': erroreHttp(502),
          'issues.createComment': erroreHttp(403),
        },
      });

      await expect(eseguiVerifica(octokit, ref, rules)).resolves.toMatchObject({
        superato: false,
      });
    });

    it('se il commento del rapporto non si riesce a scrivere il controllo fallisce', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => {});
      const { octokit } = creaOctokitFinto(
        modificaConsentita({ errori: { 'issues.createComment': erroreHttp(403) } }),
      );

      const esito = await eseguiVerifica(octokit, ref, rules);

      expect(esito.superato).toBe(false);
    });
  });

  describe('rapporto molto lungo', () => {
    it('resta sotto il limite di GitHub e conserva marcatore e anteprima', async () => {
      const molti = Array.from({ length: 1500 }, (_, i) => ({
        filename: `src/codice/cartella-con-un-nome-piuttosto-lungo/file-numero-${i}.ts`,
        status: 'added',
      }));
      const { octokit, stato } = creaOctokitFinto(
        modificaConsentita({ files: molti, contenuti: {} }),
      );

      const esito = await eseguiVerifica(octokit, ref, rules);

      expect(esito.superato).toBe(false);
      const corpo = corpoDelRapporto(stato);
      expect(corpo.length).toBeLessThanOrEqual(LIMITE_CORPO);
      expect(corpo.startsWith(`${MARCATORE}\n`)).toBe(true);
      expect(corpo).toMatch(/accorciato/);
      expect(corpo).toContain(URL_ANTEPRIMA);
    });
  });
});

describe('rapportoErrore', () => {
  it('inizia con il marcatore, spiega cosa fare e non usa gergo', () => {
    const rapporto = rapportoErrore('Qualcosa non ha funzionato.');

    expect(rapporto.startsWith(`${MARCATORE}\n`)).toBe(true);
    expect(rapporto).toContain('Qualcosa non ha funzionato.');
    expect(rapporto).toMatch(/riparte da solo/i);
    expect(rapporto).not.toMatch(GERGO);
  });
});
