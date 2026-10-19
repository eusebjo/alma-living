# CLAUDE.md: istruzioni di sviluppo per Alma Living

Sito vetrina statico di Alma Living, negozio di biancheria per la casa in Via Ricasoli 51-53, 57125 Livorno.

- **Ruoli:** eusebjo orchestra il progetto e approva; Claude (via Claude Code) sviluppa; la compagna di eusebjo gestisce i contenuti dal pannello Sveltia.
- **Stack:** Astro 7 (output statico), Vitest, Cloudflare Workers con Static Assets.
- **Contenuti:** guida in `AGENTS.md` (cartelle, campi, limiti). Questo file riguarda lo sviluppo.
- **Spec:** `docs/superpowers/specs/2026-10-19-architettura-alma-living-design.md`
- **Piano di fase 1:** `docs/superpowers/plans/2026-10-19-fase-1-fondamenta.md`

## Comandi

Node `>=22`, npm. Funziona su Windows (PowerShell e Git Bash) e su Linux.

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
- Controlli obbligatori su `main`: `build` e `verifica-autonomia`, più l'approvazione di eusebjo.
- La pull request riceve un'anteprima Cloudflare; eusebjo la guarda, approva e unisce. Dopo il merge Cloudflare ricostruisce e pubblica.
- Commit in inglese, nello stile `feat:`, `fix:`, `chore:`, `docs:`. Ogni commit termina con una riga vuota e il trailer `Co-Authored-By` con il nome del modello usato e `<noreply@anthropic.com>`.
- Login a `gh` e `wrangler`, creazione di account, app OAuth e connessioni dal dashboard li fa eusebjo di persona: non si inseriscono né si leggono password o token.

## Indirizzi

- **Produzione:** https://alma-living.sebjomuho.workers.dev (Worker `alma-living`, ramo `main`)
- **Repository:** https://github.com/eusebjo/alma-living (pubblico)
- **Anteprima di un branch:** `https://<branch con "/" sostituito da "-">-alma-living.sebjomuho.workers.dev`, per esempio il branch `fase1/2-anteprime` diventa `https://fase1-2-anteprime-alma-living.sebjomuho.workers.dev`. Il link affidabile è nei dettagli del controllo Cloudflare della pull request.

## Stato di lancio

Fino al lancio vero il sito vive su `workers.dev` ed è escluso dai motori di ricerca. Lo decide `getSiteConfig` in `src/config/site.ts`, unica fonte per `astro.config.mjs`, `SeoHead`, `robots.txt` e `llms.txt`.

Variabili di build (su Cloudflare valgono per tutte le build, produzione e anteprime):

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

Le anteprime ricevono anche `X-Robots-Tag: noindex` da Cloudflare.

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
- Sveltia CMS: versione esatta fissata in `package.json`, backend `github`, `publish_mode: editorial_workflow`, `publish: false`, `create: false`, `delete: false`.
- Nessun tracciamento. Nessuna risorsa da CDN di terzi, né sul sito né sul pannello. Font di sistema in fase 1.
- Anteprime e sito pre-lancio con `noindex`; robots, sitemap e JSON-LD solo con `SITE_LAUNCHED=true` e build del ramo `main`.
- Il testo delle pagine passa da `rehype-sanitize`: l'HTML grezzo scritto nei contenuti non finisce nella pagina.
- Messaggi verso la redattrice in italiano, senza gergo di Git (niente "branch", "commit", "merge").
- Nessun segreto nel repository.
- Codice e documentazione del progetto in italiano; la terminologia tecnica (SEO, JSON-LD, build) resta in inglese.

## Struttura

```
astro.config.mjs        site e sitemap da getSiteConfig; sanitizer Markdown
src/config/site.ts      getSiteConfig (stato di lancio), absoluteUrl
src/content/            schemi Zod, limiti, negozio.json, pagine, immagini
src/lib/                schemaOrg, robots, llms, markdown
src/components/         SeoHead (title, canonical, Open Graph, noindex, JSON-LD)
src/layouts/            BaseLayout
src/pages/              index, robots.txt, llms.txt
tests/                  test unitari; tests/dist sui file generati
```
