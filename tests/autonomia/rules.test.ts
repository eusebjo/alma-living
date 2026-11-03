import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { loadRules } from '../../scripts/autonomia/rules';

const testoRepository = readFileSync(
  fileURLToPath(new URL('../../autonomia.yml', import.meta.url)),
  'utf8',
);

// Un file di regole minimo e valido, da cui partire per i casi non validi.
const base = `
versione: 1
ruoli:
  sviluppo: [eusebjo]
  redazione: [lei]
proposte:
  stati_inviati: [sveltia-cms/pending_review]
contenuti:
  negozio:
    file: src/content/negozio/negozio.json
    formato: json
    azioni: { crea: 0, modifica: 1, elimina: 0 }
    campi: { nome: 0, orari: 1 }
media:
  percorsi: [src/content/immagini/**]
  estensioni: [webp, jpg, jpeg, png, avif]
  dimensione_massima_kb: 1500
  azioni: { carica: 1, elimina: 0 }
`;

describe('loadRules', () => {
  it('carica il file autonomia.yml del repository', () => {
    const rules = loadRules(testoRepository);

    expect(rules.versione).toBe(1);
    expect(rules.ruoli.sviluppo).toEqual(['eusebjo']);
    expect(rules.ruoli.redazione).toEqual(['martina-dimalta']);
    expect(rules.proposte.stati_inviati).toEqual([
      'sveltia-cms/pending_review',
      'sveltia-cms/pending_publish',
      'sveltia-cms/pending_deletion',
    ]);
    expect(Object.keys(rules.contenuti)).toEqual(['negozio', 'prodotti', 'post', 'storie']);
    expect(rules.contenuti.negozio).toMatchObject({
      file: 'src/content/negozio/negozio.json',
      formato: 'json',
      azioni: { crea: 0, modifica: 1, elimina: 0 },
      campi: {
        nome: 0,
        indirizzo: 0,
        descrizione: 1,
        telefono: 1,
        email: 1,
        orari: 1,
      },
    });
    // Prodotti e post: la redazione li crea, li modifica e li toglie, sempre
    // con l'approvazione (livello 1). Le otto storie sono fisse: se ne cambia
    // solo il contenuto, non il nome.
    expect(rules.contenuti.prodotti).toEqual({
      file: 'src/content/prodotti/*.json',
      formato: 'json',
      azioni: { crea: 1, modifica: 1, elimina: 1 },
      campi: {
        nome: 1,
        dettaglio: 1,
        categorie: 1,
        novita: 1,
        data: 1,
        foto: 1,
        secondaFoto: 1,
        colori: 1,
      },
    });
    expect(rules.contenuti.post).toEqual({
      file: 'src/content/post/*.json',
      formato: 'json',
      azioni: { crea: 1, modifica: 1, elimina: 1 },
      campi: { data: 1, testo: 1, foto: 1, soggetto: 1 },
    });
    expect(rules.contenuti.storie).toEqual({
      file: 'src/content/storie/*.json',
      formato: 'json',
      azioni: { crea: 0, modifica: 1, elimina: 0 },
      campi: { nome: 0, data: 1, etichetta: 1, invito: 1, foto: 1 },
    });
    // Le foto stanno su R2: nessun file si carica nel repository.
    expect(rules.media).toEqual({
      percorsi: [],
      estensioni: ['webp', 'jpg', 'jpeg', 'png', 'avif'],
      dimensione_massima_kb: 1500,
      azioni: { carica: 0, elimina: 0 },
    });
  });

  it('accetta un elenco di percorsi dei media vuoto (nessun file caricato nel repository)', () => {
    const vuoto = base.replace('percorsi: [src/content/immagini/**]', 'percorsi: []');
    expect(loadRules(vuoto).media.percorsi).toEqual([]);
  });

  it('lancia se i percorsi dei media mancano o non sono un elenco', () => {
    expect(() => loadRules(base.replace('  percorsi: [src/content/immagini/**]\n', ''))).toThrow(
      /media\.percorsi/,
    );
    expect(() =>
      loadRules(base.replace('percorsi: [src/content/immagini/**]', 'percorsi: src/content/immagini/**')),
    ).toThrow(/media\.percorsi/);
  });

  it('carica il file minimo usato come base dei casi non validi', () => {
    expect(loadRules(base).contenuti.negozio.campi).toEqual({
      nome: 0,
      orari: 1,
    });
  });

  it('lancia se un livello è 7', () => {
    const testo = base.replace('modifica: 1', 'modifica: 7');
    expect(() => loadRules(testo)).toThrow(Error);
    expect(() => loadRules(testo)).toThrow(/contenuti\.negozio\.azioni\.modifica/);
    expect(() => loadRules(testo)).toThrow(/da 0 a 4/);
  });

  it('lancia se il livello di un campo è fuori scala, non intero o non numerico', () => {
    expect(() => loadRules(base.replace('orari: 1', 'orari: 5'))).toThrow(
      /campi\.orari/,
    );
    expect(() => loadRules(base.replace('orari: 1', 'orari: -1'))).toThrow(
      /campi\.orari/,
    );
    expect(() => loadRules(base.replace('orari: 1', 'orari: 1.5'))).toThrow(
      /campi\.orari/,
    );
    expect(() => loadRules(base.replace('orari: 1', 'orari: uno'))).toThrow(
      /campi\.orari/,
    );
    expect(() =>
      loadRules(base.replace('carica: 1', "carica: '1'")),
    ).toThrow(/media\.azioni\.carica/);
  });

  it('accetta tutti i livelli da 0 a 4', () => {
    for (const livello of [0, 1, 2, 3, 4]) {
      const testo = base.replace('orari: 1', `orari: ${livello}`);
      expect(loadRules(testo).contenuti.negozio.campi.orari).toBe(livello);
    }
  });

  it('lancia se manca il campo azioni di una collection', () => {
    const testo = base.replace(
      '    azioni: { crea: 0, modifica: 1, elimina: 0 }\n',
      '',
    );
    expect(() => loadRules(testo)).toThrow(Error);
    expect(() => loadRules(testo)).toThrow(/contenuti\.negozio\.azioni/);
  });

  it("lancia se in azioni manca una delle tre azioni", () => {
    const testo = base.replace('modifica: 1, elimina: 0', 'modifica: 1');
    expect(() => loadRules(testo)).toThrow(/contenuti\.negozio\.azioni\.elimina/);
  });

  it('lancia se mancano sezioni obbligatorie', () => {
    expect(() => loadRules(base.replace('versione: 1\n', ''))).toThrow(/versione/);
    expect(() => loadRules(base.replace('versione: 1', 'versione: 2'))).toThrow(
      /versione/,
    );
    expect(() => loadRules(base.replace(/media:[\s\S]*$/, ''))).toThrow(/media/);
    expect(() =>
      loadRules(base.replace('  sviluppo: [eusebjo]\n', '')),
    ).toThrow(/ruoli\.sviluppo/);
    expect(() =>
      loadRules(base.replace('  stati_inviati: [sveltia-cms/pending_review]', '')),
    ).toThrow(/proposte/);
  });

  it('lancia se il formato di una collection non è json o markdown', () => {
    expect(() => loadRules(base.replace('formato: json', 'formato: xml'))).toThrow(
      /formato/,
    );
  });

  it('lancia se mancano le estensioni ammesse per le immagini (senza elenco passerebbe qualsiasi file)', () => {
    const testo = base.replace('  estensioni: [webp, jpg, jpeg, png, avif]\n', '');
    expect(() => loadRules(testo)).toThrow(/media\.estensioni/);
  });

  it('lancia se le estensioni non sono nomi semplici, senza punto né barre', () => {
    for (const voce of ['.webp', 'we/bp', 'we bp', "''", '7', '[a]']) {
      const testo = base.replace('estensioni: [webp, jpg, jpeg, png, avif]', `estensioni: [webp, ${voce}]`);
      expect(() => loadRules(testo), voce).toThrow(/media\.estensioni/);
    }
    const nonElenco = base.replace('estensioni: [webp, jpg, jpeg, png, avif]', 'estensioni: webp');
    expect(() => loadRules(nonElenco)).toThrow(/media\.estensioni/);
  });

  it('accetta le estensioni in maiuscolo e un elenco vuoto (nessuna immagine ammessa)', () => {
    const maiuscolo = base.replace('[webp, jpg, jpeg, png, avif]', '[WEBP, Jpg]');
    expect(loadRules(maiuscolo).media.estensioni).toEqual(['WEBP', 'Jpg']);
    const vuoto = base.replace('[webp, jpg, jpeg, png, avif]', '[]');
    expect(loadRules(vuoto).media.estensioni).toEqual([]);
  });

  it('lancia se la dimensione massima non è un numero positivo', () => {
    expect(() =>
      loadRules(base.replace('dimensione_massima_kb: 1500', 'dimensione_massima_kb: 0')),
    ).toThrow(/dimensione_massima_kb/);
    expect(() =>
      loadRules(base.replace('dimensione_massima_kb: 1500', 'dimensione_massima_kb: tanti')),
    ).toThrow(/dimensione_massima_kb/);
  });

  it('lancia un errore in italiano se il testo non è YAML o è vuoto', () => {
    expect(() => loadRules('versione: [1')).toThrow(/YAML/);
    expect(() => loadRules('')).toThrow(/regole/i);
    expect(() => loadRules('- uno\n- due\n')).toThrow(/regole/i);
  });

  it('lancia se una chiave è ripetuta (una regola ripetuta sarebbe ambigua)', () => {
    const testo = base.replace('nome: 0, orari: 1', 'nome: 0, nome: 1, orari: 1');
    expect(() => loadRules(testo)).toThrow(Error);
  });

  it('lancia se il file usa tag YAML non previsti, come quelli con codice', () => {
    const testo = base.replace(
      'dimensione_massima_kb: 1500',
      'dimensione_massima_kb: !!js/function "function(){ return 1 }"',
    );
    expect(() => loadRules(testo)).toThrow(/YAML/);
    expect(() => loadRules(`${base}\nx: !custom 1\n`)).toThrow(/YAML/);
  });

  it("non tratta come errori le chiavi in più (sono ignorate)", () => {
    expect(() => loadRules(`${base}\naltro: 1\n`)).not.toThrow();
  });
});
