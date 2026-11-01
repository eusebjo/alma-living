import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  altreCollezioni,
  apertura,
  articoli,
  categorie,
  collezioni,
  delData,
  fotoDeiFiltri,
  fotoDelNegozio,
  fotoFinestra,
  LIMITI_SELEZIONE,
  messaggioPost,
  nomeConColore,
  occhielloArticolo,
  post,
  POST_VISIBILI,
  SCALA_DETTAGLIO,
  sezioni,
  storie,
  testoColori,
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
  ...Object.values(fotoDeiFiltri),
  ...Object.values(fotoFinestra),
  ...articoli.flatMap((a) => a.scatti),
  ...articoli.flatMap((a) => (a.colori ?? []).flatMap((c) => (c.foto ? [c.foto] : []))),
  ...storie.flatMap((storia) => storia.foto),
  ...post.flatMap((voce) => voce.foto),
];

// Le foto dei post veri di Alma Living (`ig-*`) e il loro testo alternativo,
// alla lettera: un refuso nel testo alternativo lo leggerebbe uno screen reader.
const ALT_POST_VERI: Record<string, string> = {
  'ig-assaggio':
    'Camera con testiera capitonné e copriletto rosa con balza di pizzo, una donna legge sul letto',
  'ig-conchiglie': 'Vasi in ceramica a forma di conchiglia con piante grasse, su un tavolo di legno',
  'ig-spoiler':
    'Scaffali del negozio con biancheria piegata, tovaglie a quadretti e diffusori per la casa',
  'ig-angolo-bimbi':
    'Scaffale del negozio con cuscini a righe, biancheria rosa e prodotti per i più piccoli',
  'ig-tavola-1':
    'Tavola apparecchiata in negozio con piatti a spirale grigi e bicchieri, davanti agli scaffali',
  'ig-tavola-2': 'Piatti con decoro a spirale grigio e una ciotola sul tavolo del negozio',
  'ig-tavola-estate': 'Ciotole di legno decorate, vassoi con piastrelle blu e posate di legno',
  'ig-erbolinea':
    'Flaconi di essenze per il bucato su un vassoio di legno, davanti a una finestra ad arco',
  'ig-beach-therapy': 'Telo mare a righe verde menta e borsa Beach Therapy sulla spiaggia',
  'ig-autunno':
    'Camera con testiera capitonné bianca, copriletto trapuntato rosa cipria e carta da parati a fiori',
  'ig-parure-1': 'Letto matrimoniale con parure copripiumino a piccole macchie su fondo beige',
  'ig-parure-2': 'Letto matrimoniale con parure copripiumino maculata nei toni del marrone',
  'ig-parure-3': 'Letto con parure copripiumino a quadri beige, panna e rosso',
  'ig-parure-4': 'Letto con parure copripiumino a motivo geometrico blu e bianco',
  'ig-parure-5': 'Letto con copripiumino in jersey di cotone verde',
  'ig-cuscini-1': 'Divano con cuscini natalizi rossi, bianchi e verdi con alberelli in rilievo',
  'ig-cuscini-2': 'Divano con cuscini natalizi ad alberelli e un plaid rosso con fiocchi di neve',
  'ig-cuscini-3': 'Sei cuscini con gattini natalizi stampati',
  'ig-cuscini-4': 'Cuscini con baite innevate e boschi di abeti su un divano chiaro',
};

describe('dati di Salvia social', () => {
  it('ogni foto è tra quelle della prova e ha un testo alternativo', () => {
    for (const scatto of scatti) {
      expect(elenco, scatto.foto).toContain(scatto.foto);
      expect(scatto.alt.length, scatto.foto).toBeGreaterThan(10);
    }
  });

  it('gli id di storie, articoli e post sono unici', () => {
    const idStorie = storie.map((s) => s.id);
    expect(new Set(idStorie).size).toBe(idStorie.length);
    expect(new Set(articoli.map((a) => a.id)).size).toBe(articoli.length);
    expect(new Set(post.map((p) => p.id)).size).toBe(post.length);
  });

  it('ogni storia e ogni post ha almeno una foto', () => {
    for (const storia of storie) expect(storia.foto.length).toBeGreaterThan(0);
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

  it('i post sono i 13 post veri di Alma Living, dal più recente, con id da p1 a p13', () => {
    expect(post).toHaveLength(13);
    expect(post.map((voce) => voce.id)).toEqual(
      Array.from({ length: 13 }, (_vuoto, i) => `p${i + 1}`),
    );
    expect(post[0]!.data).toBe('28 ottobre');
    expect(post[12]!.data).toBe('30 aprile');
  });

  it('ogni foto dei post ha la sua voce tra i testi alternativi', () => {
    for (const voce of post) {
      for (const scatto of voce.foto) {
        expect(typeof scatto.alt, `${voce.id} ${scatto.foto}`).toBe('string');
        expect(scatto.alt.trim(), `${voce.id} ${scatto.foto}`).not.toBe('');
      }
    }
  });

  it('le 19 foto nuove dei post hanno il testo alternativo previsto, e ognuna è usata da un post', () => {
    const usate = new Map<string, string>(
      post.flatMap((voce) => voce.foto).map((scatto) => [scatto.foto, scatto.alt]),
    );
    for (const [nome, alt] of Object.entries(ALT_POST_VERI)) {
      expect(usate.get(nome), nome).toBe(alt);
      expect(elenco, nome).toContain(nome);
    }
    // Nessuna foto `ig-*` dell'elenco resta fuori dai post.
    expect(elenco.filter((nome) => nome.startsWith('ig-')).sort()).toEqual(
      Object.keys(ALT_POST_VERI).sort(),
    );
  });

  it('nessun testo dei post contiene emoji', () => {
    for (const voce of post) expect(voce.testo, voce.id).not.toMatch(/\p{Extended_Pictographic}/u);
  });

  it('la griglia mostra 9 post e ne piega almeno uno in "Mostra altri"', () => {
    expect(POST_VISIBILI).toBe(9);
    expect(post.length).toBeGreaterThan(POST_VISIBILI);
  });

  it('la selezione mostra 4 schede sul telefono e 6 sul tablet, e ne ha di più', () => {
    expect(LIMITI_SELEZIONE).toEqual([
      { media: '(max-width: 767px)', limite: 4 },
      { media: '(max-width: 1023px)', limite: 6 },
    ]);
    expect(articoli.length).toBeGreaterThan(6);
  });

  it('ogni filtro ha il cerchietto foto della sua collezione, e "Tutto" lo scaffale', () => {
    expect(Object.keys(fotoDeiFiltri).sort()).toEqual(['tutti', ...categorie.map((c) => c.id)].sort());
    expect(fotoDeiFiltri.tutti).toMatchObject({ foto: 'scaffale', posizione: '50% 45%' });
    for (const c of [...collezioni, ...altreCollezioni]) {
      expect(fotoDeiFiltri[c.id], c.id).toMatchObject({ foto: c.foto, posizione: c.posizione });
    }
  });

  it('le coppie di scatti sono quelle della tavola', () => {
    expect(Object.fromEntries(articoli.map((a) => [a.id, a.scatti.map((s) => s.foto)]))).toEqual({
      sabbia: ['lenzuola-beige', 'lenzuola-beige'],
      abbracciami: ['abbracciami-verde', 'abbracciami-rosso'],
      orsetto: ['neonato', 'accappatoi-appesi'],
      volant: ['volant', 'trapunta'],
      casetta: ['asciugamano-rosso', 'asciugamano-verde'],
      tovaglia: ['tovaglia-volant', 'tovaglia-volant'],
      coperta: ['coperta', 'coperta'],
      saponi: ['bagno-prodotti', 'bagno-prodotti'],
    });
  });

  it('il secondo scatto è un altro: una foto vera, o un dettaglio ingrandito 1,7 volte con il suo alt', () => {
    expect(SCALA_DETTAGLIO).toBe(1.7);
    for (const {
      id,
      scatti: [primo, secondo],
    } of articoli) {
      expect(secondo.alt, id).not.toBe(primo.alt);
      if (secondo.foto === primo.foto) {
        // Un dettaglio ingrandito tiene la posizione del primo scatto.
        expect(secondo.posizione, id).toBe(primo.posizione);
        expect(secondo.ingrandimento?.scala, id).toBe(SCALA_DETTAGLIO);
        expect(secondo.ingrandimento?.origine, id).toMatch(/^\d{1,3}% \d{1,3}%$/);
      } else {
        expect(secondo.ingrandimento, id).toBeUndefined();
      }
    }
  });

  it('i colori sono quelli della tavola, con le foto dove ci sono', () => {
    const colori = Object.fromEntries(
      articoli
        .filter((a) => a.colori)
        .map((a) => [a.id, a.colori!.map((c) => [c.nome, c.tinta, c.foto?.foto])]),
    );
    expect(colori).toEqual({
      abbracciami: [
        ['verde', '#5e654f', 'abbracciami-verde'],
        ['rosso', '#b8263a', 'abbracciami-rosso'],
      ],
      orsetto: [
        ['rosa', '#ddb3b8', undefined],
        ['sabbia', '#cdb896', undefined],
        ['azzurro', '#a9c7e0', undefined],
      ],
      casetta: [
        ['rosso', '#a62630', 'asciugamano-rosso'],
        ['bianco', '#f4f1ea', 'asciugamano-bianco'],
        ['verde', '#2f5734', 'asciugamano-verde'],
      ],
    });
    // Un articolo ha la foto per tutti i suoi colori o per nessuno: altrimenti un pallino cambierebbe foto e un altro no.
    for (const a of articoli) {
      const conFoto = (a.colori ?? []).filter((c) => c.foto).length;
      expect([0, a.colori?.length ?? 0], a.id).toContain(conFoto);
    }
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

  it("l'occhiello è «Novità» al posto della categoria", () => {
    const per = (id: string) => occhielloArticolo(articoli.find((a) => a.id === id)!);
    expect(per('sabbia')).toBe('Novità');
    expect(per('orsetto')).toBe('Bimbi');
    expect(per('saponi')).toBe('Profumi per la casa');
  });

  it('le sezioni seguono la pagina: il diario dopo la selezione', () => {
    expect(sezioni.map((s) => s.href)).toEqual(['#collezioni', '#selezione', '#diario', '#negozio']);
  });

  it('il messaggio WhatsApp di un post dice di che cosa parla, con la preposizione', () => {
    expect(messaggioPost(post[0]!)).toBe(
      'Buongiorno, ho visto sul sito il vostro post del 28 ottobre sui cuscini di Natale. Mi date qualche informazione in più?',
    );
    for (const voce of post) expect(voce.chiedi, voce.id).toMatch(/^su(?:l|llo|lla|i|gli|lle)? /);
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
    const p6 = post.find((voce) => voce.id === 'p6')!;
    expect(messaggioPost(p6)).toContain('post dell’8 luglio sulle essenze per il bucato');
    const p3 = post.find((voce) => voce.id === 'p3')!;
    expect(messaggioPost(p3)).toContain('post dell’11 ottobre sui plaid');
    for (const voce of post) expect(messaggioPost(voce), voce.id).not.toMatch(/post del (?:8|11) /);
  });

  it("l'apertura ha tre foto, ognuna con la sua frase", () => {
    expect(apertura).toHaveLength(3);
    for (const diapositiva of apertura) expect(diapositiva.testo.length).toBeGreaterThan(20);
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
    const file = [...sorgenti('src/prova'), ...sorgenti('src/pages/prova')];
    expect(file.length).toBeGreaterThan(20);
    for (const f of file) expect(readFileSync(f, 'utf8'), f).not.toMatch(/martina/i);
  });
});
