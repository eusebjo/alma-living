import { describe, expect, it } from 'vitest';
import {
  CARTELLE_FOTO,
  eFotoInSottocartella,
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
  // `filename_template: '{{filename}}-{{uuid_shorter}}'`, `slugify_filename` e
  // lo `slug` globale di config.yml: ASCII, senza accenti, minuscole). Il nome
  // originale resta riconoscibile: lettere, cifre, `_`, `-` e `~`, con i punti
  // diventati trattini. Poi un trattino e 8 caratteri esadecimali casuali, perché
  // una foto con lo stesso nome non ne sovrascriva un'altra nel bucket.
  // L'estensione è quella della conversione (`.webp`).
  it.each([
    // "WhatsApp Image 2026-11-03 at 10.10.10.jpeg"
    'whatsapp-image-2026-11-03-at-10-10-10-3fa9c2e1.webp',
    // "IMG_1234.HEIC"
    'img_1234-0b7c41d2.webp',
    // "Città di notte (1).jpg"
    'citta-di-notte-1-9e8d7c6b.webp',
    // "foto~1.png"
    'foto~1-5a4b3c2d.webp',
    // Un nome fatto solo di caratteri tolti diventa un codice casuale anch'esso.
    '3f9a2c1e4b5d-0b7c41d2.webp',
    // Se il browser non sa scrivere WebP, la foto resta PNG.
    'plaid-1f2e3d4c.png',
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

  // Dal selettore del pannello si può creare una cartella dentro `cms/` e caricarci la
  // foto: l'indirizzo è del bucket, ma ha un livello in più. Non è un indirizzo valido,
  // e va distinto dagli altri sbagliati perché il messaggio possa dire cosa fare.
  it.each([
    'https://foto.almalivingviaricasoli.it/cms/estate/plaid.webp',
    'https://foto.almalivingviaricasoli.it/prova/estate/plaid.webp',
    'https://foto.almalivingviaricasoli.it/cms/estate/2026/plaid-3fa9c2e1.webp',
  ])('eFotoInSottocartella riconosce %j', (src) => {
    expect(eFotoInSottocartella(src), src).toBe(true);
    expect(eIndirizzoFoto(src), src).toBe(false);
  });

  it.each([
    // Giusti: una foto direttamente in `cms/` o `prova/`.
    'https://foto.almalivingviaricasoli.it/cms/plaid.webp',
    'https://foto.almalivingviaricasoli.it/prova/plaid.jpg',
    // Sbagliati per un altro motivo: altro sito, altra cartella, `..`, query, nome strano, niente file.
    'https://pub-02e2834056a84517a87c5431c6904c14.r2.dev/cms/estate/a.webp',
    'https://example.com/cms/estate/a.webp',
    'http://foto.almalivingviaricasoli.it/cms/estate/a.webp',
    'https://foto.almalivingviaricasoli.it/altro/estate/a.webp',
    'https://foto.almalivingviaricasoli.it/cms/../prova/a.jpg',
    'https://foto.almalivingviaricasoli.it/cms/a~/../b.webp',
    'https://foto.almalivingviaricasoli.it/cms/estate/../a.webp',
    'https://foto.almalivingviaricasoli.it/cms/estate/a.webp?x=1',
    'https://foto.almalivingviaricasoli.it/cms/estate/a.webp#x',
    'https://foto.almalivingviaricasoli.it/cms/estate/a b.webp',
    'https://foto.almalivingviaricasoli.it/cms/estate/%2e%2e/a.jpg',
    'https://foto.almalivingviaricasoli.it/cms/',
    'https://foto.almalivingviaricasoli.it/cms/estate/',
    'https://foto.almalivingviaricasoli.it/cms//a.webp',
    'https://foto.almalivingviaricasoli.it.altro.example/cms/estate/a.webp',
    'https://utente@foto.almalivingviaricasoli.it/cms/estate/a.webp',
    '/cms/estate/a.webp',
    '',
  ])('eFotoInSottocartella non riconosce %j', (src) => {
    expect(eFotoInSottocartella(src), src).toBe(false);
  });
});
