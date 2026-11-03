# Messa in produzione di Salvia social: piano

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Salvia social diventa la home del sito, con prodotti, post e storie modificabili dal pannello e le foto su Cloudflare R2.

**Architecture:** Il codice della prova passa da `src/prova/` a `src/sito/` e la pagina da `/prova/salvia-social/` a `/`. Prodotti, post e storie diventano tre content collection JSON (schemi Zod, pannello Sveltia, `autonomia.yml`), lette da funzioni pure che producono gli stessi tipi di oggi (`Articolo`, `Post`, `Storia`), così i componenti cambiano poco. Ogni foto, fissa o del pannello, è un indirizzo assoluto su `https://foto.almalivingviaricasoli.it/` che Astro scarica e ottimizza alla build (immagini remote autorizzate): niente più foto locali.

**Tech Stack:** Astro 7.4 (statico), Zod (`astro/zod`), Sveltia CMS 0.248.0 (`media_libraries.cloudflare_r2`), Vitest, Cloudflare Workers Builds e R2.

**Spec:** `docs/superpowers/specs/2026-11-03-messa-in-produzione-design.md` (approvato da eusebjo il 2026-11-03). Il design di partenza è la punta di `fase2/1-varianti` con questo piano (il codice è quello di `808249c`): "uguale all'anteprima" vuol dire uguale a quella.

## Global Constraints

- Lavoro sul ramo `fase2/2-produzione`, staccato dalla punta di `fase2/1-varianti` (il commit di questo piano). Nessun push e nessuna pull request senza l'ok esplicito di eusebjo in chat.
- Prima di ogni commit: `npm test`, `npm run build`, `npm run test:dist` verdi e senza avvisi nuovi (l'avviso noto di Vite sulla dimensione dei chunk resta).
- Commit in inglese (`feat:`, `fix:`, `chore:`, `docs:`, `test:`), ogni messaggio chiuso da una riga vuota e `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Codice, commenti e documentazione in italiano; testi del pannello in italiano senza gergo di Git ("branch", "commit", "merge").
- Nessuna foto nel repository. Ogni foto di contenuto è un indirizzo che comincia con `https://foto.almalivingviaricasoli.it/prova/` o `https://foto.almalivingviaricasoli.it/cms/`.
- Nessun segreto nel repository: in `config.yml` solo Access Key ID e Account ID di R2 (pubblici); la chiave segreta non compare mai, nemmeno come nome di campo.
- Sveltia resta `0.248.0` esatta, `publish_mode: editorial_workflow`, `publish: false` su ogni collection, trasformazioni `{ format: webp, quality: 85, width: 2400, height: 2400 }`.
- Lo schema Zod è l'autorità; i limiti numerici stanno solo in `src/content/limits.ts`; ogni campo dello schema è nel pannello e in `autonomia.yml`.
- A pagina aperta nessuna richiesta a terzi: le foto si servono da `/_astro/`, i caratteri da `/_astro/fonts`.
- Negli script npm niente `VAR=x comando`.
- La pagina deve restare uguale all'anteprima di `808249c` in testi, struttura, comportamenti e stili; uniche differenze ammesse: inquadrature dei contenuti migrati arrotondate alla posizione più vicina e ingrandimenti dei prodotti senza seconda foto centrati (spec §3).

## Review Focus

1. Una foto caricata dal pannello senza testo alternativo: lo schema la respinge con un messaggio italiano (test nel Task 3).
2. Un prodotto con la foto solo per alcuni colori: respinto con "Metti la foto a tutti i colori o a nessuno." (Task 3).
3. Un indirizzo di foto incollato da un altro dominio (anche il vecchio `r2.dev`): respinto (Task 3).
4. Una categoria svuotata da Martina: il suo filtro sparisce, Mare tiene la sua finestra (Task 5).
5. Un post senza "Di cosa parla": il messaggio WhatsApp dice solo la data (Task 5); due post con la stessa data hanno un ordine stabile (Task 5).

---

## Prima di cominciare (eusebjo, dal dashboard Cloudflare)

I Task 2 e seguenti hanno bisogno dell'indirizzo delle foto; il Task 7 anche delle chiavi pubbliche. Claude non vede né chiede segreti.

- [ ] Collegare al bucket `alma-living-prova` il dominio personalizzato `foto.almalivingviaricasoli.it` (R2 > bucket > Settings > Custom Domains).
- [ ] Impostare il CORS del bucket con il testo del Task 7, Step 1 (lo prepara Claude).
- [ ] Creare un token R2 "Object Read & Write" limitato al bucket `alma-living-prova`; scrivere a Claude solo **Access Key ID** e **Account ID**; dare la chiave segreta a Martina di persona.
- [ ] Verifica (Claude): `curl -sI https://foto.almalivingviaricasoli.it/prova/scaffale.jpg` risponde `200` con `content-type: image/jpeg`.

---

### Task 1: Ramo di produzione e cartella `src/sito/`

**Files:**
- Rename: `src/prova/` → `src/sito/`; `src/sito/salvia-social/` → `src/sito/componenti/`; `tests/prova/` → `tests/sito/`
- Modify: ogni import che contiene `prova/salvia-social` o `prova/comune` (pagine, componenti, `tests/`), `CLAUDE.md` ("Struttura")

**Interfaces:**
- Produces: i percorsi `src/sito/comune/*` e `src/sito/componenti/*` usati da tutti i task successivi. Gli import tra le due cartelle (`../comune/...`) restano validi perché restano sorelle.

- [ ] **Step 1:** `git switch -c fase2/2-produzione` dalla punta di `fase2/1-varianti`, poi `git fetch` e `git merge origin/main` (2 commit: documentazione del dominio). Nei conflitti di `CLAUDE.md` e `docs/onboarding-redazione.md` tenere entrambe le parti (sezioni del dominio da `main`, sezioni della prova dal ramo).
- [ ] **Step 2:** `git mv` delle tre cartelle; aggiornare gli import con la ricerca di `prova/salvia-social` → `sito/componenti` e `prova/comune` → `sito/comune`. La pagina `src/pages/prova/salvia-social/index.astro` resta dov'è per ora (la sposta il Task 6). `.gitignore` riga `/src/prova/foto/` → `/src/sito/foto/`.
- [ ] **Step 3:** `npm test`, `npm run build`, `npm run test:dist`: tutti verdi, nessun test cambiato se non nei percorsi d'import.
- [ ] **Step 4:** Commit `chore: move the trial code to src/sito before production`.

### Task 2: Foto remote su `foto.almalivingviaricasoli.it`

**Files:**
- Create: `src/content/foto.ts`
- Modify: `astro.config.mjs`, `src/sito/componenti/Foto.astro`, `src/sito/componenti/dati.ts` (tipo `Scatto`, funzione `scatto`), `package.json` (`dev`, `build`, `foto:carica`), `.gitignore`, `tests/sito/salvia-social-dati.test.ts`, `tests/astro-config.test.ts`
- Delete: `src/sito/comune/foto.ts`, `scripts/foto-prova/`, `tests/foto-prova.test.ts`
- Test: `tests/foto.test.ts`, `tests/dist/dist.test.ts`

**Interfaces:**
- Produces in `src/content/foto.ts`:
  - `export const FOTO_BASE = 'https://foto.almalivingviaricasoli.it';`
  - `export const CARTELLE_FOTO = ['prova', 'cms'] as const;`
  - `export function indirizzoFoto(cartella: (typeof CARTELLE_FOTO)[number], nome: string): string` → `${FOTO_BASE}/${cartella}/${nome}`
  - `export function eIndirizzoFoto(valore: string): boolean`: vero solo per `https:` su quell'host, percorso `/<cartella>/<nome>` con una cartella di `CARTELLE_FOTO`, senza `..`, query o frammento.
- Produces in `dati.ts`: `interface Scatto { src: string; alt: string; posizione: string }` (prima: `foto: NomeFoto`). `NomeFoto` e `ALT` restano per le foto fisse; `scatto(nome, posizione)` scrive `src: indirizzoFoto('prova', `${nome}.jpg`)`.

- [ ] **Step 1: Test** `tests/foto.test.ts`:

```ts
expect(indirizzoFoto('prova', 'scaffale.jpg')).toBe('https://foto.almalivingviaricasoli.it/prova/scaffale.jpg');
expect(eIndirizzoFoto('https://foto.almalivingviaricasoli.it/cms/plaid.webp')).toBe(true);
expect(astroConfig.image?.remotePatterns).toEqual([{ protocol: 'https', hostname: 'foto.almalivingviaricasoli.it' }]); // in tests/astro-config.test.ts
for (const no of [
  'http://foto.almalivingviaricasoli.it/cms/a.webp',
  'https://pub-02e2834056a84517a87c5431c6904c14.r2.dev/prova/a.jpg',
  'https://foto.almalivingviaricasoli.it/altro/a.webp',
  'https://foto.almalivingviaricasoli.it/cms/../prova/a.jpg',
  'https://foto.almalivingviaricasoli.it/cms/a.webp?x=1',
  '/cms/a.webp',
]) expect(eIndirizzoFoto(no), no).toBe(false);
```

- [ ] **Step 2:** `npx vitest run tests/foto.test.ts` fallisce (modulo mancante).
- [ ] **Step 3:** Scrivere `src/content/foto.ts`. In `astro.config.mjs` aggiungere `image: { remotePatterns: [{ protocol: 'https', hostname: 'foto.almalivingviaricasoli.it' }] }`. `Foto.astro` passa a `<Picture src={scatto.src} inferSize …>` con le stesse altre prop di oggi. Togliere `prepara.mjs` da `dev` e `build`, lo script `foto:carica`, la cartella `scripts/foto-prova/`, `src/sito/comune/foto.ts` e la riga di `.gitignore` di `src/sito/foto/`.
- [ ] **Step 4:** Aggiornare i test che leggevano `elenco.json` o `scatto.foto`: `salvia-social-dati.test.ts` controlla che ogni `scatto.src` superi `eIndirizzoFoto` e cominci con `${FOTO_BASE}/prova/`. In `tests/dist/dist.test.ts` resta il controllo che ogni `<img>` abbia `src` sotto `/_astro/` e nessuna risorsa esterna.
- [ ] **Step 5:** `npm test`, `npm run build` (scarica le 45 foto dal dominio), `npm run test:dist`: verdi.
- [ ] **Step 6:** Commit `feat: serve every photo from foto.almalivingviaricasoli.it through Astro`.

### Task 3: Schemi di prodotti, post e storie

**Files:**
- Create: `src/content/categorie.ts`
- Modify: `src/content/limits.ts`, `src/content/schemas.ts`, `src/content/foto.ts`
- Test: `tests/schemas.test.ts`

**Interfaces:**
- Consumes: `eIndirizzoFoto` (Task 2).
- Produces in `src/content/categorie.ts`: `export const CATEGORIE = [{ id: 'letto', nome: 'Letto' }, { id: 'bagno', nome: 'Bagno' }, { id: 'bimbi', nome: 'Bimbi' }, { id: 'tavola', nome: 'Tavola e cucina' }, { id: 'profumi', nome: 'Profumi per la casa' }, { id: 'natale', nome: 'Natale e regali' }, { id: 'mare', nome: 'Mare' }] as const;` e `export type Categoria = (typeof CATEGORIE)[number]['id'];`. `dati.ts` smette di definirli: li importa da qui e riesporta l'elenco come `categorie` e il tipo `Categoria`, così i consumatori di oggi non cambiano.
- Produces in `src/content/foto.ts`: `export const INQUADRATURE = { alto: '50% 20%', 'centro-alto': '50% 35%', centro: '50% 50%', 'centro-basso': '50% 65%', basso: '50% 80%' } as const;`, `export type Inquadratura = keyof typeof INQUADRATURE;`, `export function inquadraturaVicina(posizione: string): Inquadratura` (la percentuale verticale più vicina; senza percentuale leggibile, `centro`).
- Produces in `src/content/limits.ts` (nuove chiavi di `LIMITI`): `foto: { alt: { min: 5, max: 150 } }`, `prodotto: { nome: { max: 60 }, dettaglio: { max: 90 }, colori: { max: 6 }, colore: { max: 30 } }`, `post: { testo: { max: 1000 }, foto: { max: 10 }, soggetto: { max: 60 } }`, `storia: { frase: { max: 200 }, soggetto: { max: 60 }, foto: { max: 10 } }`.
- Produces in `src/content/schemas.ts`: `fotoSchema` (`{ src, alt, inquadratura }`, `inquadratura` con default `'centro'`), `prodottoSchema`, `postSchema`, `storiaSchema` e i tipi `Prodotto`, `PostContenuto`, `StoriaContenuto` (`z.infer`). Campi, come nello spec §5:
  - `prodottoSchema`: `nome`, `dettaglio`, `categorie` (array non vuoto, senza doppioni, di id di `CATEGORIE`), `novita` (boolean, default `false`), `data` (`AAAA-MM-GG`, data vera), `foto`, `secondaFoto?`, `colori?` (array di `{ nome, tinta: /^#[0-9a-f]{6}$/i, foto? }`).
  - `postSchema`: `data`, `testo`, `foto` (1..`LIMITI.post.foto.max`), `soggetto?`.
  - `storiaSchema`: `nome`, `data`, `etichetta?` (`'Oggi' | 'Nuovo'`), `invito` (`'whatsapp' | 'chiama' | 'indicazioni'`), `foto` (1..max, ognuna `fotoSchema` più `frase` e `soggetto`).

- [ ] **Step 1: Test** in `tests/schemas.test.ts` (messaggi esatti, stile di `negozioSchema`):

```ts
// foto
expect(errore(fotoSchema, { src: URL_OK, alt: '' })).toBe('Il testo alternativo deve avere almeno 5 caratteri.');
expect(errore(fotoSchema, { src: 'https://pub-x.r2.dev/prova/a.jpg', alt: 'Plaid verde' })).toBe('La foto va caricata dal pannello.');
expect(fotoSchema.parse({ src: URL_OK, alt: 'Plaid verde' }).inquadratura).toBe('centro');
// prodotto
expect(errore(prodottoSchema, { ...PRODOTTO, colori: [{ nome: 'verde', tinta: '#3f5a43', foto: FOTO }, { nome: 'rosso', tinta: '#a33', }] }))
  .toBe('Metti la foto a tutti i colori o a nessuno.');
expect(errore(prodottoSchema, { ...PRODOTTO, categorie: [] })).toBe('Scegli almeno una categoria.');
expect(errore(prodottoSchema, { ...PRODOTTO, data: '2026-02-30' })).toBe('La data non è valida.');
// post e storie
expect(errore(postSchema, { ...POST, foto: [] })).toBe('Il post deve avere almeno una foto.');
expect(errore(storiaSchema, { ...STORIA, foto: [] })).toBe('La storia deve avere almeno una foto.');
expect(inquadraturaVicina('50% 58%')).toBe('centro');
expect(inquadraturaVicina('40% 68%')).toBe('centro-basso');
expect(inquadraturaVicina('50% 24%')).toBe('alto');
```

(`errore(schema, valore)` restituisce il primo messaggio di `safeParse`; `URL_OK`, `FOTO`, `PRODOTTO`, `POST`, `STORIA` sono valori validi definiti nel test.)

- [ ] **Step 2:** `npx vitest run tests/schemas.test.ts` fallisce.
- [ ] **Step 3:** Scrivere categorie, limiti, `INQUADRATURE` e schemi. Il controllo dell'indirizzo usa `eIndirizzoFoto` in un `.refine` con il messaggio "La foto va caricata dal pannello.". La regola "tutti o nessuno" è un `.refine` su `colori` con `path: ['colori']`.
- [ ] **Step 4:** `npm test` verde.
- [ ] **Step 5:** Commit `feat: content schemas for products, posts and stories`.

### Task 4: Collection e migrazione dei contenuti di oggi

**Files:**
- Modify: `src/content.config.ts`, `src/content/negozio/negozio.json` (orari)
- Create: `src/content/prodotti/*.json` (8), `src/content/post/*.json` (13), `src/content/storie/*.json` (8)
- Test: `tests/contenuti.test.ts`

**Interfaces:**
- Consumes: schemi e `inquadraturaVicina` (Task 3), `indirizzoFoto` (Task 2).
- Produces: collection `prodotti`, `post`, `storie` (loader `glob({ pattern: '*.json', base: './src/content/<nome>' })`). Nomi dei file = id di oggi: prodotti `sabbia`, `abbracciami`, `orsetto`, `volant`, `casetta`, `tovaglia`, `coperta`, `saponi`; post `p1`…`p13`; storie `oggi`, `arrivi`, `vetrina`, `casette`, `candele`, `bimbi`, `tavola`, `lenzuola`.

- [ ] **Step 1: Test** `tests/contenuti.test.ts` legge le cartelle con `readdirSync` e `JSON.parse`, valida ogni file con il suo schema e verifica:

```ts
expect(prodotti).toHaveLength(8); expect(post).toHaveLength(13); expect(storie).toHaveLength(8);
expect(leggi('post', 'p1').data).toBe('2026-10-28'); expect(leggi('post', 'p13').data).toBe('2026-04-30');
expect(leggi('storie', 'oggi').foto[0].frase).toBe('La parete dei plaid è pronta: bianchi, rosa e grigi, con i cuscini in pelo.');
// stesso ordine di oggi: date dei prodotti decrescenti nell'ordine sabbia … saponi
expect(ordinePerData(prodotti)).toEqual(['sabbia', 'abbracciami', 'orsetto', 'volant', 'casetta', 'tovaglia', 'coperta', 'saponi']);
expect(negozio.orari).toEqual(ORARI_VERI); // lun-sab 09:30-13:00 e 16:00-19:30
```

- [ ] **Step 2:** Il test fallisce (cartelle vuote).
- [ ] **Step 3:** Generare i file con uno script temporaneo (`npx tsx`, fuori dal repository) che importa `articoli`, `post`, `storie` dal `dati.ts` del Task 2 e scrive JSON formattato con 2 spazi:
  - testi, colori, categorie, novità, soggetti, inviti, etichette come oggi;
  - `src` già nella forma di Task 2; `inquadratura = inquadraturaVicina(posizione)`;
  - per i prodotti con il secondo scatto `ingrandimento` niente `secondaFoto`;
  - date: anno 2026 (`'28 ottobre'` → `2026-10-28`); prodotti con date in ordine, dal `2026-10-28` scendendo di un giorno;
  - `soggetto` del post = `chiedi` di oggi.

  Lo script non si committa. In `negozio.json` gli orari diventano lunedì-sabato `09:30-13:00` e `16:00-19:30`. Aggiungere le tre collection a `content.config.ts`.
- [ ] **Step 4:** `npm test` e `npm run build` verdi (la pagina non usa ancora le collection).
- [ ] **Step 5:** Commit `feat: products, posts and stories as content collections`.

### Task 5: La pagina legge le collection

**Files:**
- Create: `src/sito/contenuti.ts`
- Modify: `src/sito/componenti/dati.ts` (via `articoli`, `post`, `storie`; restano `categorie` riesportate dal Task 3, foto fisse, `vetrina`, `fotoDeiFiltri`, `fotoFinestra`, `fotoDelNegozio`, `sezioni`, `messaggi`, `LIMITI_SELEZIONE`, `POST_VISIBILI`, `SCALA_DETTAGLIO` e le funzioni di testo), `Selezione.astro`, `Diario.astro`, `FilaStorie.astro`, `src/pages/prova/salvia-social/index.astro`, `src/sito/comune/negozio.ts` (`orari` da `negozio.json`)
- Test: `tests/sito/contenuti.test.ts`, `tests/sito/salvia-social-dati.test.ts`, `tests/sito/negozio.test.ts`, `tests/dist/dist.test.ts`

**Interfaces:**
- Consumes: tipi e schemi del Task 3, collection del Task 4.
- Produces in `src/sito/contenuti.ts` (funzioni pure, senza `astro:content`):
  - `export function dataBreve(iso: string): string` → `'2026-10-28'` → `'28 ottobre'`, `'2026-07-08'` → `'8 luglio'`
  - ogni foto di contenuto diventa uno `Scatto` con `posizione: INQUADRATURE[foto.inquadratura]`
  - `export function articoloDa(id: string, p: Prodotto): Articolo`; senza `secondaFoto` il secondo scatto è la prima foto con `alt: 'Dettaglio di ' + p.nome` e `ingrandimento: { scala: SCALA_DETTAGLIO, origine: '50% 50%' }`
  - `export function postDa(id: string, p: PostContenuto): Post` (`data` con `dataBreve`, `chiedi` = `soggetto` o assente)
  - `export function storiaDa(id: string, s: StoriaContenuto): Storia`
  - `export function ordinaArticoli(voci: { id: string; data: string }[]): …` per data decrescente, poi `id` crescente; lo stesso per `ordinaPost`
  - `export const ORDINE_STORIE = ['oggi', 'arrivi', 'vetrina', 'casette', 'candele', 'bimbi', 'tavola', 'lenzuola'] as const;`
  - `export function categorieVisibili(articoli: Articolo[]): typeof CATEGORIE[number][]`: le categorie con almeno un articolo, più `mare` sempre, nell'ordine di `CATEGORIE`
- Produces in `dati.ts`: `Post.chiedi?: string`; `messaggioPost(voce)` senza `chiedi` dà `Buongiorno, ho visto sul sito il vostro post del 28 ottobre. Mi date qualche informazione in più?`.
- Produces nei componenti: `Selezione` riceve `articoli: Articolo[]`, `Diario` riceve `post: Post[]`, `FilaStorie` riceve `storie: Storia[]` come prop; la pagina li carica con `getCollection` e le funzioni sopra.

- [ ] **Step 1: Test** `tests/sito/contenuti.test.ts`:

```ts
expect(dataBreve('2026-07-08')).toBe('8 luglio');
expect(messaggioPost(postDa('p9', { ...POST, data: '2026-10-28', soggetto: undefined })))
  .toBe('Buongiorno, ho visto sul sito il vostro post del 28 ottobre. Mi date qualche informazione in più?');
expect(ordinaPost([{ id: 'b', data: '2026-10-01' }, { id: 'a', data: '2026-10-01' }]).map((p) => p.id)).toEqual(['a', 'b']);
expect(articoloDa('x', { ...PRODOTTO, secondaFoto: undefined }).scatti[1])
  .toMatchObject({ alt: 'Dettaglio di ' + PRODOTTO.nome, ingrandimento: { origine: '50% 50%' } });
expect(categorieVisibili([articoloLetto]).map((c) => c.id)).toEqual(['letto', 'mare']);
```

- [ ] **Step 2:** I test falliscono.
- [ ] **Step 3:** Scrivere `contenuti.ts`, togliere da `dati.ts` le liste migrate, passare i dati per prop, filtri da `categorieVisibili`. `datiNegozio` usa `negozio.orari` invece di `ORARI_PROVA`; `ORARI_PROVA` resta solo dove serve ai test di `orari.ts`.
- [ ] **Step 4:** `tests/dist/dist.test.ts` smette di importare `articoli`, `post`, `storie` da `dati.ts`: un helper del test legge i JSON delle collection e li passa a `articoloDa`, `postDa`, `storiaDa` e agli ordinamenti, così le asserzioni di oggi restano uguali. Le attese che cambiano per le scelte dello spec (inquadrature, ingrandimenti centrati, alt "Dettaglio di …") si aggiornano; nessun'altra.
- [ ] **Step 5:** Tutti i controlli verdi. Prima di cominciare il task si salva una copia di `dist/prova/salvia-social/index.html` (build del Task 4); alla fine si confrontano i testi visibili delle due pagine (tag tolti, `diff`): uguali, tranne gli `alt` "Dettaglio di …".
- [ ] **Step 6:** Commit `feat: the page reads products, posts and stories from the collections`.

### Task 6: Salvia social su `/`, via la prova e la home segnaposto

**Files:**
- Create: `src/sito/comune/LayoutSito.astro` (da `LayoutProva.astro`, senza `noindex` forzato e senza `VarianteId`)
- Move: `src/pages/prova/salvia-social/index.astro` → `src/pages/index.astro`
- Delete: `src/pages/prova/`, `src/sito/varianti.ts`, `src/sito/comune/LayoutProva.astro`, `src/layouts/BaseLayout.astro`, `src/content/pagine/`, `makePaginaSchema`, la collection `pagine` da `content.config.ts`
- Modify: `src/sito/comune/caratteri.ts` (un solo elenco `CARATTERI_SITO`), `src/pages/llms.txt.ts`, `src/lib/sitemap.ts` (resta l'esclusione di `admin`), `tests/dist/dist.test.ts`, `tests/astro-config.test.ts`, `tests/llms.test.ts`, `tests/sitemap.test.ts`, `tests/schemas.test.ts`

**Interfaces:**
- Consumes: la pagina del Task 5.
- Produces: `LayoutSito` con props `{ title: string; description: string }`; `<body data-variante="salvia-social">` resta (lo usa `tema.css`).

- [ ] **Step 1: Test** in `tests/dist/dist.test.ts`: il `describe` di Salvia social legge `dist/index.html`; nuovi casi:

```ts
expect(existsSync(join('dist', 'prova'))).toBe(false);
expect(titolo(html())).toBe('Alma Living, biancheria per la casa a Livorno');
expect(metaDescrizione(html())).toBe(negozio.descrizione); // da negozio.json
expect(html()).toContain('<meta name="robots" content="noindex, nofollow"'); // build locale
expect(html()).not.toContain('Questo è un testo segnaposto');
```

La build di lancio (niente `noindex`, JSON-LD `HomeGoodsStore`) non ha test automatici: `npm run test:dist` controlla solo la build locale (`CLAUDE.md`), quindi si verifica a mano nello Step 4.
- [ ] **Step 2:** Fallisce.
- [ ] **Step 3:** Spostare la pagina, usare `LayoutSito` con il titolo sopra e `negozio.descrizione`, cancellare la prova, `BaseLayout`, `pagine`. `llms.txt.ts` passa a `llmsTxt` una sola pagina: `{ titolo: 'Alma Living, biancheria per la casa a Livorno', descrizione: negozio.descrizione, url: absoluteUrl(siteUrl, '/') }`.
- [ ] **Step 4:** Controlli verdi; verifica a mano della build di lancio come in `CLAUDE.md` ("Verifica a mano della build di lancio"): `dist/index.html` con JSON-LD e senza `noindex`, `sitemap-index.xml` presente.
- [ ] **Step 5:** Commit `feat: Salvia social is the home page; trial pages and placeholder removed`.

### Task 7: Pannello, regole e controllo delle proposte

**Files:**
- Modify: `public/admin/config.yml`, `autonomia.yml`, `scripts/autonomia/schemi.ts`
- Test: `tests/sveltia-config.test.ts`, `tests/autonomia/rules.test.ts`, `tests/autonomia/schemi.test.ts`, `tests/autonomia/evaluate.test.ts`, `tests/autonomia/forma-sveltia.test.ts`, `tests/autonomia/fixtures.ts` e gli altri test che citano `src/content/pagine/`

**Interfaces:**
- Consumes: schemi e limiti (Task 3), `INQUADRATURE`, `CATEGORIE`, `FOTO_BASE`.
- Produces: collection del pannello `negozio` (com'è), `prodotti`, `post` (cartella, `extension: json`, `format: json`, `create: true`, `delete: true`), `storie` (`files:` con gli otto file di `ORDINE_STORIE`, `nome` `readonly`); `media_libraries.cloudflare_r2 = { access_key_id: <da eusebjo>, account_id: <da eusebjo>, bucket: 'alma-living-prova', public_url: FOTO_BASE, prefix: 'cms/' }`; nessun `media_folder`.

- [ ] **Step 1: Testo del CORS** per eusebjo (in `CLAUDE.md`, sezione nuova "Foto del sito"):

```json
[{ "AllowedOrigins": ["https://almalivingviaricasoli.it", "https://alma-living.sebjomuho.workers.dev"],
   "AllowedMethods": ["GET", "PUT", "DELETE", "HEAD"], "AllowedHeaders": ["*"],
   "ExposeHeaders": ["ETag"], "MaxAgeSeconds": 3000 }]
```

- [ ] **Step 2: Test** (aggiornare quelli di oggi, aggiungere):
  - `tests/sveltia-config.test.ts`:
    - nomi delle collection `['negozio', 'prodotti', 'post', 'storie']`;
    - `create`/`delete` delle collection a cartella uguali a `azioni.crea >= 1` / `azioni.elimina >= 1` di `autonomia.yml`;
    - campi, `readonly` e limiti allineati a `autonomia.yml` e `LIMITI` come oggi;
    - opzioni di categorie e inquadrature uguali a `CATEGORIE` e `INQUADRATURE`;
    - `cloudflare_r2` con `bucket`, `public_url === FOTO_BASE`, `prefix === 'cms/'`, nessuna chiave che contenga `secret`;
    - nessun `media_folder`;
    - i campi immagine con `choose_url: false`;
    - lo schema JSON di Sveltia valida la configurazione.
  - `tests/autonomia/rules.test.ts`: chiavi di `contenuti` `['negozio', 'prodotti', 'post', 'storie']`, `media.azioni = { carica: 0, elimina: 0 }`.
  - `tests/autonomia/evaluate.test.ts` e `schemi.test.ts`:
    - la redazione crea `src/content/post/nuovo.json` valido → livello 1;
    - crea `src/content/storie/nuova.json` → violazione "Non puoi creare nuovi contenuti.";
    - un post con foto da `pub-….r2.dev` → violazione con "La foto va caricata dal pannello.";
    - un file sotto `src/content/pagine/` → `perimetro`.
  - `tests/autonomia/forma-sveltia.test.ts`: un prodotto e un post scritti come li scrive Sveltia (JSON con `inquadratura` e `secondaFoto` assente) passano lo schema.
- [ ] **Step 3:** I test falliscono.
- [ ] **Step 4:** Scrivere `config.yml` (etichette italiane: "Prodotti degli scaffali", "Post", "Storie"; inquadratura come `select` con etichette "In alto", "Un po' in alto", "Al centro", "Un po' in basso", "In basso"; colore con `widget: color`), `autonomia.yml` (spec §7: `prodotti` e `post` `{ crea: 1, modifica: 1, elimina: 1 }`, `storie` `{ crea: 0, modifica: 1, elimina: 0 }`, campi a 1 tranne `storie.nome: 0`; `media.percorsi: []`, `media.azioni: { carica: 0, elimina: 0 }` — se `rules.ts` non accetta un elenco vuoto, adattare lo schema delle regole e il suo test), `SCHEMI` di `schemi.ts` con i tre schemi nuovi; togliere `pagine` da regole, fixture e test.
- [ ] **Step 5:** Controlli verdi. Verifica in anteprima locale (`npm run build`, `npm run preview`, `/admin/`): le collection compaiono; il login vero e il caricamento su R2 si provano nel Task 9 sull'anteprima del ramo.
- [ ] **Step 6:** Commit `feat: panel collections and autonomy rules for products, posts and stories`.

Se Access Key ID e Account ID non sono ancora arrivati da eusebjo, il task si ferma prima dello Step 4 e lo si dice: non si inventano valori.

### Task 8: Documentazione

**Files:**
- Modify: `CLAUDE.md`, `AGENTS.md`, `docs/onboarding-redazione.md`, `docs/superpowers/specs/2026-10-29-varianti-di-prova-design.md` (rimando allo spec di produzione)

- [ ] **Step 1:** `CLAUDE.md`:
  - **Comandi:** via `foto:carica` e la preparazione delle foto; la build ha bisogno della rete verso Google Fonts e verso `foto.almalivingviaricasoli.it`.
  - **Al posto di "Prova delle varianti":** sezione "Foto del sito" con bucket, dominio, prefissi `prova/` e `cms/`, CORS (testo del Task 7), token, comando `npx wrangler r2 object put alma-living-prova/prova/<nome> --file=<file> --remote` per aggiungere una foto fissa.
  - **Vincoli globali:**
    - `create`/`delete` su `prodotti` e `post`;
    - niente `media_folder`;
    - foto solo su R2;
    - caratteri per tutto il sito;
    - nuovo limite noto: cancellazioni dalla libreria delle foto fuori dall'approvazione.
  - **Struttura:** aggiornata a `src/sito/`.
  - **Limiti noti:** la voce "Libreria dei file multimediali" va riscritta per R2.
- [ ] **Step 2:** `AGENTS.md`: tabella delle cartelle, sezioni per prodotti, post e storie al posto di "Pagine", immagini su R2.
- [ ] **Step 3:** `docs/onboarding-redazione.md`:
  - "Aggiungere un prodotto", "Aggiungere un post", "Cambiare una storia";
  - "La chiave delle foto, la prima volta su ogni dispositivo" (Impostazioni > Media del pannello; la chiave la dà eusebjo);
  - in "Cosa non fare": non cancellare né rinominare foto dalla libreria, caricarle solo dal campo dell'immagine;
  - nessun gergo di Git.
- [ ] **Step 4:** `npm test` (i test su `CLAUDE.md` e sulla guida in `tests/workflows.test.ts` restano verdi o si aggiornano dove citavano `Pagine`).
- [ ] **Step 5:** Commit `docs: production content, photos on R2 and the editor's guide`.

### Task 9: Anteprima, pull request e lancio

- [ ] **Step 1:** Chiedere a eusebjo l'ok per inviare `fase2/2-produzione`; inviare, aspettare la build Cloudflare e confrontare l'anteprima con `dist/` (come per la prova).
- [ ] **Step 2:** Con eusebjo sull'anteprima del ramo (`/admin/`): login, apertura della libreria delle foto con la chiave, caricamento di una foto di prova in un post in bozza, senza inviarlo.
- [ ] **Step 3:** Con l'ok di eusebjo: pull request verso `main` con descrizione italiana e la riga finale di attribuzione; controlli `build` e `verifica-autonomia` verdi; l'unione la fa eusebjo.
- [ ] **Step 4:** Dopo l'unione: Martina corregge dal pannello i testi di prova di prodotti e storie (spec §3). Il lancio (`SITE_URL=https://almalivingviaricasoli.it`, `SITE_LAUNCHED=true` su Cloudflare) lo decide e lo fa eusebjo.
