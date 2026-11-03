import { describe, expect, it } from 'vitest';
import {
  CARTELLE_FOTO,
  eIndirizzoFoto,
  FOTO_BASE,
  indirizzoFoto,
} from '../src/content/foto';

describe('indirizzi delle foto', () => {
  it('le foto stanno su foto.almalivingviaricasoli.it, in due cartelle: prova e cms', () => {
    expect(FOTO_BASE).toBe('https://foto.almalivingviaricasoli.it');
    expect(CARTELLE_FOTO).toEqual(['prova', 'cms']);
  });

  it('indirizzoFoto mette insieme host, cartella e nome', () => {
    expect(indirizzoFoto('prova', 'scaffale.jpg')).toBe(
      'https://foto.almalivingviaricasoli.it/prova/scaffale.jpg',
    );
    expect(indirizzoFoto('cms', 'plaid.webp')).toBe(
      'https://foto.almalivingviaricasoli.it/cms/plaid.webp',
    );
  });

  it('eIndirizzoFoto accetta gli indirizzi fatti da indirizzoFoto, in ogni cartella', () => {
    expect(eIndirizzoFoto('https://foto.almalivingviaricasoli.it/cms/plaid.webp')).toBe(true);
    for (const cartella of CARTELLE_FOTO) {
      expect(eIndirizzoFoto(indirizzoFoto(cartella, 'a-b_c.1.jpg')), cartella).toBe(true);
    }
  });

  // I nomi che dà il pannello alle foto caricate (Sveltia 0.248.0 con
  // `slugify_filename` e lo `slug` globale di config.yml: ASCII, senza accenti,
  // minuscole). Restano lettere, cifre, `_`, `-` e `~`; i punti del nome
  // diventano trattini, l'estensione è quella della conversione (`.webp`) e un
  // nome già usato riceve `-1`, `-2`…
  it.each([
    // "WhatsApp Image 2026-11-03 at 10.10.10.jpeg"
    'whatsapp-image-2026-11-03-at-10-10-10.webp',
    // "IMG_1234.HEIC"
    'img_1234.webp',
    // "Città di notte (1).jpg"
    'citta-di-notte-1.webp',
    // "foto~1.png", e un nome già usato
    'foto~1.webp',
    'plaid-1.webp',
    // Un nome fatto solo di caratteri tolti diventa un codice casuale.
    '3f9a2c1e4b5d.webp',
    // Se il browser non sa scrivere WebP, la foto resta PNG.
    'plaid.png',
  ])('eIndirizzoFoto accetta il nome che il pannello dà a una foto caricata: %s', (nome) => {
    expect(eIndirizzoFoto(indirizzoFoto('cms', nome))).toBe(true);
  });

  it.each([
    'http://foto.almalivingviaricasoli.it/cms/a.webp',
    'https://foto.almalivingviaricasoli.it/cms/a~/../b.webp',
    'https://foto.almalivingviaricasoli.it/cms/%7Ea.webp',
    'https://pub-02e2834056a84517a87c5431c6904c14.r2.dev/prova/a.jpg',
    'https://foto.almalivingviaricasoli.it/altro/a.webp',
    'https://foto.almalivingviaricasoli.it/cms/../prova/a.jpg',
    'https://foto.almalivingviaricasoli.it/cms/a.webp?x=1',
    'https://foto.almalivingviaricasoli.it/cms/a.webp#x',
    'https://foto.almalivingviaricasoli.it/cms/',
    'https://foto.almalivingviaricasoli.it/cms/sotto/a.webp',
    'https://foto.almalivingviaricasoli.it.altro.example/cms/a.webp',
    'https://utente@foto.almalivingviaricasoli.it/cms/a.webp',
    'https://foto.almalivingviaricasoli.it:8443/cms/a.webp',
    'https://foto.almalivingviaricasoli.it/cms/%2e%2e/a.jpg',
    'https://foto.almalivingviaricasoli.it/cms/a%2eb.jpg',
    'https://foto.almalivingviaricasoli.it/cms/a b.jpg',
    'https://foto.almalivingviaricasoli.it/cms/a\\b.jpg',
    '//foto.almalivingviaricasoli.it/cms/a.webp',
    '/cms/a.webp',
    '',
  ])('eIndirizzoFoto rifiuta %j', (no) => {
    expect(eIndirizzoFoto(no), no).toBe(false);
  });
});
