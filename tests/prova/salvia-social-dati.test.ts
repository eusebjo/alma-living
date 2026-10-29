import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  altreCollezioni,
  apertura,
  articoli,
  categorie,
  collezioni,
  fotoDelNegozio,
  post,
  POST_VISIBILI,
  storie,
  storieInEvidenza,
  type Scatto,
} from '../../src/prova/salvia-social/dati';

// I contenuti di esempio di Salvia social: le foto devono esistere tra quelle
// della prova e gli id usati dai protocolli dello script comune devono essere
// unici nella pagina (un id ripetuto aprirebbe la storia o il post sbagliato).
const elenco = (JSON.parse(readFileSync('scripts/foto-prova/elenco.json', 'utf8')) as string[]).map(
  (file) => file.replace(/\.jpg$/, ''),
);

const scatti: Scatto[] = [
  fotoDelNegozio,
  ...apertura,
  ...collezioni,
  ...altreCollezioni,
  ...articoli,
  ...[...storie, ...storieInEvidenza].flatMap((storia) => storia.foto),
  ...post.flatMap((voce) => voce.foto),
];

describe('dati di Salvia social', () => {
  it('ogni foto è tra quelle della prova e ha un testo alternativo', () => {
    for (const scatto of scatti) {
      expect(elenco, scatto.foto).toContain(scatto.foto);
      expect(scatto.alt.length, scatto.foto).toBeGreaterThan(10);
    }
  });

  it('gli id di storie, articoli e post sono unici', () => {
    const idStorie = [...storie, ...storieInEvidenza].map((s) => s.id);
    expect(new Set(idStorie).size).toBe(idStorie.length);
    expect(new Set(articoli.map((a) => a.id)).size).toBe(articoli.length);
    expect(new Set(post.map((p) => p.id)).size).toBe(post.length);
  });

  it('ogni storia e ogni post ha almeno una foto', () => {
    for (const storia of [...storie, ...storieInEvidenza]) expect(storia.foto.length).toBeGreaterThan(0);
    for (const voce of post) expect(voce.foto.length).toBeGreaterThan(0);
  });

  it('articoli e collezioni usano le categorie dei filtri, e almeno un filtro resta vuoto', () => {
    const ids = categorie.map((c) => c.id);
    for (const articolo of articoli) {
      expect(articolo.categorie.length).toBeGreaterThan(0);
      for (const categoria of articolo.categorie) expect(ids).toContain(categoria);
    }
    for (const stanza of [...collezioni, ...altreCollezioni]) expect(ids).toContain(stanza.id);
    // Il caso "filtro senza articoli" della tavola (Mare) deve restare provabile.
    expect(ids.filter((id) => !articoli.some((a) => a.categorie.includes(id)))).toEqual(['mare']);
  });

  it('la griglia mostra 9 post e ne piega almeno uno in "Mostra altri"', () => {
    expect(POST_VISIBILI).toBe(9);
    expect(post.length).toBeGreaterThan(POST_VISIBILI);
  });

  it("l'apertura ha tre foto, ognuna con la frase di Martina", () => {
    expect(apertura).toHaveLength(3);
    for (const diapositiva of apertura) expect(diapositiva.testo.length).toBeGreaterThan(20);
  });
});
