import { describe, expect, it } from 'vitest';
import { negozioSchema, type Negozio } from '../src/content/schemas';
import { llmsTxt } from '../src/lib/llms';

function negozio(extra: Partial<Negozio> = {}): Negozio {
  return negozioSchema.parse({
    nome: 'Alma Living',
    descrizione: 'Negozio di biancheria per la casa nel centro di Livorno.',
    indirizzo: {
      via: 'Via Ricasoli',
      civico: '51-53',
      cap: '57125',
      citta: 'Livorno',
      provincia: 'LI',
    },
    telefono: '334 520 5451',
    orari: [],
    ...extra,
  });
}

const PAGINE = [
  {
    titolo: 'Alma Living, biancheria per la casa a Livorno',
    descrizione: 'Il negozio in Via Ricasoli, a Livorno.',
    url: 'https://x.dev/',
  },
  {
    titolo: 'Chi siamo',
    descrizione: 'La storia del negozio.',
    url: 'https://x.dev/chi-siamo/',
  },
];

describe('llmsTxt', () => {
  const testo = llmsTxt(negozio(), PAGINE, 'https://x.dev');

  it('inizia con il nome del negozio come titolo', () => {
    expect(testo.startsWith('# Alma Living\n')).toBe(true);
  });

  it('riassume il negozio in una citazione subito dopo il titolo', () => {
    expect(testo).toContain(
      '> Negozio di biancheria per la casa nel centro di Livorno.',
    );
  });

  it("contiene l'indirizzo completo", () => {
    expect(testo).toContain('Via Ricasoli 51-53');
    expect(testo).toContain('57125 Livorno (LI)');
  });

  it('contiene il telefono, anche in formato E.164', () => {
    expect(testo).toContain('334 520 5451');
    expect(testo).toContain('+393345205451');
  });

  it("contiene l'URL del sito", () => {
    expect(testo).toContain('https://x.dev');
  });

  it('elenca le pagine con titolo, URL e descrizione', () => {
    expect(testo).toContain('## Pagine');
    expect(testo).toContain(
      '- [Alma Living, biancheria per la casa a Livorno](https://x.dev/): Il negozio in Via Ricasoli, a Livorno.',
    );
    expect(testo).toContain(
      '- [Chi siamo](https://x.dev/chi-siamo/): La storia del negozio.',
    );
  });

  it("l'email compare solo se presente", () => {
    expect(testo).not.toMatch(/email/i);
    const conEmail = llmsTxt(
      negozio({ email: 'info@example.com' }),
      PAGINE,
      'https://x.dev',
    );
    expect(conEmail).toContain('info@example.com');
  });

  it('senza pagine non scrive la sezione Pagine', () => {
    const senza = llmsTxt(negozio(), [], 'https://x.dev');
    expect(senza).not.toContain('## Pagine');
    expect(senza.startsWith('# Alma Living\n')).toBe(true);
  });

  it('finisce con un solo a capo', () => {
    expect(testo).toMatch(/[^\n]\n$/);
  });
});
