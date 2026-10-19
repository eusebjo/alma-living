import { describe, expect, it } from 'vitest';
import { evaluate } from '../../scripts/autonomia/evaluate';
import { MARCATORE, formatReport } from '../../scripts/autonomia/report';
import type { Azione, Verdict, Violazione } from '../../scripts/autonomia/types';
import {
  HOME,
  NEGOZIO,
  ORARI_LUNEDI,
  aggiunto,
  homeMd,
  immagine,
  kb,
  modificato,
  negozioJson,
  proposta,
  rimosso,
  rinominato,
  rules,
} from './fixtures';

const GERGO = /branch|merge|commit/i;

const respinto = (violazioni: Violazione[]): Verdict => ({
  ruolo: 'redazione',
  esito: 'respinto',
  livello: null,
  violazioni,
});

describe('formatReport', () => {
  it("inizia con il marcatore `<!-- verifica-autonomia -->`", () => {
    const verdetti: Verdict[] = [
      { ruolo: 'sviluppo', esito: 'consentito', livello: null, violazioni: [] },
      { ruolo: 'redazione', esito: 'consentito', livello: 1, violazioni: [] },
      respinto([{ file: NEGOZIO, campo: 'nome', azione: 'modifica', messaggio: 'x' }]),
      {
        ruolo: 'redazione',
        esito: 'in_bozza',
        livello: null,
        violazioni: [{ file: '', azione: 'stato', messaggio: 'Ancora una bozza.' }],
      },
    ];

    expect(MARCATORE).toBe('<!-- verifica-autonomia -->');
    for (const verdetto of verdetti) {
      expect(formatReport(verdetto).startsWith('<!-- verifica-autonomia -->')).toBe(true);
    }
  });

  it('per respinto elenca file e campo, in italiano', () => {
    const report = formatReport(
      respinto([
        {
          file: NEGOZIO,
          campo: 'nome',
          azione: 'modifica',
          messaggio: 'Questo campo non può essere modificato.',
        },
        {
          file: 'src/layouts/BaseLayout.astro',
          azione: 'perimetro',
          messaggio: 'Questo file non rientra tra quelli che puoi modificare.',
        },
      ]),
    );

    expect(report).toContain('non consentita');
    expect(report).toContain(`\`${NEGOZIO}\``);
    expect(report).toContain('campo `nome`');
    expect(report).toContain('Questo campo non può essere modificato.');
    expect(report).toContain('`src/layouts/BaseLayout.astro`');
    expect(report).toContain('Questo file non rientra tra quelli che puoi modificare.');
    // Il campo compare solo dove c'è.
    expect(report.match(/campo `/g)).toHaveLength(1);
  });

  it("il verdetto reale su orari più nome elenca solo il campo vietato", () => {
    const verdetto = evaluate(
      proposta([
        modificato(
          NEGOZIO,
          negozioJson(),
          negozioJson((n) => {
            n.orari = ORARI_LUNEDI;
            n.nome = 'Altro';
          }),
        ),
      ]),
      rules,
    );
    const report = formatReport(verdetto);

    expect(report).toContain('campo `nome`');
    expect(report).not.toContain('orari');
  });

  it('per un autore sconosciuto riporta il messaggio senza una voce di file vuota', () => {
    const report = formatReport(evaluate(proposta([], { author: 'estraneo' }), rules));

    expect(report).toContain('non è autorizzat');
    expect(report).not.toContain('``');
    expect(report).not.toMatch(/^- \(/m);
  });

  it("per consentito con livello 1 contiene `in attesa dell'approvazione`", () => {
    const report = formatReport({
      ruolo: 'redazione',
      esito: 'consentito',
      livello: 1,
      violazioni: [],
    });

    expect(report).toContain("in attesa dell'approvazione");
    expect(report).toContain('consentita');
    expect(report).not.toContain('non consentita');
  });

  it('per consentito con un livello maggiore non promette un\'approvazione che non serve', () => {
    const report = formatReport({
      ruolo: 'redazione',
      esito: 'consentito',
      livello: 3,
      violazioni: [],
    });

    expect(report).toContain('consentita');
    expect(report).toContain('livello 3');
    expect(report).not.toContain("in attesa dell'approvazione");
  });

  it('per lo sviluppo dice che le regole sui contenuti non si applicano', () => {
    const report = formatReport({
      ruolo: 'sviluppo',
      esito: 'consentito',
      livello: null,
      violazioni: [],
    });

    expect(report).toMatch(/sviluppo/);
    expect(report).toContain('consentita');
    expect(report).not.toContain("in attesa dell'approvazione");
  });

  it('per in_bozza spiega cosa fare e non parla di respingimento', () => {
    const report = formatReport(evaluate(proposta([], { draft: true }), rules));

    expect(report).toContain('bozza');
    expect(report).not.toContain('non consentita');
    expect(report).toMatch(/revisione/);
  });

  it('non contiene mai le parole branch, merge, commit, per nessun tipo di violazione', () => {
    const verdetti = [
      evaluate(proposta([], { author: 'estraneo' }), rules),
      evaluate(proposta([], { draft: true }), rules),
      evaluate(proposta([], { labels: [] }), rules),
      evaluate(proposta([]), rules),
      evaluate(proposta([], { author: 'eusebjo' }), rules),
      evaluate(
        proposta([
          modificato(NEGOZIO, negozioJson(), negozioJson((n) => { n.nome = 'x'; })),
          modificato(NEGOZIO, negozioJson(), '{rotto'),
          modificato('src/layouts/BaseLayout.astro', 'a', 'b'),
          aggiunto('src/content/pagine/nuova.md', homeMd()),
          rimosso(HOME, homeMd()),
          rinominato(HOME, 'src/content/pagine/x.md', homeMd()),
          immagine('src/content/pagine/immagini/foto.jpg', kb(9000)),
          immagine('src/content/pagine/immagini/foto.webp', undefined, 'removed'),
        ]),
        rules,
      ),
    ];

    // Controlla che i casi coprano tutte le azioni possibili di una violazione.
    const azioni = new Set<Azione>(verdetti.flatMap((v) => v.violazioni.map((x) => x.azione)));
    for (const azione of ['autore', 'stato', 'modifica', 'crea', 'elimina', 'perimetro', 'formato', 'dimensione'] as Azione[]) {
      expect(azioni.has(azione)).toBe(true);
    }

    for (const verdetto of verdetti) {
      expect(formatReport(verdetto)).not.toMatch(GERGO);
    }
  });

  it('protegge il testo dei percorsi e dei campi presi dalla proposta (backtick, HTML, a capo, menzioni)', () => {
    const report = formatReport(
      respinto([
        {
          file: 'src/`x`/@everyone\n<!-- verifica-autonomia -->\u202E.md',
          campo: 'campo`\n- finto elemento',
          azione: 'modifica',
          messaggio: 'Messaggio.',
        },
      ]),
    );

    // Il marcatore compare solo in testa: quello scritto nel nome del file è neutralizzato.
    expect(report.match(/<!-- verifica-autonomia -->/g)).toHaveLength(1);
    expect(report.slice(MARCATORE.length)).not.toMatch(/[<>]/);
    expect(report).not.toContain('\u202E');
    // Nessuna riga in più: la voce di elenco resta una riga sola.
    const voci = report.split('\n').filter((riga) => riga.startsWith('- '));
    expect(voci).toHaveLength(1);
    // La menzione sta dentro un blocco di codice, quindi non avvisa nessuno.
    expect(voci[0]).toMatch(/^- `[^`]*@everyone[^`]*` /);
    expect(voci[0].match(/`/g)?.length).toBe(4);
  });

  it('accorcia i percorsi esageratamente lunghi', () => {
    const lungo = `src/${'a'.repeat(5000)}.md`;
    const report = formatReport(
      respinto([{ file: lungo, azione: 'perimetro', messaggio: 'Messaggio.' }]),
    );
    expect(report.length).toBeLessThan(1500);
  });

  it('un verdetto respinto senza violazioni non rompe il testo', () => {
    const report = formatReport(respinto([]));
    expect(report.startsWith(MARCATORE)).toBe(true);
    expect(report).toContain('non consentita');
  });
});
