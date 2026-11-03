import { describe, expect, it } from 'vitest';
import { evaluate } from '../../scripts/autonomia/evaluate';
import { validaConSchemi } from '../../scripts/autonomia/schemi';
import { eseguiVerifica } from '../../scripts/autonomia/verifica';
import type { ChangedFile } from '../../scripts/autonomia/types';
import { FOTO_BASE } from '../../src/content/foto';
import {
  ETICHETTA_INVIATA,
  NEGOZIO,
  aggiunto,
  modificato,
  proposta,
  rules,
} from './fixtures';
import { BASE_SHA, HEAD_SHA, chiave, creaOctokitFinto } from './octokitFinto';

// File scritti come li scrive il pannello (Sveltia 0.248.0, `format.js` del
// pacchetto), non come li scriverebbe una persona: il controllo e lo schema
// devono accettarli. Ogni caso passa da `evaluate`, dallo schema e, per i più
// importanti, dall'intera verifica con GitHub finto.
//
// Il JSON del pannello: due spazi, una riga finale, le chiavi nell'ordine dei
// campi di `public/admin/config.yml`, i campi facoltativi vuoti omessi
// (`omit_empty_optional_fields`). Ogni foto ha l'inquadratura (il pannello la
// scrive sempre, "Al centro" se non si sceglie altro); un oggetto facoltativo
// mai aggiunto, come la seconda foto, non c'è proprio.

/** JSON come lo scrive Sveltia: due spazi e riga finale. */
const comeSveltia = (dati: Record<string, unknown>): string => `${JSON.stringify(dati, null, 2)}\n`;

/**
 * Una foto caricata dal pannello, con il nome che le dà: il nome originale reso
 * adatto agli URL, un codice casuale, `.webp`.
 */
const fotoCaricata = (nome: string, alt: string, inquadratura = 'centro') => ({
  src: `${FOTO_BASE}/cms/${nome}.webp`,
  alt,
  inquadratura,
});

/** Un prodotto nuovo: senza seconda foto, senza colori. */
function prodottoSveltia(modifica: (p: Record<string, unknown>) => void = () => {}): string {
  const dati: Record<string, unknown> = {
    nome: 'Plaid Abbracciami',
    dettaglio: 'Pile ricamato con frange, verde o rosso',
    categorie: ['natale', 'letto'],
    novita: true,
    data: '2026-11-03',
    foto: fotoCaricata(
      'whatsapp-image-2026-11-03-at-10-10-10-3fa9c2e1',
      'Plaid verde con la scritta Abbracciami ricamata',
    ),
  };
  modifica(dati);
  return comeSveltia(dati);
}

/** Un post nuovo: senza "Di cosa parla". */
function postSveltia(modifica: (p: Record<string, unknown>) => void = () => {}): string {
  const dati: Record<string, unknown> = {
    data: '2026-11-03',
    testo: 'Sono arrivati i cuscini di Natale.',
    foto: [
      fotoCaricata('img_1234-0b7c41d2', 'Divano con cuscini natalizi rossi e verdi'),
      fotoCaricata('img_1235-9e8d7c6b', 'Cuscini con baite innevate', 'centro-alto'),
    ],
  };
  modifica(dati);
  return comeSveltia(dati);
}

/** Una storia: senza etichetta (nessuna scelta nel pannello). */
function storiaSveltia(modifica: (s: Record<string, unknown>) => void = () => {}): string {
  const dati: Record<string, unknown> = {
    nome: 'Arrivi',
    data: '2026-11-03',
    invito: 'whatsapp',
    foto: [
      {
        ...fotoCaricata('scaffale-5a4b3c2d', 'Uno scaffale con i plaid nuovi'),
        frase: 'Sono arrivati i plaid delle feste.',
        soggetto: 'i plaid delle feste',
      },
    ],
  };
  modifica(dati);
  return comeSveltia(dati);
}

/** `negozio.json` come lo scrive Sveltia: JSON a due spazi, riga finale, campi vuoti omessi. */
function negozioSveltia(modifica: (n: Record<string, unknown>) => void = () => {}): string {
  const dati: Record<string, unknown> = {
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
  };
  modifica(dati);
  return comeSveltia(dati);
}

const valuta = (...files: ChangedFile[]) => evaluate(proposta(files), rules);

/**
 * Intera verifica, con GitHub finto, di un solo file: nuovo se `prima` è
 * `null`, altrimenti modificato.
 */
async function verificaCompleta(path: string, prima: string | null, dopo: string) {
  const { octokit } = creaOctokitFinto({
    autore: 'lei',
    etichette: [ETICHETTA_INVIATA],
    files: [{ filename: path, status: prima === null ? 'added' : 'modified' }],
    contenuti: {
      ...(prima === null ? {} : { [chiave(BASE_SHA, path)]: { testo: prima } }),
      [chiave(HEAD_SHA, path)]: { testo: dopo },
    },
  });
  return eseguiVerifica(octokit, { owner: 'eusebjo', repo: 'alma-living', pullNumber: 7 }, rules);
}

describe('prodotto scritto da Sveltia', () => {
  const NUOVO = 'src/content/prodotti/2026-11-03.json';

  it('un prodotto nuovo, senza seconda foto né colori, passa la regola, lo schema e la verifica', async () => {
    const testo = prodottoSveltia();
    expect(JSON.parse(testo)).not.toHaveProperty('secondaFoto');
    expect(JSON.parse(testo)).not.toHaveProperty('colori');

    expect(valuta(aggiunto(NUOVO, testo))).toMatchObject({ esito: 'consentito', livello: 1 });
    expect(validaConSchemi([aggiunto(NUOVO, testo)], rules)).toEqual([]);
    const esito = await verificaCompleta(NUOVO, null, testo);
    expect(esito.verdict).toMatchObject({ esito: 'consentito', livello: 1 });
  });

  it('aggiungere la seconda foto e i colori con le loro foto è una modifica consentita', async () => {
    const prima = prodottoSveltia();
    const dopo = prodottoSveltia((p) => {
      const seconda = fotoCaricata('plaid-rosso-1f2e3d4c', 'Plaid rosso appeso', 'centro-alto');
      p.secondaFoto = seconda;
      p.colori = [
        { nome: 'verde', tinta: '#5e654f', foto: p.foto },
        { nome: 'rosso', tinta: '#b8263a', foto: seconda },
      ];
    });

    expect(valuta(modificato(NUOVO, prima, dopo))).toMatchObject({ esito: 'consentito', livello: 1 });
    expect(validaConSchemi([modificato(NUOVO, prima, dopo)], rules)).toEqual([]);
    const esito = await verificaCompleta(NUOVO, prima, dopo);
    expect(esito.verdict).toMatchObject({ esito: 'consentito', livello: 1 });
  });

  it('i colori senza foto, e senza «Novità» (false), sono validi', () => {
    const dopo = prodottoSveltia((p) => {
      p.novita = false;
      p.colori = [{ nome: 'sabbia', tinta: '#d8c3a5' }];
    });
    expect(validaConSchemi([modificato(NUOVO, prodottoSveltia(), dopo)], rules)).toEqual([]);
  });
});

describe('post scritto da Sveltia', () => {
  const NUOVO = 'src/content/post/2026-11-03.json';

  it('un post nuovo con due foto e senza «Di cosa parla» passa la regola, lo schema e la verifica', async () => {
    const testo = postSveltia();
    expect(JSON.parse(testo)).not.toHaveProperty('soggetto');

    expect(valuta(aggiunto(NUOVO, testo))).toMatchObject({ esito: 'consentito', livello: 1 });
    expect(validaConSchemi([aggiunto(NUOVO, testo)], rules)).toEqual([]);
    const esito = await verificaCompleta(NUOVO, null, testo);
    expect(esito.verdict).toMatchObject({ esito: 'consentito', livello: 1 });
  });

  it('aggiungere «Di cosa parla» e una foto è una modifica consentita', () => {
    const prima = postSveltia();
    const dopo = postSveltia((p) => {
      p.soggetto = 'sui cuscini di Natale';
      (p.foto as unknown[]).push(fotoCaricata('img_1236-7c6b5a49', 'Cuscini con i gattini'));
    });
    expect(valuta(modificato(NUOVO, prima, dopo))).toMatchObject({ esito: 'consentito', livello: 1 });
    expect(validaConSchemi([modificato(NUOVO, prima, dopo)], rules)).toEqual([]);
  });
});

describe('storia scritta da Sveltia', () => {
  const ARRIVI = 'src/content/storie/arrivi.json';

  it('togliere l’etichetta (campo omesso, mai "") è una modifica consentita', async () => {
    const prima = storiaSveltia((s) => {
      s.etichetta = 'Nuovo';
    });
    const dopo = storiaSveltia();
    expect(JSON.parse(dopo)).not.toHaveProperty('etichetta');

    expect(valuta(modificato(ARRIVI, prima, dopo))).toMatchObject({ esito: 'consentito', livello: 1 });
    expect(validaConSchemi([modificato(ARRIVI, prima, dopo)], rules)).toEqual([]);
    const esito = await verificaCompleta(ARRIVI, prima, dopo);
    expect(esito.verdict).toMatchObject({ esito: 'consentito', livello: 1 });
  });

  it('una storia nuova è respinta anche se scritta dal pannello', () => {
    const verdetto = valuta(aggiunto('src/content/storie/saldi.json', storiaSveltia()));
    expect(verdetto.esito).toBe('respinto');
    expect(verdetto.violazioni.map((v) => v.messaggio)).toEqual(['Non puoi creare nuovi contenuti.']);
  });
});

describe('negozio.json scritto da Sveltia', () => {
  it('senza orari (elenco vuoto omesso) è valido per lo schema', () => {
    const dopo = negozioSveltia();
    expect(JSON.parse(dopo)).not.toHaveProperty('orari');
    expect(validaConSchemi([modificato(NEGOZIO, dopo, dopo)], rules)).toEqual([]);
  });

  it('salvare una descrizione nuova toglie la chiave orari vuota: è una modifica consentita', async () => {
    // Nel repository c'è `"orari": []`: con `omit_empty_optional_fields` il
    // primo salvataggio dal pannello la toglie. Per la regola `orari` è un campo
    // di livello 1, quindi non è un problema.
    const prima = `${JSON.stringify({ ...JSON.parse(negozioSveltia()), orari: [] }, null, 2)}\n`;
    const dopo = negozioSveltia((n) => {
      n.descrizione = 'Una descrizione nuova del negozio.';
    });

    const verdetto = valuta(modificato(NEGOZIO, prima, dopo));

    expect(verdetto).toMatchObject({ esito: 'consentito', livello: 1 });
    expect(validaConSchemi([modificato(NEGOZIO, prima, dopo)], rules)).toEqual([]);
    const esito = await verificaCompleta(NEGOZIO, prima, dopo);
    expect(esito.verdict).toMatchObject({ esito: 'consentito', livello: 1 });
  });

  it('senza orari prima e dopo, cambiare il telefono cambia solo il telefono', () => {
    const prima = negozioSveltia();
    const dopo = negozioSveltia((n) => {
      n.telefono = '334 520 0000';
    });
    expect(valuta(modificato(NEGOZIO, prima, dopo))).toMatchObject({
      esito: 'consentito',
      livello: 1,
    });
    expect(validaConSchemi([modificato(NEGOZIO, prima, dopo)], rules)).toEqual([]);
  });

  it('aggiungere gli orari a un file che non li ha è consentito', () => {
    const prima = negozioSveltia();
    const dopo = negozioSveltia((n) => {
      n.orari = [{ giorno: 'lunedi', apertura: '09:00', chiusura: '13:00' }];
    });
    expect(valuta(modificato(NEGOZIO, prima, dopo))).toMatchObject({ esito: 'consentito' });
    expect(validaConSchemi([modificato(NEGOZIO, prima, dopo)], rules)).toEqual([]);
  });

  it('senza orari non si possono toccare i campi di livello 0', () => {
    const prima = negozioSveltia();
    const dopo = negozioSveltia((n) => {
      n.nome = 'Altro nome';
    });
    expect(valuta(modificato(NEGOZIO, prima, dopo))).toMatchObject({ esito: 'respinto' });
  });

  it('una email omessa e poi aggiunta è valida', () => {
    const prima = negozioSveltia();
    const dopo = negozioSveltia((n) => {
      n.email = 'info@example.com';
    });
    expect(valuta(modificato(NEGOZIO, prima, dopo))).toMatchObject({ esito: 'consentito' });
    expect(validaConSchemi([modificato(NEGOZIO, prima, dopo)], rules)).toEqual([]);
  });
});
