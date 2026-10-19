# CLAUDE.md: istruzioni di sviluppo per Alma Living

Sito vetrina statico di Alma Living, negozio di biancheria per la casa in Via Ricasoli 51-53, 57125 Livorno.

- **Ruoli:** eusebjo orchestra il progetto e approva; Claude (via Claude Code) sviluppa; la compagna di eusebjo gestisce i contenuti dal pannello Sveltia.
- **Stack:** Astro 7 (output statico), Vitest, Cloudflare Workers con Static Assets.
- **Contenuti:** guida in `AGENTS.md` (cartelle, campi, limiti). Questo file riguarda lo sviluppo.
- **Spec:** `docs/superpowers/specs/2026-10-19-architettura-alma-living-design.md`
- **Piano di fase 1:** `docs/superpowers/plans/2026-10-19-fase-1-fondamenta.md`
- **Onboarding della redazione:** `docs/onboarding-redazione.md` (guida in italiano che eusebjo segue con lei la prima volta)

## Comandi

Node `>=22.22.0` (come richiede Astro), npm. Funziona su Windows (PowerShell e Git Bash) e su Linux.

| Comando | Cosa fa |
|---|---|
| `npm ci` | Installa le dipendenze dal lockfile |
| `npm run dev` | Server di sviluppo su `http://localhost:4321` |
| `npm run build` | Build statica in `dist/` |
| `npm run preview` | Serve `dist/` in locale |
| `npm test` | Test unitari e di contenuto (esclude `tests/dist`) |
| `npm run test:dist` | Test sui file generati in `dist/`: da lanciare **dopo** `npm run build` |

Prima di ogni commit: `npm test`, `npm run build`, `npm run test:dist`, tutti verdi e senza avvisi.

Negli script npm non usare la sintassi `VAR=x comando` (non funziona su Windows): se serve impostare variabili d'ambiente, si usa Node.

## Flusso: branch e pull request

- Nessun push diretto su `main`. Ogni modifica passa da un branch (`fase1/<n>-<nome>`) e da una pull request.
- Controlli obbligatori su `main`: `build` e `verifica-autonomia`, per ogni pull request. Le proposte della redazione richiedono anche l'approvazione di eusebjo (proprietario del codice, `.github/CODEOWNERS`). Le pull request di sviluppo non hanno un'approvazione separata: GitHub non lascia approvare la propria pull request, quindi le unisce eusebjo stesso con il bypass da amministratore della regola di approvazione (`main-approvazione`, modalità `pull_request`); i controlli obbligatori restano validi anche per lui.
- Branch di sviluppo (tutto tranne `main` e `cms/**`): li possono creare, aggiornare ed eliminare solo gli admin (ruleset `rami-sviluppo`, in `infra/github/`). Il pannello dei contenuti lavora solo su `cms/**`, così la redazione non può modificare una pull request di sviluppo. Le proposte da un fork sono sempre respinte da `verifica-autonomia`.
- La pull request riceve un'anteprima Cloudflare; eusebjo la guarda e la unisce (la redazione dopo l'approvazione, lo sviluppo con il bypass descritto sopra). Dopo il merge Cloudflare ricostruisce e pubblica.
- **Regole di `verifica-autonomia`** (`scripts/autonomia/`, regole in `autonomia.yml`): le proposte di account che non sono in `autonomia.yml` sono sempre respinte, come quelle da un fork. Una pull request da un ramo `cms/**` si valuta **sempre con le regole della redazione**, anche se la apre un account di sviluppo (la redazione può scrivere su quei rami: altrimenti le sue modifiche andrebbero online senza controlli con l'unione dell'admin): per lavoro di sviluppo non si usano rami `cms/`. Per la redazione il controllo legge i file alla versione da cui la proposta si è staccata da `main` (non alla punta di `main`), controlla i valori con gli schemi veri dei contenuti (`scripts/autonomia/schemi.ts`: gli errori che farebbe la build escono subito in italiano) e vuole lo stato "In revisione" del pannello.
- Commit in inglese, nello stile `feat:`, `fix:`, `chore:`, `docs:`. Ogni commit termina con una riga vuota e il trailer `Co-Authored-By` con il nome del modello usato e `<noreply@anthropic.com>`.
- Login a `gh` e `wrangler`, creazione di account, app OAuth e connessioni dal dashboard li fa eusebjo di persona: non si inseriscono né si leggono password o token.

## Indirizzi

- **Produzione:** https://alma-living.sebjomuho.workers.dev (Worker `alma-living`, ramo `main`)
- **Repository:** https://github.com/eusebjo/alma-living (pubblico)
- **Anteprima di un branch:** `https://<branch con "/" sostituito da "-">-alma-living.sebjomuho.workers.dev`, per esempio il branch `fase1/2-anteprime` diventa `https://fase1-2-anteprime-alma-living.sebjomuho.workers.dev`. Il link affidabile è nei dettagli del controllo Cloudflare della pull request.

## Limiti noti prima del livello ≥2

Oggi ogni proposta della redazione richiede l'approvazione di eusebjo (livello 1) e questi limiti sono coperti da quell'approvazione. **Prima di attivare qualunque unione automatica (livello 2 e oltre) vanno risolti.**

- **Il controllo `verifica-autonomia` si può imitare.** La regola su `main` (`infra/github/ruleset-main-protezione.json`) chiede i controlli `build` e `verifica-autonomia` indicando solo l'app che li pubblica (GitHub Actions, `integration_id` 15368). Chi può scrivere su un ramo `cms/**`, come la redazione, può aggiungere dall'interfaccia web di GitHub un workflow con un job chiamato `verifica-autonomia` che finisce sempre in verde: per GitHub è la stessa app, quindi vale come il controllo vero. Prima di una qualunque unione automatica il risultato del controllo va pubblicato da una **GitHub App dedicata**, limitata al solo `main`, e nella regola va richiesto il suo `integration_id`.
- **Libreria dei file multimediali del pannello.** La sezione "File Multimediali" (Asset Library, nel menu del pannello) salva su `main` direttamente, senza passare dal flusso editoriale: caricamenti, nuove cartelle, rinomine ed eliminazioni di file. Le regole di `main` rifiutano comunque quei salvataggi (nessuna modifica può arrivare online), ma l'errore è in inglese. In Sveltia 0.248.0 (schema JSON, sorgenti del pacchetto e documentazione controllati) non esiste un'opzione di `config.yml` che la nasconda o la blocchi senza bloccare anche le voci (`readonly` esiste solo per l'intero pannello, per una collection e per una `asset_collection`; `media_folder` globale è obbligatorio; le cartelle `admin`/`cms` sono di sola lettura, ma non quella delle pagine). Sveltia la rende di sola lettura da sé solo quando l'utente non può scrivere sul ramo, cosa che chiede a GitHub con `refUpdateRule.viewerCanPush`: nel collaudo, con l'account della redazione (non admin), il pulsante per caricare è attivo: su un repository personale la protezione classica non toglie il permesso di scrittura (le restrizioni di push esistono solo per le organizzazioni), quindi è stata tolta e restano le tre ruleset di `infra/github/` (vedi `docs/collaudo-fase-1.md`). Per questo la redazione **non deve usarla** (è scritto nella guida di onboarding): le immagini si caricano dal campo "Immagine" della pagina, dentro il flusso editoriale.
- **Segreti futuri.** Oggi nel repository non ci sono segreti. Quando serviranno, vanno in *Environments* di GitHub limitati ai rami consentiti (di norma `main`), mai tra i segreti del repository: chi scrive su `cms/**` può far girare dei workflow su quei rami e leggerebbe i segreti.

## Accesso al pannello

Il login a `/admin/` passa da GitHub tramite il Worker Cloudflare [`sveltia-cms-auth`](https://github.com/sveltia/sveltia-cms-auth), che custodisce il segreto OAuth fuori dal repository e dal browser.

- **Worker:** https://sveltia-cms-auth.sebjomuho.workers.dev (endpoint `/auth` e `/callback`). È l'unico `backend.base_url` in `public/admin/config.yml`, senza barra finale; `auth_endpoint` non si imposta (il predefinito `auth` coincide col Worker). Un test (`tests/sveltia-config.test.ts`) fissa l'indirizzo.
- **GitHub OAuth App:** Homepage `https://alma-living.sebjomuho.workers.dev`, Authorization callback URL `https://sveltia-cms-auth.sebjomuho.workers.dev/callback`. Si gestisce da GitHub, Settings → Developer settings → OAuth Apps, a cura di eusebjo.
- **Variabili del Worker** (dashboard Cloudflare, a cura di eusebjo): `GITHUB_CLIENT_ID` e `GITHUB_CLIENT_SECRET` (segreto), mai nel repository né in chat; `ALLOWED_DOMAINS` = `*.sebjomuho.workers.dev`, che copre produzione e anteprime del sito (`*` vale per qualunque sottodominio, ma non per il dominio nudo). Quando il sito avrà un dominio proprio, va aggiunto qui: altrimenti il Worker rifiuta l'accesso.
- **Chi entra:** serve un account GitHub con accesso al repository `eusebjo/alma-living`; i permessi sul repository decidono chi può salvare.

## Stato di lancio

Fino al lancio vero il sito vive su `workers.dev` ed è escluso dai motori di ricerca. Lo decide `getSiteConfig` in `src/config/site.ts`, unica fonte per `astro.config.mjs`, `SeoHead`, `robots.txt` e `llms.txt`.

Variabili di build. Quelle impostate su Cloudflare valgono per la build di produzione (ramo `main`); **le anteprime (build degli altri rami) non le ricevono**:

| Variabile | Significato |
|---|---|
| `SITE_URL` | URL pubblico del sito. Se manca o è vuota vale `http://localhost:4321`; la barra finale viene tolta |
| `SITE_LAUNCHED` | `true` solo dopo il lancio vero; oggi è `false` |
| `WORKERS_CI_BRANCH` | Ramo della build, impostata da Cloudflare Workers Builds (assente nelle build locali). Non va impostata a mano su Cloudflare |

Una build è **indicizzabile** solo se `SITE_LAUNCHED=true` **e** `WORKERS_CI_BRANCH=main`. Le anteprime e le build locali non lo sono mai.

| | Non indicizzabile | Indicizzabile |
|---|---|---|
| `<meta name="robots">` | `noindex, nofollow` | assente |
| JSON-LD (schema.org `HomeGoodsStore`) | assente | presente |
| `robots.txt` | `Disallow: /` | `Allow: /` e riga `Sitemap:` |
| Sitemap | non generata | `sitemap-index.xml` e `sitemap-0.xml` |
| `llms.txt`, canonical, Open Graph | sempre presenti | sempre presenti |

Le anteprime ricevono anche `X-Robots-Tag: noindex` da Cloudflare. Poiché non ricevono le variabili di build, nelle anteprime `SITE_URL` vale il predefinito: canonical, Open Graph e `llms.txt` puntano a `http://localhost:4321/`. È innocuo, perché le anteprime sono `noindex` sia nella pagina sia nell'intestazione: non va corretto impostando variabili per le anteprime.

**Verifica a mano della build di lancio** (non si committa il risultato; poi si ricostruisce in locale):

```bash
# Git Bash / Linux
SITE_LAUNCHED=true WORKERS_CI_BRANCH=main SITE_URL=https://example.com npm run build
```

```powershell
# PowerShell
$env:SITE_LAUNCHED='true'; $env:WORKERS_CI_BRANCH='main'; $env:SITE_URL='https://example.com'; npm run build
Remove-Item Env:SITE_LAUNCHED, Env:WORKERS_CI_BRANCH, Env:SITE_URL
```

Atteso in `dist/`: `index.html` con JSON-LD e senza `noindex`, `sitemap-index.xml` presente, `robots.txt` con `Sitemap:`. `npm run test:dist` verifica solo la build locale e fallisce su una build di lancio.

Il lancio vero (dominio di produzione collegato, `SITE_URL` aggiornato, `SITE_LAUNCHED=true` su Cloudflare) lo decide eusebjo.

## Vincoli globali

- Output Astro completamente statico: niente parti generate a ogni richiesta in fase 1.
- Lo schema Astro è l'autorità sui contenuti. I limiti numerici stanno solo in `src/content/limits.ts`.
- Ogni campo dello schema compare nella configurazione Sveltia: i campi a livello 0 in `autonomia.yml` sono `readonly: true`, gli altri no.
- Sveltia CMS: versione esatta fissata in `package.json`, backend `github`, `publish_mode: editorial_workflow`, `publish: false` su ogni collection, trasformazioni delle foto in un riquadro di 2400 x 2400 px (larghezza e altezza massime insieme), `create: false` e `delete: false` sulla collection a cartella (`pagine`; le collection a file, come `negozio`, non hanno queste opzioni: i file si modificano soltanto). Il pannello è la pagina Astro `src/pages/admin/index.astro` (nessun layout del sito, `noindex`), che importa il pacchetto npm `@sveltia/cms` e chiama `CMS.init()`; la configurazione è `public/admin/config.yml`. Non si usa la build "CDN" (`dist/sveltia-cms.js`) né si copia nulla da `node_modules`: Vite impacchetta il pannello in `/_astro/`. `/admin/` non entra nella sitemap (`src/lib/sitemap.ts`).
- Il pannello contatta solo questi host esterni: `api.github.com` (e gli indirizzi degli avatar di GitHub) per leggere e salvare i contenuti, `www.githubstatus.com` (stato del servizio, già dalla schermata di accesso, non si disattiva) e il Worker di autenticazione (`sveltia-cms-auth.sebjomuho.workers.dev`, vedi "Accesso al pannello"). Font, traduzioni, decoder delle immagini e librerie sono locali. Dopo un aggiornamento di `@sveltia/cms` si ricontrollano le richieste di rete di `/admin/` nel browser: `tests/dist` guarda gli indirizzi scritti nei file ma non può provare cosa il pacchetto carica a runtime.
- Per provare il pannello sul computer: `npm run build` e `npm run preview`, poi `/admin/`. Con `npm run dev` funziona, ma la documentazione di Sveltia sconsiglia una pagina Astro perché il server di sviluppo la ricarica a ogni modifica di un file e un salvataggio con "Work with Local Repository" può restare a metà.
- Nessun tracciamento. Nessuna risorsa da CDN di terzi sul sito. Sul pannello nessuna risorsa da CDN (jsDelivr, unpkg): vedi gli host elencati sopra. Font di sistema in fase 1.
- Anteprime e sito pre-lancio con `noindex`; robots, sitemap e JSON-LD solo con `SITE_LAUNCHED=true` e build del ramo `main`.
- Il testo delle pagine passa da `rehype-sanitize`: l'HTML grezzo scritto nei contenuti non finisce nella pagina. Subito dopo, `rimuoviImmaginiEsterne` (`src/lib/markdown.ts`) toglie ogni immagine il cui indirizzo ha uno schema (`https:`, `data:`...) o comincia con `//`: nessuna risorsa di terzi nel testo. Nel pannello il campo `body` ha `editor_components: []`, quindi non offre l'inserimento di immagini; i test in `tests/dist` cercano anche gli indirizzi senza schema (`//host`).
- Messaggi verso la redattrice in italiano, senza gergo di Git (niente "branch", "commit", "merge").
- Nessun segreto nel repository.
- Codice e documentazione del progetto in italiano; la terminologia tecnica (SEO, JSON-LD, build) resta in inglese.

## Struttura

```
astro.config.mjs        site e sitemap da getSiteConfig; sanitizer Markdown
src/config/site.ts      getSiteConfig (stato di lancio), absoluteUrl
src/content/            schemi Zod, limiti, negozio.json, pagine, immagini
src/lib/                schemaOrg, robots, llms, markdown, sitemap
src/components/         SeoHead (title, canonical, Open Graph, noindex, JSON-LD)
src/layouts/            BaseLayout
src/pages/              index, admin (pannello), robots.txt, llms.txt
tests/                  test unitari; tests/dist sui file generati
```
