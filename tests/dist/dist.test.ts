import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, sep } from 'node:path';
import { describe, expect, it } from 'vitest';
import { GIORNI } from '../../src/content/limits';
import { messaggioDisponibilita } from '../../src/prova/comune/contatti';
import { ORARI_PROVA } from '../../src/prova/comune/orari';
import {
  altreCollezioni,
  apertura,
  articoli,
  categorie,
  collezioni,
  fotoFinestra,
  idSchedaRapida,
  LIMITI_SELEZIONE,
  messaggi,
  messaggioPost,
  nomeConColore,
  occhielloArticolo,
  post,
  POST_VISIBILI,
  sezioni,
  storie,
  testoColori,
} from '../../src/prova/salvia-social/dati';
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
  // Un link `data-filtro-scegli="<nome>:<id>"` preme il filtro `<id>` che sta
  // dentro `[data-filtri="<nome>"]`.
  for (const valore of valoriAttributo(html, 'data-filtro-scegli')) {
    const due = valore.indexOf(':');
    const nome = due < 0 ? '' : valore.slice(0, due);
    const filtro = due < 0 ? '' : valore.slice(due + 1);
    const presente = contenutiCon(html, 'data-filtri', nome).some((contenuto) =>
      valoriAttributo(contenuto, 'data-filtro').includes(filtro),
    );
    if (!presente) {
      problemi.add(
        `data-filtro-scegli="${valore}" senza [data-filtri="${nome}"] con data-filtro="${filtro}"`,
      );
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
 * Il contenuto (fino al tag di chiusura corrispondente) di ogni elemento di
 * `html` con `attributo="valore"`.
 */
function contenutiCon(html: string, attributo: string, valore: string): string[] {
  const contenuti: string[] = [];
  for (const apertura of html.matchAll(/<([a-z][a-z0-9-]*)\b[^>]*>/gi)) {
    const trovato = new RegExp(`\\s${attributo}=["']?([^"'\\s>]*)`, 'i').exec(apertura[0])?.[1];
    if (trovato !== valore) continue;
    const tag = apertura[1]!;
    const inizio = apertura.index + apertura[0].length;
    const tagStesso = new RegExp(`<(/?)${tag}\\b[^>]*>`, 'gi');
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
    contenuti.push(html.slice(inizio, fine));
  }
  return contenuti;
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
    // un link che sceglie un filtro vuole il contenitore e, dentro, quel filtro
    '<a href="#s" data-filtro-scegli="selezione:letto">Letto</a>',
    '<a href="#s" data-filtro-scegli="selezione:letto"></a>' +
      '<div data-filtri="selezione"><button data-filtro="bagno">Bagno</button></div>',
    '<a href="#s" data-filtro-scegli="altri:letto"></a>' +
      '<div data-filtri="selezione"><button data-filtro="letto">Letto</button></div>',
    '<a href="#s" data-filtro-scegli="selezione:letto"></a><div data-filtri="selezione"></div>' +
      '<button data-filtro="letto">Letto</button>',
    '<a href="#s" data-filtro-scegli="letto"></a>' +
      '<div data-filtri="letto"><button data-filtro="letto">Letto</button></div>',
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
    // il filtro scelto dal link sta dentro il suo contenitore, anche dopo altri elementi
    '<a href="#s" data-filtro-scegli="selezione:letto">Letto</a>' +
      '<div data-filtri="selezione"><button data-filtro="tutti">Tutto</button>' +
      '<div><span>x</span></div><button class="f" data-filtro=letto>Letto</button></div>',
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
      for (const [tag] of html().matchAll(/<img\b[^>]*>/gi)) {
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
      ...testo.matchAll(new RegExp(`<${nome}\\b[^>]*\\s${attributo}(?=[\\s=>])[^>]*>`, 'gi')),
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

  it('le sezioni si susseguono: collezioni, selezione, diario, negozio', () => {
    const posizioni = ['collezioni', 'selezione', 'diario', 'negozio'].map((id) =>
      html().indexOf(`id="${id}"`),
    );
    for (const p of posizioni) expect(p).toBeGreaterThanOrEqual(0);
    expect([...posizioni].sort((a, b) => a - b)).toEqual(posizioni);
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
    expect(diario).toContain('l’ultimo il 28 ottobre');
    expect(decodifica(html())).not.toMatch(/ogni settimana/i);
  });

  it('"del" davanti alle date dell’8 e dell’11 è elisio in tutta la pagina', () => {
    const pagina = decodifica(html());
    expect(pagina).not.toContain('del 8 ');
    expect(pagina).not.toContain('del 11 ');
    // Il pulsante del post e il suo dialog dicono "dell’8 luglio" (p6, p7) e "dell’11 ottobre" (p3).
    expect(pagina).toContain('Apri il post dell’8 luglio, Arrivi');
    expect(pagina).toContain('Post dell’11 ottobre, In vetrina');
  });

  it('la pagina parla come Alma Living: niente "Martina", niente carattere a mano', () => {
    expect(decodifica(html())).not.toMatch(/martina/i);
    expect(html()).not.toMatch(/beth[- ]ellen/i);
  });

  it('il diario è "del negozio", con il testo al plurale', () => {
    const apertura = /<section\b[^>]*\sid="diario"[^>]*>/.exec(html())?.[0] ?? '';
    expect(valore(apertura, 'aria-label')).toBe('Dal negozio, il diario');
    const diario = normalizza(contenutiCon(html(), 'id', 'diario')[0] ?? '');
    expect(diario).toContain('>Il diario del negozio<');
    expect(diario).toContain(
      'Fotografiamo quello che succede in Via Ricasoli: gli arrivi, la vetrina che cambia, le confezioni preparate al banco. Tocca una foto per aprirla.',
    );
  });

  it('accanto alle storie, "Le storie del negozio"', () => {
    // Astro aggiunge gli attributi `data-astro-cid-…`: il tag si cerca con un'espressione.
    expect(normalizza(html())).toMatch(
      /<span\b[^>]*>Le storie del negozio<\/span>Arrivi, vetrina e novità, per categoria/,
    );
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
    expect(contenuto).toContain('@almaliving.viaricasoli');
    expect(contenuto).toContain('Le foto di ogni giorno sono anche lì.');
    expect(contenuto).toContain('aria-label="Apri Instagram: @almaliving.viaricasoli"');
    expect(contenuto).not.toMatch(/<(?:img|picture)\b/);
    // Per i lettori di schermo: tolto ciò che è `aria-hidden` (il puntino) e i tag,
    // nome e frase restano separati da uno spazio vero, non da quello del separatore.
    const riga = /<p\b[^>]*>([\s\S]*?)<\/p>/.exec(contenuto)?.[1] ?? '';
    const letto = riga
      .replace(/<span\b[^>]*\saria-hidden="true"[^>]*>[\s\S]*?<\/span>/g, '')
      .replace(/<[^>]*>/g, '');
    expect(letto).toMatch(/@almaliving\.viaricasoli\s+Le foto/);
  });

  it('accanto alla fila delle storie "Vedi i post" porta al diario', () => {
    expect(html()).toMatch(/<a\b[^>]*\shref="#diario"[^>]*>Vedi i post/);
    expect(html()).not.toContain('Vedi il profilo');
  });

  it('storie e post propongono di chiamare il negozio, non Instagram', () => {
    const testo = (s: string) => s.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    expect(decodifica(html())).not.toContain('Vedi su Instagram');
    const chiama = [...html().matchAll(/<a\b[^>]*\shref="tel:\+393345205451"[^>]*>([\s\S]*?)<\/a>/g)]
      .map((m) => testo(m[1]!))
      .filter((t) => t === 'Chiama il negozio');
    expect(chiama).toHaveLength(storie.length + post.length);
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
    expect(scaffale).toContain('In negozio c’è molto di più di quello che vedi qui.');
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

  it("la griglia non riordina nulla a vista: la finestra resta in fondo, come nel DOM", () => {
    const css = cssDellaPagina();
    expect(css).not.toMatch(
      /\.voce(?:-finestra|-mostra)?\[[^\]]*\](?::nth-child\([^)]*\))?[^{}]*\{[^}]*\border:/,
    );
    expect(css).not.toContain(' of [data-filtrabile]');
  });

  it('i riquadri delle collezioni e le pillole scelgono il loro filtro e portano alla selezione', () => {
    const link = tagCon('a', 'data-filtro-scegli');
    expect(link.map((t) => valore(t, 'data-filtro-scegli'))).toEqual(
      [...collezioni, ...altreCollezioni].map((c) => `selezione:${c.id}`),
    );
    for (const tag of link) expect(valore(tag, 'href')).toBe('#selezione');
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
    for (const ancora of ['#collezioni', '#diario', '#selezione', '#negozio']) {
      expect(piede, ancora).toContain(`href="${ancora}"`);
    }
  });

  /** I tag `<img>` delle diapositive dell'apertura, nell'ordine. */
  const fotoApertura = () =>
    [
      ...(contenutiCon(html(), 'id', 'apertura')[0] ?? '').matchAll(
        /<li\b[^>]*\sdata-galleria-foto\b[^>]*>([\s\S]*?)<\/li>/gi,
      ),
    ].map((m) => /<img\b[^>]*>/i.exec(m[1]!)?.[0] ?? '');

  it("l'apertura è una galleria che si trascina: un'area sola, che contiene le foto", () => {
    const sezione = /<section\b[^>]*\sid="apertura"[^>]*>/.exec(html())?.[0] ?? '';
    expect(sezione).toMatch(/\sdata-galleria(?=[\s=>])/);
    const dentro = contenutiCon(html(), 'id', 'apertura')[0] ?? '';
    expect(dentro.match(/\sdata-galleria-trascina(?=[\s=>])/g) ?? []).toHaveLength(1);
    const area = dentro.search(/\sdata-galleria-trascina(?=[\s=>])/);
    expect(area).toBeLessThan(dentro.search(/\sdata-galleria-foto(?=[\s=>])/));
  });

  it("solo la prima foto d'apertura si carica subito e con priorità alta", () => {
    const immagini = [...html().matchAll(/<img\b[^>]*>/gi)].map((m) => m[0]);
    const prioritarie = immagini.filter((t) => /\sfetchpriority="high"/.test(t));
    expect(prioritarie).toHaveLength(1);
    expect(prioritarie[0]).toMatch(/\sloading="eager"/);
    expect(prioritarie[0]).toBe(fotoApertura()[0]);
    // Delle altre immagini, si caricano subito solo i loghi in alto e le altre
    // foto dell'apertura.
    const altreApertura = fotoApertura().slice(1);
    const subito = immagini.filter(
      (t) => !/\sloading="lazy"/.test(t) && !/\sfetchpriority=/.test(t),
    );
    for (const tag of subito) {
      if (!altreApertura.includes(tag)) expect(tag).toMatch(/\salt="Alma Living"/);
    }
  });

  it("le altre foto d'apertura si caricano subito, senza priorità: al primo cambio sono già pronte", () => {
    const foto = fotoApertura();
    expect(foto).toHaveLength(apertura.length);
    for (const tag of foto.slice(1)) {
      expect(tag).toMatch(/\sloading="eager"/);
      expect(tag).not.toMatch(/\sfetchpriority=/);
    }
  });
});

