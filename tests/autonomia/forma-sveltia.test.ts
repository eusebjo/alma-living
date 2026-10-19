import { describe, expect, it } from 'vitest';
import { Document } from 'yaml';
import { evaluate } from '../../scripts/autonomia/evaluate';
import { parseContent } from '../../scripts/autonomia/parse';
import { validaConSchemi } from '../../scripts/autonomia/schemi';
import { eseguiVerifica } from '../../scripts/autonomia/verifica';
import type { ChangedFile } from '../../scripts/autonomia/types';
import {
  ETICHETTA_INVIATA,
  HOME,
  NEGOZIO,
  immagine,
  kb,
  modificato,
  proposta,
  rules,
} from './fixtures';
import { BASE_SHA, HEAD_SHA, chiave, creaOctokitFinto } from './octokitFinto';

// File scritti come li scrive il pannello (Sveltia 0.248.0, `format.js` del
// pacchetto), non come li scriverebbe una persona: il controllo e lo schema
// devono accettarli. Ogni caso passa da `evaluate`, dallo schema e, per i più
// importanti, dall'intera verifica con GitHub finto.

const FOTO_NUOVA = 'src/content/pagine/immagini/nuova.webp';

/**
 * Frontmatter come lo scrive Sveltia: YAML con `lineWidth: 0` (mai a capo
 * automatici), stringhe senza virgolette salvo dove servono (allora apici
 * singoli), poi una riga vuota e il testo. Senza testo il file finisce con
 * la riga `---`, senza riga vuota.
 */
function paginaSveltia(campi: Record<string, string>, corpo = ''): string {
  const intestazione = new Document(campi)
    .toString({
      indent: 2,
      indentSeq: true,
      lineWidth: 0,
      defaultKeyType: 'PLAIN',
      defaultStringType: 'PLAIN',
      singleQuote: true,
    })
    .trim();
  return `---\n${intestazione}\n---\n${corpo === '' ? '' : `\n${corpo}\n`}`;
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
  return `${JSON.stringify(dati, null, 2)}\n`;
}

const CAMPI_HOME = {
  titolo: 'Alma Living, biancheria per la casa a Livorno',
  descrizione:
    'Alma Living è un negozio di biancheria per la casa in Via Ricasoli, a Livorno. Sito in costruzione.',
  immagine: 'immagini/home.webp',
  immagine_alt: 'Immagine segnaposto, sarà sostituita da una foto del negozio',
};

const valuta = (...files: ChangedFile[]) => evaluate(proposta(files), rules);

/** Intera verifica di una modifica a un solo file, con GitHub finto. */
async function verificaCompleta(path: string, prima: string, dopo: string) {
  const { octokit } = creaOctokitFinto({
    autore: 'lei',
    etichette: [ETICHETTA_INVIATA],
    files: [{ filename: path, status: 'modified' }],
    contenuti: {
      [chiave(BASE_SHA, path)]: { testo: prima },
      [chiave(HEAD_SHA, path)]: { testo: dopo },
    },
  });
  return eseguiVerifica(octokit, { owner: 'eusebjo', repo: 'alma-living', pullNumber: 7 }, rules);
}

describe('pagina scritta da Sveltia', () => {
  it('controllo: la forma scritta da Sveltia è quella attesa (frontmatter, riga vuota, testo)', () => {
    const testo = paginaSveltia(CAMPI_HOME, 'Un testo.');
    expect(testo).toBe(
      [
        '---',
        'titolo: Alma Living, biancheria per la casa a Livorno',
        `descrizione: ${CAMPI_HOME.descrizione}`,
        'immagine: immagini/home.webp',
        `immagine_alt: ${CAMPI_HOME.immagine_alt}`,
        '---',
        '',
        'Un testo.',
        '',
      ].join('\n'),
    );
  });

  it('l’immagine come percorso senza ./ (immagini/x.webp) è accettata dalla regola e dallo schema', async () => {
    const prima = paginaSveltia({ ...CAMPI_HOME, immagine: './immagini/home.webp' }, 'Testo.');
    const dopo = paginaSveltia({ ...CAMPI_HOME, immagine: 'immagini/nuova.webp' }, 'Testo.');

    expect(valuta(modificato(HOME, prima, dopo), immagine(FOTO_NUOVA, kb(300)))).toMatchObject({
      esito: 'consentito',
      livello: 1,
    });
    expect(validaConSchemi([modificato(HOME, prima, dopo)], rules)).toEqual([]);
    expect(parseContent(dopo, 'markdown').immagine).toBe('immagini/nuova.webp');
    const esito = await verificaCompleta(HOME, prima, dopo);
    expect(esito.verdict).toMatchObject({ esito: 'consentito', livello: 1 });
  });

  it('cambiare solo il titolo di una pagina con il percorso senza ./ cambia solo il titolo', () => {
    const prima = paginaSveltia(CAMPI_HOME, 'Testo.');
    const dopo = paginaSveltia({ ...CAMPI_HOME, titolo: 'Un altro titolo' }, 'Testo.');

    expect(valuta(modificato(HOME, prima, dopo))).toMatchObject({ esito: 'consentito', livello: 1 });
    expect(validaConSchemi([modificato(HOME, prima, dopo)], rules)).toEqual([]);
  });

  it('un titolo con i due punti viene scritto tra apici e si legge uguale', async () => {
    const titolo = 'Chi siamo: la storia di Alma Living';
    const dopo = paginaSveltia({ ...CAMPI_HOME, titolo }, 'Testo.');

    expect(dopo).toContain("titolo: 'Chi siamo: la storia di Alma Living'");
    expect(parseContent(dopo, 'markdown').titolo).toBe(titolo);
    const esito = await verificaCompleta(HOME, paginaSveltia(CAMPI_HOME, 'Testo.'), dopo);
    expect(esito.verdict).toMatchObject({ esito: 'consentito' });
  });

  describe('testo vuoto', () => {
    it('il file finisce con la riga --- e il testo è vuoto', () => {
      const vuota = paginaSveltia(CAMPI_HOME);
      expect(vuota.endsWith('\n---\n')).toBe(true);
      expect(parseContent(vuota, 'markdown').corpo).toBe('');
    });

    it('si può cambiare un campo di una pagina senza testo', async () => {
      const prima = paginaSveltia(CAMPI_HOME);
      const dopo = paginaSveltia({ ...CAMPI_HOME, titolo: 'Un altro titolo' });

      expect(valuta(modificato(HOME, prima, dopo))).toMatchObject({ esito: 'consentito', livello: 1 });
      expect(validaConSchemi([modificato(HOME, prima, dopo)], rules)).toEqual([]);
      const esito = await verificaCompleta(HOME, prima, dopo);
      expect(esito.verdict).toMatchObject({ esito: 'consentito' });
    });

    it('svuotare il testo è una modifica del solo corpo, consentita', async () => {
      const prima = paginaSveltia(CAMPI_HOME, 'Testo da cancellare.');
      const dopo = paginaSveltia(CAMPI_HOME);

      const verdetto = valuta(modificato(HOME, prima, dopo));

      expect(verdetto).toMatchObject({ esito: 'consentito', livello: 1 });
      expect(validaConSchemi([modificato(HOME, prima, dopo)], rules)).toEqual([]);
      const esito = await verificaCompleta(HOME, prima, dopo);
      expect(esito.verdict).toMatchObject({ esito: 'consentito' });
    });
  });

  describe('testo con --- (linea orizzontale)', () => {
    it.each([
      ['in mezzo al testo', 'Prima.\n\n---\n\nDopo.'],
      ['all’inizio del testo', '---\n\nDopo la linea.'],
      ['alla fine del testo', 'Prima.\n\n---'],
      ['con più linee', 'Uno.\n\n---\n\nDue.\n\n---\n\nTre.'],
      ['un blocco che sembra un frontmatter', 'Prima.\n\n---\ntitolo: finto\n---\n\nDopo.'],
    ])('%s: il testo si legge intero e il frontmatter resta quello vero', async (_nome, corpo) => {
      const prima = paginaSveltia(CAMPI_HOME, 'Testo vecchio.');
      const dopo = paginaSveltia(CAMPI_HOME, corpo);

      const dati = parseContent(dopo, 'markdown');
      expect(dati.corpo).toBe(corpo);
      expect(dati.titolo).toBe(CAMPI_HOME.titolo);
      expect(valuta(modificato(HOME, prima, dopo))).toMatchObject({
        esito: 'consentito',
        livello: 1,
      });
      expect(validaConSchemi([modificato(HOME, prima, dopo)], rules)).toEqual([]);
      const esito = await verificaCompleta(HOME, prima, dopo);
      expect(esito.verdict).toMatchObject({ esito: 'consentito' });
    });

    it('un testo che contiene --- non nasconde un cambio di titolo: i campi si guardano comunque', () => {
      const prima = paginaSveltia(CAMPI_HOME, 'Prima.\n\n---\n\nDopo.');
      const dopo = paginaSveltia({ ...CAMPI_HOME, titolo: 'Nuovo' }, 'Prima.\n\n---\n\nDopo.');
      const dati = parseContent(dopo, 'markdown');
      expect(dati.titolo).toBe('Nuovo');
      expect(valuta(modificato(HOME, prima, dopo)).esito).toBe('consentito');
    });
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
