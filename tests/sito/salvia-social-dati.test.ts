import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { eIndirizzoFoto, FOTO_BASE, indirizzoFoto } from '../../src/content/foto';
import {
  categorie,
  delData,
  fotoDeiFiltri,
  fotoDelNegozio,
  fotoFinestra,
  LIMITI_SELEZIONE,
  messaggioPost,
  messaggioStoria,
  nomeConColore,
  occhielloArticolo,
  POST_VISIBILI,
  SCALA_DETTAGLIO,
  sezioni,
  testoColori,
  vetrina,
  type Articolo,
  type Post,
  type Scatto,
  type Storia,
} from '../../src/sito/componenti/dati';

// I dati fissi di Salvia social (vetrina, foto dei filtri, delle finestre e del
// negozio, sezioni) e le funzioni di testo. Prodotti, post e storie sono nelle
// collection e li cambia la redazione: qui non si fissano (le loro regole sono
// negli schemi, `tests/schemas.test.ts` e `tests/contenuti.test.ts`, e negli
// adattatori, `tests/sito/contenuti.test.ts`).

/** Il nome della foto (senza cartella né estensione), per esempio `righe-rosa`. */
function nome(scatto: Scatto): string {
  return scatto.src.slice(indirizzoFoto('prova', '').length).replace(/\.jpg$/, '');
}

/** Le foto fisse della pagina, scritte nel codice. */
const scatti: Scatto[] = [
  fotoDelNegozio,
  ...vetrina.map((p) => p.scatto),
  ...Object.values(fotoDeiFiltri),
  ...Object.values(fotoFinestra),
];

/** Uno scatto di prova per gli articoli, i post e le storie inventati qui sotto. */
const SCATTO: Scatto = { src: indirizzoFoto('cms', 'a.webp'), alt: 'Una foto di prova', posizione: '50% 50%' };

function articolo(campi: Partial<Articolo>): Articolo {
  return {
    id: 'x',
    nome: 'Articolo',
    dettaglio: 'Dettaglio',
    categorie: ['letto'],
    novita: false,
    scatti: [SCATTO, SCATTO],
    ...campi,
  };
}

function post(campi: Partial<Post>): Post {
  return { id: 'p', data: '28 ottobre', testo: 'Testo', foto: [SCATTO], ...campi };
}

describe('dati di Salvia social', () => {
  it('ogni foto fissa è un indirizzo della cartella prova di foto.almalivingviaricasoli.it e ha un testo alternativo', () => {
    expect(scatti.length).toBeGreaterThan(20);
    for (const scatto of scatti) {
      expect(eIndirizzoFoto(scatto.src), scatto.src).toBe(true);
      expect(scatto.src.startsWith(`${FOTO_BASE}/prova/`), scatto.src).toBe(true);
      expect(scatto.src, scatto.src).toMatch(/\.jpg$/);
      expect(scatto.alt.length, scatto.src).toBeGreaterThan(10);
    }
  });

  it('gli scatti hanno src, alt e posizione, e nessun campo foto', () => {
    for (const scatto of scatti) {
      expect(scatto, scatto.src).toMatchObject({
        src: expect.any(String),
        alt: expect.any(String),
        posizione: expect.any(String),
      });
      expect(scatto, scatto.src).not.toHaveProperty('foto');
    }
  });

  it('il messaggio WhatsApp di una storia dice il nome e il soggetto della foto', () => {
    const storia: Storia = {
      id: 'arrivi',
      nome: 'Arrivi',
      data: '27 ottobre',
      invito: 'whatsapp',
      foto: [
        { ...SCATTO, testo: 'Sono arrivati i plaid delle feste.', soggetto: 'i plaid delle feste' },
        { ...SCATTO, testo: 'E il verde.', soggetto: 'l’asciugamano verde con la casetta' },
      ],
    };
    expect(messaggioStoria(storia, storia.foto[0]!)).toBe(
      'Buongiorno, ho visto la storia «Arrivi» sul sito: i plaid delle feste. ',
    );
    expect(messaggioStoria(storia, storia.foto[1]!)).toBe(
      'Buongiorno, ho visto la storia «Arrivi» sul sito: l’asciugamano verde con la casetta. ',
    );
  });

  it('i cerchietti dei filtri: "tutti" e ogni categoria', () => {
    const ids = categorie.map((c) => c.id);
    for (const chiave of Object.keys(fotoDeiFiltri)) expect(['tutti', ...ids]).toContain(chiave);
  });

  it('la griglia mostra 9 post prima di "Mostra altri"', () => {
    expect(POST_VISIBILI).toBe(9);
  });

  it('la selezione mostra 4 schede sul telefono e 6 sul tablet', () => {
    expect(LIMITI_SELEZIONE).toEqual([
      { media: '(max-width: 767px)', limite: 4 },
      { media: '(max-width: 1023px)', limite: 6 },
    ]);
  });

  it('ogni filtro ha il cerchietto foto della sua stanza, e "Tutto" lo scaffale', () => {
    expect(Object.keys(fotoDeiFiltri).sort()).toEqual(['tutti', ...categorie.map((c) => c.id)].sort());
    expect(
      Object.fromEntries(
        Object.entries(fotoDeiFiltri).map(([id, s]) => [id, [nome(s), s.posizione]]),
      ),
    ).toEqual({
      tutti: ['scaffale', '50% 45%'],
      letto: ['camera-rosa', '50% 55%'],
      bagno: ['bagno', '50% 58%'],
      bimbi: ['accappatoi-appesi', '50% 24%'],
      tavola: ['tavola', '40% 55%'],
      profumi: ['candele', '50% 60%'],
      natale: ['gnomi', '50% 45%'],
      mare: ['mare', '50% 60%'],
    });
  });

  it('un dettaglio si ingrandisce 1,7 volte', () => {
    expect(SCALA_DETTAGLIO).toBe(1.7);
  });

  it('i testi dei colori', () => {
    const verde = { nome: 'verde', tinta: '#000' };
    const rosso = { nome: 'rosso', tinta: '#000' };
    const bianco = { nome: 'bianco', tinta: '#000' };
    expect(testoColori([verde, rosso])).toBe('scegli tra verde e rosso');
    expect(testoColori([rosso, bianco, verde])).toBe('scegli tra rosso, bianco e verde');
    expect(testoColori([verde])).toBe('verde');
    expect(testoColori([])).toBe('');
    expect(nomeConColore('Plaid Abbracciami', verde)).toBe('Plaid Abbracciami · verde');
  });

  it("l'occhiello è «Novità» al posto della categoria, altrimenti il nome della prima categoria", () => {
    expect(occhielloArticolo(articolo({ novita: true, categorie: ['letto'] }))).toBe('Novità');
    expect(occhielloArticolo(articolo({ categorie: ['bimbi', 'bagno'] }))).toBe('Bimbi');
    expect(occhielloArticolo(articolo({ categorie: ['profumi', 'bagno'] }))).toBe('Profumi per la casa');
  });

  it('le sezioni seguono la pagina: «Collezioni» porta agli scaffali, il diario dopo', () => {
    expect(sezioni.map((s) => s.href)).toEqual(['#selezione', '#diario', '#negozio']);
    expect(sezioni.map((s) => s.nome)).toEqual(['Collezioni', 'Dal negozio', 'Il negozio']);
  });

  it('il messaggio WhatsApp di un post dice di che cosa parla, con la preposizione', () => {
    expect(messaggioPost(post({ chiedi: 'sui cuscini di Natale' }))).toBe(
      'Buongiorno, ho visto sul sito il vostro post del 28 ottobre sui cuscini di Natale. Mi date qualche informazione in più?',
    );
  });

  it('senza "di cosa parla" il messaggio del post dice solo la data', () => {
    expect(messaggioPost(post({}))).toBe(
      'Buongiorno, ho visto sul sito il vostro post del 28 ottobre. Mi date qualche informazione in più?',
    );
  });

  it('"del" davanti a una data si elide con 8 e 11: dell’8 luglio, dell’11 ottobre', () => {
    expect(delData('8 luglio')).toBe('dell’8 luglio');
    expect(delData('11 ottobre')).toBe('dell’11 ottobre');
    expect(delData('28 ottobre')).toBe('del 28 ottobre');
    expect(delData('1 giugno')).toBe('del 1 giugno');
    // Gli altri giorni che cominciano per 1 si leggono con la consonante: non si elidono.
    expect(delData('18 giugno')).toBe('del 18 giugno');
    expect(delData('10 giugno')).toBe('del 10 giugno');
  });

  it('il messaggio WhatsApp elide "del" con le date dell’8 e dell’11', () => {
    expect(messaggioPost(post({ data: '8 luglio', chiedi: 'sulle essenze per il bucato' }))).toContain(
      'post dell’8 luglio sulle essenze per il bucato',
    );
    expect(messaggioPost(post({ data: '11 ottobre', chiedi: 'sui plaid' }))).toContain(
      'post dell’11 ottobre sui plaid',
    );
  });

  it('la vetrina ha i 12 prodotti della sequenza, cinque grandi', () => {
    expect(vetrina.map((p) => p.nome)).toEqual([
      'Lenzuola e copriletto a righe rosa', 'Coperta in maglia', 'Plaid Abbracciami',
      'Asciugamano con casetta', 'Lenzuola color sabbia', 'Accappatoio con orsetto',
      'Tovaglia con volant', 'Parure con volant', 'Candele nelle ciotole di legno',
      'Copriletto rosso con volant', 'Cuscini delle feste', 'Saponi e profumi',
    ]);
    expect(vetrina.map((p, i) => (p.grande ? i : -1)).filter((i) => i >= 0)).toEqual([0, 1, 6, 10, 11]);
  });

  it('la vetrina: foto e posizioni, computer e telefono, della sequenza fissa', () => {
    expect(vetrina.map((p) => [nome(p.scatto), p.scatto.posizione, p.posizioneTelefono])).toEqual([
      ['righe-rosa', '50% 24%', '50% 40%'],
      ['coperta', '50% 52%', '50% 50%'],
      ['abbracciami-verde', '50% 50%', '50% 50%'],
      ['asciugamano-rosso', '50% 50%', '50% 50%'],
      ['lenzuola-beige', '50% 40%', '50% 40%'],
      ['neonato', '50% 40%', '50% 40%'],
      ['tovaglia-volant', '50% 45%', '50% 50%'],
      ['volant', '50% 50%', '50% 50%'],
      ['candele', '50% 60%', '50% 60%'],
      ['copriletto-rosso', '50% 50%', '50% 50%'],
      ['ig-cuscini-1', '50% 62%', '50% 55%'],
      ['bagno-prodotti', '50% 62%', '50% 78%'],
    ]);
  });
});

/** I sorgenti testuali sotto `cartella` (le foto e i loghi no). */
function sorgenti(cartella: string): string[] {
  return readdirSync(cartella, { withFileTypes: true }).flatMap((voce) => {
    const percorso = join(cartella, voce.name);
    if (voce.isDirectory()) return sorgenti(percorso);
    return /\.(astro|ts|css|mjs)$/.test(voce.name) ? [percorso] : [];
  });
}

describe('la voce del sito', () => {
  it('nessun file della variante, dello script comune o delle pagine di prova nomina Martina', () => {
    const file = [...sorgenti('src/sito'), ...sorgenti('src/pages/prova')];
    expect(file.length).toBeGreaterThan(20);
    for (const f of file) expect(readFileSync(f, 'utf8'), f).not.toMatch(/martina/i);
  });
});
