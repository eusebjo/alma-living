import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { describe, expect, it } from 'vitest';
import type { Negozio } from '../../src/content/schemas';
import Diario from '../../src/sito/componenti/Diario.astro';
import { datiNegozio } from '../../src/sito/comune/negozio';

// Il diario senza post: la redazione può cancellarli tutti dal pannello, e la
// pagina deve costruirsi lo stesso. Restano l'introduzione e il biglietto;
// spariscono la riga "L’ultimo post è …" e il riquadro "Post dal negozio".
// (Con i post la sezione la controllano i test sul sito generato, `tests/dist`:
// qui le foto andrebbero scaricate dal bucket.)

const negozio = datiNegozio({
  nome: 'Alma Living',
  descrizione: 'Negozio di biancheria per la casa nel centro di Livorno.',
  indirizzo: { via: 'Via Ricasoli', civico: '51-53', cap: '57125', citta: 'Livorno', provincia: 'LI' },
  telefono: '334 520 5451',
  orari: [],
} satisfies Negozio);

/** Il testo dell'HTML: senza tag, con gli spazi ridotti a uno. */
function testo(html: string): string {
  return html
    .replace(/<style\b[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

describe('Diario senza post', () => {
  it('si costruisce: introduzione e biglietto, senza "ultimo post" né riquadro dei post', async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(Diario, { props: { post: [], negozio } });
    const scritto = testo(html);

    // L'introduzione e il biglietto restano.
    expect(html).toMatch(/<section\b[^>]*\sid="diario"/);
    expect(scritto).toContain('Post e foto');
    expect(scritto).toContain('Dal negozio');
    expect(scritto).toContain('Il feed del negozio: qui trovi tutti i nostri post.');
    expect(scritto).toContain('Se vedi qualcosa che ti piace, scrivici');
    expect(scritto).toContain('Alma Living · Via Ricasoli');

    // Niente data dell'ultimo post e niente riquadro: testata, griglia, "Mostra altri".
    expect(scritto).not.toContain('L’ultimo post è');
    expect(scritto).not.toContain('Post dal negozio');
    expect(scritto).not.toContain('Aggiornato il');
    expect(scritto).not.toContain('Mostra altri post');
    expect(html).not.toMatch(/\sclass="[^"]*\b(?:riquadro|griglia|frequenza)\b/);
    expect(html).not.toMatch(/\sdata-(?:post-apri|mostra-altri|post)(?=[\s=>])/);
  });
});
