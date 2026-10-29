import { describe, expect, it } from 'vitest';
import {
  linkTelefono,
  linkWhatsApp,
  messaggioDisponibilita,
} from '../../src/prova/comune/contatti';

describe('messaggioDisponibilita', () => {
  it('usa la frase esatta, anche con virgolette nel nome', () => {
    expect(messaggioDisponibilita('Plaid «Abbracciami»')).toBe(
      'Buongiorno, ho visto sul sito «Plaid «Abbracciami»». È disponibile? Misura o colore: …',
    );
  });
});

describe('linkWhatsApp', () => {
  it('senza messaggio è il link semplice', () => {
    expect(linkWhatsApp('393345205451')).toBe('https://wa.me/393345205451');
  });

  it("il messaggio va codificato nell'indirizzo", () => {
    expect(linkWhatsApp('393345205451', 'Ciao è?')).toBe(
      'https://wa.me/393345205451?text=Ciao%20%C3%A8%3F',
    );
  });

  it('un messaggio vuoto non aggiunge il parametro', () => {
    expect(linkWhatsApp('393345205451', '')).toBe('https://wa.me/393345205451');
  });

  it('tiene solo le cifre del numero, anche se arriva con + e spazi o come link wa.me', () => {
    expect(linkWhatsApp('+39 334 520 5451')).toBe('https://wa.me/393345205451');
    expect(linkWhatsApp('https://wa.me/393345205451', 'Ciao')).toBe(
      'https://wa.me/393345205451?text=Ciao',
    );
  });

  it('il messaggio di disponibilità arriva intatto', () => {
    const messaggio = messaggioDisponibilita('Plaid «Abbracciami»');
    const url = new URL(linkWhatsApp('393345205451', messaggio));
    expect(url.searchParams.get('text')).toBe(messaggio);
  });
});

describe('linkTelefono', () => {
  it('numero italiano senza prefisso: aggiunge +39', () => {
    expect(linkTelefono('334 520 5451')).toBe('tel:+393345205451');
  });

  it('numero con prefisso internazionale: lo mantiene', () => {
    expect(linkTelefono('+39 334 520 5451')).toBe('tel:+393345205451');
    expect(linkTelefono('0039 334 520 5451')).toBe('tel:+393345205451');
    expect(linkTelefono('+44 20 7946 0958')).toBe('tel:+442079460958');
  });
});
