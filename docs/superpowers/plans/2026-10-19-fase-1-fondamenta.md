# Alma Living, fase 1: piano di implementazione

> **Per agenti esecutori:** SOTTO-SKILL OBBLIGATORIA: usare superpowers:subagent-driven-development (consigliata) oppure superpowers:executing-plans per eseguire il piano task per task. I passi usano le caselle (`- [ ]`) per il tracciamento.

**Obiettivo:** realizzare le fondamenta del sito Alma Living. Lei propone modifiche ai contenuti da un pannello visuale; le regole di autonomia le verificano; eusebjo le approva; il sito statico si pubblica da solo.

**Architettura:**
- Astro con output statico; contenuti come file nel repository pubblico `eusebjo/alma-living`.
- Sveltia CMS crea branch e pull request.
- Due controlli obbligatori su `main`:
  - `build`: test più build;
  - `verifica-autonomia`: regole lette da `autonomia.yml`, eseguite dal codice del ramo base, mai da quello della proposta.
- Cloudflare Workers Builds pubblica la produzione da `main` e un'anteprima per ogni pull request.

**Tecnologie:** Astro (ultima stabile), TypeScript, Vitest, Zod (`astro/zod`), gray-matter, yaml, @octokit/rest, tsx, rehype-sanitize, @astrojs/sitemap, @sveltia/cms (versione esatta), wrangler, GitHub Actions, `gh` CLI.

**Spec:** [docs/superpowers/specs/2026-10-19-architettura-alma-living-design.md](../specs/2026-10-19-architettura-alma-living-design.md)

## Vincoli globali

- Output Astro completamente statico; nessuna parte generata a ogni richiesta in fase 1.
- Hosting: Cloudflare Workers con Static Assets e Workers Builds; produzione dal ramo `main`.
- Repository pubblico `github.com/eusebjo/alma-living` (nome del repository scelto da Claude).
- Nessun push diretto su `main` dopo il primo push iniziale (Task 2). Dalla Task 3 ogni task lavora su un branch `fase1/<n>-<nome>` e si chiude con una pull request, che eusebjo unisce dopo aver visto l'anteprima.
- Controlli obbligatori su `main`: `build` e `verifica-autonomia`. Almeno 1 approvazione per chi non è amministratore.
- Sveltia CMS:
  - versione esatta fissata in `package.json`;
  - backend `github`, `publish_mode: editorial_workflow`, `publish: false` su ogni collection, `create: false`, `delete: false`;
  - immagini convertite in WebP, larghezza massima 2400 px, qualità 85, Exif rimossi, HEIC convertito.
- Lo schema Astro è l'autorità sui contenuti. I limiti numerici stanno solo in `src/content/limits.ts`.
- Ogni campo dello schema compare nella configurazione Sveltia: i campi a livello 0 sono `readonly: true`, gli altri no.
- Nessun tracciamento; nessuna risorsa da CDN di terzi sul sito né sul pannello; font di sistema in fase 1.
- Anteprime e sito pre-lancio con `noindex`. Robots, sitemap e JSON-LD solo quando `SITE_LAUNCHED=true` e la build è di produzione.
- Messaggi verso lei in italiano, senza gergo Git (niente "branch", "commit", "merge" nei testi a lei rivolti).
- Nessun segreto nel repository.
- Login a `gh` e `wrangler`, creazione di account, app OAuth e connessioni dal dashboard li fa **[eusebjo]** di persona. Claude non inserisce né legge password o token.
- Node `>=22` (installato: 22.23.1); npm; Windows (PowerShell e Git Bash). Tutti gli script devono funzionare anche su Linux (GitHub Actions, Cloudflare).
- Ogni commit termina con `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Focus della revisione

1. **HTML grezzo nel testo di una pagina** (`<script>`, attributi `style`, `<iframe>` scritti da lei): non deve finire nella pagina. Test in Task 3.
2. **Una proposta che mescola un campo consentito e uno vietato nello stesso file:** va respinta per intero, e il messaggio elenca solo il campo vietato. Test in Task 5.
3. **Foto non convertita o enorme** (trasformazione fallita, oppure caricata da GitHub web): oltre `dimensione_massima_kb` la proposta va respinta. Test in Task 5.
4. **Modifica dopo l'approvazione:** un nuovo push deve annullare l'approvazione e rifare i controlli, e un ritorno a "bozza" deve far fallire di nuovo `verifica-autonomia`. Test in Task 5 (bozza) e Task 6 (configurazione del ruleset più prova).
5. **Proposta da fork o da autore sconosciuto** sul repository pubblico: respinta, e il workflow non esegue mai codice della proposta. Test in Task 5 (autore) e Task 6 (verifica del workflow).

---

## Struttura dei file

```
alma-living/
  package.json  astro.config.mjs  tsconfig.json  vitest.config.ts  wrangler.jsonc
  autonomia.yml  AGENTS.md  CLAUDE.md  .gitignore
  .github/CODEOWNERS
  .github/workflows/ci.yml                     job "build"
  .github/workflows/verifica-autonomia.yml     job "verifica-autonomia"
  infra/github/ruleset-main-protezione.json
  infra/github/ruleset-main-approvazione.json
  public/admin/index.html  public/admin/config.yml   (sveltia-cms.js copiato in build, ignorato da git)
  scripts/copy-sveltia.mjs
  scripts/autonomia/{types,rules,parse,diff,evaluate,report,github,main}.ts
  src/content.config.ts
  src/content/limits.ts  src/content/schemas.ts
  src/content/negozio/negozio.json
  src/content/pagine/home.md  src/content/pagine/immagini/
  src/config/site.ts
  src/lib/{schemaOrg,robots,llms,markdown}.ts
  src/layouts/BaseLayout.astro  src/components/SeoHead.astro
  src/pages/index.astro  src/pages/robots.txt.ts  src/pages/llms.txt.ts
  tests/*.test.ts  tests/autonomia/*.test.ts  tests/dist/dist.test.ts
```

---

### Task 1: Scheletro Astro, strumenti di test e repository locale

**File:**
- Crea: `package.json`, `astro.config.mjs`, `tsconfig.json`, `vitest.config.ts`, `.gitignore`, `src/pages/index.astro`, `src/layouts/BaseLayout.astro`, `tests/dist/dist.test.ts`

**Interfacce:**
- Produce gli script npm usati da tutte le task:
  - `dev`, `build`, `preview`;
  - `test` (Vitest, esclude `tests/dist`);
  - `test:dist` (Vitest solo su `tests/dist`, da eseguire dopo `build`).
- Produce `BaseLayout.astro` con props `{ title: string; description: string }` e `<html lang="it">`.

- [ ] **Passo 1:** inizializza git nella cartella esistente (`git init -b main`) e crea il progetto Astro **minimal** nella cartella corrente senza toccare `docs/`.
  - Se `create-astro` rifiuta una cartella non vuota, crea il progetto in una sottocartella temporanea e sposta i file.
  - Imposta `output: 'static'` e `site` letto da `process.env.SITE_URL` (default `http://localhost:4321`).
  - Imposta `"engines": { "node": ">=22" }`.
- [ ] **Passo 2:** installa Vitest e crea `vitest.config.ts` con `getViteConfig` di `astro/config`. Escludi `tests/dist/**` da `npm test`.
- [ ] **Passo 3:** scrivi il test che fallisce `tests/dist/dist.test.ts`:

```ts
it('la home esiste ed è in italiano', () => {
  const html = readFileSync('dist/index.html', 'utf8');
  expect(html).toContain('<html lang="it"');
});
it('nessuna risorsa da CDN di terzi', () => {
  const html = readFileSync('dist/index.html', 'utf8');
  expect(html).not.toMatch(/<(script|img|iframe)[^>]+src="https?:\/\//);
  expect(html).not.toMatch(/<link[^>]+rel="stylesheet"[^>]+href="https?:\/\//);
  expect(html).not.toContain('fonts.googleapis');
});
```

- [ ] **Passo 4:** esegui `npm run build; npm run test:dist`. Atteso: FAIL sul primo test (il template non ha `lang="it"`).
- [ ] **Passo 5:** crea `BaseLayout.astro` (lang `it`, font di sistema, `<title>` e meta description dalle props) e usalo in `index.astro` con un testo segnaposto "Alma Living, sito in costruzione".
- [ ] **Passo 6:** esegui `npm run build; npm run test:dist`. Atteso: PASS.
- [ ] **Passo 7:** commit `chore: scaffold Astro static site with test tooling`. Nel `.gitignore` aggiungi `public/admin/sveltia-cms.js`.

---

### Task 2: Repository GitHub pubblico e deploy Cloudflare con anteprime

**File:**
- Crea: `wrangler.jsonc`
- Modifica: `package.json` (wrangler come devDependency)

**Interfacce:**
- Produce:
  - repository remoto `eusebjo/alma-living`, ramo `main`;
  - Worker `alma-living` su Cloudflare, con URL di produzione `https://alma-living.<sottodominio>.workers.dev` (da annotare in `CLAUDE.md` nella Task 4);
  - variabili di build `SITE_URL` e `SITE_LAUNCHED=false`.

- [ ] **Passo 1:** crea `wrangler.jsonc`: `name: "alma-living"`, `compatibility_date` di oggi, `assets: { directory: "./dist" }`. Esegui `npm run build; npx wrangler deploy --dry-run`. Atteso: nessun errore di configurazione.
- [ ] **Passo 2 [eusebjo]:** esegui `gh auth login` nel terminale (account `eusebjo`, scope `repo`, `workflow`, `admin:repo_hook`). Claude verifica con `gh auth status`. Atteso: loggato come `eusebjo`.
- [ ] **Passo 3:** `gh repo create eusebjo/alma-living --public --source . --push`, con descrizione "Sito vetrina di Alma Living, Livorno". Atteso: `git ls-remote origin main` restituisce un hash.
- [ ] **Passo 4 [eusebjo]:** crea l'account Cloudflare. Nel dashboard: Workers & Pages → Create → Import a repository → `eusebjo/alma-living`, con:
  - comando di build `npm run build`;
  - comando di deploy `npx wrangler deploy`;
  - ramo di produzione `main`;
  - build di anteprima attive per tutti i rami non di produzione;
  - variabili di build `SITE_URL=https://alma-living.<sottodominio>.workers.dev` e `SITE_LAUNCHED=false`.
- [ ] **Passo 5:** verifica la produzione con `curl -s https://alma-living.<sottodominio>.workers.dev/ | grep "Alma Living"`. Atteso: la riga del testo segnaposto.
- [ ] **Passo 6:** verifica le anteprime:
  - crea il branch `fase1/2-prova-anteprima` con una modifica al testo segnaposto e apri la pull request con `gh pr create`;
  - controlla con `gh pr view --comments`. Atteso: commento di Cloudflare con l'URL dell'anteprima;
  - chiudi la pull request senza unirla ed elimina il branch.
- [ ] **Passo 7:** documenta in `wrangler.jsonc` (commento) il nome esatto della variabile d'ambiente con cui Workers Builds espone il ramo durante la build. Cercala nella documentazione Cloudflare Workers Builds (atteso `WORKERS_CI_BRANCH`). Serve alla Task 4.
- [ ] **Passo 8:** commit `chore: add Cloudflare Workers static assets config`. Push su `main`: è l'ultimo push diretto.

---

### Task 3: Modello dei contenuti v0 e pagina home

**File:**
- Crea: `src/content/limits.ts`, `src/content/schemas.ts`, `src/content.config.ts`, `src/content/negozio/negozio.json`, `src/content/pagine/home.md`, `src/content/pagine/immagini/home.webp`, `src/lib/markdown.ts`, `tests/schemas.test.ts`, `tests/markdown.test.ts`
- Modifica: `src/pages/index.astro`, `astro.config.mjs`

**Interfacce:**
- Produce `LIMITI` in `limits.ts`:

```ts
export const LIMITI = {
  negozio: { nome: { max: 60 }, descrizione: { min: 20, max: 160 }, civico: { max: 10 } },
  pagina: { titolo: { max: 70 }, descrizione: { min: 50, max: 160 }, immagine_alt: { min: 5, max: 150 } },
} as const;
export const GIORNI = ['lunedi','martedi','mercoledi','giovedi','venerdi','sabato','domenica'] as const;
```

- Produce gli schemi in `schemas.ts`:
  - `negozioSchema`: `nome`, `descrizione`, `indirizzo{via,civico,cap,citta,provincia}`, `telefono`, `email?`, `orari[]{giorno,apertura,chiusura}`;
  - `makePaginaSchema(image: () => ZodTypeAny)`: `titolo`, `descrizione`, `immagine`, `immagine_alt`;
  - tipo `Negozio = z.infer<typeof negozioSchema>`.
- Produce `rehypePlugins` in `markdown.ts`, usato in `astro.config.mjs` (`markdown.rehypePlugins`).
- Collection `negozio` (glob `*.json` in `src/content/negozio`, entry `negozio`) e `pagine` (glob `*.md` in `src/content/pagine`).

- [ ] **Passo 1:** scrivi i test che falliscono in `tests/schemas.test.ts`:
  - `negozioSchema` accetta un esempio valido con `telefono: '334 520 5451'`, `cap: '57125'`, `provincia: 'LI'`, `orari: []`;
  - rifiuta `cap: '5712'`, `provincia: 'Li'`, `telefono: 'abc'` e un orario `{ apertura: '13:00', chiusura: '09:30' }` (la chiusura deve essere successiva all'apertura);
  - `makePaginaSchema(() => z.string())` rifiuta `titolo` di 71 caratteri, `descrizione` di 49 e l'assenza di `immagine_alt`.
- [ ] **Passo 2:** esegui `npx vitest run tests/schemas.test.ts`. Atteso: FAIL (modulo inesistente).
- [ ] **Passo 3:** implementa `limits.ts` e `schemas.ts`:
  - telefono: solo cifre, spazi e `+` iniziale, 9–15 cifre;
  - orari: `HH:MM` 24h, con `refine` chiusura successiva all'apertura;
  - `orari` con default `[]`.
- [ ] **Passo 4:** esegui `npx vitest run tests/schemas.test.ts`. Atteso: PASS.
- [ ] **Passo 5:** scrivi il test che fallisce `tests/markdown.test.ts`. Usa `createMarkdownProcessor` di `@astrojs/markdown-remark` con `rehypePlugins` da `src/lib/markdown.ts`. Renderizzando `'<script>alert(1)</script>\n\nCiao <b style="color:red">x</b> <iframe src="x"></iframe>'`, l'output:
  - non contiene `<script`, `style=`, `<iframe`;
  - contiene `Ciao`.
- [ ] **Passo 6:** esegui il test. Atteso: FAIL.
- [ ] **Passo 7:** implementa `rehypePlugins = [rehypeSanitize]` (schema di default) e collegalo in `astro.config.mjs`. Esegui il test. Atteso: PASS.
- [ ] **Passo 8:** crea `content.config.ts` e i contenuti iniziali:
  - `negozio.json`: nome "Alma Living"; indirizzo Via Ricasoli, civico "51-53", 57125, Livorno, LI; telefono "334 520 5451"; descrizione "Negozio di biancheria per la casa nel centro di Livorno."; `orari: []`;
  - `home.md`: titolo, descrizione di almeno 50 caratteri, `immagine: ./immagini/home.webp`, `immagine_alt`, corpo segnaposto di due paragrafi;
  - `home.webp`: immagine segnaposto 1600×900 a tinta unita, generata con sharp.
- [ ] **Passo 9:** aggiorna `index.astro`: legge `negozio` e `pagine/home`, mostra titolo, immagine (componente `Image` di `astro:assets` con `alt` da `immagine_alt`), corpo, indirizzo, telefono e, se presenti, gli orari. Esegui `npm test; npm run build; npm run test:dist`. Atteso: tutto PASS.
- [ ] **Passo 10:** commit `feat: content model v0 with shop settings and home page` sul branch `fase1/3-contenuti` e apri la pull request.

---

### Task 4: SEO, stato di lancio e file per agenti

**File:**
- Crea: `src/config/site.ts`, `src/lib/schemaOrg.ts`, `src/lib/robots.ts`, `src/lib/llms.ts`, `src/components/SeoHead.astro`, `src/pages/robots.txt.ts`, `src/pages/llms.txt.ts`, `AGENTS.md`, `CLAUDE.md`, `tests/site-config.test.ts`, `tests/schemaOrg.test.ts`, `tests/robots.test.ts`, `tests/llms.test.ts`
- Modifica: `BaseLayout.astro`, `astro.config.mjs` (`@astrojs/sitemap`, filtrata quando non indicizzabile), `tests/dist/dist.test.ts`

**Interfacce:**
- Consuma: `Negozio`, `negozioSchema` (Task 3); il nome della variabile di ramo (Task 2, passo 7).
- Produce:
  - `getSiteConfig(env: Record<string, string | undefined>): { siteUrl: string; launched: boolean; indexable: boolean }`;
  - `toE164(telefono: string): string`;
  - `buildStoreJsonLd(negozio: Negozio, siteUrl: string): Record<string, unknown>`;
  - `robotsTxt(opts: { indexable: boolean; siteUrl: string }): string`;
  - `llmsTxt(negozio: Negozio, pagine: { titolo: string; descrizione: string; url: string }[], siteUrl: string): string`.

- [ ] **Passo 1:** scrivi i test che falliscono:
  - `getSiteConfig({ SITE_URL: 'https://x.dev', SITE_LAUNCHED: 'true', <VAR_RAMO>: 'main' }).indexable === true`;
  - `indexable === false` se `SITE_LAUNCHED` manca, oppure se il ramo è `fase1/x`;
  - `toE164('334 520 5451') === '+393345205451'` e `toE164('+39 0586 123456') === '+390586123456'`;
  - `buildStoreJsonLd` restituisce `@type: 'HomeGoodsStore'`, `name: 'Alma Living'`, `address.streetAddress: 'Via Ricasoli 51-53'`, `postalCode: '57125'`, `addressLocality: 'Livorno'`, `addressRegion: 'LI'`, `addressCountry: 'IT'`, `telephone: '+393345205451'`;
  - con `orari: []` non contiene la chiave `openingHoursSpecification`; con un orario di lunedì contiene `dayOfWeek: 'https://schema.org/Monday'`, `opens`, `closes`;
  - `robotsTxt({ indexable: false, ... })` contiene `Disallow: /`; con `indexable: true` contiene `Allow: /` e `Sitemap: https://x.dev/sitemap-index.xml`;
  - `llmsTxt` inizia con `# Alma Living` e contiene indirizzo, telefono e gli URL delle pagine.
- [ ] **Passo 2:** esegui `npm test`. Atteso: FAIL sui nuovi test.
- [ ] **Passo 3:** implementa le cinque funzioni, poi `SeoHead.astro`. `SeoHead` emette:
  - title, description, canonical e Open Graph;
  - `<meta name="robots" content="noindex, nofollow">` se non indicizzabile;
  - JSON-LD solo se indicizzabile.

  Crea gli endpoint `robots.txt.ts` e `llms.txt.ts`. Aggiungi `noindex` anche a `/admin/` (Task 7).
- [ ] **Passo 4:** esegui `npm test`. Atteso: PASS.
- [ ] **Passo 5:** estendi `tests/dist/dist.test.ts` per la build locale, che non è indicizzabile:
  - `index.html` contiene `noindex` e non contiene `application/ld+json`;
  - `robots.txt` contiene `Disallow: /`;
  - `llms.txt` contiene `Via Ricasoli`.

  Esegui `npm run build; npm run test:dist`. Atteso: PASS.
- [ ] **Passo 6:** verifica la build di lancio senza committarla. Esegui una build con `SITE_LAUNCHED=true`, la variabile di ramo a `main` e `SITE_URL` impostato, poi controlla `dist/index.html`. Atteso: JSON-LD presente, niente `noindex`, `dist/sitemap-index.xml` presente.
- [ ] **Passo 7:** scrivi `AGENTS.md` (guida per gli agenti su come si modificano i contenuti):
  - cartelle e campi di `negozio` e `pagine`;
  - limiti da `LIMITI`;
  - "le regole di autonomia sono in `autonomia.yml`; codice e layout non si toccano";
  - immagini in `src/content/pagine/immagini/`, in WebP.

  Scrivi `CLAUDE.md`: comandi, flusso a branch e pull request, URL di produzione, link a spec e piano, vincoli globali.
- [ ] **Passo 8:** commit `feat: SEO head, launch gating, robots, llms.txt and agent docs` su `fase1/4-seo`, poi pull request.

---

### Task 5: Motore delle regole di autonomia

**File:**
- Crea: `autonomia.yml`, `scripts/autonomia/types.ts`, `rules.ts`, `parse.ts`, `diff.ts`, `evaluate.ts`, `report.ts`, `tests/autonomia/{rules,parse,diff,evaluate,report}.test.ts`

**Interfacce:**
- Consuma: i percorsi dei contenuti della Task 3.
- Produce, in `types.ts`:

```ts
export type Livello = 0 | 1 | 2 | 3 | 4;
export interface CollectionRule { file: string; formato: 'json' | 'markdown';
  azioni: { crea: Livello; modifica: Livello; elimina: Livello }; campi: Record<string, Livello>; }
export interface Rules { versione: 1; ruoli: { sviluppo: string[]; redazione: string[] };
  proposte: { stati_inviati: string[] }; contenuti: Record<string, CollectionRule>;
  media: { percorsi: string[]; dimensione_massima_kb: number; azioni: { carica: Livello; elimina: Livello } }; }
export interface ChangedFile { path: string; status: 'added' | 'modified' | 'removed' | 'renamed';
  previousPath?: string; before: string | null; after: string | null; sizeBytes?: number; }
export interface PullRequestInput { author: string; draft: boolean; labels: string[]; files: ChangedFile[]; }
export type Azione = 'crea' | 'modifica' | 'elimina' | 'carica' | 'perimetro' | 'formato' | 'dimensione' | 'autore' | 'stato';
export interface Violazione { file: string; campo?: string; azione: Azione; messaggio: string; }
export interface Verdict { ruolo: 'sviluppo' | 'redazione' | 'sconosciuto';
  esito: 'consentito' | 'respinto' | 'in_bozza'; livello: Livello | null; violazioni: Violazione[]; }
```

- Produce le funzioni:
  - `loadRules(yamlText: string): Rules` (lancia `Error` con messaggio in italiano se il file non è valido);
  - `parseContent(text: string, formato: 'json' | 'markdown'): Record<string, unknown>` (markdown: frontmatter con gray-matter più il corpo in `corpo`);
  - `diffFields(before: Record<string, unknown>, after: Record<string, unknown>): string[]`: percorsi puntati delle foglie cambiate; un array conta come un solo valore al suo percorso;
  - `levelForField(campi: Record<string, Livello>, path: string): Livello`: corrispondenza sul prefisso più lungo, per segmenti; 0 se non c'è nessuna regola;
  - `evaluate(input: PullRequestInput, rules: Rules): Verdict`;
  - `formatReport(v: Verdict): string`: Markdown in italiano che inizia con `<!-- verifica-autonomia -->`.

`autonomia.yml` iniziale (scelta di Claude per la fase 1; la lista `redazione` resta vuota fino alla Task 9):

```yaml
versione: 1
ruoli:
  sviluppo: [eusebjo]
  redazione: []
proposte:
  stati_inviati: [sveltia-cms/pending_review, sveltia-cms/pending_publish]  # verificare in Task 7
contenuti:
  negozio:
    file: src/content/negozio/negozio.json
    formato: json
    azioni: { crea: 0, modifica: 1, elimina: 0 }
    campi: { nome: 0, indirizzo: 0, descrizione: 1, telefono: 1, email: 1, orari: 1 }
  pagine:
    file: src/content/pagine/*.md
    formato: markdown
    azioni: { crea: 0, modifica: 1, elimina: 0 }
    campi: { titolo: 1, descrizione: 1, immagine: 1, immagine_alt: 1, corpo: 1 }
media:
  percorsi: [src/content/pagine/immagini/**]
  dimensione_massima_kb: 1500
  azioni: { carica: 1, elimina: 0 }
```

Regole di `evaluate`, in ordine:
1. Autore in `sviluppo`: esito `consentito`, livello `null`.
2. Autore in nessun ruolo: esito `respinto`, violazione `autore`.
3. Redazione con `draft: true`, o senza nessuna etichetta di `stati_inviati`: esito `in_bozza`, violazione `stato`.
4. Per ogni file:
   - **Collection** (glob `file`):
     - `added` vale come `crea`, `removed` come `elimina`;
     - `renamed` vale come `elimina` del percorso precedente più `crea` del nuovo;
     - `modified`: `parseContent` di prima e dopo, poi `diffFields`, poi `levelForField` per ogni percorso; il livello dell'azione `modifica` si applica come tetto;
     - contenuto non analizzabile: violazione `formato`.
   - **Media:** `added` o `modified` vale come `carica`, `removed` come `elimina`; se `sizeBytes` supera `dimensione_massima_kb × 1024`, violazione `dimensione`.
   - **Qualsiasi altro percorso** (codice, `.github/`, `autonomia.yml`, `public/admin/`): violazione `perimetro`.
5. Se c'è almeno una violazione, esito `respinto`. Altrimenti `consentito`, con livello pari al minimo dei livelli toccati (in fase 1 sempre 1).

- [ ] **Passo 1:** scrivi i test che falliscono:
  - **`rules.test.ts`:** il file `autonomia.yml` del repository si carica; un livello `7` fa lanciare `loadRules`; un campo `azioni` mancante fa lanciare.
  - **`parse.test.ts`:** il JSON restituisce l'oggetto; il markdown restituisce il frontmatter più `corpo` senza spazi iniziali e finali; un JSON malformato fa lanciare.
  - **`diff.test.ts`:**
    - `diffFields({a:1,b:{c:1}}, {a:1,b:{c:2}})` restituisce `['b.c']`;
    - una chiave aggiunta o rimossa compare tra i percorsi;
    - `orari` diverso restituisce `['orari']`;
    - oggetti uguali restituiscono `[]`.
  - **`evaluate.test.ts`** (con un'utente `lei` in `redazione` e l'etichetta `sveltia-cms/pending_review`):
    1. `eusebjo` modifica `src/layouts/BaseLayout.astro`: `consentito`, ruolo `sviluppo`;
    2. `estraneo` modifica `home.md`: `respinto`, `azione: 'autore'`, messaggio che contiene `non è autorizzat`;
    3. `lei` modifica solo `orari` in `negozio.json`: `consentito`, `livello: 1`;
    4. `lei` modifica `nome`: `respinto`, `campo: 'nome'`;
    5. `lei` modifica `orari` e `nome` nello stesso file: `respinto`, una sola violazione, `campo: 'nome'` (focus 2);
    6. `lei` modifica `indirizzo.via`: `respinto`, `campo: 'indirizzo.via'`;
    7. `lei` modifica `BaseLayout.astro`, `autonomia.yml` o `.github/workflows/ci.yml`: ognuno `respinto`, `azione: 'perimetro'`;
    8. `lei` aggiunge `src/content/pagine/nuova.md`: `respinto`, `azione: 'crea'`;
    9. `lei` rimuove `home.md`: `respinto`, `azione: 'elimina'`;
    10. `lei` rinomina `home.md`: `respinto`;
    11. `lei` carica `immagini/foto.webp` da 900 KB: `consentito`;
    12. `lei` carica `immagini/foto.jpg` da 9.000 KB: `respinto`, `azione: 'dimensione'` (focus 3);
    13. `lei` modifica `titolo` e `corpo` di `home.md`: `consentito`;
    14. `lei` con `draft: true`: `in_bozza`; senza etichette: `in_bozza` (focus 4);
    15. `negozio.json` con JSON non valido dopo la modifica: `respinto`, `azione: 'formato'`.
  - **`report.test.ts`:**
    - inizia con il marcatore;
    - per `respinto` elenca file e campo in italiano;
    - non contiene le parole `branch`, `merge`, `commit`;
    - per `consentito` con livello 1 contiene `in attesa dell'approvazione`.
- [ ] **Passo 2:** esegui `npx vitest run tests/autonomia`. Atteso: FAIL (moduli inesistenti).
- [ ] **Passo 3:** implementa i moduli. Usa `yaml` per il parsing, Zod per validare `Rules` e `picomatch` (o equivalente) per i glob.
- [ ] **Passo 4:** esegui `npx vitest run tests/autonomia`. Atteso: PASS. Poi `npm test`: tutto PASS.
- [ ] **Passo 5:** commit `feat: autonomy rules engine with field-level checks` su `fase1/5-regole`, poi pull request.

---

### Task 6: Controlli GitHub, CODEOWNERS e protezioni su main

**File:**
- Crea: `scripts/autonomia/github.ts`, `scripts/autonomia/main.ts`, `tests/autonomia/github.test.ts`, `tests/workflows.test.ts`, `.github/workflows/ci.yml`, `.github/workflows/verifica-autonomia.yml`, `.github/CODEOWNERS`, `infra/github/ruleset-main-protezione.json`, `infra/github/ruleset-main-approvazione.json`

**Interfacce:**
- Consuma: `loadRules`, `evaluate`, `formatReport`, `PullRequestInput` (Task 5).
- Produce:
  - `fetchPullRequestInput(octokit: Octokit, ref: { owner: string; repo: string; pullNumber: number }): Promise<PullRequestInput>`;
  - `upsertReport(octokit, ref, body: string): Promise<void>`: aggiorna il commento con il marcatore, oppure lo crea;
  - nomi dei controlli obbligatori: `build`, `verifica-autonomia`;
  - etichetta `livello-1-serve-approvazione`.

- [ ] **Passo 1:** scrivi il test che fallisce `github.test.ts`, con un Octokit finto:
  - `fetchPullRequestInput` mappa `pulls.get` (`user.login`, `draft`, `labels[].name`, `base.sha`, `head.sha`) e `pulls.listFiles` (paginato) su `ChangedFile`;
  - `before` è letto da `repos.getContent` su `base.sha` (null se `added`), `after` su `head.sha` (null se `removed`);
  - `sizeBytes` viene dalla risposta di `getContent`; per i file media si legge solo `size`, non il contenuto;
  - `previousPath` viene da `previous_filename`.

  Scrivi anche `tests/workflows.test.ts`, che legge `.github/workflows/verifica-autonomia.yml` con `yaml` (focus 5):
  - l'evento è solo `pull_request_target`;
  - lo step `actions/checkout` non ha `with.ref`;
  - nessuno step esegue `npm run build`, `npm test` o script del ramo della proposta;
  - i permessi sono esattamente `contents: read`, `pull-requests: write`, `issues: write`.
- [ ] **Passo 2:** esegui `npx vitest run tests/autonomia/github.test.ts tests/workflows.test.ts`. Atteso: FAIL.
- [ ] **Passo 3:** implementa `github.ts` e `main.ts`. Comportamento di `main.ts`:
  - legge `GITHUB_TOKEN`, `GITHUB_REPOSITORY`, `GITHUB_EVENT_PATH` e `autonomia.yml` dal checkout del ramo base;
  - chiama `evaluate` e `upsertReport`;
  - aggiunge l'etichetta del livello se l'esito è `consentito` per la redazione, altrimenti la toglie;
  - imposta `process.exitCode = 1` se l'esito non è `consentito`.

  Esegui il test. Atteso: PASS.
- [ ] **Passo 4:** crea i workflow:
  - **`ci.yml`:** su `pull_request` e `push` di `main`; job `build` con `npm ci`, `npm test`, `npm run build`, `npm run test:dist`.
  - **`verifica-autonomia.yml`:**
    - su `pull_request_target` con i tipi `opened, reopened, synchronize, edited, ready_for_review, converted_to_draft, labeled, unlabeled`;
    - `permissions: { contents: read, pull-requests: write, issues: write }`;
    - job `verifica-autonomia`: `actions/checkout` **senza `ref`** (ramo base), `npm ci`, `npx tsx scripts/autonomia/main.ts`.
  - Fissa le action di terzi allo SHA del commit.
  - Il contenuto della proposta si legge solo tramite API, come dato, e non viene mai eseguito.
- [ ] **Passo 5:** crea `CODEOWNERS` con `* @eusebjo` e i due ruleset JSON per il ramo predefinito:
  - **`main-protezione`** (nessun bypass): `deletion`, `non_fast_forward`, `pull_request` con 0 approvazioni, `required_status_checks` su `build` e `verifica-autonomia`;
  - **`main-approvazione`** (bypass per il ruolo admin, `bypass_mode: pull_request`): `pull_request` con `required_approving_review_count: 1`, `require_code_owner_review: true`, `dismiss_stale_reviews_on_push: true`, `require_last_push_approval: true`.
- [ ] **Passo 6:** commit `ci: build and autonomy checks, CODEOWNERS, rulesets` su `fase1/6-controlli`, poi pull request.
  - Atteso: `build` verde.
  - `verifica-autonomia` non compare ancora, ed è normale: un workflow `pull_request_target` gira solo quando esiste già su `main`.
  - **[eusebjo]** unisce.
- [ ] **Passo 7:** applica i ruleset:

```bash
gh api --method POST repos/eusebjo/alma-living/rulesets --input infra/github/ruleset-main-protezione.json
```

```bash
gh api --method POST repos/eusebjo/alma-living/rulesets --input infra/github/ruleset-main-approvazione.json
```

  Verifica con `gh api repos/eusebjo/alma-living/rules/branches/main`. Atteso: regole `pull_request`, `required_status_checks` (2 controlli), `deletion`, `non_fast_forward`.
- [ ] **Passo 8:** prove di protezione:
  - `git push origin HEAD:main` da un commit di prova. Atteso: rifiutato dal ruleset;
  - apri una pull request di prova che modifica solo `README.md`. Atteso: `verifica-autonomia` verde (autore `eusebjo`), unibile da `eusebjo` tramite bypass;
  - chiudila senza unirla.

---

### Task 7: Pannello Sveltia

**File:**
- Crea: `public/admin/index.html`, `public/admin/config.yml`, `scripts/copy-sveltia.mjs`, `tests/sveltia-config.test.ts`
- Modifica: `package.json` (`@sveltia/cms` versione esatta; `prebuild` e `predev` che eseguono `copy-sveltia.mjs`), `autonomia.yml` (`stati_inviati`, se diversi), `tests/dist/dist.test.ts`

**Interfacce:**
- Consuma: `LIMITI` (Task 3); `autonomia.yml` (Task 5).
- Produce il pannello su `/admin/`, con `base_url` di autenticazione lasciato a segnaposto `https://AUTH_WORKER_URL` fino alla Task 8.

- [ ] **Passo 1:** scrivi il test che fallisce `tests/sveltia-config.test.ts`, che legge `public/admin/config.yml` con `yaml`:
  - `backend.name === 'github'`, `backend.repo === 'eusebjo/alma-living'`, `backend.branch === 'main'`, `publish_mode === 'editorial_workflow'`;
  - ogni collection ha `publish: false`, `create: false`, `delete: false`;
  - i campi di `negozio` sono esattamente `nome, descrizione, indirizzo, telefono, email, orari`; quelli di `pagine` sono `titolo, descrizione, immagine, immagine_alt, body`;
  - ogni campo con livello 0 in `autonomia.yml` ha `readonly: true`, ogni campo con livello ≥ 1 no (`body` corrisponde a `corpo`);
  - `maxlength` e `minlength` dei campi testuali sono uguali a `LIMITI`;
  - la trasformazione delle immagini ha `format: webp`, `quality: 85`, `width: 2400`.
- [ ] **Passo 2:** esegui il test. Atteso: FAIL.
- [ ] **Passo 3:** installa `@sveltia/cms` alla versione esatta più recente e scrivi `copy-sveltia.mjs`, che copia il bundle da `node_modules` in `public/admin/sveltia-cms.js`.
  - Scrivi `index.html`: `<meta name="robots" content="noindex">`, script locale `/admin/sveltia-cms.js`, nessuna risorsa esterna.
  - Scrivi `config.yml` seguendo la [guida Astro di Sveltia](https://sveltiacms.app/en/docs/frameworks/astro.md):
    - collection file `negozio` e collection cartella `pagine`, con media relativi in `immagini/`;
    - lingua italiana, se la configurazione la prevede;
    - `omit_empty_optional_fields: true`.
- [ ] **Passo 4:** esegui il test, poi `npm run build`. Atteso: PASS e `dist/admin/sveltia-cms.js` presente.
- [ ] **Passo 5:** estendi `dist.test.ts`: `dist/admin/index.html` contiene `noindex` e nessun `src="http`. Esegui `npm run test:dist`. Atteso: PASS.
- [ ] **Passo 6:** verifica in locale il modo "lavora su cartella locale" di Sveltia, da Chrome con `npm run dev` su `/admin/`:
  - i campi a livello 0 sono visibili e non modificabili;
  - una foto JPEG grande caricata diventa WebP.
- [ ] **Passo 7:** controlla nella [documentazione del flusso editoriale](https://sveltiacms.app/en/docs/workflows/editorial.md) i nomi esatti delle etichette che Sveltia applica agli stati "In revisione" e "Pronta", e se la bozza è una pull request draft. Allinea `proposte.stati_inviati` in `autonomia.yml` e il test della Task 5, scenario 14.
- [ ] **Passo 8:** commit `feat: Sveltia CMS admin with editorial workflow` su `fase1/7-pannello`, poi pull request.

---

### Task 8: Login del pannello

**File:**
- Modifica: `public/admin/config.yml` (`backend.base_url`)

**Interfacce:**
- Consuma: l'URL del sito (Task 2).
- Produce: il Worker di autenticazione `sveltia-cms-auth` attivo, e il login GitHub funzionante su `/admin/` in produzione e nelle anteprime.

- [ ] **Passo 1 [eusebjo]:** distribuisci il Worker dal pulsante "Deploy to Cloudflare" nel README di [sveltia-cms-auth](https://github.com/sveltia/sveltia-cms-auth), sul tuo account Cloudflare. Comunica a Claude l'URL del Worker.
- [ ] **Passo 2 [eusebjo]:** su GitHub, Settings → Developer settings → OAuth Apps → New:
  - Homepage: l'URL del sito;
  - Callback: `<URL del Worker>/callback`.

  Inserisci `GITHUB_CLIENT_ID` e `GITHUB_CLIENT_SECRET` come variabili e segreti del Worker dal dashboard Cloudflare. Imposta `ALLOWED_DOMAINS` sul dominio `workers.dev` del sito, comprese le anteprime (per esempio `*.alma-living.<sottodominio>.workers.dev`, secondo il formato indicato dal README).
- [ ] **Passo 3:** imposta `backend.base_url` sull'URL del Worker e aggiorna il test della Task 7, se contiene il segnaposto. Esegui `npm test`. Atteso: PASS.
- [ ] **Passo 4:** commit `feat: connect admin to Sveltia auth worker` su `fase1/8-login`, poi pull request. Sull'URL di anteprima, `/admin/`, **[eusebjo]** accede con GitHub. Atteso: il pannello mostra le collection `negozio` e `pagine`.
- [ ] **Passo 5:** dopo il merge, ripeti l'accesso sull'URL di produzione. Atteso: accesso riuscito.

---

### Task 9: Collaudo con lei

**File:**
- Modifica: `autonomia.yml` (username di lei in `redazione`)
- Crea: `docs/collaudo-fase-1.md` (esito di ogni scenario, con data)

**Interfacce:**
- Consuma: tutto quanto prodotto dalle task precedenti.

- [ ] **Passo 1 [lei]:** crea un account GitHub gratuito. **[eusebjo]** comunica lo username a Claude.
- [ ] **Passo 2:** invita lei come collaboratrice con permesso di scrittura:

```bash
gh api --method PUT repos/eusebjo/alma-living/collaborators/<username> -f permission=push
```

  Aggiungi lo username a `ruoli.redazione` con una pull request di sviluppo (`fase1/9-redazione`). **[eusebjo]** unisce. **[lei]** accetta l'invito.
- [ ] **Passo 3:** esegui gli scenari con lei e registra l'esito in `docs/collaudo-fase-1.md`:
  1. Da desktop compila gli orari, salva e sposta in "In revisione". Atteso: anteprima con gli orari, `verifica-autonomia` verde, etichetta del livello, notifica a eusebjo. eusebjo approva dall'app GitHub e unisce: online in pochi minuti.
  2. Da telefono (accesso con il QR) sostituisce la foto della home con una foto del telefono. Atteso: nella proposta arriva un file `.webp` sotto 1.500 KB, e il controllo è verde.
  3. Da GitHub web propone una modifica a `src/layouts/BaseLayout.astro`. Atteso: `verifica-autonomia` rosso, commento in italiano comprensibile, merge impossibile.
  4. Prova ad approvare e unire una propria proposta. Atteso: GitHub lo impedisce.
  5. Dopo l'approvazione di eusebjo, modifica di nuovo la proposta. Atteso: approvazione annullata, controlli rifatti.
  6. Riporta una proposta in "Bozza". Atteso: `verifica-autonomia` rosso con il messaggio sullo stato.
  7. Due bozze aperte sullo stesso file `negozio.json`. Atteso: la seconda, dopo il merge della prima, mostra un conflitto. Registra il comportamento del pannello.
  8. eusebjo annulla una modifica online con "Revert" su GitHub. Atteso: proposta di annullamento, controlli verdi, sito tornato com'era dopo il merge.
- [ ] **Passo 4:** per ogni scenario fallito apri un'attività separata. Non correggere dentro il collaudo.
- [ ] **Passo 5:** commit `docs: phase 1 acceptance results` su `fase1/9-collaudo`, poi pull request.
