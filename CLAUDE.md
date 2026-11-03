# CLAUDE.md: istruzioni di sviluppo per Alma Living

Sito vetrina statico di Alma Living, negozio di biancheria per la casa in Via Ricasoli 51-53, 57125 Livorno.

- **Ruoli:** eusebjo orchestra il progetto e approva; Claude (via Claude Code) sviluppa; la compagna di eusebjo gestisce i contenuti dal pannello Sveltia.
- **Stack:** Astro 7 (output statico), Vitest, Cloudflare Workers con Static Assets.
- **Contenuti:** guida in `AGENTS.md` (cartelle, campi, limiti). Questo file riguarda lo sviluppo.
- **Spec:** `docs/superpowers/specs/2026-10-19-architettura-alma-living-design.md`
- **Piano di fase 1:** `docs/superpowers/plans/2026-10-19-fase-1-fondamenta.md`
- **Messa in produzione (fase 2):** spec `docs/superpowers/specs/2026-11-03-messa-in-produzione-design.md`, piano `docs/superpowers/plans/2026-11-03-messa-in-produzione.md`. La prova di design che l'ha preceduta (ramo `fase2/1-varianti`, spec `docs/superpowers/specs/2026-10-29-varianti-di-prova-design.md`) è finita: il design scelto, Salvia social, è la pagina `/`; prodotti, post e storie si cambiano dal pannello.
- **Onboarding della redazione:** `docs/onboarding-redazione.md` (guida in italiano che eusebjo segue con lei la prima volta)

## Comandi

Node `>=22.22.0` (come richiede Astro), npm. Funziona su Windows (PowerShell e Git Bash) e su Linux.

| Comando | Cosa fa |
|---|---|
| `npm ci` | Installa le dipendenze dal lockfile |
| `npm run dev` | Server di sviluppo su `http://localhost:4321` |
| `npm run build` | Build statica in `dist/`; serve rete verso Google Fonts (caratteri, vedi "Vincoli globali") e verso `foto.almalivingviaricasoli.it` (foto, vedi "Foto del sito"): Astro le scarica e le ottimizza in `/_astro/` |
| `npm run preview` | Serve `dist/` in locale |
| `npm test` | Test unitari e di contenuto (esclude `tests/dist`) |
| `npm run test:dist` | Test sui file generati in `dist/`: da lanciare **dopo** `npm run build` |

Prima di ogni commit: `npm test`, `npm run build`, `npm run test:dist`, tutti verdi e senza avvisi.

Negli script npm non usare la sintassi `VAR=x comando` (non funziona su Windows): se serve impostare variabili d'ambiente, si usa Node.

## Flusso: branch e pull request

- Nessun push diretto su `main`. Ogni modifica passa da un branch (`fase<N>/<n>-<nome>`, per esempio `fase2/2-produzione`) e da una pull request.
- Controlli obbligatori su `main`: `build` e `verifica-autonomia`, per ogni pull request. Le proposte della redazione richiedono anche l'approvazione di eusebjo (proprietario del codice, `.github/CODEOWNERS`). Le pull request di sviluppo non hanno un'approvazione separata: GitHub non lascia approvare la propria pull request, quindi le unisce eusebjo stesso con il bypass da amministratore della regola di approvazione (`main-approvazione`, modalità `pull_request`); i controlli obbligatori restano validi anche per lui.
- Branch di sviluppo (tutto tranne `main` e `cms/**`): li possono creare, aggiornare ed eliminare solo gli admin (ruleset `rami-sviluppo`, in `infra/github/`). Il pannello dei contenuti lavora solo su `cms/**`, così la redazione non può modificare una pull request di sviluppo. Le proposte da un fork sono sempre respinte da `verifica-autonomia`.
- La pull request riceve un'anteprima Cloudflare; eusebjo la guarda e la unisce (la redazione dopo l'approvazione, lo sviluppo con il bypass descritto sopra). Dopo il merge Cloudflare ricostruisce e pubblica.
- **Regole di `verifica-autonomia`** (`scripts/autonomia/`, regole in `autonomia.yml`): le proposte di account che non sono in `autonomia.yml` sono sempre respinte, come quelle da un fork. Una pull request da un ramo `cms/**` si valuta **sempre con le regole della redazione**, anche se la apre un account di sviluppo (la redazione può scrivere su quei rami: altrimenti le sue modifiche andrebbero online senza controlli con l'unione dell'admin): per lavoro di sviluppo non si usano rami `cms/`. Per la redazione il controllo legge i file alla versione da cui la proposta si è staccata da `main` (non alla punta di `main`), controlla i valori con gli schemi veri dei contenuti (`scripts/autonomia/schemi.ts`: gli errori che farebbe la build escono subito in italiano) e vuole che la proposta sia stata inviata dal pannello: lo stato "In revisione" (o "Pronti"), oppure "In Attesa di Eliminazione" per un prodotto o un post tolto, che il pannello apre già inviato (le etichette `sveltia-cms/pending_review`, `pending_publish` e `pending_deletion` sono in `stati_inviati`, `autonomia.yml`); una bozza no. Respinge anche i file nuovi o rinominati di `prodotti` e `post` il cui nome non è fatto di sole lettere minuscole, cifre e trattini (la data `AAAA-MM-GG` che dà il nome ai file del pannello lo è) e i post il cui nome comincia con `articolo-` (nella pagina gli articoli degli scaffali sono `articolo-<id>`). `autonomia.yml` non ammette nessun file multimediale (`media.percorsi: []`): ogni file fuori dalle cartelle dei contenuti, foto comprese, fa respingere la proposta della redazione.
- Commit in inglese, nello stile `feat:`, `fix:`, `chore:`, `docs:`. Ogni commit termina con una riga vuota e il trailer `Co-Authored-By` con il nome del modello usato e `<noreply@anthropic.com>`.
- Login a `gh` e `wrangler`, creazione di account, app OAuth e connessioni dal dashboard li fa eusebjo di persona: non si inseriscono né si leggono password o token.

## Indirizzi

- **Produzione:** https://almalivingviaricasoli.it (Worker `alma-living`, ramo `main`). È un Custom Domain del Worker, collegato dal dashboard Cloudflare il 2026-11-02: `wrangler.jsonc` non ha `routes`, quindi i deploy non lo tolgono. `http://` e `www.` portano al dominio principale con un 301, percorso e parametri compresi (Always Use HTTPS e una Redirect Rule della zona). Resta attivo anche https://alma-living.sebjomuho.workers.dev; dal lancio del 2026-11-03 canonical, Open Graph, `llms.txt` e sitemap puntano al dominio (vedi "Stato di lancio").
- **Dominio:** registrato su IONOS (Cloudflare Registrar non vende `.it`), DNS su Cloudflare (piano Free). Nella zona il Bot Preference Sync resta spento: aggiungerebbe a `robots.txt` righe che non vengono dal sito (prima del lancio avrebbe annullato anche il `Disallow: /`). I record della posta (MX, SPF, `autodiscover`, `_dmarc`) sono quelli di IONOS: l'uso dell'email è ancora da decidere. Il record TXT `google-site-verification=…` sul dominio verifica la proprietà "Dominio" di Google Search Console (aggiunto il 2026-11-03 con l'autorizzazione automatica da Cloudflare, sitemap `https://almalivingviaricasoli.it/sitemap-index.xml` inviata): non va tolto, altrimenti Search Console perde la verifica.
- **Foto:** https://foto.almalivingviaricasoli.it, dominio personalizzato del bucket R2 `alma-living-prova` (vedi "Foto del sito").
- **Repository:** https://github.com/eusebjo/alma-living (pubblico)
- **Anteprima di un branch:** `https://<branch con "/" sostituito da "-">-alma-living.sebjomuho.workers.dev`, per esempio il branch `fase1/2-anteprime` diventa `https://fase1-2-anteprime-alma-living.sebjomuho.workers.dev`. Il link affidabile è nei dettagli del controllo Cloudflare della pull request.

## Limiti noti prima del livello ≥2

Oggi ogni proposta della redazione richiede l'approvazione di eusebjo (livello 1). Quell'approvazione copre i limiti che riguardano il repository (come il controllo imitabile qui sotto), **non** quelli delle foto su R2, che il pannello scrive nel bucket senza passare da nessuna proposta (vedi la seconda voce). **Prima di attivare qualunque unione automatica (livello 2 e oltre) vanno risolti tutti.**

- **Il controllo `verifica-autonomia` si può imitare.** La regola su `main` (`infra/github/ruleset-main-protezione.json`) chiede i controlli `build` e `verifica-autonomia` indicando solo l'app che li pubblica (GitHub Actions, `integration_id` 15368). Chi può scrivere su un ramo `cms/**`, come la redazione, può aggiungere dall'interfaccia web di GitHub un workflow con un job chiamato `verifica-autonomia` che finisce sempre in verde: per GitHub è la stessa app, quindi vale come il controllo vero. Prima di una qualunque unione automatica il risultato del controllo va pubblicato da una **GitHub App dedicata**, limitata al solo `main`, e nella regola va richiesto il suo `integration_id`.
- **Le foto su R2 non passano dall'approvazione.** Il pannello scrive su R2 direttamente dal browser, con la chiave della persona, senza il flusso editoriale (le regole di `main` riguardano solo i file del repository): una foto è pubblica appena caricata, anche se il post non è ancora approvato (chi non conosce l'indirizzo non la trova). La sezione "File Multimediali" (Asset Library, nel menu del pannello) mostra la cartella `cms/` del bucket e lascia fare cose che restano fuori dall'approvazione:
  - **«Sostituisci»** tiene il nome della foto e ne cambia il contenuto: una foto già online cambia senza che nessuno approvi. In Sveltia 0.248.0 (schema JSON e sorgenti del pacchetto controllati) non esiste un'opzione di `config.yml` che la spenga: `readonly` esiste solo per l'intero pannello, per una collection e per una `asset_collection`.
  - **Sottocartelle sotto `cms/`:** la redazione può crearle e caricarci foto. Il controllo dei contenuti le respinge (`eIndirizzoFoto` accetta solo `/<cartella>/<nome>`) con il messaggio «Carica la foto senza metterla in una cartella.» (`eFotoInSottocartella`), quindi quelle foto restano nel bucket senza essere usate.
  - **La chiave segreta** dà accesso in scrittura a tutto il bucket (anche `prova/`), anche senza il pannello: chi la ha può caricare e sovrascrivere oggetti finché eusebjo non revoca il token. Il CORS vincola solo i browser: con la chiave uno script può anche eliminare oggetti del bucket.
  - Eliminare e rinominare foto dal browser sono bloccati dal CORS del bucket (niente `DELETE`, vedi "Foto del sito"): il blocco sta nella configurazione del bucket, non nel repository.

  Per questo la redazione **non deve usare** la libreria "File Multimediali" (è scritto nella guida di onboarding): le foto si caricano solo dal campo "Foto" della voce, dentro il flusso editoriale.
- **Segreti futuri.** Oggi nel repository non ci sono segreti (la chiave segreta del token R2 sta nel password manager di eusebjo e nel browser di chi carica le foto: vedi "Foto del sito"). Quando serviranno, vanno in *Environments* di GitHub limitati ai rami consentiti (di norma `main`), mai tra i segreti del repository: chi scrive su `cms/**` può far girare dei workflow su quei rami e leggerebbe i segreti.

## Accesso al pannello

Il login a `/admin/` passa da GitHub tramite il Worker Cloudflare [`sveltia-cms-auth`](https://github.com/sveltia/sveltia-cms-auth), che custodisce il segreto OAuth fuori dal repository e dal browser.

- **Worker:** https://sveltia-cms-auth.sebjomuho.workers.dev (endpoint `/auth` e `/callback`). È l'unico `backend.base_url` in `public/admin/config.yml`, senza barra finale; `auth_endpoint` non si imposta (il predefinito `auth` coincide col Worker). Un test (`tests/sveltia-config.test.ts`) fissa l'indirizzo.
- **GitHub OAuth App:** Homepage `https://alma-living.sebjomuho.workers.dev`, Authorization callback URL `https://sveltia-cms-auth.sebjomuho.workers.dev/callback`. Si gestisce da GitHub, Settings → Developer settings → OAuth Apps, a cura di eusebjo. La Homepage è solo un'etichetta (il login non la usa); la callback resta quella del Worker anche con il dominio del sito.
- **Variabili del Worker** (dashboard Cloudflare, a cura di eusebjo): `GITHUB_CLIENT_ID` e `GITHUB_CLIENT_SECRET` (segreto), mai nel repository né in chat; `ALLOWED_DOMAINS` = `*.sebjomuho.workers.dev, almalivingviaricasoli.it`. La prima voce copre il `workers.dev` di produzione e le anteprime (`*` vale per qualunque sottodominio, ma non per il dominio nudo), la seconda il dominio del sito; `www` non serve, perché porta al dominio principale prima di arrivare al pannello. Se il sito cambia dominio, va aggiunto qui: altrimenti il Worker rifiuta l'accesso.
- **Deploy del Worker:** il repository `eusebjo/sveltia-cms-auth` (importato, non un fork) si pubblica con Workers Builds a ogni push. Il suo `wrangler.toml` ha `keep_vars = true`: senza, un deploy cancellerebbe le variabili di testo del dashboard (`ALLOWED_DOMAINS`, `GITHUB_CLIENT_ID`) e nessuno entrerebbe più nel pannello. Dopo un deploy si controlla che `https://sveltia-cms-auth.sebjomuho.workers.dev/auth?provider=github&site_id=almalivingviaricasoli.it` risponda con un redirect (302) verso GitHub.
- **Chi entra:** serve un account GitHub con accesso al repository `eusebjo/alma-living`; i permessi sul repository decidono chi può salvare. La redazione entra da https://almalivingviaricasoli.it/admin/ (provato da eusebjo il 2026-11-03); il pannello funziona anche su `workers.dev` e nelle anteprime. Per caricare foto serve anche la chiave del bucket (vedi "Foto del sito"), e il caricamento funziona solo dalle origini elencate nel CORS del bucket.

## Foto del sito

Le foto di prodotti, post e storie e quelle fisse della pagina stanno nel bucket R2 `alma-living-prova` (posizione EEUR), servito da `https://foto.almalivingviaricasoli.it`, dominio personalizzato del bucket (`FOTO_BASE` in `src/content/foto.ts`). Nessuna foto sta nel repository, che è pubblico: i contenuti citano l'indirizzo assoluto e solo quello, perché lo schema (`eIndirizzoFoto`) accetta `https://foto.almalivingviaricasoli.it/prova/<nome>` e `…/cms/<nome>`, senza altri host né sottocartelle.

- **`prova/`:** le foto migrate dalla prova di design e le foto fisse del codice (apertura, filtri, finestre, negozio: `src/sito/componenti/dati.ts`, per nome). Il nome del prefisso è quello di allora: chi visita il sito non lo vede, perché le foto si servono da `/_astro/`.
- **`cms/`:** le foto caricate dal pannello (`media_libraries.cloudflare_r2` in `public/admin/config.yml`, con `prefix: cms/`). Non c'è `media_folder` e l'archivio interno è spento (`media_libraries.default: false`): le foto vanno solo su R2, e `autonomia.yml` non lascia caricare file nel repository.
- **Nomi:** una foto caricata prende il suo nome, reso adatto agli URL (`slugify_filename`), più un trattino e 8 caratteri casuali (`filename_template: '{{filename}}-{{uuid_shorter}}'` sotto `media_libraries.all`), per esempio `img_1234-0b7c41d2.webp`. R2 sovrascrive senza chiedere un oggetto con lo stesso nome: senza il codice una foto nuova potrebbe cambiarne una già approvata.
- **Conversione:** nel browser, prima del caricamento: WebP, qualità 85, dentro un riquadro di 2400 x 2400 px (`media_libraries.all.transformations`).
- **Alla build:** Astro scarica le foto (`image.remotePatterns` in `astro.config.mjs`, solo da quell'host) e le ottimizza in `/_astro/`; a pagina aperta il browser non contatta mai quell'host. Se una foto citata da un contenuto non c'è più nel bucket, la build fallisce e il sito online resta quello di prima. Le misure di ogni foto si leggono una volta sola per indirizzo e con tre tentativi (`src/sito/comune/misure-foto.ts`, `riprova.ts`), quindi un errore passeggero di rete non ferma la build; se fallisce lo stesso con `FailedToFetchRemoteImageDimensions` o «Failed to load remote image», si rilancia. Dopo l'unione di una proposta si controlla in Cloudflare che la build di produzione su `main` sia verde.
- **Una foto fissa del codice** si carica a mano nel prefisso `prova/`: `npx wrangler r2 object put alma-living-prova/prova/<nome>.jpg --file=<file> --remote` (serve `npx wrangler login`, che fa eusebjo di persona; senza `--remote` scrive in locale). Poi si controlla con `curl -sI https://foto.almalivingviaricasoli.it/prova/<nome>.jpg` che `content-type` sia `image/jpeg` (altrimenti si ricarica con `--content-type=image/jpeg`) e si aggiunge `<nome>` con il suo testo alternativo a `ALT` in `src/sito/componenti/dati.ts`.
- **Togliere una foto dal bucket** lo fa eusebjo dal dashboard Cloudflare, dopo aver controllato che nessun contenuto la citi (`grep` dell'indirizzo in `src/content/`).

**Token R2.** Account API token `alma-living-pannello`, permesso «Object Read & Write», solo sul bucket `alma-living-prova`, senza scadenza (TTL Forever) e senza filtro IP, creato da eusebjo il 2026-11-03. Access Key ID e Account ID stanno in `config.yml` e non sono segreti. La chiave segreta (Secret Access Key) la tiene eusebjo nel suo password manager: non è mai nel repository né in chat. Ogni persona la inserisce una volta per browser e dispositivo; il pannello (in italiano, se il browser lo è) la chiede in due modi:

- dal menu dell'account, «Impostazioni», «File Multimediali», sezione «Chiavi API dei Servizi di Cloud Storage», casella «Cloudflare R2»: si preme Invio (o si tocca fuori dalla casella) e compare «Chiave API salvata.»; se la chiave non ha la forma giusta, «La chiave API fornita non è valida. Ricontrolla e riprova.»;
- la prima volta che si preme «Sfoglia» su un campo «Foto», il dialogo «Seleziona Immagine» dice «Inserisci la tua Secret Access Key per Cloudflare R2.» e ha una casella dove incollarla.

La chiave resta nelle preferenze del pannello di quel browser (le toglie «Cancella Tutti i Dati» in «Impostazioni»). La voce «Accedi con il Dispositivo Mobile» del menu dell'account (solo da computer) mette nel codice QR le preferenze insieme al token di GitHub, quindi anche la chiave: non è un canale previsto, la chiave si dà a mano. Se una chiave si perde o trapela, eusebjo elimina il token in Cloudflare (R2, API Tokens), ne crea uno nuovo con le stesse impostazioni, aggiorna l'Access Key ID in `config.yml` con una pull request di sviluppo e fa inserire la nuova chiave su ogni dispositivo.

**CORS del bucket** (dashboard Cloudflare, a cura di eusebjo, salvato e verificato il 2026-11-03):

```json
[{ "AllowedOrigins": ["https://almalivingviaricasoli.it", "https://alma-living.sebjomuho.workers.dev", "http://localhost:4321"],
   "AllowedMethods": ["GET", "PUT", "HEAD"], "AllowedHeaders": ["*"],
   "ExposeHeaders": ["ETag"], "MaxAgeSeconds": 3000 }]
```

Niente `DELETE`, apposta: una foto cancellata dal pannello mentre un prodotto o un post la usa farebbe fallire ogni build successiva, quindi le cancellazioni dal browser sono bloccate (il pannello mostra un errore) e le foto da togliere le toglie eusebjo dal dashboard. `localhost` serve per provare il pannello sul computer; le anteprime dei rami non sono nell'elenco, quindi lì il caricamento delle foto non funziona (l'origine dell'anteprima di `fase2/2-produzione`, usata per il collaudo, è stata tolta il 2026-11-03 dopo l'unione). Per provare un caricamento su un'anteprima si aggiunge la sua origine e la si toglie dopo. Per caricare, il pannello contatta anche l'API di R2 (`<account_id>.r2.cloudflarestorage.com`) e l'indirizzo delle foto.

## Stato di lancio

Il sito è lanciato dal 2026-11-03, per decisione di eusebjo: su Cloudflare `SITE_URL` = `https://almalivingviaricasoli.it` e `SITE_LAUNCHED=true`, quindi la build di produzione è indicizzabile. Lo decide `getSiteConfig` in `src/config/site.ts`, unica fonte per `astro.config.mjs`, `SeoHead`, `robots.txt` e `llms.txt`.

Variabili di build. Quelle impostate su Cloudflare valgono per la build di produzione (ramo `main`); **le anteprime (build degli altri rami) non le ricevono**:

| Variabile | Significato |
|---|---|
| `SITE_URL` | URL pubblico del sito. Se manca o è vuota vale `http://localhost:4321`; la barra finale viene tolta |
| `SITE_LAUNCHED` | `true` dal lancio del 2026-11-03; con `false` la produzione torna non indicizzabile |
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

Le variabili si cambiano dal dashboard Cloudflare (Worker `alma-living`, Settings → Build → Variables and secrets) e valgono dalla build successiva di `main`. Per togliere di nuovo il sito dai motori di ricerca: `SITE_LAUNCHED=false` e una nuova build di `main`; lo decide eusebjo.

## Vincoli globali

- Output Astro completamente statico: niente parti generate a ogni richiesta in fase 1.
- Lo schema Astro è l'autorità sui contenuti. I limiti numerici stanno solo in `src/content/limits.ts`.
- Ogni campo dello schema compare nella configurazione Sveltia: i campi a livello 0 in `autonomia.yml` sono `readonly: true`, gli altri no.
- Sveltia CMS: versione esatta fissata in `package.json`, backend `github`, `publish_mode: editorial_workflow`, `publish: false` su ogni collection. `prodotti` e `post` sono collection a cartella (un file JSON per voce) con `create: true` e `delete: true`: il nome del file nuovo è la data `{{fields.data}}` (`AAAA-MM-GG`, con `-1`, `-2`… se c'è già), non modificabile (`slug.editable: false`). Le collection a file (`negozio`, e `storie` con le otto storie fisse) non hanno queste opzioni: i file si modificano soltanto. Nessun `media_folder`: l'archivio interno è spento (`media_libraries.default: false`) e le foto vanno solo su R2 (vedi "Foto del sito"), convertite nel browser in un riquadro di 2400 x 2400 px (larghezza e altezza massime insieme). Il pannello è la pagina Astro `src/pages/admin/index.astro` (nessun layout del sito, `noindex`), che importa il pacchetto npm `@sveltia/cms` e chiama `CMS.init()`; la configurazione è `public/admin/config.yml`. Non si usa la build "CDN" (`dist/sveltia-cms.js`) né si copia nulla da `node_modules`: Vite impacchetta il pannello in `/_astro/`. `/admin/` non entra nella sitemap (`src/lib/sitemap.ts`).
- Il pannello contatta solo questi host esterni: `api.github.com` (e gli indirizzi degli avatar di GitHub) per leggere e salvare i contenuti, `www.githubstatus.com` (stato del servizio, già dalla schermata di accesso, non si disattiva), il Worker di autenticazione (`sveltia-cms-auth.sebjomuho.workers.dev`, vedi "Accesso al pannello") e, per le foto, l'API di R2 (`<account_id>.r2.cloudflarestorage.com`) e `foto.almalivingviaricasoli.it` (vedi "Foto del sito"). Font, traduzioni, decoder delle immagini e librerie sono locali. Dopo un aggiornamento di `@sveltia/cms` si ricontrollano le richieste di rete di `/admin/` nel browser: `tests/dist` guarda gli indirizzi scritti nei file ma non può provare cosa il pacchetto carica a runtime.
- Per provare il pannello sul computer: `npm run build` e `npm run preview`, poi `/admin/` (`http://localhost:4321` è tra le origini del CORS del bucket, quindi si prova anche il caricamento di una foto). Con `npm run dev` funziona, ma la documentazione di Sveltia sconsiglia una pagina Astro perché il server di sviluppo la ricarica a ogni modifica di un file e un salvataggio con "Work with Local Repository" può restare a metà.
- Nessun tracciamento. Nessuna risorsa da CDN di terzi sul sito. Sul pannello nessuna risorsa da CDN (jsDelivr, unpkg): vedi gli host elencati sopra. Caratteri: li scarica la build con la Fonts API di Astro (provider Google, famiglie in `FAMIGLIE_CARATTERI` di `src/sito/comune/caratteri-config.ts`) e il sito li serve da `/_astro/fonts`, quindi ogni build (locale, di Cloudflare e delle anteprime) ha bisogno della rete verso Google Fonts, mentre a pagina aperta non parte nessuna richiesta a terzi. `caratteri-config.ts` importa `astro/config` e lo legge solo `astro.config.mjs`: la pagina usa `src/sito/comune/caratteri.ts` (`CARATTERI_SITO`, le variabili CSS). Il pannello non usa questi caratteri.
- Anteprime e build non di lancio con `noindex`; robots, sitemap e JSON-LD solo con `SITE_LAUNCHED=true` e build del ramo `main`.
- Oggi nessun contenuto usa Markdown (prodotti, post e storie sono JSON, e la collection `pagine` non c'è più). Il sanitizer resta collegato in `astro.config.mjs` per un testo Markdown futuro: passa da `rehype-sanitize`, quindi l'HTML grezzo non finisce nella pagina, e subito dopo `rimuoviImmaginiEsterne` (`src/lib/markdown.ts`) toglie ogni immagine il cui indirizzo ha uno schema (`https:`, `data:`...) o comincia con `//`: nessuna risorsa di terzi nel testo. I test in `tests/dist` cercano nelle pagine generate anche gli indirizzi senza schema (`//host`).
- Messaggi verso la redattrice in italiano, senza gergo di Git (niente "branch", "commit", "merge").
- Nessun segreto nel repository.
- Codice e documentazione del progetto in italiano; la terminologia tecnica (SEO, JSON-LD, build) resta in inglese.

## Struttura

```
astro.config.mjs        site e sitemap da getSiteConfig; caratteri (Fonts API); foto remote autorizzate; sanitizer Markdown
autonomia.yml           regole di autonomia della redazione (lette da scripts/autonomia/)
public/admin/config.yml configurazione del pannello Sveltia
src/config/site.ts      getSiteConfig (stato di lancio), absoluteUrl
src/content.config.ts   le collection (negozio, prodotti, post, storie) con i loro schemi
src/content/            schemi Zod, limiti, categorie, indirizzi delle foto (foto.ts) e contenuti JSON:
                        negozio/, prodotti/, post/, storie/ (le otto storie fisse)
src/lib/                schemaOrg, robots, llms, markdown, sitemap
src/components/         SeoHead (title, canonical, Open Graph, noindex, JSON-LD)
src/pages/              index (la pagina del sito), admin (pannello), robots.txt, llms.txt
src/sito/contenuti.ts   dalle collection ai dati dei componenti (Articolo, Post, Storia)
src/sito/comune/        logica, script del browser, layout e dati condivisi (Salvia social)
src/sito/componenti/    componenti, dati fissi e tema di Salvia social
scripts/autonomia/      il controllo verifica-autonomia
infra/github/           ruleset di GitHub; .github/ ha i workflow e CODEOWNERS
tests/                  test unitari (tests/sito: logica e dati del sito; tests/autonomia: verifica-autonomia); tests/dist sui file generati
```
