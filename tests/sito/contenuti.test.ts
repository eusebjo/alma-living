import { describe, expect, it } from 'vitest';
import { indirizzoFoto, INQUADRATURE } from '../../src/content/foto';
import type { PostContenuto, Prodotto, StoriaContenuto } from '../../src/content/schemas';
import { delData, messaggioPost, SCALA_DETTAGLIO } from '../../src/sito/componenti/dati';
import {
  articoloDa,
  categorieVisibili,
  dataBreve,
  elencoArticoli,
  elencoPost,
  elencoStorie,
  ORDINE_STORIE,
  ordinaArticoli,
  ordinaPost,
  postDa,
  storiaDa,
} from '../../src/sito/contenuti';

// Dai contenuti delle collection ai dati dei componenti. Le voci qui sono
// inventate: i contenuti veri li cambia la redazione e non si fissano nei test.

const FOTO: Prodotto['foto'] = {
  src: indirizzoFoto('cms', 'prima.webp'),
  alt: 'Lenzuola color sabbia in primo piano',
  inquadratura: 'alto',
};

const SECONDA: Prodotto['foto'] = {
  src: indirizzoFoto('cms', 'seconda.webp'),
  alt: 'Primo piano della balza bianca',
  inquadratura: 'basso',
};

const PRODOTTO: Prodotto = {
  nome: 'Lenzuola color sabbia',
  dettaglio: 'Cotone con balza bianca · matrimoniale',
  categorie: ['letto'],
  novita: true,
  data: '2026-10-28',
  foto: FOTO,
  secondaFoto: SECONDA,
};

const POST: PostContenuto = {
  data: '2026-10-28',
  testo: 'Sono arrivati i cuscini di Natale.',
  foto: [FOTO, SECONDA],
  soggetto: 'sui cuscini di Natale',
};

const STORIA: StoriaContenuto = {
  nome: 'Arrivi',
  data: '2026-10-27',
  etichetta: 'Nuovo',
  invito: 'whatsapp',
  foto: [
    {
      ...FOTO,
      inquadratura: 'centro-alto',
      frase: 'Sono arrivati i plaid delle feste.',
      soggetto: 'i plaid delle feste',
    },
  ],
};

describe('dataBreve', () => {
  it('scrive la data come sulla pagina: giorno senza zero e mese in lettere', () => {
    expect(dataBreve('2026-10-28')).toBe('28 ottobre');
    expect(dataBreve('2026-07-08')).toBe('8 luglio');
  });

  it('conosce i dodici mesi', () => {
    expect(
      Array.from({ length: 12 }, (_vuoto, i) => dataBreve(`2026-${String(i + 1).padStart(2, '0')}-01`)),
    ).toEqual([
      '1 gennaio',
      '1 febbraio',
      '1 marzo',
      '1 aprile',
      '1 maggio',
      '1 giugno',
      '1 luglio',
      '1 agosto',
      '1 settembre',
      '1 ottobre',
      '1 novembre',
      '1 dicembre',
    ]);
    expect(dataBreve('2026-12-31')).toBe('31 dicembre');
  });

  it('con delData dà "dell’1", "dell’8" e "dell’11"', () => {
    expect(delData(dataBreve('2026-10-01'))).toBe('dell’1 ottobre');
    expect(delData(dataBreve('2026-07-08'))).toBe('dell’8 luglio');
    expect(delData(dataBreve('2026-10-11'))).toBe('dell’11 ottobre');
    expect(delData(dataBreve('2026-06-18'))).toBe('del 18 giugno');
  });
});

describe('articoloDa', () => {
  it('copia i campi del prodotto e usa il nome del file come id', () => {
    expect(articoloDa('sabbia', PRODOTTO)).toMatchObject({
      id: 'sabbia',
      nome: PRODOTTO.nome,
      dettaglio: PRODOTTO.dettaglio,
      categorie: ['letto'],
      novita: true,
    });
  });

  it('ogni foto diventa uno scatto: indirizzo, testo alternativo e la posizione della sua inquadratura', () => {
    const [primo, secondo] = articoloDa('sabbia', PRODOTTO).scatti;
    expect(primo).toEqual({ src: FOTO.src, alt: FOTO.alt, posizione: INQUADRATURE.alto });
    expect(secondo).toEqual({ src: SECONDA.src, alt: SECONDA.alt, posizione: INQUADRATURE.basso });
  });

  it('senza seconda foto il secondo scatto è la prima ingrandita al centro, con "Dettaglio di …"', () => {
    expect(articoloDa('x', { ...PRODOTTO, secondaFoto: undefined }).scatti[1]).toMatchObject({
      alt: 'Dettaglio di ' + PRODOTTO.nome,
      ingrandimento: { origine: '50% 50%' },
    });
    expect(articoloDa('x', { ...PRODOTTO, secondaFoto: undefined }).scatti[1]).toEqual({
      src: FOTO.src,
      alt: 'Dettaglio di Lenzuola color sabbia',
      posizione: INQUADRATURE.alto,
      ingrandimento: { scala: SCALA_DETTAGLIO, origine: '50% 50%' },
    });
  });

  it('i colori: nome e tinta, e la foto dove c’è', () => {
    const conFoto = articoloDa('a', {
      ...PRODOTTO,
      colori: [
        { nome: 'verde', tinta: '#5e654f', foto: FOTO },
        { nome: 'rosso', tinta: '#b8263a', foto: SECONDA },
      ],
    });
    expect(conFoto.colori).toEqual([
      { nome: 'verde', tinta: '#5e654f', foto: { src: FOTO.src, alt: FOTO.alt, posizione: INQUADRATURE.alto } },
      { nome: 'rosso', tinta: '#b8263a', foto: { src: SECONDA.src, alt: SECONDA.alt, posizione: INQUADRATURE.basso } },
    ]);
    const senzaFoto = articoloDa('b', { ...PRODOTTO, colori: [{ nome: 'rosa', tinta: '#ddb3b8' }] });
    expect(senzaFoto.colori).toEqual([{ nome: 'rosa', tinta: '#ddb3b8' }]);
  });

  it('senza colori l’articolo non ne ha', () => {
    expect(articoloDa('c', PRODOTTO)).not.toHaveProperty('colori');
  });
});

describe('postDa', () => {
  it('data come sulla pagina, testo, foto come scatti e "di cosa parla" per il messaggio', () => {
    expect(postDa('p1', POST)).toEqual({
      id: 'p1',
      data: '28 ottobre',
      chiedi: 'sui cuscini di Natale',
      testo: POST.testo,
      foto: [
        { src: FOTO.src, alt: FOTO.alt, posizione: INQUADRATURE.alto },
        { src: SECONDA.src, alt: SECONDA.alt, posizione: INQUADRATURE.basso },
      ],
    });
    expect(messaggioPost(postDa('p1', POST))).toBe(
      'Buongiorno, ho visto sul sito il vostro post del 28 ottobre sui cuscini di Natale. Mi date qualche informazione in più?',
    );
  });

  it('senza "di cosa parla" il messaggio dice solo la data del post', () => {
    expect(messaggioPost(postDa('p9', { ...POST, data: '2026-10-28', soggetto: undefined }))).toBe(
      'Buongiorno, ho visto sul sito il vostro post del 28 ottobre. Mi date qualche informazione in più?',
    );
    expect(postDa('p9', { ...POST, soggetto: undefined })).not.toHaveProperty('chiedi');
  });

  it('"di cosa parla" vuoto, o di soli spazi, vale come assente', () => {
    for (const soggetto of ['', '   ']) {
      const voce = postDa('p9', { ...POST, soggetto });
      expect(voce, JSON.stringify(soggetto)).not.toHaveProperty('chiedi');
      expect(messaggioPost(voce)).toBe(
        'Buongiorno, ho visto sul sito il vostro post del 28 ottobre. Mi date qualche informazione in più?',
      );
    }
  });

  it('il messaggio elide "del" anche senza "di cosa parla"', () => {
    expect(messaggioPost(postDa('p6', { ...POST, data: '2026-07-08', soggetto: undefined }))).toBe(
      'Buongiorno, ho visto sul sito il vostro post dell’8 luglio. Mi date qualche informazione in più?',
    );
  });
});

describe('storiaDa', () => {
  it('copia la storia; la data come sulla pagina, la frase di ogni foto è il suo testo', () => {
    expect(storiaDa('arrivi', STORIA)).toEqual({
      id: 'arrivi',
      nome: 'Arrivi',
      etichetta: 'Nuovo',
      data: '27 ottobre',
      invito: 'whatsapp',
      foto: [
        {
          src: FOTO.src,
          alt: FOTO.alt,
          posizione: INQUADRATURE['centro-alto'],
          testo: 'Sono arrivati i plaid delle feste.',
          soggetto: 'i plaid delle feste',
        },
      ],
    });
  });

  it('senza etichetta la storia non ne ha', () => {
    expect(storiaDa('vetrina', { ...STORIA, etichetta: undefined })).not.toHaveProperty('etichetta');
  });
});

describe('ordinamenti', () => {
  it('a parità di data viene prima l’id minore', () => {
    expect(
      ordinaPost([
        { id: 'b', data: '2026-10-01' },
        { id: 'a', data: '2026-10-01' },
      ]).map((p) => p.id),
    ).toEqual(['a', 'b']);
  });

  it('dal più recente; l’id conta solo a parità di data', () => {
    const voci = [
      { id: 'p7', data: '2026-07-08' },
      { id: 'p1', data: '2026-10-28' },
      { id: 'p10', data: '2026-06-15' },
      { id: 'p6', data: '2026-07-08' },
      { id: 'p9', data: '2026-06-19' },
    ];
    expect(ordinaPost(voci).map((p) => p.id)).toEqual(['p1', 'p6', 'p7', 'p9', 'p10']);
    expect(ordinaArticoli(voci).map((p) => p.id)).toEqual(['p1', 'p6', 'p7', 'p9', 'p10']);
  });

  it('non cambia l’elenco che riceve e tiene gli altri campi', () => {
    const voci = [
      { id: 'b', data: '2026-01-01', altro: 1 },
      { id: 'a', data: '2026-02-01', altro: 2 },
    ];
    const ordinate = ordinaArticoli(voci);
    expect(voci.map((v) => v.id)).toEqual(['b', 'a']);
    expect(ordinate).toEqual([
      { id: 'a', data: '2026-02-01', altro: 2 },
      { id: 'b', data: '2026-01-01', altro: 1 },
    ]);
  });

  it('le storie hanno un ordine fisso', () => {
    expect(ORDINE_STORIE).toEqual([
      'oggi',
      'arrivi',
      'vetrina',
      'casette',
      'candele',
      'bimbi',
      'tavola',
      'lenzuola',
    ]);
  });
});

describe('elenchi dalle voci delle collection', () => {
  it('gli articoli: dal prodotto più recente', () => {
    const articoli = elencoArticoli([
      { id: 'vecchio', data: { ...PRODOTTO, data: '2026-01-10' } },
      { id: 'nuovo', data: { ...PRODOTTO, data: '2026-10-10' } },
    ]);
    expect(articoli.map((a) => a.id)).toEqual(['nuovo', 'vecchio']);
    expect(articoli[0]).toEqual(articoloDa('nuovo', { ...PRODOTTO, data: '2026-10-10' }));
  });

  it('i post: dal più recente, con la data come sulla pagina', () => {
    const post = elencoPost([
      { id: 'p7', data: { ...POST, data: '2026-07-08' } },
      { id: 'p1', data: POST },
      { id: 'p6', data: { ...POST, data: '2026-07-08' } },
    ]);
    expect(post.map((p) => [p.id, p.data])).toEqual([
      ['p1', '28 ottobre'],
      ['p6', '8 luglio'],
      ['p7', '8 luglio'],
    ]);
  });

  it('le storie: nell’ordine fisso, qualunque sia l’ordine dei file', () => {
    const ids = [...ORDINE_STORIE].reverse();
    const storie = elencoStorie(ids.map((id) => ({ id, data: STORIA })));
    expect(storie.map((s) => s.id)).toEqual([...ORDINE_STORIE]);
    expect(storie[0]).toEqual(storiaDa('oggi', STORIA));
  });

  it('una storia fuori dall’elenco fisso va in fondo', () => {
    const storie = elencoStorie([
      { id: 'zeta', data: STORIA },
      { id: 'arrivi', data: STORIA },
      { id: 'oggi', data: STORIA },
    ]);
    expect(storie.map((s) => s.id)).toEqual(['oggi', 'arrivi', 'zeta']);
  });
});

describe('categorieVisibili', () => {
  const articoloLetto = articoloDa('sabbia', PRODOTTO);

  it('le categorie con almeno un articolo, più Mare sempre', () => {
    expect(categorieVisibili([articoloLetto]).map((c) => c.id)).toEqual(['letto', 'mare']);
  });

  it('senza articoli resta solo Mare', () => {
    expect(categorieVisibili([]).map((c) => c.id)).toEqual(['mare']);
  });

  it('nell’ordine dei filtri, non in quello degli articoli; Mare una volta sola', () => {
    const regalo = articoloDa('regalo', { ...PRODOTTO, categorie: ['natale', 'bagno'] });
    const telo = articoloDa('telo', { ...PRODOTTO, categorie: ['mare', 'letto'] });
    expect(categorieVisibili([regalo, telo]).map((c) => c.id)).toEqual(['letto', 'bagno', 'natale', 'mare']);
  });

  it('nome e id come nell’elenco delle categorie', () => {
    expect(categorieVisibili([articoloLetto])).toEqual([
      { id: 'letto', nome: 'Letto' },
      { id: 'mare', nome: 'Mare' },
    ]);
  });
});
