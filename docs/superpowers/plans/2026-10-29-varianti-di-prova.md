# Varianti di prova del sito: piano di lavoro

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** portare in Astro, sul ramo `fase2/1-varianti`, la variante di design Salvia social: una pagina singola responsive sotto `/prova/`, da provare sull'anteprima Cloudflare del ramo. (Aggiornato il 2026-10-30: in origine le varianti erano tre; Salvia bianca e Cipria app sono state annullate da eusebjo, vedi Task 6 e 7.)

**Architecture:**
- La parte comune (`src/prova/comune/`), pensata per più varianti e oggi usata dalla sola Salvia social (aggiornato il 2026-10-30), comprende:
  - una piccola logica pura e testata: orari e stato del negozio, link di contatto, navigazione di storie e gallerie, filtri;
  - un solo script del browser che dà vita al markup attraverso attributi `data-*` convenzionali;
  - un layout di prova sempre `noindex`.
- Ogni variante ha la sua cartella: dati di esempio fedeli alla sua tavola, gettoni di colore e caratteri, componenti e stili.
- Le foto di prova non sono nel repository. Uno script Node le prepara prima di `astro build`: le copia da `foto/prova/` in locale o le scarica dal bucket R2 pubblico. Astro poi le ottimizza.

**Tech Stack:** Astro 7.4 (output statico, `astro:assets`, Fonts API con provider Google), TypeScript, Vitest, Cloudflare Workers Builds e R2.

**Spec:** `docs/superpowers/specs/2026-10-29-varianti-di-prova-design.md` (approvata da eusebjo il 2026-10-29). Riferimento visivo: le tavole `research_notes/Design UI/tela/project/SalviaSocial.dc.html`, `SalviaBianca.dc.html`, `CipriaApp.dc.html` (solo locali, escluse da git); corrispondenza indirizzi `/_blob/` → nomi delle foto in `research_notes/Design UI/strumenti/blob-map.txt`.

## Global Constraints

- **Ramo e indirizzi:**
  - si lavora solo sul ramo `fase2/1-varianti`, creato da `main`; nessuna unione in `main` durante la prova; anteprima `https://fase2-1-varianti-alma-living.sebjomuho.workers.dev`;
  - pagine: `/prova/` e `/prova/salvia-social/`;
  - home `/` e pannello `/admin/` invariati.
- **Indicizzazione:** le pagine `/prova/` hanno sempre `<meta name="robots" content="noindex, nofollow">`, nessun JSON-LD e restano fuori da sitemap e `llms.txt`.
- **Risorse esterne:** nessuna a pagina aperta (script, immagini, fogli di stile, `@font-face`); niente iframe, niente feed di Instagram, niente mappa di Google; Instagram, mappe e WhatsApp solo come link.
- **Caratteri:** scaricati alla build con la Fonts API di Astro e serviti da `/_astro/fonts`.
- **Foto:**
  - mai in git: la cartella generata `src/prova/foto/` è in `.gitignore`;
  - servite da `/_astro/`;
  - se una foto non si trova, la build si ferma con un messaggio in italiano che la nomina.
- **Orari della prova:** lunedì-sabato 9:30-13:00 e 16:00-19:30, domenica chiuso, calcolati sul fuso `Europe/Rome`.
- **Contatti:**
  - telefono `334 520 5451` (`tel:+393345205451`);
  - WhatsApp `https://wa.me/393345205451`, con il messaggio di disponibilità esatto `Buongiorno, ho visto sul sito «<articolo>». È disponibile? Misura o colore: …`;
  - Instagram `https://www.instagram.com/almaliving.viaricasoli/` (`@almaliving.viaricasoli`).
- **Dati di esempio:**
  - stelle Google: `5,0`, `5 recensioni`;
  - frase del marchio: `Rendiamo la tua casa ancora più casa. Biancheria, profumi e dettagli che scaldano l’ambiente.`;
  - nessun prezzo, nessuna recensione inventata, nessun contatore social, nessun segnaposto tra parentesi quadre.
- **Responsive:** nessuno scorrimento orizzontale della pagina a 320, 360, 390, 768, 1024, 1440 e 1920 px, telefono anche ruotato.
- **Accessibilità (WCAG 2.2 AA):**
  - contrasto del testo almeno 4,5:1; bersagli di almeno 24 px (44 px per le azioni principali sul telefono);
  - tutto da tastiera con focus visibile; Esc chiude storie e post, che restituiscono il focus;
  - `prefers-reduced-motion` rispettato;
  - un solo `h1` per pagina, ogni `img` con `alt`.
- **Prestazioni:** foto principale `loading="eager"` e `fetchpriority="high"` senza animazione d'ingresso, le altre `loading="lazy"` (aggiornato il 2026-10-30: le altre diapositive dell'apertura, nascoste fino al primo cambio, si caricano subito ma senza priorità); JavaScript solo lo script comune e quello eventuale della variante.
- **Comandi:**
  - prima di ogni commit: `npm test`, `npm run build`, `npm run test:dist` verdi e senza avvisi;
  - script npm compatibili con Windows: niente `VAR=x comando`, gli script di build in Node puro (`.mjs`), non `tsx`.
- **Commit:** in inglese (`feat:`, `fix:`, `chore:`, `docs:`, `test:`), con riga vuota e trailer `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- **Lingua:** codice, commenti e testi in italiano; la terminologia tecnica resta in inglese.

## Review Focus

1. **Visitatore fuori dall'Italia o a cavallo del cambio d'ora:** "aperto ora" deve seguire l'ora di Roma, non quella del dispositivo. Test in Task 3 con date CEST e CET.
2. **Foto assente nel bucket o rinominata:** la build deve fallire subito nominando il file, non produrre pagine con foto mancanti. Test in Task 2.
3. **JavaScript disattivato o bloccato:** orari, articoli, didascalie dei post e foto delle storie restano nell'HTML e leggibili. Test in `tests/dist` (Task 1, generico, e Task 5-7, per variante).
4. **Telefono stretto (320 px) e parole lunghe** (`@almaliving.viaricasoli`, nomi di articoli lunghi): nessuno scorrimento orizzontale. Verifica nel browser a 320 px in Task 5-7 e `overflow-wrap: anywhere` sui testi lunghi.
5. **Filtro senza articoli** (per esempio Mare): messaggio garbato e invito su WhatsApp, mai una griglia vuota. Test della logica in Task 3 e verifica in Task 5-7.

---

### Task 1: ramo, layout di prova, caratteri e controlli sul sito generato

**Files:**
- Create: `docs/superpowers/specs/2026-10-29-varianti-di-prova-design.md` (già scritto, da committare), `docs/superpowers/plans/2026-10-29-varianti-di-prova.md` (questo file)
- Create: `src/prova/varianti.ts`, `src/prova/comune/caratteri.ts`, `src/prova/comune/LayoutProva.astro`, `src/pages/prova/index.astro`
- Modify: `src/components/SeoHead.astro` (prop `noindex`), `src/lib/sitemap.ts` (esclude `prova`), `astro.config.mjs` (`fonts`)
- Test: `tests/sitemap.test.ts`, `tests/astro-config.test.ts`, `tests/dist/dist.test.ts`

**Interfaces:**
- Produces:
  - `VARIANTI` in `src/prova/varianti.ts`: `readonly { id: VarianteId; nome: string; descrizione: string }[]`, con `type VarianteId = 'salvia-social' | 'salvia-bianca' | 'cipria-app'` e nomi `Salvia social`, `Salvia bianca`, `Cipria app`.
  - `CARATTERI_PROVA` in `src/prova/comune/caratteri.ts`: l'array di famiglie per `fonts` di Astro, provider `fontProviders.google()`, subset `latin`. Variabili CSS: `--font-libre-caslon-display` (400), `--font-libre-caslon-text` (400 corsivo), `--font-instrument-sans` (400, 500, 600), `--font-beth-ellen` (400), `--font-dm-serif-display` (400 normale e corsivo), `--font-plus-jakarta-sans` (400-700).
  - `CARATTERI_PER_VARIANTE: Record<VarianteId, string[]>` (le variabili CSS di ogni variante), nello stesso file.
  - `LayoutProva.astro`, props `{ title: string; description: string; caratteri: string[]; variante?: VarianteId }`:
    - mette `data-variante="<variante>"` sul `body` quando `variante` c'è (la pagina `/prova/` non lo ha);
    - usa `SeoHead` con `noindex`;
    - un `<Font cssVariable=… />` per ogni carattere, `preload` solo sul primo;
    - nessuno stile globale salvo `body { margin: 0 }`;
    - uno `<slot />`.
  - `SeoHead` accetta `noindex?: boolean`: se vero, stampa sempre il meta robots e mai il JSON-LD.
  - Convenzione per i test: ogni pagina di prova dichiara la sua variante con `data-variante="<id>"` sul `body`.

- [ ] **Step 1: creare il ramo e committare spec e piano**

```bash
git switch main && git pull --ff-only && git switch -c fase2/1-varianti
git add docs/superpowers/specs/2026-10-29-varianti-di-prova-design.md docs/superpowers/plans/2026-10-29-varianti-di-prova.md
git commit -m "docs: spec and plan for the trial design variants"
```

- [ ] **Step 2: scrivere i test che falliscono**

`tests/sitemap.test.ts`:
```ts
it('esclude le pagine di prova, per segmento', () => {
  expect(includiInSitemap('https://x.dev/prova/')).toBe(false);
  expect(includiInSitemap('https://x.dev/prova/salvia-social/')).toBe(false);
  expect(includiInSitemap('https://x.dev/provare/')).toBe(true);
});
```

`tests/astro-config.test.ts`:
```ts
it('dichiara i caratteri della prova, dal provider Google', async () => {
  const config = await caricaConfig({});
  const nomi = (config.fonts ?? []).map((f: { name: string }) => f.name);
  expect(nomi).toEqual(expect.arrayContaining([
    'Libre Caslon Display', 'Libre Caslon Text', 'Instrument Sans',
    'Beth Ellen', 'DM Serif Display', 'Plus Jakarta Sans',
  ]));
});
```

`tests/dist/dist.test.ts`, nuovo `describe('pagine di prova')` sulle pagine sotto `dist/prova/`:
- `dist/prova/index.html` esiste e ha un link per ogni voce di `VARIANTI` (`href="/prova/<id>/"`);
- ogni pagina sotto `dist/prova/` ha:
  - `noindex, nofollow` e nessun `application/ld+json`;
  - esattamente un `<h1`;
  - un `alt=` su ogni `<img`, e un `src` di `/_astro/` su ogni `<img` con `src`;
- nessuna regola `@font-face` in tutti i CSS di `dist/_astro/` contiene un `url(` esterno. È l'estensione del controllo oggi limitato al pannello.
- `dist/llms.txt` non contiene `/prova/`.

- [ ] **Step 3: verificare che falliscano**

Run: `npm test -- tests/sitemap.test.ts tests/astro-config.test.ts`
Expected: FAIL (`includiInSitemap` restituisce true su `/prova/`; `config.fonts` non definito).

- [ ] **Step 4: implementare**
- `includiInSitemap`: segmenti esclusi `admin` e `prova`.
- `astro.config.mjs`: aggiungere `fonts: CARATTERI_PROVA`.
- `SeoHead`: prop `noindex`.
- `LayoutProva` come da Interfaces.
- `src/pages/prova/index.astro`: pagina semplice e sobria con un `h1` "Varianti di prova" e un elenco di link alle varianti da `VARIANTI`, con nome e descrizione.

- [ ] **Step 5: verificare**

Run: `npm test && npm run build && npm run test:dist`
Expected: tutto PASS; `dist/prova/index.html` presente; nessun avviso di build.

- [ ] **Step 6: commit**

```bash
git add src/prova src/pages/prova src/components/SeoHead.astro src/lib/sitemap.ts astro.config.mjs tests
git commit -m "feat: trial layout, self-hosted fonts and checks for /prova pages"
```

---

### Task 2: foto di prova fuori da git

**Files:**
- Create: `scripts/foto-prova/elenco.json`, `scripts/foto-prova/config.mjs`, `scripts/foto-prova/prepara.mjs`, `src/prova/comune/foto.ts`
- Modify: `package.json` (script `build` e `dev`), `.gitignore`
- Test: `tests/foto-prova.test.ts`
- Locale, non versionato: `foto/prova/*.jpg`. Bucket R2 `alma-living-prova`.

**Interfaces:**
- Consumes: niente.
- Produces:
  - `elenco.json`: array dei nomi di file. Sono 27, uno per foto della tela: `abbracciami-rosso.jpg`, `abbracciami-verde.jpg`, `accappatoi-appesi.jpg`, `asciugamani-bimbo.jpg`, `asciugamano-bianco.jpg`, `asciugamano-rosso.jpg`, `asciugamano-verde.jpg`, `bagno-prodotti.jpg`, `bagno.jpg`, `camera-rosa.jpg`, `candele.jpg`, `coperta.jpg`, `copriletto-rosso.jpg`, `cuori.jpg`, `gnomi.jpg`, `lenzuola-beige.jpg`, `letto-giardino.jpg`, `mare.jpg`, `neonato.jpg`, `plaid-rosso.jpg`, `plaid-verde.jpg`, `righe-rosa.jpg`, `scaffale.jpg`, `tavola.jpg`, `tovaglia-volant.jpg`, `trapunta.jpg`, `volant.jpg`.
  - `config.mjs`: `export const FOTO_PROVA_BASE` (indirizzo pubblico del bucket, senza barra finale) e `export const FOTO_PROVA_DESTINAZIONE = 'src/prova/foto'`, `export const FOTO_PROVA_LOCALE = 'foto/prova'`.
  - `prepara.mjs`: `export async function preparaFoto({ elenco, destinazione, sorgenteLocale, base, fetchFn = fetch })`. Restituisce `Promise<{ presenti: string[]; copiate: string[]; scaricate: string[] }>`. Per ogni nome, nell'ordine:
    1. se è già in `destinazione` la salta;
    2. se c'è in `sorgenteLocale` la copia;
    3. altrimenti la scarica da `${base}/${nome}`.

    Se anche una sola manca ovunque, rigetta con `Error` il cui messaggio comincia con `Foto di prova mancanti:` e le nomina tutte. Eseguito come comando (`node scripts/foto-prova/prepara.mjs`) usa i valori di `config.mjs` ed esce con codice 1 e il messaggio in caso di errore.
  - `src/prova/comune/foto.ts`: `export function foto(nome: string): ImageMetadata`, da `import.meta.glob('../foto/*.jpg', { eager: true, import: 'default' })`. Lancia `Error('Foto di prova non trovata: <nome>')` se manca. Il nome si passa senza estensione: `foto('righe-rosa')`.

- [ ] **Step 1: test che falliscono** (`tests/foto-prova.test.ts`, cartelle temporanee, `fetchFn` finto)
- `'salta le foto già presenti e non scarica nulla'`: `fetchFn` non chiamata, `presenti` contiene il nome.
- `'copia dalla cartella locale prima di scaricare'`: file finisce in `destinazione`, `copiate` contiene il nome, `fetchFn` non chiamata.
- `'scarica dal bucket quello che manca in locale'`: `fetchFn` chiamata con `'https://esempio.r2.dev/mare.jpg'`, file scritto con i byte ricevuti.
- `'si ferma nominando tutte le foto introvabili'`: due nomi con risposta 404 → `rejects.toThrow(/Foto di prova mancanti: .*a\.jpg.*b\.jpg/)`.
- `'elenco.json e la banca foto coincidono'`: `elenco.json` ha 27 nomi unici che finiscono in `.jpg`.

- [ ] **Step 2: verificare che falliscano**

Run: `npm test -- tests/foto-prova.test.ts`
Expected: FAIL (modulo `prepara.mjs` assente).

- [ ] **Step 3: implementare** `prepara.mjs`, `config.mjs` (con `FOTO_PROVA_BASE` provvisorio, da sostituire allo Step 6), `foto.ts`.
- `.gitignore`: riga `/src/prova/foto/`, con commento "foto di prova: si preparano alla build da foto/prova o dal bucket R2".
- `package.json`:
  - `"build": "node scripts/foto-prova/prepara.mjs && astro build"`;
  - `"dev": "node scripts/foto-prova/prepara.mjs && astro dev"`.

- [ ] **Step 4: preparare le foto originali in locale** (non versionate).

Creare `foto/prova/` dai JPEG di WhatsApp in `foto/`, con questa corrispondenza. Il nome di arrivo è a sinistra; a destra la sorgente, tutte `WhatsApp Image 2026-10-24 at …`:

| Nome | Sorgente | Nome | Sorgente |
|---|---|---|---|
| abbracciami-rosso | 14.51.18 (6) | gnomi | 14.51.18 (1) |
| abbracciami-verde | 14.51.18 (5) | lenzuola-beige | 14.51.18 (3) |
| accappatoi-appesi | 14.51.17 (7) | letto-giardino | 14.51.17 (1) |
| asciugamani-bimbo | 14.51.17 (9) | mare | 14.51.17 (2) |
| asciugamano-bianco | 14.51.17 (11) | neonato | 14.51.17 (9) |
| asciugamano-rosso | 14.51.17 (10) | plaid-rosso | 14.51.17 |
| asciugamano-verde | 14.51.18 | plaid-verde | 14.51.16 (4) |
| bagno-prodotti | 14.51.18 (10) | righe-rosa | 14.51.18 (9) |
| bagno | 14.51.18 (11) | scaffale | 14.51.16 |
| camera-rosa | 14.51.18 (8) | tavola | 14.51.17 (3) |
| candele | 14.51.16 (3), ritaglio (31, 354, 1125, 1827) | tovaglia-volant | 14.51.17 (4) |
| coperta | 14.51.18 (4) | trapunta | 14.51.18 (7) |
| copriletto-rosso | 14.51.17 (5) | volant | 14.51.18 (2) |
| cuori | 14.51.16 (2), ritaglio (16, 385, 1100, 1841) | | |

I due ritagli tolgono la cornice delle storie di WhatsApp e la scritta "Meta AI". Salvare in JPEG qualità 92.

- [ ] **Step 5: verificare in locale**

Run: `npm test && npm run build && npm run test:dist`
Expected: PASS; il comando di build stampa 27 foto copiate (la prima volta) o presenti (le volte dopo).

- [ ] **Step 6: bucket R2 (serve eusebjo).** Bloccante solo prima del primo invio del ramo.
1. eusebjo crea il bucket `alma-living-prova` dal dashboard, attiva l'indirizzo pubblico `r2.dev` e lo comunica.
2. eusebjo fa il login di `wrangler`, oppure carica lui le 27 foto dal dashboard.
3. Con il login: per ogni foto, `npx wrangler r2 object put alma-living-prova/<nome> --file foto/prova/<nome> --remote`.
4. Aggiornare `FOTO_PROVA_BASE` con l'indirizzo comunicato.
5. Verificare: svuotare `src/prova/foto/`, rinominare temporaneamente `foto/prova/`, lanciare `npm run build`. Expected: 27 foto scaricate, build PASS. Poi ripristinare il nome della cartella.

- [ ] **Step 7: commit**

```bash
git add scripts/foto-prova src/prova/comune/foto.ts package.json .gitignore tests/foto-prova.test.ts
git commit -m "feat: prepare trial photos from local folder or R2 before build"
```

---

### Task 3: logica comune pura

**Files:**
- Create: `src/prova/comune/orari.ts`, `src/prova/comune/contatti.ts`, `src/prova/comune/sequenza.ts`, `src/prova/comune/filtra.ts`, `src/prova/comune/negozio.ts`
- Test: `tests/prova/orari.test.ts`, `tests/prova/contatti.test.ts`, `tests/prova/sequenza.test.ts`, `tests/prova/filtra.test.ts`

**Interfaces:**
- Consumes: `GIORNI` e il tipo dei giorni da `src/content/limits.ts`; `Negozio` da `src/content/schemas.ts`.
- Produces:
  - `orari.ts`:
    - `type Fascia = { giorno: Giorno; apertura: string; chiusura: string }` (orari `HH:MM`);
    - `ORARI_PROVA: Fascia[]` (lun-sab 09:30-13:00 e 16:00-19:30);
    - `type StatoNegozio = { aperto: true; chiudeAlle: string } | { aperto: false; apre: { giorno: Giorno; ora: string; quando: 'oggi' | 'domani' | 'giorno' } | null }`;
    - `statoNegozio(fasce: Fascia[], adesso: Date): StatoNegozio`, sull'ora di `Europe/Rome` via `Intl.DateTimeFormat`;
    - `testoStato(stato: StatoNegozio): string`;
    - `righeOrari(fasce: Fascia[]): { giorno: Giorno; etichetta: string; testo: string }[]`, sette righe da lunedì a domenica.
  - `contatti.ts`:
    - `linkWhatsApp(numero: string, messaggio?: string): string`;
    - `messaggioDisponibilita(articolo: string): string`;
    - `linkTelefono(telefono: string): string`.
  - `sequenza.ts`: `type Posizione = { gruppo: number; foto: number }`; `avanti(p: Posizione, fotoPerGruppo: number[]): Posizione | null` (`null` = fine, chiudere); `indietro(p, fotoPerGruppo): Posizione` (al primo elemento resta lì).
  - `filtra.ts`: `filtra<T extends { categorie: readonly string[] }>(voci: T[], filtro: string): T[]`; il filtro `'tutti'` restituisce tutto.
  - `negozio.ts`: `datiNegozio(negozio: Negozio): DatiNegozio`, con nome, indirizzo su una riga, telefono, `telefonoHref`, `whatsapp`, `instagram { handle, url }`, `mappeUrl`, `recensioniUrl`, `google { media: '5,0', recensioni: 5 }`, `frase`, `orari: ORARI_PROVA`. Valori dai Global Constraints. `mappeUrl` e `recensioniUrl` = `https://www.google.com/maps/search/?api=1&query=Alma%20Living%20Via%20Ricasoli%2051%20Livorno`.

- [ ] **Step 1: test che falliscono**

`tests/prova/orari.test.ts` (date in UTC, attese sull'ora di Roma):
```ts
it.each([
  ['2026-10-28T09:00:00Z', 'Aperto ora, chiude alle 13:00'],   // mercoledì 10:00 CET
  ['2026-10-28T12:30:00Z', 'Chiuso, apre alle 16:00'],         // mercoledì 13:30
  ['2026-10-28T19:00:00Z', 'Chiuso, apre domani alle 9:30'],   // mercoledì 20:00
  ['2026-10-31T19:00:00Z', 'Chiuso, apre lunedì alle 9:30'],   // sabato 20:00
  ['2026-11-01T10:00:00Z', 'Chiuso, apre domani alle 9:30'],   // domenica 11:00
  ['2026-10-24T08:00:00Z', 'Aperto ora, chiude alle 13:00'],   // sabato 10:00 CEST
  ['2026-10-26T08:00:00Z', 'Chiuso, apre alle 9:30'],          // lunedì 9:00 CET
])('%s → %s', (iso, atteso) => {
  expect(testoStato(statoNegozio(ORARI_PROVA, new Date(iso)))).toBe(atteso);
});
it('righeOrari: domenica chiusa, fasce unite', () => {
  const righe = righeOrari(ORARI_PROVA);
  expect(righe).toHaveLength(7);
  expect(righe[0]).toMatchObject({ etichetta: 'Lunedì', testo: '9:30–13:00, 16:00–19:30' });
  expect(righe[6]).toMatchObject({ etichetta: 'Domenica', testo: 'Chiuso' });
});
it('nessuna fascia: chiuso senza prossima apertura', () => {
  expect(statoNegozio([], new Date('2026-10-28T09:00:00Z'))).toEqual({ aperto: false, apre: null });
});
```

`tests/prova/contatti.test.ts`:
```ts
expect(messaggioDisponibilita('Plaid «Abbracciami»')).toBe(
  'Buongiorno, ho visto sul sito «Plaid «Abbracciami»». È disponibile? Misura o colore: …');
expect(linkWhatsApp('393345205451')).toBe('https://wa.me/393345205451');
expect(linkWhatsApp('393345205451', 'Ciao è?')).toBe('https://wa.me/393345205451?text=Ciao%20%C3%A8%3F');
expect(linkTelefono('334 520 5451')).toBe('tel:+393345205451');
```

`tests/prova/sequenza.test.ts`:
- `avanti({gruppo:0,foto:0},[2,1])` → `{gruppo:0,foto:1}`;
- poi `{gruppo:1,foto:0}`;
- poi `null`;
- `indietro({gruppo:1,foto:0},[2,1])` → `{gruppo:0,foto:1}`;
- `indietro({gruppo:0,foto:0},[2,1])` → `{gruppo:0,foto:0}`.

`tests/prova/filtra.test.ts`: `'tutti'` restituisce tutto; `'letto'` solo le voci con `letto`; un filtro senza voci restituisce `[]`.

- [ ] **Step 2: verificare che falliscano** — Run: `npm test -- tests/prova` — Expected: FAIL (moduli assenti).
- [ ] **Step 3: implementare** i cinque moduli come da Interfaces.
- [ ] **Step 4: verificare** — Run: `npm test` — Expected: PASS.
- [ ] **Step 5: commit** — `git commit -m "feat: shared trial logic for hours, contacts, stories and filters"`

---

### Task 4: script comune del browser

**Files:**
- Create: `src/prova/comune/interazioni.ts`, `src/prova/comune/Interazioni.astro` (lo include con `<script>` di Astro, impacchettato in `/_astro/`)
- Test: `tests/dist/dist.test.ts` (controlli di coerenza del markup, attivi per ogni pagina di prova)

**Interfaces:**
- Consumes: `statoNegozio`, `testoStato`, `avanti`, `indietro`, `filtra` (Task 3).
- Produces: questi protocolli di markup. Ogni variante li usa con il suo stile, e lo script li fa funzionare su tutta la pagina.

| Funzione | Markup |
|---|---|
| Menu | `button[data-menu-apri]` con `aria-controls`; pannello `[data-menu]` con `hidden`; aggiorna `aria-expanded` |
| Stato negozio | `[data-stato-negozio]` con `data-orari` (JSON di `Fascia[]`): il testo diventa `testoStato`; `[data-orario-giorno="<giorno>"]`: quello di oggi riceve `data-oggi` |
| Filtri | contenitore `[data-filtri="<nome>"]` con `button[data-filtro="<id>"]` (`aria-pressed`); voci `[data-filtrabile="<nome>"][data-categorie="a b"]`; `[data-filtro-vuoto="<nome>"]` visibile solo con zero voci |
| Chiedi | `button[data-chiedi="<id>"]` con `aria-expanded` mostra `[data-chiedi-pannello="<id>"]` |
| Galleria | `[data-galleria]` con figli `[data-galleria-foto]`, `button[data-galleria-prec]`, `button[data-galleria-succ]`, punti `button[data-galleria-punto]` (`aria-current`), testo `[data-galleria-contatore]` ("1 di 3") |
| Carosello | `[data-carosello]` con `[data-carosello-binario]` (scroll-snap) e `button[data-carosello-prec\|succ]`, scorrimento di una larghezza visibile |
| Storie | `button[data-storia-apri="<g>"]`; `dialog[data-storie]` con gruppi `[data-storia-gruppo="<g>"]` e foto `[data-storia-foto]`; barre `[data-storia-barra]`; `button[data-storia-prec\|succ\|chiudi]`. Frecce sinistra e destra della tastiera. Alla fine dell'ultima foto si chiude. Il gruppo visto marca il suo pulsante con `data-vista` |
| Post | `button[data-post-apri="<id>"]` apre `dialog[data-post="<id>"]` (`showModal`); al suo interno può esserci una galleria; `button[data-post-chiudi]` |
| Mostra altri | `button[data-mostra-altri="<nome>"]` toglie `hidden` a `[data-altro="<nome>"]` e poi sparisce |

Comportamenti comuni:
- i `dialog` si aprono con `showModal()`, si chiudono con Esc e restituiscono il focus al pulsante d'origine;
- con `prefers-reduced-motion: reduce` niente avanzamento animato delle barre;
- senza JavaScript i `dialog` restano chiusi, ma il loro contenuto è nell'HTML.

- [ ] **Step 1: test che falliscono** in `tests/dist/dist.test.ts`.

  Una funzione `incoerenzeProtocolli(html: string): string[]` restituisce un messaggio per ogni rimando senza destinazione:
  - ogni `data-post-apri="X"` deve avere un `dialog` con `data-post="X"`;
  - ogni `data-storia-apri="G"` un `data-storia-gruppo="G"`;
  - ogni `data-chiedi="X"` un `data-chiedi-pannello="X"`;
  - ogni `data-filtrabile="N"` un contenitore `data-filtri="N"` e un `data-filtro-vuoto="N"`.

  La si prova come `risorseEsterne`:
  - `it.each` di frammenti HTML incoerenti (per esempio `<button data-post-apri="x">` senza `dialog`) che deve segnalare;
  - `it.each` di frammenti coerenti che non deve segnalare;
  - infine `it.each(pagine sotto dist/prova)`, che si aspetta `[]`.
- [ ] **Step 2: verificare che falliscano** — Run: `npm run test:dist` — Expected: FAIL (`incoerenzeProtocolli` non definita).
- [ ] **Step 3: implementare** `interazioni.ts`:
  - un'unica funzione `avviaInterazioni(radice: ParentNode = document): void`, che registra gli ascoltatori per delega;
  - una sezione per protocollo, nessuna libreria;
  - la logica di stato riusa le funzioni di Task 3.
- [ ] **Step 4: verificare** — Run: `npm test && npm run build && npm run test:dist` — Expected: PASS. Prova a mano in `npm run dev` su una pagina di appoggio, da cancellare prima del commit, con un esempio per protocollo; nel browser integrato controllare apertura, chiusura con Esc, ritorno del focus e filtri.
- [ ] **Step 5: commit** — `git commit -m "feat: shared browser script for the trial variants"`

---

### Task 5: variante Salvia social

**Files:**
- Create: `src/prova/salvia-social/dati.ts`, `src/prova/salvia-social/tema.css`, componenti in `src/prova/salvia-social/` (uno per sezione), `src/pages/prova/salvia-social/index.astro`
- Create: `src/prova/comune/logo/alma-nero.png`, `alma-bianco.png` (da `research_notes/Design UI/tela/assets/logo-*.png`), `src/prova/comune/grana.png` (da `.../assets/grana.png`)
- Test: `tests/dist/dist.test.ts`

**Interfaces:**
- Consumes: `LayoutProva`, `CARATTERI_PER_VARIANTE['salvia-social']` (Task 1); `foto()` (Task 2); `datiNegozio`, `righeOrari`, `linkWhatsApp`, `messaggioDisponibilita`, `linkTelefono` (Task 3); i protocolli e `Interazioni.astro` (Task 4).
- Produces:
  - `dati.ts` esporta `collezioni`, `articoli`, `post`, `storie`, `storieInEvidenza` e `apertura` (le tre diapositive con frase di Martina), tipizzati. I contenuti sono trascritti da `renderVals()` di `SalviaSocial.dc.html`, con le foto per nome (`blob-map.txt`).
  - `tema.css` definisce sul contenitore `[data-variante="salvia-social"]` i gettoni:
    - colori: `--bianco`, `--latte`, `--salvia`, `--salvia-chiara`, `--salvia-scura`, `--verde-notte`, `--nero`, `--grigio-testo`, `--sabbia`, con i valori della tavola;
    - raggi: `--raggio: 20px`, `--pillola: 999px`;
    - caratteri: `--titoli`, `--testo`, `--firma`.

    Tutti i componenti della variante usano solo questi gettoni.

- [ ] **Step 1: test che falliscono** (`describe('Salvia social')` su `dist/prova/salvia-social/index.html`):
  - `data-variante="salvia-social"`;
  - fila di storie: almeno 6 `data-storia-apri`;
  - un `dialog[data-storie]`;
  - griglia profilo: 9 `data-post-apri` visibili più quelli `data-altro`, ognuno con il suo `dialog`;
  - selezione con `data-filtri` e `data-filtro-vuoto`;
  - un link `https://wa.me/393345205451?text=` per ogni articolo;
  - le didascalie dei post sono nell'HTML;
  - `[data-stato-negozio]` con `data-orari`.
- [ ] **Step 2: verificare che falliscano** — Run: `npm run build && npm run test:dist` — Expected: FAIL (pagina assente).
- [ ] **Step 3: implementare la pagina** sezione per sezione, nell'ordine della tavola:
  1. header con la fila di storie;
  2. apertura come Diario: galleria a sinistra; a destra riga in stile post, titolo, biglietto firmato "Martina", azioni;
  3. collezioni per stanza in quattro riquadri di misure diverse più pillole;
  4. sezione di Martina come profilo;
  5. selezione a carosello con filtri e "Chiedi disponibilità";
  6. il negozio;
  7. footer;
  8. barra flottante sul telefono.

  Layout con CSS grid, flex e `clamp()`, punti di rottura dove serve, `overflow-wrap: anywhere` sui testi lunghi. Foto con `<Picture>` di `astro:assets` (formati `avif` e `webp`), quella d'apertura con `loading="eager"` e `fetchpriority="high"`.
- [ ] **Step 4: verificare**
  - Run: `npm test && npm run build && npm run test:dist`. Expected: PASS.
  - Nel browser integrato, su `npm run dev`, a 320, 390, 768, 1024, 1440 e 1920 px:
    - nessuno scorrimento orizzontale;
    - fedeltà alla tavola (colori, caratteri, impaginazione);
    - storie (avanti, indietro, Esc, "vista"), post e galleria, filtri compreso il caso vuoto, "Chiedi", menu del telefono, "Mostra altri";
    - con JavaScript disattivato i contenuti si leggono.
- [ ] **Step 5: commit** — `git commit -m "feat: Salvia social trial variant"`

---

### Task 6: variante Salvia bianca

**Annullato il 2026-10-30** su decisione di eusebjo: si costruisce solo Salvia social.

Come Task 5, con la tavola `SalviaBianca.dc.html`, la cartella `src/prova/salvia-bianca/` e la pagina `src/pages/prova/salvia-bianca/index.astro`.

**Interfaces:**
- Consumes: come Task 5, più i loghi e la grana già creati in Task 5.
- Produces:
  - `dati.ts`: `collezioni`, `articoli`, `post`, `storie`, `apertura` e `cartolina` (testo del saluto e firma), trascritti dalla tavola.
  - `tema.css` sul contenitore `[data-variante="salvia-bianca"]`, con i gettoni di colore della tavola (bianco dominante, salvia come accento, salvia scura piena solo in "Dove siamo") e `--titoli` (DM Serif Display), `--testo` (Instrument Sans), `--firma` (Beth Ellen).
- Test specifici (`describe('Salvia bianca')`):
  - storie nell'header: almeno 6 `data-storia-apri`;
  - post in evidenza: una galleria più una fila di almeno 9 miniature, ciascuna con `data-post-apri` e il suo `dialog`;
  - la cartolina con la firma è nell'HTML;
  - collezioni come elenco di nomi.
- Verifica nel browser e commit come Task 5: `git commit -m "feat: Salvia bianca trial variant"`.

---

### Task 7: variante Cipria app

**Annullato il 2026-10-30** su decisione di eusebjo: si costruisce solo Salvia social.

Come Task 5, con la tavola `CipriaApp.dc.html`, la cartella `src/prova/cipria-app/` e la pagina `src/pages/prova/cipria-app/index.astro`.

**Interfaces:**
- Consumes: come Task 5.
- Produces:
  - `dati.ts`: `collezioni`, `articoli`, `rubriche`, `post`, `storie`, `apertura`.
  - `tema.css` sul contenitore `[data-variante="cipria-app"]`, con i gettoni `--crema`, `--cipria`, `--rosa-antico` (solo decorativo), `--cacao`, `--cacao-chiaro`, `--fondo` (#F8F1ED) e i grigi caldi della tavola; `--testo` e `--titoli` sono entrambi Plus Jakarta Sans.
- Elementi propri:
  - header fisso sfocato con menu a pillole;
  - schede rapide sotto l'apertura;
  - foglio "Chiedi" agganciato in basso, con lo stesso protocollo `data-chiedi`;
  - sezione di Martina con rubriche che filtrano i post (protocollo filtri), una colonna di post (3 visibili, "Mostra altri"), un riquadro laterale fisso su computer (profilo, storie in elenco, orari di oggi) che sul telefono diventa una scheda sopra il feed.
- Test specifici (`describe('Cipria app')`):
  - le rubriche usano `data-filtri`;
  - la colonna ha almeno 3 post visibili e altri in `data-altro`;
  - storie in elenco con `data-storia-apri`;
  - riquadro con `[data-stato-negozio]`.
- Verifica nel browser e commit come Task 5: `git commit -m "feat: Cipria app trial variant"`.

---

### Task 8: regole, invio e verifica dell'anteprima

**Files:**
- Modify: `CLAUDE.md`
  - "Font di sistema in fase 1" diventa "caratteri scaricati alla build (Fonts API di Astro) e serviti da `/_astro/fonts`; nessuna richiesta a terzi a pagina aperta";
  - nuova sezione "Prova delle varianti": ramo, indirizzi, foto da `foto/prova` o R2 con `scripts/foto-prova/`, pagine `/prova/` sempre `noindex`;
  - la tabella dei comandi cita che `npm run build` e `npm run dev` preparano prima le foto.

- [ ] **Step 1: aggiornare `CLAUDE.md`** come sopra. Verificare che `tests/` non citino la vecchia frase. Run: `npm test` → PASS.
- [ ] **Step 2: verifica completa** — Run: `npm test && npm run build && npm run test:dist` — Expected: tutto PASS, nessun avviso.
- [ ] **Step 3: commit** — `git commit -m "docs: rules for the trial variants and self-hosted fonts"`
- [ ] **Step 4: inviare il ramo** (account admin `eusebjo`, richiesto dal ruleset `rami-sviluppo`). Prerequisito: Task 2 Step 6 completato.

```bash
git push -u origin fase2/1-varianti
```

- [ ] **Step 5: verificare l'anteprima**
  - Attendere la build di Cloudflare del ramo; se fallisce, leggere il log e correggere.
  - Aprire `https://fase2-1-varianti-alma-living.sebjomuho.workers.dev/prova/` nel browser integrato e verificare Salvia social a 390 e 1440 px (aggiornato il 2026-10-30: è l'unica variante).
  - Controllare le richieste di rete: solo il proprio dominio. Controllare l'intestazione `X-Robots-Tag: noindex`.
- [ ] **Step 6: consegnare a eusebjo** l'indirizzo dell'anteprima e l'elenco di cosa provare. Da qui si entra nel ciclo di prova della spec (§11): ogni cambio richiesto è un commit piccolo sul ramo, con gli stessi controlli.
