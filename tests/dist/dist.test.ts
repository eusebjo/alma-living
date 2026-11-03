import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, sep } from 'node:path';
import { describe, expect, it } from 'vitest';
import { GIORNI } from '../../src/content/limits';
import { messaggioDisponibilita } from '../../src/sito/comune/contatti';
import { ORARI_PROVA } from '../../src/sito/comune/orari';
import { durataFoto } from '../../src/sito/comune/sequenza';
import {
  articoli,
  categorie,
  fotoFinestra,
  idSchedaRapida,
  LIMITI_SELEZIONE,
  messaggi,
  messaggioPost,
  messaggioStoria,
  nomeConColore,
  occhielloArticolo,
  post,
  POST_VISIBILI,
  sezioni,
  storie,
  testoColori,
  vetrina,
} from '../../src/sito/componenti/dati';
import { VARIANTI } from '../../src/sito/varianti';

// Questi test guardano la build locale (`npm run build` senza SITE_LAUNCHED né
// WORKERS_CI_BRANCH), che non è indicizzabile: niente JSON-LD, niente sitemap,
// `noindex` su ogni pagina. La build di lancio si verifica a mano (vedi
// CLAUDE.md, "Stato di lancio").

/**
 * Gli attributi di un tag di apertura, fino al `>` che lo chiude: un `>` dentro un
 * valore tra virgolette non lo chiude (per esempio `sizes="(width > 1023px) …"` o
 * `data-galleria-salta="(width > 1023px)"`). Da usare al posto di `[^>]*`.
 */
const ATTRIBUTI = String.raw`(?:[^>"']|"[^"]*"|'[^']*')*`;

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
  for (const [tag, nome] of html.matchAll(
    new RegExp(`<(script|img|iframe|link)\\b${ATTRIBUTI}>`, 'gi'),
  )) {
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

  // Le foto stanno sul bucket (foto.almalivingviaricasoli.it), ma la build le
  // scarica e le serve da /_astro/: a pagina aperta nessuna richiesta parte
  // verso quell'host (né verso l'indirizzo r2.dev di prima), nemmeno da `srcset`.
  it.each(pagine)('%s: le foto non puntano al bucket, e ogni srcset è di /_astro/', (file) => {
    const html = readFileSync(file, 'utf8');
    expect(html).not.toContain('foto.almalivingviaricasoli.it');
    expect(html).not.toContain('r2.dev');
    for (const [, valore] of html.matchAll(/\ssrcset=["']([^"']*)["']/gi)) {
      for (const candidato of valore!.split(',')) {
        expect(candidato.trim(), candidato).toMatch(/^\/_astro\//);
      }
    }
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
  for (const [elemento] of html.matchAll(new RegExp(`<${tag}\\b${ATTRIBUTI}>`, 'gi'))) {
    const valore = new RegExp(`\\s${attributo}=["']?([^"'\\s>]*)`, 'i').exec(elemento)?.[1];
    if (valore !== undefined) valori.push(valore);
  }
  return valori;
}

/** Quante volte l'attributo `attributo` (con o senza valore) compare nei tag di `testo`. */
function quanti(testo: string, attributo: string): number {
  return (testo.match(new RegExp(`\\s${attributo}(?=[\\s=>/])`, 'gi')) ?? []).length;
}

/**
 * Rimandi dei protocolli di markup (`src/sito/comune/interazioni.ts`) che non
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
  // Chi apre un post è un `button`, o un link `a[href]`: senza script il link porta
  // al suo indirizzo (per esempio WhatsApp), con lo script apre il dialog.
  for (const [elemento] of html.matchAll(
    /<[a-z][a-z0-9-]*\b[^>]*\sdata-post-apri(?=[\s=>/])[^>]*>/gi,
  )) {
    const unPulsante = /^<button\b/i.test(elemento);
    const unLink = /^<a\b/i.test(elemento) && /\shref=["']?[^"'\s>]/i.test(elemento);
    if (!unPulsante && !unLink) {
      problemi.add('data-post-apri non è un button né un link a con href');
    }
  }
  const gruppi = destinazioni('data-storia-gruppo');
  for (const valore of valoriAttributo(html, 'data-storia-apri')) {
    if (!gruppi.has(valore)) manca('data-storia-apri', valore, 'data-storia-gruppo');
  }
  // Un interruttore è un `button` con `aria-pressed="true|false"`: lo script ne inverte lo stato.
  for (const [elemento] of html.matchAll(
    /<[a-z][a-z0-9-]*\b[^>]*\sdata-interruttore(?=[\s=>/])[^>]*>/gi,
  )) {
    const unPulsante = /^<button\b/i.test(elemento);
    const conStato = /\saria-pressed=["']?(?:true|false)["']?(?=[\s>/])/i.test(elemento);
    if (!unPulsante || !conStato) {
      problemi.add('data-interruttore non è un button con aria-pressed="true|false"');
    }
  }
  const contenitori = destinazioni('data-filtri');
  const vuoti = destinazioni('data-filtro-vuoto');
  for (const valore of valoriAttributo(html, 'data-filtrabile')) {
    if (!contenitori.has(valore)) manca('data-filtrabile', valore, 'data-filtri');
    if (!vuoti.has(valore)) manca('data-filtrabile', valore, 'data-filtro-vuoto');
  }
  // Il limite conta le voci filtrabili del suo nome e ha il suo "Mostra tutti".
  const limiti = destinazioni('data-limite');
  const filtrabili = destinazioni('data-filtrabile');
  const mostraTutti = destinazioni('data-limite-mostra');
  for (const valore of valoriAttributo(html, 'data-limite-mostra')) {
    if (!limiti.has(valore)) manca('data-limite-mostra', valore, 'data-limite');
  }
  for (const valore of limiti) {
    if (!filtrabili.has(valore)) manca('data-limite', valore, 'data-filtrabile');
    if (!mostraTutti.has(valore)) manca('data-limite', valore, 'data-limite-mostra');
  }
  // Galleria: pausa, foto saltate, didascalie e annuncio valgono
  // solo dentro una `[data-galleria]` (lo script la cerca con `closest`); e le
  // didascalie, quando ci sono, sono una per foto, nello stesso ordine.
  const gallerie = elementiCon(html, 'data-galleria');
  for (const attributo of [
    'data-galleria-pausa',
    'data-galleria-salta',
    'data-galleria-didascalia',
    'data-galleria-annuncio',
  ]) {
    const dentro = gallerie.reduce((somma, galleria) => somma + quanti(galleria, attributo), 0);
    if (quanti(html, attributo) !== dentro) problemi.add(`${attributo} fuori da una galleria data-galleria`);
  }
  for (const galleria of gallerie) {
    const didascalie = quanti(galleria, 'data-galleria-didascalia');
    const foto = quanti(galleria, 'data-galleria-foto');
    if (didascalie > 0 && didascalie !== foto) {
      problemi.add(`${didascalie} data-galleria-didascalia per ${foto} data-galleria-foto nella stessa galleria`);
    }
  }
  // La pausa di una galleria è un `button` senza `aria-pressed` (come il controllo
  // di rotazione del carosello W3C APG): cambia il testo, lo stato è
  // `data-galleria-ferma` sulla galleria.
  for (const [elemento] of html.matchAll(
    new RegExp(`<[a-z][a-z0-9-]*\\b${ATTRIBUTI}>`, 'gi'),
  )) {
    if (quanti(elemento, 'data-galleria-pausa') === 0) continue;
    if (!/^<button\b/i.test(elemento) || quanti(elemento, 'aria-pressed') > 0) {
      problemi.add('data-galleria-pausa non è un button senza aria-pressed');
    }
  }
  // Un pulsante colore sta dentro un contenitore `data-colori`; e la foto che
  // sceglie (`data-colore-foto="n"`) esiste nella galleria di quel contenitore.
  const PULSANTE_COLORE = /<button\b[^>]*\sdata-colore(?=[\s=>/])[^>]*>/gi;
  const pulsantiColore = (testo: string) => [...testo.matchAll(PULSANTE_COLORE)];
  const dentroContenitori = [...new Set(valoriAttributo(html, 'data-colori'))].flatMap((nome) =>
    contenutiCon(html, 'data-colori', nome).flatMap((contenuto) => {
      const foto = (contenuto.match(/\sdata-galleria-foto(?=[\s=>/])/g) ?? []).length;
      for (const valore of valoriAttributo(contenuto, 'data-colore-foto', 'button')) {
        if (!(Number(valore) < foto)) {
          problemi.add(
            `data-colore-foto="${valore}" senza una foto data-galleria-foto in [data-colori="${nome}"]`,
          );
        }
      }
      return pulsantiColore(contenuto);
    }),
  );
  if (pulsantiColore(html).length !== dentroContenitori.length) {
    problemi.add('data-colore fuori da un contenitore data-colori');
  }
  return [...problemi];
}

/**
 * Ogni elemento di `html` il cui tag di apertura soddisfa `scegli`: il tag di
 * apertura e il contenuto, fino al tag di chiusura corrispondente.
 */
function elementiDove(
  html: string,
  scegli: (apertura: string) => boolean,
): { apertura: string; contenuto: string }[] {
  const elementi: { apertura: string; contenuto: string }[] = [];
  for (const apertura of html.matchAll(new RegExp(`<([a-z][a-z0-9-]*)\\b${ATTRIBUTI}>`, 'gi'))) {
    if (!scegli(apertura[0])) continue;
    const tag = apertura[1]!;
    const inizio = apertura.index + apertura[0].length;
    const tagStesso = new RegExp(`<(/?)${tag}\\b${ATTRIBUTI}>`, 'gi');
    tagStesso.lastIndex = inizio;
    let profondita = 1;
    let fine = html.length;
    for (let m = tagStesso.exec(html); m; m = tagStesso.exec(html)) {
      profondita += m[1] ? -1 : 1;
      if (profondita === 0) {
        fine = m.index;
        break;
      }
    }
    elementi.push({ apertura: apertura[0], contenuto: html.slice(inizio, fine) });
  }
  return elementi;
}

/**
 * Il contenuto (fino al tag di chiusura corrispondente) di ogni elemento di
 * `html` con `attributo="valore"`.
 */
function contenutiCon(html: string, attributo: string, valore: string): string[] {
  const conValore = new RegExp(`\\s${attributo}=["']?([^"'\\s>]*)`, 'i');
  return elementiDove(html, (apertura) => conValore.exec(apertura)?.[1] === valore).map(
    (e) => e.contenuto,
  );
}

/**
 * Ogni elemento di `html` che ha l'attributo `attributo`, con o senza valore: il
 * tag di apertura seguito dal contenuto.
 */
function elementiCon(html: string, attributo: string): string[] {
  return elementiDove(html, (apertura) => quanti(apertura, attributo) > 0).map(
    (e) => e.apertura + e.contenuto,
  );
}

describe('controllo dei rimandi tra i protocolli di markup', () => {
  it.each([
    '<button data-post-apri="x">Apri</button>',
    '<button data-post-apri="x">Apri</button><dialog data-post="y"></dialog>',
    // la destinazione di un post deve essere un dialog, non un elemento qualunque
    '<button data-post-apri="x">Apri</button><div data-post="x"></div>',
    // chi apre un post è un button, o un link con href
    '<a data-post-apri="x">Apri</a><dialog data-post="x"></dialog>',
    '<div data-post-apri="x"></div><dialog data-post="x"></dialog>',
    '<button data-storia-apri="arrivi">Arrivi</button>',
    '<button data-storia-apri="a"></button><section data-storia-gruppo="b"></section>',
    // un interruttore è un button con aria-pressed true o false
    '<div data-interruttore></div>',
    '<button data-interruttore>x</button>',
    '<li data-filtrabile="selezione" data-categorie="letto">Lenzuola</li>',
    // pausa, foto saltate, didascalie e annuncio vogliono la loro galleria
    '<button type="button" data-galleria-pausa>Pausa</button>',
    // la pausa è un button, e senza aria-pressed: il suo testo cambia
    '<div data-galleria><button type="button" data-galleria-pausa aria-pressed="false">Pausa</button></div>',
    '<div data-galleria><div data-galleria-pausa>Pausa</div></div>',
    '<ul><li data-galleria-foto data-galleria-salta="(width > 1023px)"></li></ul>',
    '<p data-galleria-annuncio><span data-galleria-didascalia>Coperta</span></p>',
    '<div data-galleria><div data-galleria-foto></div></div><p data-galleria-annuncio></p>',
    // una didascalia per foto, nella stessa galleria
    '<div data-galleria><div data-galleria-foto></div><div data-galleria-foto></div>' +
      '<p data-galleria-annuncio><span data-galleria-didascalia>a</span></p></div>',
    '<div data-galleria><div data-galleria-foto></div></div>' +
      '<div data-galleria><span data-galleria-didascalia>a</span></div>',
    // "Mostra tutti" vuole il suo limite; il limite vuole le voci e il pulsante
    '<button data-limite-mostra="s" hidden>Mostra tutti</button>',
    '<ul data-limite="s" data-limite-regole="[]"></ul><button data-limite-mostra="s" hidden></button>',
    '<ul data-limite="s" data-limite-regole="[]"><li data-filtrabile="s" data-categorie="a">x</li></ul>' +
      '<div data-filtri="s"><button data-filtro="a">A</button></div><p data-filtro-vuoto="s" hidden></p>',
    // un pulsante colore vuole il suo contenitore; la foto che sceglie, la sua galleria
    '<button data-colore="verde" aria-pressed="false"></button>',
    '<div data-colori="a"><div data-galleria><div data-galleria-foto></div></div>' +
      '<button data-colore="verde" data-colore-foto="1" aria-pressed="false"></button></div>',
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
    // un link che apre il post e, senza script, porta altrove
    '<a href="https://wa.me/1" data-post-apri="x"></a><dialog data-post="x"></dialog>',
    '<button data-storia-apri="arrivi">Arrivi</button>' +
      '<dialog data-storie><section data-storia-gruppo="arrivi"></section></dialog>',
    '<button type="button" data-interruttore aria-pressed="false">x</button>',
    // attributi in qualunque ordine e senza virgolette
    '<button class="i" aria-pressed=true data-interruttore>x</button>',
    '<div data-filtri="selezione"><button data-filtro="tutti" aria-pressed="true">Tutti</button></div>' +
      '<ul><li data-filtrabile="selezione" data-categorie="letto bagno">x</li></ul>' +
      '<p data-filtro-vuoto="selezione" hidden>Nessun articolo</p>',
    // data-filtro (il pulsante) e data-post (il dialog) da soli non sono rimandi
    '<button data-filtro="letto">Letto</button><dialog data-post="x"></dialog>',
    // una galleria che gira da sola, con tutto dentro: un ">" in un valore non chiude il tag
    '<section data-galleria data-galleria-auto="5000"><div>' +
      '<button type="button" data-galleria-pausa>Pausa</button>' +
      '<ul><li data-galleria-foto></li><li data-galleria-foto data-galleria-salta="(width > 1023px)" hidden></li></ul>' +
      '<p data-galleria-annuncio><span data-galleria-didascalia>a</span><span data-galleria-didascalia hidden>b</span></p>' +
      '</div></section>',
    // una galleria senza didascalie non ne chiede
    '<div data-galleria><div data-galleria-foto></div><div data-galleria-foto></div></div>',
    '<ul data-limite="s" data-limite-regole="[]"><li data-filtrabile="s" data-categorie="a">x</li></ul>' +
      '<div data-filtri="s"><button data-filtro="a">A</button></div><p data-filtro-vuoto="s" hidden></p>' +
      '<button data-limite-mostra="s" hidden><span data-limite-testo></span></button>',
    // un colore con la sua foto, e uno senza: i pulsanti stanno dentro il contenitore
    '<div data-colori="a"><div data-galleria><div data-galleria-foto></div><div data-galleria-foto></div></div>' +
      '<button data-colore="verde" data-colore-foto="1" aria-pressed="false"></button></div>',
    '<article data-colori=b><button type="button" data-colore="rosa" data-colore-nome="x" aria-pressed="false"></button></article>',
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

  it('la pagina /prova/ non ha link a varianti che non sono in VARIANTI', () => {
    const html = leggi(join(CARTELLA_PROVA, 'index.html'));
    const attesi = VARIANTI.map(({ id }) => `/prova/${id}/`).sort();
    const trovati = [...html.matchAll(/href="(\/prova\/[^"]*)"/g)]
      .map((m) => m[1]!)
      .sort();
    expect(trovati).toEqual(attesi);
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
      for (const [tag] of html().matchAll(new RegExp(`<img\\b${ATTRIBUTI}>`, 'gi'))) {
        // Un'immagine decorativa ha l'alt vuoto, che Astro scrive senza valore (`alt`).
        expect(tag, tag).toMatch(/\salt(?:=|(?=[\s/>]))/i);
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

// La variante Salvia social (Task 5): oltre ai controlli comuni delle pagine di
// prova, il markup che lo script comune fa funzionare e i contenuti che devono
// restare leggibili anche senza JavaScript (didascalie, storie, orari, contatti).
describe('Salvia social (/prova/salvia-social/)', () => {
  const FILE = join('dist', 'prova', 'salvia-social', 'index.html');
  const html = () => readFileSync(FILE, 'utf8');

  it('nessuna foto dichiara una larghezza che l’originale non ha', () => {
    // Come per le foto importate, Astro non deve offrire `1000w` di una foto
    // larga 896 px: la larghezza dell'`<img>` è quella dell'originale.
    const gruppi = [...html().matchAll(/<picture\b[^>]*>([\s\S]*?)<\/picture>/gi)];
    expect(gruppi.length).toBeGreaterThan(100);
    for (const [, dentro] of gruppi) {
      const originale = Number(/\swidth="(\d+)"/.exec(dentro!)?.[1]);
      expect(originale, dentro).toBeGreaterThan(0);
      for (const [, srcset] of dentro!.matchAll(/\ssrcset="([^"]*)"/g)) {
        for (const [, larghezza] of srcset!.matchAll(/\s(\d+)w(?:,|$)/g)) {
          expect(Number(larghezza), dentro).toBeLessThanOrEqual(originale);
        }
      }
    }
  });

  // Il testo come lo legge il browser: Astro scrive alcune entità nei valori.
  const decodifica = (testo: string) =>
    testo
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&');

  /** Il testo decodificato, con gli spazi (a capo compresi) ridotti a uno. */
  const normalizza = (s: string) => decodifica(s).replace(/\s+/g, ' ');

  /** I tag di apertura `<nome …>` di `testo` che hanno l'attributo `attributo`. */
  const tagIn = (testo: string, nome: string, attributo: string) =>
    [
      ...testo.matchAll(
        new RegExp(`<${nome}\\b${ATTRIBUTI}\\s${attributo}(?=[\\s=>])${ATTRIBUTI}>`, 'gi'),
      ),
    ].map((m) => m[0]);

  /** I tag di apertura `<nome …>` della pagina che hanno l'attributo `attributo`. */
  const tagCon = (nome: string, attributo: string) => tagIn(html(), nome, attributo);

  /** Valore di `attributo` in un tag di apertura (decodificato), o undefined. */
  const valore = (tag: string, attributo: string) => {
    const trovato = new RegExp(`\\s${attributo}=(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i').exec(
      tag,
    );
    if (!trovato) return undefined;
    return decodifica(trovato[1] ?? trovato[2] ?? trovato[3] ?? '');
  };

  /** Il tag di apertura e il contenuto di ogni `<dialog>` con l'attributo `attributo`. */
  const dialogCon = (attributo: string) =>
    [
      ...html().matchAll(
        new RegExp(`<dialog\\b[^>]*\\s${attributo}(?=[\\s=>])[^>]*>([\\s\\S]*?)<\\/dialog>`, 'gi'),
      ),
    ].map((m) => ({ apertura: m[0].slice(0, m[0].indexOf('>') + 1), contenuto: m[1]! }));

  it('esiste e il body porta data-variante="salvia-social"', () => {
    expect(existsSync(FILE)).toBe(true);
    expect(html()).toMatch(/<body\b[^>]*\sdata-variante="salvia-social"/);
  });

  it('il pulsante del menu ha un nome fisso: aperto o chiuso lo dice solo aria-expanded', () => {
    const pulsante = /<button\b[^>]*\sdata-menu-apri\b[^>]*>([\s\S]*?)<\/button>/i.exec(html());
    expect(pulsante).not.toBeNull();
    const apertura = pulsante![0].slice(0, pulsante![0].indexOf('>') + 1);
    expect(apertura).toMatch(/\saria-expanded="false"/);
    expect(apertura).not.toMatch(/\saria-label(?:ledby)?=/);
    // Il testo dentro il pulsante (le icone sono decorative) è il suo nome.
    const testo = pulsante![1]!.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    expect(testo).toBe('Menu');
  });

  it('la fila di storie ha almeno 6 storie da aprire, e ogni storia sta in un dialog di storie', () => {
    const apri = tagCon('button', 'data-storia-apri');
    expect(apri.length).toBeGreaterThanOrEqual(6);
    const dialog = dialogCon('data-storie');
    expect(dialog.length).toBeGreaterThanOrEqual(1);
    const gruppi = dialog.flatMap(({ contenuto }) =>
      [...contenuto.matchAll(/\sdata-storia-gruppo="([^"]+)"/g)].map((m) => m[1]),
    );
    for (const id of new Set(apri.map((t) => valore(t, 'data-storia-apri')))) {
      expect(gruppi, id).toContain(id);
    }
  });

  it('ogni storia ha le sue foto e una barra per foto, e ogni dialog il pulsante di pausa', () => {
    const dialog = dialogCon('data-storie');
    for (const { contenuto } of dialog) {
      expect(contenuto).toMatch(/<button\b[^>]*\sdata-storia-pausa\b[^>]*\saria-pressed="false"/);
    }
    const tutto = dialog.map((d) => d.contenuto).join('\n');
    const inizi = [...tutto.matchAll(/\sdata-storia-gruppo="([^"]+)"/g)];
    const gruppi = new Map(
      inizi.map((m, i) => [m[1], tutto.slice(m.index, inizi[i + 1]?.index ?? tutto.length)]),
    );
    for (const storia of storie) {
      const gruppo = gruppi.get(storia.id) ?? '';
      expect(gruppo.match(/\sdata-storia-foto\b/g) ?? [], storia.id).toHaveLength(
        storia.foto.length,
      );
      expect(gruppo.match(/\sdata-storia-barra\b/g) ?? [], storia.id).toHaveLength(
        storia.foto.length,
      );
      for (const foto of storia.foto) expect(decodifica(gruppo), storia.id).toContain(foto.testo);
    }
  });

  it('il lettore delle storie ha una zona di tocco, nascosta ai lettori di schermo e fuori dal tab', () => {
    for (const { contenuto } of dialogCon('data-storie')) {
      const zone = [...contenuto.matchAll(/<([a-z]+)\b[^>]*\sdata-storia-tocchi(?=[\s=>])[^>]*>/g)];
      expect(zone).toHaveLength(1);
      expect(zone[0]![1]).toBe('div');
      expect(zone[0]![0]).toMatch(/\saria-hidden="true"/);
      expect(zone[0]![0]).not.toMatch(/\s(?:tabindex|role)=/);
    }
  });

  /** I gruppi del lettore delle storie, per id: il tag di apertura e il contenuto. */
  const gruppiStorie = () =>
    new Map(
      elementiDove(dialogCon('data-storie')[0]?.contenuto ?? '', (a) => quanti(a, 'data-storia-gruppo') > 0).map(
        (g) => [valore(g.apertura, 'data-storia-gruppo'), g],
      ),
    );

  const MAPPE =
    'https://www.google.com/maps/search/?api=1&query=Alma%20Living%20Via%20Ricasoli%2051%20Livorno';

  it('ogni foto delle storie resta il tempo della sua frase (data-storia-durata)', () => {
    const contenuto = dialogCon('data-storie')[0]?.contenuto ?? '';
    const durate = tagIn(contenuto, '[a-z]+', 'data-storia-foto').map((t) => valore(t, 'data-storia-durata'));
    expect(durate).toEqual(storie.flatMap((s) => s.foto.map((f) => String(durataFoto(f.testo)))));
  });

  it('in ogni storia un solo "Chiedi informazioni", chiuso, che apre la scheda', () => {
    const gruppi = gruppiStorie();
    for (const storia of storie) {
      const { contenuto } = gruppi.get(storia.id) ?? { contenuto: '' };
      const apri = elementiDove(contenuto, (a) => quanti(a, 'data-storia-invito-apri') > 0);
      expect(apri, storia.id).toHaveLength(1);
      expect(apri[0]!.apertura).toMatch(/^<button\b/);
      expect(valore(apri[0]!.apertura, 'aria-expanded')).toBe('false');
      expect(soloTesto(apri[0]!.contenuto)).toBe('Chiedi informazioni');
    }
  });

  it('ogni frase delle storie: il testo intero per i lettori di schermo, quello visibile da accorciare e "altro" in fondo', () => {
    const gruppi = gruppiStorie();
    for (const storia of storie) {
      const { contenuto } = gruppi.get(storia.id) ?? { contenuto: '' };
      const frasi = elementiDove(contenuto, (a) => quanti(a, 'data-storia-frase') > 0);
      expect(frasi, storia.id).toHaveLength(storia.foto.length);
      storia.foto.forEach((foto, i) => {
        const dove = `${storia.id}, foto ${i + 1}`;
        const frase = frasi[i]!.contenuto;
        const lettori = elementiDove(frase, (a) => /\sclass="solo-lettori[\s"]/.test(a));
        expect(lettori.map((e) => soloTesto(e.contenuto)), dove).toEqual([foto.testo]);
        const visibile = elementiDove(frase, (a) => quanti(a, 'data-storia-frase-testo') > 0);
        expect(visibile, dove).toHaveLength(1);
        expect(valore(visibile[0]!.apertura, 'aria-hidden'), dove).toBe('true');
        expect(soloTesto(visibile[0]!.contenuto), dove).toBe(foto.testo);
        // "altro" sta dentro la frase, dopo il testo visibile, ed è nascosto finché lo script non misura.
        const altro = tagIn(frase, 'button', 'data-storia-altro');
        expect(altro, dove).toHaveLength(1);
        expect(nascosto(altro[0]!), dove).toBe(true);
        // Chiusa "altro"; aperta "Mostra meno", che non si confonde con l'ultima parola della frase.
        const bottone = elementiDove(frase, (a) => quanti(a, 'data-storia-altro') > 0)[0]!;
        const testi = elementiDove(bottone.contenuto, (a) => /\sclass="se-(?:chiusa|aperta)[\s"]/.test(a)).map(
          (e) => soloTesto(e.contenuto),
        );
        expect(testi, dove).toEqual(['altro', 'Mostra meno']);
        expect(frase.indexOf('data-storia-altro'), dove).toBeGreaterThan(frase.indexOf('data-storia-frase-testo'));
      });
    }
  });

  it('in ogni storia una scheda degli inviti per foto: i tre link, il primo quello della storia, e "Torna alla storia"', () => {
    const gruppi = gruppiStorie();
    const resto = ['indicazioni', 'whatsapp', 'chiama'] as const;
    const WHATSAPP = 'https://wa.me/393345205451?text=';
    for (const storia of storie) {
      const { contenuto } = gruppi.get(storia.id) ?? { contenuto: '' };
      const schede = elementiDove(contenuto, (a) => quanti(a, 'data-storia-invito') > 0);
      expect(schede, storia.id).toHaveLength(storia.foto.length);
      // Senza script si vede la scheda della prima foto; lo script mostra quella della foto attuale.
      expect(schede.map((s) => nascosto(s.apertura)), storia.id).toEqual(storia.foto.map((_, i) => i > 0));
      const attesi = [storia.invito, ...resto.filter((k) => k !== storia.invito)];
      storia.foto.forEach((foto, i) => {
        const dove = `${storia.id}, foto ${i + 1}`;
        const link = tagIn(schede[i]!.contenuto, 'a', 'href');
        const indirizzi = link.map((t) => valore(t, 'href') ?? '');
        const tipi = indirizzi.map((href) =>
          href.startsWith(WHATSAPP) ? 'whatsapp' : href.startsWith('tel:') ? 'chiama' : 'indicazioni',
        );
        expect(tipi, dove).toEqual(attesi);
        expect(decodeURIComponent(indirizzi[tipi.indexOf('whatsapp')]!.slice(WHATSAPP.length)), dove).toBe(
          messaggioStoria(storia, foto),
        );
        expect(indirizzi[tipi.indexOf('chiama')], dove).toBe('tel:+393345205451');
        expect(indirizzi[tipi.indexOf('indicazioni')], dove).toBe(MAPPE);
        // Il primo è pieno, gli altri bordati.
        expect(link.map((t) => /\sclass="pieno[\s"]/.test(t)), dove).toEqual([true, false, false]);
        const TESTI = {
          indicazioni: 'Indicazioni per Via Ricasoli',
          whatsapp: 'Scrivici su WhatsApp',
          chiama: 'Chiama il negozio',
        } as const;
        const testi = elementiDove(schede[i]!.contenuto, (a) => /^<a\b/i.test(a)).map((e) =>
          soloTesto(e.contenuto),
        );
        expect(testi, dove).toEqual(attesi.map((k) => TESTI[k]));
        // Un tocco sul velo chiude la scheda, ma non sul gruppo dei tre link: lì la scheda resta.
        const resta = elementiDove(schede[i]!.contenuto, (a) => quanti(a, 'data-storia-invito-resta') > 0);
        expect(resta, dove).toHaveLength(1);
        expect(tagIn(resta[0]!.contenuto, 'a', 'href'), dove).toEqual(link);
        const chiudi = elementiDove(schede[i]!.contenuto, (a) => quanti(a, 'data-storia-invito-chiudi') > 0);
        expect(chiudi, dove).toHaveLength(1);
        expect(chiudi[0]!.apertura).toMatch(/^<button\b/);
        expect(soloTesto(chiudi[0]!.contenuto)).toBe('Torna alla storia');
      });
    }
  });

  it('nel lettore delle storie niente titolo, stato del negozio, "Poi" né azioni fisse', () => {
    const { contenuto } = dialogCon('data-storie')[0] ?? { contenuto: '' };
    const testo = soloTesto(contenuto);
    for (const frase of ['In negozio c’è molto di più', 'Aperto ora', 'Chiuso', 'Chiedi, chiama, vieni']) {
      expect(testo).not.toContain(frase);
    }
    expect(testo).not.toMatch(/\bPoi\b/);
    expect(contenuto).not.toMatch(/\sclass="[^"]*\bazioni\b/);
  });

  it('le frecce per la tastiera ci sono ancora: un pulsante "Indietro" e uno "Avanti"', () => {
    const { contenuto } = dialogCon('data-storie')[0] ?? { contenuto: '' };
    for (const [attributo, nome] of [
      ['data-storia-prec', 'Indietro'],
      ['data-storia-succ', 'Avanti'],
    ] as const) {
      const tag = tagIn(contenuto, '[a-z]+', attributo);
      expect(tag, attributo).toHaveLength(1);
      expect(tag[0]).toMatch(/^<button\b/);
      expect(valore(tag[0]!, 'aria-label')).toBe(nome);
    }
  });

  it('il CSS del lettore: le foto non prendono il puntatore, i tocchi non lasciano gesti al browser, il fondo è opaco', () => {
    const css = cssDellaPagina();
    const { apertura } = dialogCon('data-storie')[0] ?? { apertura: '' };
    const cid = /\sdata-astro-cid-([a-z0-9]+)/.exec(apertura)?.[1];
    expect(cid).toBeDefined();
    const mio = `[data-astro-cid-${cid}]`;
    /** Le dichiarazioni delle regole che hanno `selettore` nel loro elenco di selettori. */
    const dichiarazioni = (selettore: string) =>
      regole(css)
        .filter((r) => r.selettore.split(',').map((s) => s.trim()).includes(selettore))
        .map((r) => r.dichiarazioni);
    expect(dichiarazioni(`.storie${mio} img`)).toContainEqual(
      expect.stringMatching(/(?:^|;)pointer-events:none(?:;|$)/),
    );
    expect(dichiarazioni(`.tocchi${mio}`)).toContainEqual(
      expect.stringMatching(/(?:^|;)touch-action:none(?:;|$)/),
    );
    expect(dichiarazioni(`.storie${mio}`)).toContainEqual(
      expect.stringMatching(/(?:^|;)background:var\(--fondo-storie\)(?:;|$)/),
    );
    // Il fondo è un colore pieno: niente trasparenza, la pagina sotto non si vede.
    expect(css).toMatch(/--fondo-storie:#[0-9a-f]{6}(?=[;}])/i);
  });

  it('il CSS del lettore: la frase è centrata, la pausa si vede solo con il focus da tastiera', () => {
    const css = cssDellaPagina();
    const { apertura } = dialogCon('data-storie')[0] ?? { apertura: '' };
    const cid = /\sdata-astro-cid-([a-z0-9]+)/.exec(apertura)?.[1];
    expect(cid).toBeDefined();
    const mio = `[data-astro-cid-${cid}]`;
    // Fuori da ogni `@media`.
    let base = css;
    for (const b of [...blocchiMedia(css)].reverse()) base = base.slice(0, b.da) + base.slice(b.a);
    const dichiarazioni = (selettore: string) =>
      regole(base)
        .filter((r) => r.selettore.split(',').map((s) => s.trim()).includes(selettore))
        .map((r) => r.dichiarazioni);
    expect(dichiarazioni(`.frase${mio}`)).toContainEqual(expect.stringMatching(/(?:^|;)text-align:center(?:;|$)/));
    expect(dichiarazioni(`.frase${mio}`)).toContainEqual(expect.stringMatching(/(?:^|;)overflow:hidden(?:;|$)/));
    expect(dichiarazioni(`.pausa${mio}`)).toContainEqual(
      expect.stringMatching(/(?:^|;)clip-path:inset\(50%\)(?:;|$)/),
    );
    expect(dichiarazioni(`.pausa${mio}:focus-visible`)).toContainEqual(
      expect.stringMatching(/(?:^|;)clip-path:none(?:;|$)/),
    );
  });

  it('la scala dei titoli: l’h1 è il più grande, poi gli h2, i titoli medi e gli h3, sul telefono e sul computer', () => {
    const css = cssDellaPagina();
    const scala = (nome: string) => {
      const m = new RegExp(`--${nome}:clamp\\((\\d+)px,[^,]+,\\s*(\\d+)px\\)`).exec(css);
      expect(m, nome).not.toBeNull();
      return [Number(m![1]), Number(m![2])] as const;
    };
    const [h1, h2, medio, h3] = ['h1', 'h2', 'titolo-medio', 'h3'].map(scala);
    for (const i of [0, 1] as const) {
      expect(h1![i]).toBeGreaterThan(h2![i]);
      expect(h2![i]).toBeGreaterThan(medio![i]);
      expect(medio![i]).toBeGreaterThan(h3![i]);
    }
    // L'h1 dell'apertura usa la sua misura, senza valori scritti a mano.
    expect(css).toMatch(/(?:^|[}\s,])h1\[data-astro-cid-[a-z0-9]+\]\{[^}]*font-size:var\(--h1\)/);
    expect(css).not.toMatch(/(?:^|[}\s,])h1\[data-astro-cid-[a-z0-9]+\]\{[^}]*font-size:\d/);
  });

  it('il menu del telefono: le tre sezioni a 22 px, poi il riquadro con stato, indirizzo, WhatsApp e Chiama', () => {
    const menu = contenutiCon(html(), 'id', 'menu-telefono')[0] ?? '';
    const link = tagIn(menu, 'a', 'href');
    const voci = link.filter((t) => /\sclass="menu-voce[\s"]/.test(t));
    expect(voci.map((t) => valore(t, 'href'))).toEqual(sezioni.map((s) => s.href));
    const azioni = link.filter((t) => !/\sclass="menu-voce[\s"]/.test(t)).map((t) => valore(t, 'href') ?? '');
    expect(azioni).toHaveLength(2);
    expect(azioni[0]).toMatch(/^https:\/\/wa\.me\/393345205451/);
    expect(azioni[1]).toBe('tel:+393345205451');
    expect(menu).toContain('data-stato-negozio');
    expect(decodifica(menu)).toContain('Via Ricasoli 51-53, 57125 Livorno');
    // Le voci un gradino sotto i titoli della pagina, non grandi quanto l'h1.
    const css = cssDellaPagina();
    expect(css).toMatch(/\.menu-voce\[data-astro-cid-[a-z0-9]+\]\{[^}]*font-size:22px/);
  });

  it('le frecce del lettore: ritagliate sul telefono, sempre visibili con il mouse', () => {
    const css = cssDellaPagina();
    const { apertura } = dialogCon('data-storie')[0] ?? { apertura: '' };
    const cid = /\sdata-astro-cid-([a-z0-9]+)/.exec(apertura)?.[1];
    expect(cid).toBeDefined();
    const freccia = `.freccia[data-astro-cid-${cid}]`;
    const conFreccia = (testo: string) =>
      regole(testo).filter((r) => r.selettore.split(',').map((s) => s.trim()).includes(freccia));
    // Fuori da ogni `@media` la freccia è ritagliata.
    const blocchi = blocchiMedia(css);
    let base = css;
    for (const b of [...blocchi].reverse()) base = base.slice(0, b.da) + base.slice(b.a);
    expect(conFreccia(base).map((r) => r.dichiarazioni)).toContainEqual(
      expect.stringMatching(/(?:^|;)clip-path:inset\(50%\)(?:;|$)/),
    );
    // Con un mouse (passaggio e puntatore preciso) non lo è più, e prende il puntatore.
    const mouse = blocchi
      .filter((b) => /^\(hover:\s*hover\)\s*and\s*\(pointer:\s*fine\)$/.test(b.condizione))
      .flatMap((b) => conFreccia(b.contenuto).map((r) => r.dichiarazioni));
    expect(mouse).toContainEqual(expect.stringMatching(/(?:^|;)clip-path:none(?:;|$)/));
    expect(mouse).toContainEqual(expect.stringMatching(/(?:^|;)pointer-events:auto(?:;|$)/));
  });

  it('le sezioni si susseguono: apertura, selezione, diario, negozio; "Per ogni stanza" non c’è più', () => {
    const posizioni = ['apertura', 'selezione', 'diario', 'negozio'].map((id) =>
      html().indexOf(`id="${id}"`),
    );
    for (const p of posizioni) expect(p).toBeGreaterThanOrEqual(0);
    expect([...posizioni].sort((a, b) => a - b)).toEqual(posizioni);
    expect(html()).not.toContain('id="collezioni"');
  });

  it('il negozio: niente etichette in fondo, e da Google il voto, le stelle e il link senza il numero di recensioni', () => {
    const negozio = decodifica(contenutiCon(html(), 'id', 'negozio')[0] ?? '');
    // Sotto il titolo un invito semplice, non la descrizione degli scaffali.
    expect(normalizza(negozio)).toContain(
      'Siamo al 51-53, nell’isola pedonale del centro di Livorno. Passa a trovarci, ti aspettiamo.',
    );
    expect(negozio).not.toContain('scaffali bianchi');
    expect(negozio).not.toContain('Confezioni regalo con spago e cartellino');
    expect(negozio).not.toContain('Attività di proprietà di donne');
    expect(negozio).not.toMatch(/\d+\s+recensioni/);
    expect(negozio).toContain('Su Google');
    expect(negozio).toContain('5,0');
    expect(negozio).toContain('aria-label="5 stelle su 5"');
    expect(negozio).toContain('Leggi le recensioni');
  });

  it("header, menu del telefono e piè di pagina elencano le sezioni nell'ordine della pagina", () => {
    const ancore = sezioni.map((s) => s.href);
    const elenchi = [...html().matchAll(/<nav\b[\s\S]*?<\/nav>/g)]
      .map((m) => [...m[0].matchAll(/href="(#[^"]+)"/g)].map((h) => h[1]!).filter((a) => ancore.includes(a)))
      .filter((elenco) => elenco.length > 0);
    expect(elenchi).toHaveLength(3);
    for (const elenco of elenchi) expect(elenco).toEqual(ancore);
  });

  it('il diario non è più un profilo: niente storie, un riquadro "Post dal negozio"', () => {
    const diario = decodifica(contenutiCon(html(), 'id', 'diario')[0] ?? '');
    expect(diario).not.toMatch(/\sdata-storia-apri=/);
    expect(diario).not.toContain('Storie in evidenza');
    expect(diario).toMatch(/<h3\b[^>]*>Post dal negozio<\/h3>/);
    expect(diario).toContain(`Aggiornato il ${post[0]!.data}`);
  });

  it('il diario dà la data dell’ultimo post (28 ottobre) e la pagina non promette un ritmo settimanale', () => {
    const diario = decodifica(contenutiCon(html(), 'id', 'diario')[0] ?? '');
    expect(diario).toContain('Aggiornato il 28 ottobre');
    expect(diario).toContain('L’ultimo post è del 28 ottobre');
    expect(decodifica(html())).not.toMatch(/ogni settimana/i);
  });

  it('"del" davanti alle date dell’8 e dell’11 è elisio in tutta la pagina', () => {
    const pagina = decodifica(html());
    expect(pagina).not.toContain('del 8 ');
    expect(pagina).not.toContain('del 11 ');
    // Il pulsante del post e il suo dialog dicono "dell’8 luglio" (p6, p7) e "dell’11 ottobre" (p3).
    expect(pagina).toContain('Apri il post dell’8 luglio');
    expect(pagina).toContain('aria-label="Post dell’11 ottobre"');
  });

  it('i post non hanno etichette come "Arrivi": nel feed restano anche quelli vecchi', () => {
    const diario = decodifica(contenutiCon(html(), 'id', 'diario')[0] ?? '');
    for (const etichetta of ['Arrivi', 'In vetrina', 'Dettagli', 'Dietro il banco']) {
      expect(diario).not.toContain(`>${etichetta}<`);
      expect(diario).not.toMatch(new RegExp(`aria-label="[^"]*${etichetta}`));
    }
    // Nella griglia, sul velo, solo la data; nel nome del pulsante data e numero di foto.
    expect(diario).toMatch(/aria-label="Apri il post del 28 ottobre, \d+ foto"/);
  });

  it('la pagina parla come Alma Living: niente "Martina", niente carattere a mano', () => {
    expect(decodifica(html())).not.toMatch(/martina/i);
    expect(html()).not.toMatch(/beth[- ]ellen/i);
  });

  it('la sezione dei post parla di post, non di diario, e dà del tu', () => {
    const apertura = /<section\b[^>]*\sid="diario"[^>]*>/.exec(html())?.[0] ?? '';
    expect(valore(apertura, 'aria-label')).toBe('Dal negozio: post e foto');
    const diario = normalizza(contenutiCon(html(), 'id', 'diario')[0] ?? '');
    expect(diario).toContain('>Post e foto<');
    expect(diario).toMatch(/<h2\b[^>]*>Dal negozio<\/h2>/);
    expect(diario).toContain('Il feed del negozio: qui trovi tutti i nostri post.');
    expect(diario).toContain(
      '“Se vedi qualcosa che ti piace, scrivici: ti mandiamo altre foto e te lo teniamo da parte.”',
    );
    // Il biglietto vale sempre: la firma non ha una data.
    expect(diario).toMatch(/>Alma Living<\/span> · Via Ricasoli<\/span>/);
    expect(diario.replace(/<[^>]*>/g, ' ')).not.toMatch(/diario/i);
  });

  it('un solo lettore di storie', () => {
    expect(dialogCon('data-storie')).toHaveLength(1);
  });

  const INSTAGRAM = 'href="https://www.instagram.com/almaliving.viaricasoli/"';

  it("Instagram in tre punti soltanto: icona dell'header, fascia, piè di pagina", () => {
    const pagina = html();
    expect(pagina.split(INSTAGRAM)).toHaveLength(4);
    expect(/<header\b[\s\S]*?<\/header>/.exec(pagina)?.[0]).toContain(INSTAGRAM);
    expect(contenutiCon(pagina, 'id', 'instagram')[0]).toContain(INSTAGRAM);
    expect(/<footer\b[\s\S]*?<\/footer>/.exec(pagina)?.[0]).toContain(INSTAGRAM);
  });

  it('la fascia Instagram sta tra il diario e il negozio, ed è senza foto', () => {
    const pagina = html();
    const [diario, fascia, negozio] = ['id="diario"', 'id="instagram"', 'id="negozio"'].map((s) =>
      pagina.indexOf(s),
    );
    expect(diario).toBeGreaterThanOrEqual(0);
    expect(fascia).toBeGreaterThan(diario!);
    expect(negozio).toBeGreaterThan(fascia!);
    const contenuto = decodifica(contenutiCon(pagina, 'id', 'instagram')[0] ?? '');
    expect(contenuto).toMatch(/<h2\b[^>]*\sid="instagram-titolo"[^>]*>Seguici anche su Instagram<\/h2>/);
    expect(contenuto).toContain('aria-label="Apri Instagram: @almaliving.viaricasoli"');
    expect(contenuto).not.toMatch(/<(?:img|picture)\b/);
    // Sotto il titolo solo il nome del profilo: la frase sulle foto di ogni giorno non c'è più.
    const riga = /<p\b[^>]*>([\s\S]*?)<\/p>/.exec(contenuto)?.[1] ?? '';
    expect(riga.replace(/<[^>]*>/g, '').trim()).toBe('@almaliving.viaricasoli');
    expect(contenuto).not.toContain('Le foto di ogni giorno');
  });

  it('storie e post propongono di chiamare il negozio, non Instagram', () => {
    const testo = (s: string) => s.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    expect(decodifica(html())).not.toContain('Vedi su Instagram');
    const chiama = [...html().matchAll(/<a\b[^>]*\shref="tel:\+393345205451"[^>]*>([\s\S]*?)<\/a>/g)]
      .map((m) => testo(m[1]!))
      .filter((t) => t === 'Chiama il negozio');
    // Nelle storie un link per foto (nella scheda degli inviti), nei post uno per post.
    const fotoDelleStorie = storie.reduce((somma, storia) => somma + storia.foto.length, 0);
    expect(chiama).toHaveLength(fotoDelleStorie + post.length);
    for (const { contenuto } of [...dialogCon('data-storie'), ...dialogCon('data-post')]) {
      expect(contenuto).not.toContain('almaliving.viaricasoli');
    }
  });

  it("il post aperto è firmato Alma Living e il suo WhatsApp ha il messaggio del post", () => {
    const dialog = new Map(dialogCon('data-post').map(({ apertura, contenuto }) => [valore(apertura, 'data-post'), contenuto]));
    for (const voce of post) {
      const contenuto = dialog.get(voce.id) ?? '';
      expect(contenuto, voce.id).toMatch(/>Alma Living</);
      expect(contenuto, voce.id).toContain(
        `href="https://wa.me/393345205451?text=${encodeURIComponent(messaggioPost(voce))}"`,
      );
    }
  });

  it(`griglia dei post: ${POST_VISIBILI} post visibili, gli altri piegati, ognuno con il suo dialog`, () => {
    const pulsanti = tagCon('button', 'data-post-apri');
    const visibili = pulsanti.filter((t) => !/\sdata-altro=/.test(t));
    const piegati = pulsanti.filter((t) => /\sdata-altro=/.test(t));
    expect(visibili).toHaveLength(POST_VISIBILI);
    for (const tag of visibili) expect(tag).not.toMatch(/\shidden(?=[\s=>])/);
    expect(piegati).toHaveLength(post.length - POST_VISIBILI);
    expect(piegati.length).toBeGreaterThan(0);
    for (const tag of piegati) expect(tag).toMatch(/\shidden(?=[\s=>])/);

    // Il pulsante "Mostra altri" apre proprio il gruppo dei post piegati.
    const gruppiAltri = new Set(piegati.map((t) => valore(t, 'data-altro')));
    expect(gruppiAltri.size).toBe(1);
    const mostra = tagCon('button', 'data-mostra-altri').map((t) =>
      valore(t, 'data-mostra-altri'),
    );
    expect(mostra).toEqual([...gruppiAltri]);

    expect(pulsanti.map((t) => valore(t, 'data-post-apri'))).toEqual(post.map((p) => p.id));
    // Anche le schede rapide degli articoli sono dialog `data-post`: qui contano solo i post.
    const dialog = dialogCon('data-post')
      .filter(({ apertura }) => !valore(apertura, 'data-post')!.startsWith('articolo-'))
      .map(({ apertura }) => valore(apertura, 'data-post'));
    expect(dialog).toEqual(post.map((p) => p.id));
  });

  it("le didascalie dei post sono nell'HTML, ciascuna nel dialog del suo post", () => {
    const dialog = new Map(
      dialogCon('data-post').map(({ apertura, contenuto }) => [
        valore(apertura, 'data-post'),
        contenuto,
      ]),
    );
    for (const voce of post) {
      expect(decodifica(dialog.get(voce.id) ?? ''), voce.id).toContain(voce.testo);
    }
  });

  it('la selezione ha i filtri, il messaggio del filtro vuoto e un articolo filtrabile per voce', () => {
    expect(tagCon('[a-z]+', 'data-filtri').map((t) => valore(t, 'data-filtri'))).toEqual([
      'selezione',
    ]);
    const filtri = tagCon('button', 'data-filtro');
    expect(filtri.map((t) => valore(t, 'data-filtro'))).toEqual([
      'tutti',
      ...categorie.map((c) => c.id),
    ]);
    expect(filtri.map((t) => valore(t, 'aria-pressed'))).toEqual([
      'true',
      ...categorie.map(() => 'false'),
    ]);

    const vuoto = tagCon('[a-z]+', 'data-filtro-vuoto');
    expect(vuoto).toHaveLength(1);
    expect(valore(vuoto[0]!, 'data-filtro-vuoto')).toBe('selezione');
    expect(vuoto[0]).toMatch(/\shidden(?=[\s=>])/);

    const voci = tagCon('[a-z]+', 'data-filtrabile');
    expect(voci.map((t) => valore(t, 'data-filtrabile'))).toEqual(articoli.map(() => 'selezione'));
    expect(voci.map((t) => valore(t, 'data-categorie'))).toEqual(
      articoli.map((a) => a.categorie.join(' ')),
    );
  });

  it('la selezione ha il limite per misura, e senza JavaScript mostra tutte le schede', () => {
    const contenitori = tagCon('ul', 'data-limite');
    expect(contenitori.map((t) => valore(t, 'data-limite'))).toEqual(['selezione']);
    expect(JSON.parse(valore(contenitori[0]!, 'data-limite-regole') ?? '')).toEqual(
      LIMITI_SELEZIONE,
    );
    const mostra = tagCon('button', 'data-limite-mostra');
    expect(mostra.map((t) => valore(t, 'data-limite-mostra'))).toEqual(['selezione']);
    expect(mostra[0]).toMatch(/\shidden(?=[\s=>])/);
    for (const voce of tagCon('[a-z]+', 'data-filtrabile')) {
      expect(voce).not.toMatch(/\shidden(?=[\s=>])/);
    }
  });

  it('niente carosello: una griglia sola', () => {
    expect(html()).not.toMatch(/\sdata-carosello/);
  });

  it('ogni filtro ha il cerchietto foto, decorativo; Mare dice che non ha articoli', () => {
    const filtri = [
      ...html().matchAll(/<button\b[^>]*\sdata-filtro="([^"]+)"[^>]*>([\s\S]*?)<\/button>/g),
    ];
    expect(filtri.map((m) => m[1])).toEqual(['tutti', ...categorie.map((c) => c.id)]);
    for (const [, id, dentro] of filtri) {
      const img = dentro!.match(/<img\b[^>]*>/g) ?? [];
      expect(img, id).toHaveLength(1);
      expect(img[0], id).toMatch(/\salt(?:="")?(?=[\s/>])/);
    }
    expect(decodifica(filtri.find((m) => m[1] === 'mare')![2]!)).toContain(
      ', nessun articolo adesso',
    );
  });

  it('nella griglia: le schede, "Mostra tutti", poi le due finestre, ognuna con la foto vera e il suo WhatsApp', () => {
    const griglia = decodifica(contenutiCon(html(), 'data-limite', 'selezione')[0] ?? '');
    const ultimaScheda = griglia.lastIndexOf(' data-filtrabile=');
    const mostra = griglia.indexOf(' data-limite-mostra=');
    const mare = griglia.indexOf(' data-filtro-vuoto=');
    const finestra = griglia.indexOf('Non lo trovi qui?');
    expect(ultimaScheda).toBeGreaterThan(0);
    expect(mostra).toBeGreaterThan(ultimaScheda);
    expect(mare).toBeGreaterThan(mostra);
    expect(finestra).toBeGreaterThan(mare);

    const vuota = decodifica(contenutiCon(html(), 'data-filtro-vuoto', 'selezione')[0] ?? '');
    expect(vuota).toContain('Il mare torna in primavera');
    expect(vuota).toContain(`alt="${fotoFinestra.mare.alt}"`);
    expect(vuota).toContain(
      `href="https://wa.me/393345205451?text=${encodeURIComponent(messaggi.mare)}"`,
    );

    // La foto sta prima del testo: la finestra comincia dal suo `<li>`.
    const scaffale = griglia.slice(griglia.lastIndexOf('<li', finestra));
    // Un invito semplice: il pulsante dice già come scrivere.
    expect(scaffale).toMatch(/<h3\b[^>]*>Chiedi pure a noi\.<\/h3>/);
    expect(scaffale).toContain('Raccontaci cosa cerchi: saremo felici di aiutarti.');
    expect(scaffale).not.toContain('molto di più');
    expect(scaffale).not.toContain('per quale stanza');
    expect(scaffale).toContain(`alt="${fotoFinestra.scaffale.alt}"`);
    expect(scaffale).toContain(
      `href="https://wa.me/393345205451?text=${encodeURIComponent(messaggi.cerco)}"`,
    );
  });

  /** Il CSS della pagina: i fogli collegati (in /_astro/) e i `<style>` scritti nella pagina. */
  const cssDellaPagina = () => {
    const pagina = html();
    const collegati = [...pagina.matchAll(/<link\b[^>]*>/gi)]
      .map((m) => m[0])
      .filter((tag) => /\srel=["']?stylesheet\b/i.test(tag))
      .map((tag) => valore(tag, 'href') ?? '')
      .map((href) => readFileSync(join('dist', ...href.split('/').filter(Boolean)), 'utf8'));
    const inPagina = [...pagina.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)].map((m) => m[1]!);
    return [...collegati, ...inPagina].join('\n');
  };

  it('la fila delle storie si vede solo sul telefono, senza invito ai post', () => {
    const css = cssDellaPagina();
    expect(css).toMatch(/@media \(width ?> ?767px\)\{[^}]*\.storie\[[^\]]*\]\{display:none\}/);
    expect(decodifica(html())).not.toContain('Vedi i post');
    expect(decodifica(html())).not.toContain('Le storie del negozio');
  });

  it("la griglia non riordina nulla a vista: la finestra resta in fondo, come nel DOM", () => {
    const css = cssDellaPagina();
    expect(css).not.toMatch(
      /\.voce(?:-finestra|-mostra)?\[[^\]]*\](?::nth-child\([^)]*\))?[^{}]*\{[^}]*\border:/,
    );
    expect(css).not.toContain(' of [data-filtrabile]');
  });

  it('nessun link sceglie più un filtro da fuori, e nessuno porta a #collezioni', () => {
    expect(html()).not.toMatch(/\sdata-filtro-scegli(?=[\s=>])/);
    expect(html()).not.toContain('href="#collezioni"');
  });

  it('per ogni articolo, un link WhatsApp con il messaggio di disponibilità già scritto', () => {
    for (const { nome } of articoli) {
      const messaggio = `Buongiorno, ho visto sul sito «${nome}». È disponibile? Misura o colore: …`;
      expect(html(), nome).toContain(
        `href="https://wa.me/393345205451?text=${encodeURIComponent(messaggio)}"`,
      );
    }
  });

  it('ogni scheda: prima il link che chiede la disponibilità, poi due scatti, l’interruttore, occhiello, nome e dettaglio', () => {
    const schede = contenutiCon(html(), 'data-filtrabile', 'selezione');
    expect(schede).toHaveLength(articoli.length);
    articoli.forEach((articolo, i) => {
      const scheda = decodifica(schede[i]!);
      const primo = /<(?:a|button)\b[^>]*>/.exec(scheda)?.[0] ?? '';
      expect(primo, articolo.id).toMatch(/^<a\b/);
      expect(valore(primo, 'href')).toBe(
        `https://wa.me/393345205451?text=${encodeURIComponent(messaggioDisponibilita(articolo.nome))}`,
      );
      expect(valore(primo, 'aria-label')).toBe(`Chiedi disponibilità: ${articolo.nome}`);
      expect(scheda.match(/<img\b/g) ?? [], articolo.id).toHaveLength(2);
      for (const s of articolo.scatti) expect(scheda, articolo.id).toContain(`alt="${s.alt}"`);
      const interruttore =
        /<button\b[^>]*\sdata-interruttore(?=[\s=>])[^>]*>/.exec(scheda)?.[0] ?? '';
      expect(valore(interruttore, 'aria-pressed')).toBe('false');
      expect(valore(interruttore, 'aria-label')).toBe(`Seconda foto: ${articolo.nome}`);
      expect(scheda).toContain(`>${occhielloArticolo(articolo)}</p>`);
      expect(scheda).toMatch(new RegExp(`<h3\\b[^>]*>${articolo.nome}</h3>`));
      expect(scheda).toContain(articolo.dettaglio);
    });
    expect(html()).not.toMatch(/\sdata-chiedi(?:-pannello)?=/);
  });

  it('ogni scheda apre la sua scheda rapida, e senza JavaScript il link porta comunque a WhatsApp', () => {
    const link = tagCon('a', 'data-post-apri');
    expect(link.map((t) => valore(t, 'data-post-apri'))).toEqual(articoli.map(idSchedaRapida));
    articoli.forEach((articolo, i) => {
      expect(valore(link[i]!, 'href')).toBe(
        `https://wa.me/393345205451?text=${encodeURIComponent(messaggioDisponibilita(articolo.nome))}`,
      );
      expect(link[i]).not.toMatch(/\saria-haspopup=/); // lo aggiunge lo script
    });
  });

  it('la scheda rapida: titolo e nome, foto, occhiello, dettaglio, messaggio già scritto e le due azioni', () => {
    const rapide = new Map(dialogCon('data-post').map((d) => [valore(d.apertura, 'data-post'), d]));
    for (const articolo of articoli) {
      const { apertura, contenuto } = rapide.get(idSchedaRapida(articolo)) ?? { apertura: '', contenuto: '' };
      const testo = decodifica(contenuto);
      const [titolo, nome] = (valore(apertura, 'aria-labelledby') ?? '').split(' ');
      expect(testo, articolo.id).toMatch(new RegExp(`<p\\b[^>]*\\sid="${titolo}"[^>]*>Chiedi disponibilità</p>`));
      expect(testo, articolo.id).toMatch(new RegExp(`<h2\\b[^>]*\\sid="${nome}"[^>]*>${articolo.nome}</h2>`));
      expect(testo).toContain(`>${occhielloArticolo(articolo)}</p>`);
      expect(testo).toContain(articolo.dettaglio);
      // Almeno i due scatti; con il Task 5 la casetta ne ha tre, uno per colore.
      expect((testo.match(/<img\b/g) ?? []).length).toBeGreaterThanOrEqual(2);
      const messaggio = messaggioDisponibilita(articolo.nome);
      expect(testo).toContain(messaggio);
      expect(testo).toContain('Il messaggio è già scritto: puoi cambiarlo prima di inviarlo.');
      expect(contenuto).toContain(`href="https://wa.me/393345205451?text=${encodeURIComponent(messaggio)}"`);
      expect(testo).toContain('Invia su WhatsApp');
      expect(testo).toMatch(/<a\b[^>]*\shref="tel:\+393345205451"[^>]*>Preferisci chiamare\? 334 520 5451<\/a>/);
      const chiudi = tagIn(contenuto, 'button', 'data-post-chiudi');
      expect(chiudi).toHaveLength(1);
      expect(valore(chiudi[0]!, 'aria-label')).toBe('Chiudi');
      expect(chiudi[0]).toMatch(/\sautofocus(?=[\s=>])/);
    }
  });

  it('nella scheda rapida, un pulsante per colore con nome, messaggio e link già scritti', () => {
    const rapide = new Map(dialogCon('data-post').map((d) => [valore(d.apertura, 'data-post'), d.contenuto]));
    for (const articolo of articoli) {
      const contenuto = rapide.get(idSchedaRapida(articolo)) ?? '';
      const colori = articolo.colori ?? [];
      const pulsanti = tagIn(contenuto, 'button', 'data-colore');
      expect(pulsanti.map((t) => valore(t, 'data-colore')), articolo.id).toEqual(colori.map((c) => c.nome));
      colori.forEach((colore, i) => {
        const t = pulsanti[i]!;
        const messaggio = messaggioDisponibilita(articolo.nome, colore.nome);
        expect(valore(t, 'aria-pressed')).toBe('false');
        expect(valore(t, 'aria-label')).toBe(`Colore ${colore.nome}`);
        expect(valore(t, 'data-colore-nome')).toBe(nomeConColore(articolo.nome, colore));
        expect(valore(t, 'data-colore-testo')).toBe(colore.nome);
        expect(valore(t, 'data-colore-messaggio')).toBe(messaggio);
        expect(valore(t, 'data-colore-href')).toBe(`https://wa.me/393345205451?text=${encodeURIComponent(messaggio)}`);
        expect(valore(t, 'data-colore-foto')).toBe(colore.foto ? String(i) : undefined);
      });
      if (colori.length === 0) continue;
      const testo = decodifica(contenuto);
      expect(testo).toMatch(/\sdata-colori="[^"]+"/);
      expect(testo).toContain(testoColori(colori));
      for (const dove of ['nome', 'testo', 'messaggio', 'link']) {
        expect(tagIn(testo, '[a-z0-9]+', 'data-colore-dove').map((t) => valore(t, 'data-colore-dove'))).toContain(dove);
      }
      // E stanno sugli elementi giusti: il nome sull'h2, il messaggio sul fumetto, il link su «Invia su WhatsApp».
      for (const [dove, tag] of [['nome', 'h2'], ['testo', 'span'], ['messaggio', 'p'], ['link', 'a']] as const) {
        const elementi = tagIn(testo, tag, 'data-colore-dove').filter((t) => valore(t, 'data-colore-dove') === dove);
        expect(elementi, `${articolo.id} ${dove}`).toHaveLength(1);
      }
      expect(tagIn(testo, 'a', 'data-colore-dove')[0]).toMatch(/\sclass="invia\b/);
      expect(tagIn(testo, 'p', 'data-colore-dove')[0]).toMatch(/\sclass="messaggio\b/);
      const conFoto = colori.every((c) => c.foto);
      // Con le foto dei colori: una galleria di quelle foto e niente interruttore; senza, i due scatti.
      expect((testo.match(/\sdata-galleria-foto(?=[\s=>])/g) ?? []).length, articolo.id).toBe(conFoto ? colori.length : 0);
      expect(/\sdata-interruttore(?=[\s=>])/.test(testo), articolo.id).toBe(!conFoto);
    }
  });

  it('lo stato del negozio porta gli orari della prova, e la tabella ha i sette giorni', () => {
    const stati = tagCon('[a-z]+', 'data-stato-negozio');
    expect(stati.length).toBeGreaterThan(0);
    for (const tag of stati) {
      expect(JSON.parse(valore(tag, 'data-orari') ?? '')).toEqual(ORARI_PROVA);
    }
    expect(
      tagCon('[a-z]+', 'data-orario-giorno').map((t) => valore(t, 'data-orario-giorno')),
    ).toEqual([...GIORNI]);
  });

  it('telefono, WhatsApp, Instagram e le sezioni sono link nel piè di pagina, anche senza JavaScript', () => {
    const piede = /<footer\b[\s\S]*?<\/footer>/.exec(html())?.[0] ?? '';
    expect(piede).toContain('href="tel:+393345205451"');
    expect(piede).toMatch(/href="https:\/\/wa\.me\/393345205451(?:\?text=[^"]*)?"/);
    expect(piede).toContain('href="https://www.instagram.com/almaliving.viaricasoli/"');
    for (const ancora of ['#diario', '#selezione', '#negozio']) {
      expect(piede, ancora).toContain(`href="${ancora}"`);
    }
  });

  /** Il contenuto di `#apertura`. */
  const dentroApertura = () => contenutiCon(html(), 'id', 'apertura')[0] ?? '';

  /** I tag `<nome …>`, anche con un `>` dentro un valore tra virgolette (`sizes`, `data-galleria-salta`). */
  const tagRe = (nome: string, flag = 'gi') => new RegExp(`<${nome}\\b${ATTRIBUTI}>`, flag);

  /** Il testo di un frammento: senza tag, decodificato, con gli spazi ridotti a uno. */
  const soloTesto = (frammento: string) =>
    normalizza(
      frammento.replace(tagRe('[a-z][a-z0-9-]*'), ' ').replace(/<\/[a-z0-9-]+>/gi, ' '),
    ).trim();

  /** Le foto della cornice dell'apertura, nell'ordine: il tag `<li>` e la sua `<img>`. */
  const fotoCornice = () =>
    elementiDove(
      dentroApertura(),
      (apertura) => /^<li\b/i.test(apertura) && quanti(apertura, 'data-galleria-foto') > 0,
    ).map(({ apertura, contenuto }) => ({
      li: apertura,
      img: tagRe('img', 'i').exec(contenuto)?.[0] ?? '',
    }));

  const nascosto = (tag: string) => /\shidden(?=[\s=>/])/.test(tag);

  it("l'apertura è una scena: niente gesti, contatore, pillola della pausa né frecce", () => {
    const sezione = /<section\b[^>]*\sid="apertura"[^>]*>/.exec(html())?.[0] ?? '';
    expect(sezione).toMatch(/\sdata-galleria(?=[\s=>])/);
    const dentro = dentroApertura();
    for (const attributo of [
      'data-galleria-trascina',
      'data-galleria-sosta',
      'data-galleria-contatore',
      'data-galleria-prec',
      'data-galleria-succ',
    ]) {
      expect(quanti(dentro, attributo), attributo).toBe(0);
    }
    expect(dentro).not.toMatch(/\sclass="in-pausa[\s"]/);
    expect(soloTesto(dentro)).not.toContain('In pausa');
  });

  it("claim e frase: l'h1 dell'apertura è il claim, e la pagina ha la frase lunga e la corta", () => {
    const h1 = elementiDove(dentroApertura(), (apertura) => /^<h1\b/i.test(apertura));
    expect(h1).toHaveLength(1);
    expect(soloTesto(h1[0]!.contenuto)).toBe('Rendiamo la tua casa ancora più casa.');
    expect(valore(h1[0]!.apertura, 'id')).toBe('apertura-titolo');
    const sezione = /<section\b[^>]*\sid="apertura"[^>]*>/.exec(html())?.[0] ?? '';
    expect(valore(sezione, 'aria-labelledby')).toBe('apertura-titolo');
    const testo = soloTesto(html());
    expect(testo).toContain(
      'Biancheria, profumi e dettagli che scaldano l’ambiente, scelti uno per uno per il negozio di Via Ricasoli, nell’isola pedonale di Livorno.',
    );
    expect(testo).toContain(
      'Biancheria, profumi e dettagli scelti uno per uno, nel negozio di Via Ricasoli a Livorno.',
    );
  });

  it("l'apertura è una galleria che gira da sola: 12 foto, 7 solo sotto i 1024 px, 12 didascalie, 5 tacche che non si cliccano", () => {
    const sezione = /<section\b[^>]*\sid="apertura"[^>]*>/.exec(html())?.[0] ?? '';
    expect(valore(sezione, 'data-galleria-auto')).toBe('5000');
    // Lo stato lo scrive lo script: nell'HTML non c'è.
    expect(sezione + dentroApertura()).not.toMatch(
      /\sdata-galleria-(?:ferma|avviata)(?=[\s=>])/,
    );

    const foto = fotoCornice();
    expect(foto.map((f) => valore(f.img, 'alt'))).toEqual(vetrina.map((p) => p.scatto.alt));
    expect(foto.map((f) => nascosto(f.li))).toEqual(vetrina.map((_, i) => i > 0));
    const saltate = foto.filter((f) => valore(f.li, 'data-galleria-salta') !== undefined);
    expect(saltate).toHaveLength(7);
    for (const f of saltate) expect(valore(f.li, 'data-galleria-salta')).toBe('(width > 1023px)');
    expect(foto.map((f) => valore(f.li, 'data-galleria-salta') === undefined)).toEqual(
      vetrina.map((p) => p.grande),
    );

    const annunci = elementiDove(dentroApertura(), (a) => quanti(a, 'data-galleria-annuncio') > 0);
    expect(annunci).toHaveLength(1);
    const didascalie = elementiDove(
      annunci[0]!.contenuto,
      (a) => quanti(a, 'data-galleria-didascalia') > 0,
    );
    expect(didascalie.map((d) => soloTesto(d.contenuto))).toEqual(vetrina.map((p) => p.nome));
    expect(didascalie.map((d) => nascosto(d.apertura))).toEqual(vetrina.map((_, i) => i > 0));

    // Le tacche segnano il giro e basta: `span` (lo script cambia foto solo da un
    // `button[data-galleria-punto]`), in un gruppo nascosto ai lettori di schermo.
    expect(quanti(dentroApertura(), 'data-galleria-punto')).toBe(5);
    expect(tagIn(dentroApertura(), 'button', 'data-galleria-punto')).toEqual([]);
    const tacche = tagIn(dentroApertura(), 'span', 'data-galleria-punto');
    expect(tacche.map((t) => valore(t, 'data-galleria-punto'))).toEqual(['0', '1', '6', '10', '11']);
    expect(tacche.map((t) => valore(t, 'aria-current'))).toEqual(['true', undefined, undefined, undefined, undefined]);
    const gruppo = elementiDove(dentroApertura(), (a) => /\sclass="tacche[\s"]/.test(a));
    expect(gruppo).toHaveLength(1);
    expect(valore(gruppo[0]!.apertura, 'aria-hidden')).toBe('true');
  });

  it('le foto della cornice: misure, e posizione del computer e del telefono', () => {
    const foto = fotoCornice();
    expect(foto).toHaveLength(vetrina.length);
    foto.forEach((f, i) => {
      const prodotto = vetrina[i]!;
      expect(valore(f.img, 'sizes'), prodotto.nome).toBe('(width > 1023px) min(61vw, 872px), 100vw');
      const stile = valore(f.li, 'style') ?? '';
      expect(stile, prodotto.nome).toContain(`--pos-computer: ${prodotto.scatto.posizione}`);
      expect(stile, prodotto.nome).toContain(`--pos-telefono: ${prodotto.posizioneTelefono}`);
      expect(valore(f.img, 'style'), prodotto.nome).toContain('object-position: var(--posizione)');
    });
  });

  it("l'unico elemento attivabile dell'apertura è la pausa da tastiera, con i suoi due testi", () => {
    const attivabili = [...dentroApertura().matchAll(new RegExp(`<(?:a|button)\\b${ATTRIBUTI}>`, 'gi'))];
    expect(attivabili).toHaveLength(1);
    const primo = attivabili[0]?.[0] ?? '';
    expect(primo).toMatch(/^<button\b/);
    expect(quanti(primo, 'data-galleria-pausa')).toBe(1);
    // Come il controllo di rotazione del carosello W3C APG: cambia il testo, niente aria-pressed.
    expect(quanti(primo, 'aria-pressed')).toBe(0);
    const pausa = elementiDove(dentroApertura(), (a) => quanti(a, 'data-galleria-pausa') > 0);
    expect(pausa).toHaveLength(1);
    const testo = soloTesto(pausa[0]!.contenuto);
    expect(testo).toContain('Metti in pausa le foto');
    expect(testo).toContain('Riprendi le foto');
  });

  it('il testo della pausa segue data-galleria-ferma', () => {
    const css = cssDellaPagina();
    // Solo le regole dell'apertura: altri componenti (le storie) hanno classi con gli stessi nomi.
    const sezione = /<section\b[^>]*\sid="apertura"[^>]*>/.exec(html())?.[0] ?? '';
    const cid = /\sdata-astro-cid-([a-z0-9]+)/.exec(sezione)?.[1];
    expect(cid).toBeDefined();
    const mio = `\\[data-astro-cid-${cid}\\]`;
    // Il testo del pulsante si sceglie dallo stato della galleria (l'altro è display: none).
    expect(css).not.toMatch(new RegExp(`\\[aria-pressed[^\\]]*\\][^{}]*\\.se-(?:gira|ferma)${mio}`));
    expect(css).toMatch(
      new RegExp(`\\[data-galleria-ferma\\][^{},]*\\.se-gira${mio}[^{}]*\\{display:none\\}`),
    );
    expect(css).toMatch(
      new RegExp(`:not\\(\\[data-galleria-ferma\\]\\)[^{},]*\\.se-ferma${mio}[^{}]*\\{display:none\\}`),
    );
  });

  /** L'attributo `data-astro-cid-…` dell'apertura, come pezzo di espressione regolare. */
  const cidApertura = () => {
    const sezione = /<section\b[^>]*\sid="apertura"[^>]*>/.exec(html())?.[0] ?? '';
    const cid = /\sdata-astro-cid-([a-z0-9]+)/.exec(sezione)?.[1];
    expect(cid).toBeDefined();
    return `\\[data-astro-cid-${cid}\\]`;
  };

  /** I blocchi `@media` del CSS: la condizione, il contenuto (graffe bilanciate) e dove stanno. */
  const blocchiMedia = (css: string) => {
    const blocchi: { condizione: string; contenuto: string; da: number; a: number }[] = [];
    for (let da = css.indexOf('@media'); da !== -1; da = css.indexOf('@media', da + 1)) {
      const apre = css.indexOf('{', da);
      let a = apre + 1;
      for (let profondita = 1; a < css.length && profondita > 0; a++) {
        if (css[a] === '{') profondita++;
        else if (css[a] === '}') profondita--;
      }
      const condizione = css.slice(da + '@media'.length, apre).trim();
      blocchi.push({ condizione, contenuto: css.slice(apre + 1, a - 1), da, a });
      da = a - 1;
    }
    return blocchi;
  };

  /** Le regole `selettore{dichiarazioni}` di un pezzo di CSS (senza `@media` dentro). */
  const regole = (css: string) =>
    [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map((m) => ({
      selettore: m[1]!.trim(),
      dichiarazioni: m[2]!,
    }));

  it('con "riduci movimento" nulla si muove; senza script, o ferme, le miniature restano in pausa', () => {
    const css = cssDellaPagina();
    const mio = cidApertura();
    const blocchi = blocchiMedia(css);
    // "Riduci movimento": le miniature senza animazione, le foto della cornice senza dissolvenza.
    const ridotto = regole(
      blocchi
        .filter((b) => /^\(prefers-reduced-motion:\s*reduce\)$/.test(b.condizione))
        .map((b) => b.contenuto)
        .join('\n'),
    );
    const binario = new RegExp(`\\.binario${mio}$`);
    expect(
      ridotto.some(
        (r) => binario.test(r.selettore) && /(?:^|;)animation:none(?:;|$)/.test(r.dichiarazioni),
      ),
    ).toBe(true);
    expect(
      ridotto.some(
        (r) =>
          new RegExp(`^\\.foto${mio}$`).test(r.selettore) &&
          /(?:^|;)transition:none(?:;|$)/.test(r.dichiarazioni),
      ),
    ).toBe(true);

    // Di base (fuori da ogni `@media`) i due binari hanno l'animazione in pausa...
    let base = css;
    for (const b of [...blocchi].reverse()) base = base.slice(0, b.da) + base.slice(b.a);
    for (const nome of ['binario-sale', 'binario-scende']) {
      const regola = regole(base).find((r) => new RegExp(`^\\.${nome}${mio}$`).test(r.selettore));
      expect(regola?.dichiarazioni, nome).toMatch(/(?:^|;)animation:[^;]*\bpaused\b/);
    }
    // ...e corrono solo dentro una galleria avviata (dallo script) e non ferma.
    const inCorsa = regole(css).filter(
      (r) => r.selettore.includes(`.binario[`) && /\brunning\b/.test(r.dichiarazioni),
    );
    expect(inCorsa.map((r) => r.selettore)).toHaveLength(1);
    expect(inCorsa[0]!.selettore).toMatch(
      new RegExp(
        `^\\.apertura${mio}\\[data-galleria-avviata\\]:not\\(\\[data-galleria-ferma\\]\\) \\.binario${mio}$`,
      ),
    );
    expect(inCorsa[0]!.dichiarazioni).toMatch(/(?:^|;)animation-play-state:running(?:;|$)/);
  });

  it('senza JavaScript niente pausa né tacche; la foto non ha il cursore a mano', () => {
    const css = cssDellaPagina();
    const mio = cidApertura();
    const senzaScript = regole(
      blocchiMedia(css)
        .filter((b) => /^\(scripting:\s*none\)$/.test(b.condizione))
        .map((b) => b.contenuto)
        .join('\n'),
    );
    const nascosti = senzaScript
      .filter((r) => /(?:^|;)display:none(?:;|$)/.test(r.dichiarazioni))
      .flatMap((r) => r.selettore.split(','));
    for (const classe of ['pausa', 'tacche']) {
      expect(nascosti, classe).toContainEqual(expect.stringMatching(new RegExp(`^\\.${classe}${mio}$`)));
    }
    const conMano = regole(css).filter(
      (r) => r.selettore.includes(`.cornice${mio.replaceAll('\\', '')}`) && /cursor:pointer/.test(r.dichiarazioni),
    );
    expect(conMano).toEqual([]);
  });

  it("l'annuncio della foto nasce con aria-live=\"off\"", () => {
    const annunci = elementiDove(dentroApertura(), (a) => quanti(a, 'data-galleria-annuncio') > 0);
    expect(annunci).toHaveLength(1);
    expect(valore(annunci[0]!.apertura, 'aria-live')).toBe('off');
  });

  it('le miniature sono decorative: due colonne nascoste ai lettori di schermo, con le foto 3-6 e 8-10 due volte', () => {
    const colonne = elementiDove(dentroApertura(), (a) => valore(a, 'aria-hidden') === 'true').filter(
      (e) => /<img\b/i.test(e.contenuto),
    );
    const immagini = colonne.map((c) => [...c.contenuto.matchAll(tagRe('img'))].map((m) => m[0]));
    expect(immagini.map((lista) => lista.length)).toEqual([8, 6]);
    // La foto sta sul bucket (`…/prova/righe-rosa.jpg`) e la build la serve da
    // /_astro/ con il nome del file e un hash (`righe-rosa_Z1H1FSp.jpg`).
    const sinistra = [2, 3, 4, 5].map((i) => /\/([a-z0-9-]+)\.jpg$/.exec(vetrina[i]!.scatto.src)?.[1]);
    const destra = [7, 8, 9].map((i) => /\/([a-z0-9-]+)\.jpg$/.exec(vetrina[i]!.scatto.src)?.[1]);
    const nomi = immagini.map((lista) =>
      lista.map((t) => /^\/_astro\/([a-z0-9-]+)_[A-Za-z0-9]+\./.exec(valore(t, 'src') ?? '')?.[1]),
    );
    // Senza questo due elenchi di `undefined` risulterebbero uguali.
    for (const nome of [...sinistra, ...destra, ...nomi.flat()]) expect(nome).toEqual(expect.any(String));
    expect(nomi).toEqual([
      [...sinistra, ...sinistra],
      [...destra, ...destra],
    ]);
    for (const tag of immagini.flat()) {
      expect(tag).toMatch(/\salt(?:=""|(?=[\s/>]))/);
      expect(tag).toMatch(/\sloading="lazy"/);
      expect(valore(tag, 'sizes')).toBe('204px');
    }
  });

  it('solo la prima foto della cornice si carica subito, con priorità alta; le altre aspettano', () => {
    const immagini = [...html().matchAll(tagRe('img'))].map((m) => m[0]);
    const prioritarie = immagini.filter((t) => /\sfetchpriority="high"/.test(t));
    expect(prioritarie).toHaveLength(1);
    expect(prioritarie[0]).toMatch(/\sloading="eager"/);
    const foto = fotoCornice().map((f) => f.img);
    expect(foto).toHaveLength(vetrina.length);
    expect(prioritarie[0]).toBe(foto[0]);
    for (const tag of foto.slice(1)) {
      expect(tag).toMatch(/\sloading="lazy"/);
      expect(tag).not.toMatch(/\sfetchpriority=/);
    }
    // A parte la prima foto della cornice e i loghi in alto, nessuna immagine si carica subito.
    for (const tag of immagini.filter((t) => !/\sloading="lazy"/.test(t) && t !== foto[0])) {
      expect(tag).toMatch(/\salt="Alma Living"/);
    }
  });
});

