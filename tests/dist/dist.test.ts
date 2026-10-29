import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, sep } from 'node:path';
import { describe, expect, it } from 'vitest';
import { VARIANTI } from '../../src/prova/varianti';

// Questi test guardano la build locale (`npm run build` senza SITE_LAUNCHED né
// WORKERS_CI_BRANCH), che non è indicizzabile: niente JSON-LD, niente sitemap,
// `noindex` su ogni pagina. La build di lancio si verifica a mano (vedi
// CLAUDE.md, "Stato di lancio").

function paginePerFile(cartella = 'dist'): string[] {
  return readdirSync(cartella, { withFileTypes: true }).flatMap((voce) => {
    const percorso = join(cartella, voce.name);
    if (voce.isDirectory()) return paginePerFile(percorso);
    return voce.name.endsWith('.html') ? [percorso] : [];
  });
}

const pagine = paginePerFile();

// Il pannello dei contenuti (/admin/) è una pagina Astro a sé, senza il
// BaseLayout del sito: ha le sue regole (vedi "pannello dei contenuti").
const PANNELLO = join('dist', 'admin', 'index.html');
const pagineDelSito = pagine.filter((file) => file !== PANNELLO);

describe('build statica: dist/index.html', () => {
  it('la home esiste ed è in italiano', () => {
    const html = readFileSync('dist/index.html', 'utf8');
    expect(html).toContain('<html lang="it"');
  });

  it('la home ha title e description', () => {
    const html = readFileSync('dist/index.html', 'utf8');
    expect(html).toMatch(/<title>[^<]+<\/title>/);
    expect(html).toMatch(/<meta name="description" content="[^"]+"/);
  });

  it("la home ha un'immagine in evidenza ottimizzata da Astro: un file WebP di /_astro/", () => {
    // Non si guarda quale foto sia né come si chiami: è un contenuto che la
    // redazione può cambiare dal pannello (e `home.md` non si legge qui), la
    // build deve restare verde con qualunque foto valida.
    const html = readFileSync('dist/index.html', 'utf8');
    const hero = [...html.matchAll(/<img\b[^>]*>/gi)]
      .map((m) => m[0])
      .filter((tag) => /\sclass="[^"]*\bhero\b[^"]*"/.test(tag));
    expect(hero).toHaveLength(1);
    expect(hero[0]).toMatch(/\ssrc="\/_astro\/[^"/]+\.webp"/);
  });

  it('la home ha canonical e Open Graph', () => {
    const html = readFileSync('dist/index.html', 'utf8');
    expect(html).toMatch(/<link rel="canonical" href="https?:\/\/[^"]+\/"/);
    expect(html).toMatch(/<meta property="og:title" content="[^"]+"/);
    expect(html).toMatch(/<meta property="og:description" content="[^"]+"/);
    expect(html).toMatch(/<meta property="og:url" content="https?:\/\/[^"]+"/);
  });
});

// Un indirizzo è esterno se ha uno schema `http(s):` oppure comincia con `//`
// (indirizzo "senza schema", che il browser completa con quello della pagina e
// che porta a un altro sito).
const INDIRIZZO_ESTERNO = /^(?:https?:)?\/\//i;

/**
 * Tag di `html` che caricano una risorsa da un altro sito: script, immagini e
 * frame con `src` esterno, fogli di stile con `href` esterno.
 */
function risorseEsterne(html: string): string[] {
  const trovati: string[] = [];
  for (const [tag, nome] of html.matchAll(/<(script|img|iframe|link)\b[^>]*>/gi)) {
    const attributo = nome!.toLowerCase() === 'link' ? 'href' : 'src';
    const indirizzo = new RegExp(`\\s${attributo}=["']?([^"'\\s>]*)`, 'i').exec(tag)?.[1];
    if (indirizzo === undefined || !INDIRIZZO_ESTERNO.test(indirizzo)) continue;
    if (attributo === 'href' && !/\srel=["']?stylesheet\b/i.test(tag)) continue;
    trovati.push(tag);
  }
  return trovati;
}

describe('controllo delle risorse di terzi', () => {
  it.each([
    '<script src="https://cdn.example.com/a.js"></script>',
    '<script src=https://cdn.example.com/a.js></script>',
    '<img alt="x" src="//cdn.example.com/a.jpg">',
    "<img src='//cdn.example.com/a.jpg'>",
    '<iframe src="http://example.com/"></iframe>',
    '<link rel="stylesheet" href="//cdn.example.com/a.css">',
    '<link href="https://cdn.example.com/a.css" rel="stylesheet">',
  ])('trova %s', (tag) => {
    expect(risorseEsterne(`<p>testo</p>${tag}`)).toHaveLength(1);
  });

  it.each([
    '<script type="module" src="/_astro/a.js"></script>',
    '<img src="/_astro/a.webp" alt="x">',
    '<img src="immagini/a.webp" alt="x">',
    '<link rel="stylesheet" href="/_astro/a.css">',
    '<link rel="canonical" href="https://example.com/">',
    '<a href="https://example.com/">un link</a>',
    '<img alt="x">',
  ])('non segnala %s', (tag) => {
    expect(risorseEsterne(tag)).toEqual([]);
  });
});

describe('build statica: tutte le pagine', () => {
  it("c'è almeno la home tra le pagine HTML", () => {
    expect(pagine).toContain(join('dist', 'index.html'));
  });

  it.each(pagine)('%s: nessuna risorsa da CDN di terzi', (file) => {
    const html = readFileSync(file, 'utf8');
    expect(risorseEsterne(html)).toEqual([]);
    expect(html).not.toContain('fonts.googleapis');
  });
});

describe('build locale: non indicizzabile', () => {
  it.each(pagineDelSito)('%s: ha noindex e nessun JSON-LD', (file) => {
    const html = readFileSync(file, 'utf8');
    expect(html).toContain('<meta name="robots" content="noindex, nofollow"');
    expect(html).not.toContain('application/ld+json');
  });

  it('robots.txt vieta tutto e non cita la sitemap', () => {
    const robots = readFileSync('dist/robots.txt', 'utf8');
    expect(robots).toContain('Disallow: /');
    expect(robots).not.toContain('Sitemap:');
  });

  it('non viene generata nessuna sitemap', () => {
    const file = readdirSync('dist');
    expect(file.filter((nome) => nome.startsWith('sitemap'))).toEqual([]);
    expect(existsSync('dist/sitemap-index.xml')).toBe(false);
  });
});

describe('pannello dei contenuti (/admin/)', () => {
  const html = () => readFileSync(PANNELLO, 'utf8');

  // Percorso di un file dentro dist/ a partire da un indirizzo del sito
  // (`/_astro/x.js` diventa `dist/_astro/x.js`).
  const nelSito = (indirizzo: string) => join('dist', ...indirizzo.split('/'));

  const sorgentiAstro = (): string[] =>
    readdirSync(join('dist', '_astro')).filter((nome) => /\.(js|css)$/.test(nome));
  const leggiAstro = (nome: string) => readFileSync(join('dist', '_astro', nome), 'utf8');

  it('esiste ed è in italiano', () => {
    expect(existsSync(PANNELLO)).toBe(true);
    expect(html()).toContain('<html lang="it"');
  });

  it('non si indicizza, anche dopo il lancio, e non ha JSON-LD', () => {
    expect(html()).toContain('<meta name="robots" content="noindex">');
    expect(html()).not.toContain('application/ld+json');
  });

  it('carica un solo script, un modulo di /_astro/ del proprio sito, senza codice inline', () => {
    const script = [...html().matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)];
    expect(script).toHaveLength(1);
    const [, attributi, codice] = script[0];
    expect(codice).toBe('');
    expect(attributi).toMatch(/^\s*type="module"\s+src="\/_astro\/[^"/]+\.js"\s*$/);
    const src = /src="([^"]+)"/.exec(attributi)?.[1] ?? '';
    expect(existsSync(nelSito(src))).toBe(true);
  });

  it('ogni script, link, immagine e frame ha un indirizzo del proprio sito', () => {
    // Un indirizzo del sito comincia con una sola barra: niente http(s):,
    // niente //host, niente data: o blob:.
    const indirizzi = [
      ...html().matchAll(/<(?:script|link|img|iframe|source|video|audio)\b[^>]*?\s(?:src|href)="([^"]*)"/gi),
    ].map((m) => m[1]);
    expect(indirizzi.length).toBeGreaterThan(0);
    for (const indirizzo of indirizzi) {
      expect(indirizzo, indirizzo).toMatch(/^\/(?!\/)/);
    }
  });

  it('l\'unico link è la configurazione, sullo stesso sito', () => {
    const link = [...html().matchAll(/<link\b[^>]*>/gi)].map((m) => m[0]);
    expect(link).toEqual([
      '<link href="/admin/config.yml" type="application/yaml" rel="cms-config-url">',
    ]);
  });

  it('serve lo stesso config.yml di public/admin', () => {
    expect(readFileSync('dist/admin/config.yml', 'utf8')).toBe(
      readFileSync('public/admin/config.yml', 'utf8'),
    );
  });

  it('non resta la copia della build CDN di Sveltia', () => {
    expect(existsSync('dist/admin/sveltia-cms.js')).toBe(false);
    expect(existsSync('dist/admin/chunks')).toBe(false);
  });

  it('i font del pannello sono file del sito, non indirizzi esterni', () => {
    // Il pacchetto npm registra i font con `FontFace` e li prende da file che
    // Vite emette in /_astro/; la build CDN li prenderebbe da jsDelivr.
    const nomi = readdirSync(join('dist', '_astro'));
    for (const famiglia of ['source-sans-3', 'noto-mono', 'material-symbols-outlined']) {
      expect(
        nomi.some((nome) => nome.startsWith(`${famiglia}-`) && nome.endsWith('.woff2')),
        famiglia,
      ).toBe(true);
    }
    const codice = leggiAstro(/src="\/_astro\/([^"]+)"/.exec(html())?.[1] ?? '');
    expect(codice).toMatch(/new URL\(`\/_astro\/source-sans-3-[^`]+\.woff2`/);
    expect(codice).toMatch(/new URL\(`\/_astro\/material-symbols-outlined-[^`]+\.woff2`/);
  });

  it('nessuna regola @font-face, in CSS o JS emessi, ha un indirizzo esterno', () => {
    const regole: string[] = [];
    for (const nome of sorgentiAstro()) {
      regole.push(...(leggiAstro(nome).match(/@font-face\s*\{[^}]*\}/g) ?? []));
    }
    // PDF.js ne scrive alcune a tempo di esecuzione, per i font incorporati nei PDF.
    for (const regola of regole) {
      const indirizzi = [...regola.matchAll(/url\(\s*["']?([^"')]*)/g)].map((m) => m[1]);
      for (const indirizzo of indirizzi) {
        expect(indirizzo, regola).not.toMatch(/^(?:https?:)?\/\//i);
      }
    }
    for (const nome of sorgentiAstro()) {
      expect(leggiAstro(nome), nome).not.toMatch(
        /url\(\s*["'`]?(?:https?:)?\/\/[^)]*\.(?:woff2?|ttf|otf)/i,
      );
    }
  });

  it('nessun import(), worker o foglio di stile ha un indirizzo esterno scritto per esteso', () => {
    // Le stringhe "unpkg.com" che restano nel pacchetto sono i valori
    // predefiniti della build CDN, sostituiti all'avvio con quelli locali (si
    // verifica nel browser, vedi il report): qui si controlla solo ciò che
    // sarebbe sicuramente un caricamento esterno.
    for (const nome of sorgentiAstro()) {
      const sorgente = leggiAstro(nome);
      expect(sorgente, nome).not.toMatch(/import\(\s*["'`]https?:/);
      expect(sorgente, nome).not.toMatch(/(?:importScripts|new Worker)\(\s*["'`]https?:/);
      expect(sorgente, nome).not.toMatch(/@import\s+(?:url\()?["']?https?:/);
    }
  });
});

describe('llms.txt', () => {
  const llms = () => readFileSync('dist/llms.txt', 'utf8');

  it('descrive il negozio', () => {
    expect(llms().startsWith('# Alma Living')).toBe(true);
    expect(llms()).toContain('Via Ricasoli');
  });

  it('elenca la home con un URL assoluto', () => {
    expect(llms()).toMatch(/\]\(https?:\/\/[^)\s]+\/\):/);
  });
});

/**
 * Valori dell'attributo `attributo` nei tag `<tag …>` di `html` (in tutti i tag
 * se `tag` manca).
 */
function valoriAttributo(html: string, attributo: string, tag = '[a-z][a-z0-9-]*'): string[] {
  const valori: string[] = [];
  for (const [elemento] of html.matchAll(new RegExp(`<${tag}\\b[^>]*>`, 'gi'))) {
    const valore = new RegExp(`\\s${attributo}=["']?([^"'\\s>]*)`, 'i').exec(elemento)?.[1];
    if (valore !== undefined) valori.push(valore);
  }
  return valori;
}

/**
 * Rimandi dei protocolli di markup (`src/prova/comune/interazioni.ts`) che non
 * hanno la destinazione: un messaggio per ogni valore, anche se il rimando si
 * ripete. Lo script non può segnalarli (sta zitto), quindi li cerca la build.
 */
function incoerenzeProtocolli(html: string): string[] {
  const problemi = new Set<string>();
  const manca = (attributo: string, valore: string, serve: string) =>
    problemi.add(`${attributo}="${valore}" senza ${serve}="${valore}"`);

  const destinazioni = (attributo: string, tag?: string) =>
    new Set(valoriAttributo(html, attributo, tag));

  const dialogPost = destinazioni('data-post', 'dialog');
  for (const valore of valoriAttributo(html, 'data-post-apri')) {
    if (!dialogPost.has(valore)) manca('data-post-apri', valore, 'dialog data-post');
  }
  const gruppi = destinazioni('data-storia-gruppo');
  for (const valore of valoriAttributo(html, 'data-storia-apri')) {
    if (!gruppi.has(valore)) manca('data-storia-apri', valore, 'data-storia-gruppo');
  }
  const pannelli = destinazioni('data-chiedi-pannello');
  for (const valore of valoriAttributo(html, 'data-chiedi')) {
    if (!pannelli.has(valore)) manca('data-chiedi', valore, 'data-chiedi-pannello');
  }
  const contenitori = destinazioni('data-filtri');
  const vuoti = destinazioni('data-filtro-vuoto');
  for (const valore of valoriAttributo(html, 'data-filtrabile')) {
    if (!contenitori.has(valore)) manca('data-filtrabile', valore, 'data-filtri');
    if (!vuoti.has(valore)) manca('data-filtrabile', valore, 'data-filtro-vuoto');
  }
  return [...problemi];
}

describe('controllo dei rimandi tra i protocolli di markup', () => {
  it.each([
    '<button data-post-apri="x">Apri</button>',
    '<button data-post-apri="x">Apri</button><dialog data-post="y"></dialog>',
    // la destinazione di un post deve essere un dialog, non un elemento qualunque
    '<button data-post-apri="x">Apri</button><div data-post="x"></div>',
    '<button data-storia-apri="arrivi">Arrivi</button>',
    '<button data-storia-apri="a"></button><section data-storia-gruppo="b"></section>',
    '<button data-chiedi="lenzuola">Chiedi</button>',
    '<button data-chiedi="a"></button><div data-chiedi-pannello="b" hidden></div>',
    '<li data-filtrabile="selezione" data-categorie="letto">Lenzuola</li>',
  ])('segnala %s', (frammento) => {
    expect(incoerenzeProtocolli(`<p>testo</p>${frammento}`).length).toBeGreaterThan(0);
  });

  it('per le voci filtrabili chiede sia il contenitore dei filtri sia il messaggio "nessuna voce"', () => {
    const voce = '<li data-filtrabile="n" data-categorie="a">x</li>';
    const filtri = '<div data-filtri="n"><button data-filtro="a">A</button></div>';
    const vuoto = '<p data-filtro-vuoto="n" hidden>Nessuna voce</p>';
    expect(incoerenzeProtocolli(voce)).toHaveLength(2);
    expect(incoerenzeProtocolli(voce + filtri)).toHaveLength(1);
    expect(incoerenzeProtocolli(voce + vuoto)).toHaveLength(1);
    expect(incoerenzeProtocolli(voce + filtri + vuoto)).toEqual([]);
  });

  it('un messaggio per valore, anche se il rimando si ripete, e dice quale manca', () => {
    const doppio = '<button data-post-apri="x"></button><button data-post-apri="x"></button>';
    expect(incoerenzeProtocolli(doppio)).toEqual(['data-post-apri="x" senza dialog data-post="x"']);
  });

  it.each([
    '<p>niente da collegare</p>',
    '<button data-post-apri="x">Apri</button><dialog data-post="x"><p>Post</p></dialog>',
    // più pulsanti per lo stesso dialog, attributi in qualunque ordine e senza virgolette
    '<button data-post-apri=x></button><button class="b" data-post-apri="x"></button>' +
      '<dialog class="post" open data-post=x></dialog>',
    '<button data-storia-apri="arrivi">Arrivi</button>' +
      '<dialog data-storie><section data-storia-gruppo="arrivi"></section></dialog>',
    '<button data-chiedi="lenzuola" aria-expanded="false">Chiedi</button>' +
      '<div data-chiedi-pannello="lenzuola" hidden></div>',
    // un pulsante dentro il pannello può usare lo stesso data-chiedi per chiuderlo
    '<button data-chiedi="a"></button><div data-chiedi-pannello="a"><button data-chiedi="a"></button></div>',
    '<div data-filtri="selezione"><button data-filtro="tutti" aria-pressed="true">Tutti</button></div>' +
      '<ul><li data-filtrabile="selezione" data-categorie="letto bagno">x</li></ul>' +
      '<p data-filtro-vuoto="selezione" hidden>Nessun articolo</p>',
    // data-filtro (il pulsante) e data-post (il dialog) da soli non sono rimandi
    '<button data-filtro="letto">Letto</button><dialog data-post="x"></dialog>',
  ])('non segnala %s', (frammento) => {
    expect(incoerenzeProtocolli(frammento)).toEqual([]);
  });
});

// Le pagine di prova (/prova/…) sono un lavoro a parte, in un ramo di sviluppo:
// ogni pagina deve restare fuori dai motori di ricerca e dal resto del sito, e
// non deve chiedere nulla a terzi (vedi spec "varianti di prova", §8 e §10).
describe('pagine di prova (/prova/)', () => {
  const CARTELLA_PROVA = join('dist', 'prova');
  const pagineProva = pagine.filter((file) => file.startsWith(CARTELLA_PROVA + sep));
  const leggi = (file: string) => readFileSync(file, 'utf8');

  it('la pagina /prova/ esiste e ha un link per ogni variante', () => {
    const indice = join(CARTELLA_PROVA, 'index.html');
    expect(existsSync(indice)).toBe(true);
    const html = leggi(indice);
    expect(VARIANTI.length).toBeGreaterThan(0);
    for (const { id } of VARIANTI) {
      expect(html, id).toContain(`href="/prova/${id}/"`);
    }
  });

  describe.each(pagineProva)('%s', (file) => {
    const html = () => leggi(file);

    it('è in italiano', () => {
      expect(html()).toContain('<html lang="it"');
    });

    it('ha noindex e nessun JSON-LD', () => {
      expect(html()).toContain('<meta name="robots" content="noindex, nofollow"');
      expect(html()).not.toContain('application/ld+json');
    });

    it('ha esattamente un h1', () => {
      expect(html().match(/<h1[\s>]/gi) ?? []).toHaveLength(1);
    });

    it('ogni immagine ha un alt, e una foto servita da /_astro/', () => {
      for (const [tag] of html().matchAll(/<img\b[^>]*>/gi)) {
        expect(tag, tag).toMatch(/\salt=/i);
        const src = /\ssrc=["']?([^"'\s>]*)/i.exec(tag)?.[1];
        if (src !== undefined) expect(src, tag).toMatch(/^\/_astro\//);
      }
    });

    it('ogni rimando dei protocolli di markup ha la sua destinazione', () => {
      expect(incoerenzeProtocolli(html())).toEqual([]);
    });
  });

  it('nessuna pagina di prova è in llms.txt', () => {
    expect(readFileSync('dist/llms.txt', 'utf8')).not.toContain('/prova/');
  });
});

// Astro scrive le regole @font-face dei caratteri in un <style> dentro ogni
// pagina che usa il componente Font, e i file in /_astro/fonts/: qui si guarda
// ovunque, non solo nei fogli di stile emessi (che il test del pannello copre).
describe('caratteri: nessun indirizzo esterno, in nessuna pagina', () => {
  function indirizziFontFace(testo: string): string[] {
    return (testo.match(/@font-face\s*\{[^}]*\}/g) ?? []).flatMap((regola) =>
      [...regola.matchAll(/url\(\s*["']?([^"')]*)/g)].map((m) => m[1]!),
    );
  }

  const fogli = readdirSync(join('dist', '_astro'))
    .filter((nome) => nome.endsWith('.css'))
    .map((nome) => join('dist', '_astro', nome));

  it('il controllo trova gli indirizzi di una regola @font-face', () => {
    expect(
      indirizziFontFace(
        '@font-face{font-family:x;src:url("/_astro/fonts/a.woff2") format("woff2"),url(https://f.example/a.woff2)}',
      ),
    ).toEqual(['/_astro/fonts/a.woff2', 'https://f.example/a.woff2']);
  });

  it.each([...pagine, ...fogli])('%s: ogni @font-face punta a un file del sito', (file) => {
    for (const indirizzo of indirizziFontFace(readFileSync(file, 'utf8'))) {
      expect(indirizzo, indirizzo).toMatch(/^\/(?!\/)/);
      expect(existsSync(join('dist', ...indirizzo.split('/'))), indirizzo).toBe(true);
    }
  });
});

