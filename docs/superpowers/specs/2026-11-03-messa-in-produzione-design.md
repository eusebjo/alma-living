# Messa in produzione di Salvia social

Data: 2026-11-03. Stato: da approvare (eusebjo).

Documento di partenza: `docs/superpowers/specs/2026-10-29-varianti-di-prova-design.md`, §12 "Dopo la prova". Architettura e vincoli generali: `docs/superpowers/specs/2026-10-19-architettura-alma-living-design.md` e `CLAUDE.md`.

## 1. Intento

La prova di design è finita: eusebjo ha scelto **Salvia social**, rifinita sull'anteprima del ramo `fase2/1-varianti` (`/prova/salvia-social/`). Ora deve diventare il sito vero, su `https://almalivingviaricasoli.it/`, e la redattrice (Martina, account GitHub `martina-dimalta`) deve poterlo tenere vivo da sola.

Oggi prodotti, post e storie sono scritti nel codice (`src/prova/salvia-social/dati.ts`): senza il pannello ogni novità passerebbe dallo sviluppo e il sito sembrerebbe fermo dopo poche settimane ("L'ultimo post è del 28 ottobre"). Il pannello è il cuore di questo lavoro.

eusebjo vuole essere online **prima possibile**.

## 2. Obiettivi, non obiettivi, anti-obiettivi

**Obiettivi**
1. Salvia social sull'indirizzo principale (`/`), uguale all'anteprima di oggi.
2. Dal pannello, da telefono e da computer, Martina crea, modifica e cancella **prodotti degli scaffali** e **post**, e cambia il contenuto delle **storie**.
3. Le foto che carica dal pannello vanno in **Cloudflare R2**, mai nel repository (pubblico).
4. Il sito parte già pieno: i contenuti di oggi (8 prodotti, 13 post, 8 storie) passano nel pannello, con le loro foto che restano nel bucket R2 di oggi.
5. Il lancio: sito indicizzabile su `almalivingviaricasoli.it`, con i dati strutturati veri del negozio.

**Non obiettivi (decisi da eusebjo il 2026-11-03)**
- Partita IVA e informativa privacy.
- Prove su telefono vero, misure di velocità e accessibilità.
- Più autonomia della redazione (livelli ≥2): all'inizio eusebjo approva tutto; i limiti di `CLAUDE.md` ("Limiti noti prima del livello ≥2") restano da risolvere più avanti.
- Rendere modificabili dal pannello le altre parti della pagina: apertura, testi delle sezioni, fascia Instagram, finestra "Non lo trovi qui?", categorie degli scaffali.
- Creare o cancellare storie: restano le otto di oggi.

**Anti-obiettivi (sarebbe un fallimento anche se funziona)**
- Una foto caricata dal pannello finisce nel repository GitHub.
- Una chiave segreta (R2, GitHub, OAuth) nel repository, nel sito o in chat.
- Una modifica della redazione va online senza l'approvazione di eusebjo.
- Il sito online diverso dall'anteprima approvata (design, testi, comportamenti).
- Risorse di terzi caricate a pagina aperta (caratteri, immagini, script): le foto si servono dal sito o dal dominio del negozio.
- Pagine di prova (`/prova/`) ancora online dopo la messa in produzione.

## 3. Decisioni di eusebjo (2026-11-03)

- **Strada:** quella completa del §12 della prova, senza partita IVA/privacy e senza prove telefono/velocità/accessibilità.
- **Cosa fa la redazione:** post, storie e prodotti degli scaffali, da telefono e da computer. Nient'altro della pagina.
- **Approvazione:** ogni modifica passa da eusebjo, come oggi (livello 1).
- **Foto:** su R2, non nel repository pubblico. Confermato che la soluzione nativa di Sveltia per R2 va bene, con la chiave segreta inserita da Martina una volta per dispositivo (alternative valutate: repository privato con GitHub Pro, Cloudinary/Uploadcare, Worker che firma i caricamenti).
- **Playback approvato:** categorie fisse, otto storie fisse con contenuto modificabile, possibilità di togliere post e prodotti.
- **Bucket:** si usa quello che c'è già, `alma-living-prova`, invece di crearne uno nuovo (consiglio di Claude, approvato): le foto ci sono già. La scelta dell'Unione Europea non è più possibile per un bucket esistente, e per queste foto non serve.
- **Testi di prodotti e storie:** gli 8 prodotti e le 8 storie di `dati.ts` hanno testi scritti per la prova (dettagli, colori, date); solo i 13 post sono veri. Si migrano così come sono; dopo l'unione Martina li corregge dal pannello, e il lancio viene dopo la sua revisione.
- **Inquadratura semplice:** le foto si inquadrano con un elenco di posizioni (non con percentuali); eusebjo accetta che le foto di oggi si spostino di poco. Dove manca la seconda foto di un prodotto, l'ingrandimento della prima è al centro, con un testo alternativo composto in automatico (per esempio "Dettaglio di Lenzuola color sabbia").
- **Quando:** prima possibile.

## 4. Il sito

- **`/`** è la pagina Salvia social di oggi, con gli stessi componenti, testi, comportamenti e stili (scala dei caratteri, storie, menu, scheda a richiesta…). I dati di prodotti, post e storie vengono dalle collection del pannello invece che da `dati.ts`.
- **Layout e SEO:** la pagina usa `SeoHead` e lo stato di lancio di `getSiteConfig` (`CLAUDE.md`, "Stato di lancio"): `noindex` finché non è lanciata, poi indicizzabile con JSON-LD `HomeGoodsStore`, sitemap, robots. Non deve più forzare `noindex` come `LayoutProva`.
- **Dati del negozio:** nome, indirizzo, telefono e **orari** vengono da `src/content/negozio/negozio.json` (già nel pannello). Oggi la pagina di prova usa gli orari di esempio (`ORARI_PROVA`) e `negozio.json` ha solo il lunedì del collaudo: nella migrazione `negozio.json` riceve gli orari veri della scheda Google (lunedì-sabato 9:30-13:00 e 16:00-19:30, domenica chiuso), poi li corregge Martina. Instagram, link alle mappe, voto di Google e frase del marchio restano nel codice.
- **Restano nel codice, come oggi:** apertura (le dodici foto della vetrina), testi delle sezioni, fascia Instagram, finestra "Non lo trovi qui?" e finestra del filtro Mare, foto dei filtri, foto del negozio, categorie e loro ordine.
- **Spariscono:** `/prova/`, `/prova/salvia-social/`, l'elenco delle varianti (`src/prova/varianti.ts`), la home segnaposto di oggi (`src/pages/index.astro` con il testo "Questo è un testo segnaposto…"). Restano nella storia di git.
- **`/admin/`** resta com'è (pannello, login con il Worker `sveltia-cms-auth`).
- `llms.txt` oggi elenca la collection `pagine`: va rifatto sulla pagina nuova (vedi §7).

## 5. I contenuti nel pannello

Tre gruppi nuovi nel pannello, oltre a "Negozio". Tutti con il flusso editoriale di oggi (`publish_mode: editorial_workflow`, `publish: false`): Martina salva, invia in revisione, eusebjo approva e unisce. Nomi e testi del pannello in italiano, senza gergo di Git.

### 5.1 Prodotti degli scaffali (collection a cartella, un file per prodotto)

Martina crea, modifica e cancella i prodotti.

| Campo | Note |
|---|---|
| Nome | obbligatorio, per esempio "Plaid Abbracciami" |
| Dettaglio | riga breve sotto il nome, per esempio "Pile ricamato con frange, verde o rosso" |
| Categorie | una o più tra le sette fisse (Letto, Bagno, Bimbi, Tavola e cucina, Profumi per la casa, Natale e regali, Mare); la prima dà il nome mostrato sulla scheda |
| Novità | sì/no: al posto della categoria la scheda mostra "Novità" |
| Foto principale | obbligatoria, con testo alternativo e inquadratura |
| Seconda foto | facoltativa; se manca, la scheda mostra un dettaglio ingrandito della prima, al centro (§3) |
| Colori | facoltativi: nome e tinta del pallino; foto per colore facoltativa, ma per tutti i colori o per nessuno (regola di oggi) |
| Data | quando il prodotto è stato aggiunto: ordina gli scaffali (vedi §9) |

Il messaggio WhatsApp di "Chiedi disponibilità" si compone dal nome (e dal colore scelto) come oggi (`messaggioDisponibilita`).

### 5.2 Post (collection a cartella, un file per post)

Martina crea, modifica e cancella i post.

| Campo | Note |
|---|---|
| Data | obbligatoria; la griglia va dal più recente, e "L'ultimo post è del …" e "Aggiornato il …" la leggono da qui |
| Testo | obbligatorio |
| Foto | da 1 a più foto, ognuna con testo alternativo e inquadratura; con più foto la griglia mostra l'icona delle foto multiple e il post la galleria |
| Di cosa parla | facoltativo, per il messaggio WhatsApp ("sui cuscini di Natale"): se c'è, il messaggio lo nomina; se manca, il messaggio dice solo la data del post (vedi §9) |

### 5.3 Storie (collection a file: otto file fissi)

Le otto storie di oggi (Oggi, Arrivi, Vetrina, Casette, Candele, Bimbi, Tavola, Lenzuola) restano, nello stesso ordine. Martina non le crea né le cancella: ne cambia il contenuto.

| Campo | Note |
|---|---|
| Nome | fisso, non modificabile |
| Data | quella mostrata nella testata ("Alma Living · 28 ottobre") |
| Etichetta | facoltativa, sul cerchio: nessuna, "Oggi" o "Nuovo" |
| Invito | quello in evidenza nella scheda: WhatsApp, Indicazioni o Chiama |
| Foto | almeno una; ognuna con testo alternativo, inquadratura, **frase** e **soggetto** ("i plaid delle feste", per la scheda e il messaggio WhatsApp) |

La copertina del cerchio è la prima foto. La durata di ogni foto si calcola dalla frase (`durataFoto`), come oggi.

### 5.4 Cose comuni ai tre gruppi

- **Inquadratura:** oggi ogni foto ha un `object-position` scritto a mano. Nel pannello diventa un elenco di posizioni con un valore predefinito "al centro"; le inquadrature di oggi si traducono nella posizione più vicina (§3; i nomi e i valori delle posizioni li sceglie chi sviluppa, §10).
- **Testo alternativo** obbligatorio per ogni foto, con una frase d'aiuto nel pannello.
- **Limiti numerici** (lunghezze, numero di foto) solo in `src/content/limits.ts`, come vuole `CLAUDE.md`; le date nei file come `AAAA-MM-GG`, sulla pagina come oggi ("28 ottobre", con "dell'8"/"dell'11").
- **Schema Astro autorità:** ogni campo è nello schema Zod (`src/content/schemas.ts`), nella configurazione Sveltia e in `autonomia.yml`, tenuti allineati dai test come per `negozio` e `pagine`.

## 6. Le foto su Cloudflare R2

Sveltia 0.248.0 (la versione fissata) carica direttamente su R2: `media_libraries.cloudflare_r2` (documentazione: https://sveltiacms.app/en/docs/media/cloudflare-r2.md, letta il 2026-11-03).

- **Il bucket di oggi**, `alma-living-prova` (§3): le foto della pagina ci sono già, sotto `prova/`.
- **Indirizzo pubblico proprio:** un sottodominio collegato al bucket, proposto `foto.almalivingviaricasoli.it` (la zona è già su Cloudflare). `r2.dev` è "rate limited" e solo per sviluppo.
- **Prefissi:** `cms/` per le foto caricate dal pannello (`prefix` di Sveltia); le foto di oggi (quelle fisse del codice e quelle di prodotti, post e storie migrati) restano sotto `prova/`. Il nome "prova" resta nell'indirizzo delle foto, ma chi visita il sito non lo vede: le foto si servono da `/_astro/`.
- **Chiave:** un token R2 "Object Read & Write" limitato al solo bucket, creato da eusebjo. L'Access Key ID (pubblico) va in `config.yml`; la chiave segreta la inserisce Martina nel pannello la prima volta che apre la libreria delle foto, una volta per dispositivo, e resta nel suo browser. Non passa mai dal repository né dalla chat con Claude.
- **CORS del bucket:** permette `GET, PUT, DELETE, HEAD` dalle origini del pannello (almeno `https://almalivingviaricasoli.it`; anche `https://alma-living.sebjomuho.workers.dev` finché si usa) ed espone `ETag`. Anche l'indirizzo pubblico deve mandare gli header CORS per l'origine del pannello. *(Aggiornamento del 2026-11-03: in pratica il CORS salvato non ammette `DELETE`, così le cancellazioni e le rinomine di foto dal browser sono bloccate e il limite accettato qui sotto sulle cancellazioni non si presenta; il testo vero è in `CLAUDE.md`, "Foto del sito".)*
- **Trasformazioni:** restano quelle di oggi (`media_libraries.all.transformations`: WebP, qualità 85, dentro 2400 x 2400 px); secondo la documentazione valgono anche per R2.
- **Nei contenuti** finisce l'indirizzo assoluto della foto (`https://foto.almalivingviaricasoli.it/cms/…`). Lo schema accetta solo indirizzi che cominciano così (o con `…/prova/` per le foto migrate): nessuna immagine da altri domini.
- **Alla build** Astro scarica le foto da quell'indirizzo e le ottimizza come oggi, servendole da `/_astro/`: a pagina aperta nessuna richiesta a terzi. La build ha bisogno della rete verso l'indirizzo delle foto, come già verso Google Fonts.
- **Archivio interno disattivato:** senza `pagine` (vedi §7) il pannello non ha più bisogno di `media_folder`; se la documentazione lo conferma, si toglie e l'unico archivio è R2. Così sparisce anche il limite noto della libreria "File Multimediali" che salva su `main`.

**Limiti accettati:**
- Con la sua chiave Martina può anche cancellare o rinominare foto nel bucket dalla libreria delle foto, e questo non passa dall'approvazione: una foto cancellata sparisce dai contenuti che la usano. La guida le dice di caricare le foto solo dal campo "Immagine" e di non cancellare dalla libreria.
- Una foto caricata è pubblica appena caricata, anche se il post non è ancora approvato (chi non conosce l'indirizzo non la trova).
- La chiave nel browser vale finché eusebjo non la revoca; se un dispositivo si perde, si revoca il token e se ne crea uno nuovo.

## 7. Pannello, regole e controlli

- **Configurazione Sveltia** (`public/admin/config.yml`): tre collection nuove (`prodotti`, `post` a cartella con `create: true` e `delete: true`; `storie` a file con gli otto file), `publish: false` su tutte; la collection `negozio` resta.
- **La collection `pagine`** serviva solo la home segnaposto: si toglie dal pannello e dal sito (*scelta di Claude*, vedi §9). La meta description passa a `negozio.json`. `llms.txt`, sitemap e test che la usano si aggiornano.
- **`CLAUDE.md`, "Vincoli globali":** oggi dice `create: false` e `delete: false` sulla collection a cartella `pagine` e "media_folder globale obbligatorio". Si aggiorna: creare e cancellare sono permessi su `prodotti` e `post` (a livello 1, cioè con approvazione), le foto vanno su R2.
- **`autonomia.yml`:** `prodotti` e `post` con `azioni: { crea: 1, modifica: 1, elimina: 1 }`, `storie` con `{ crea: 0, modifica: 1, elimina: 0 }`; tutti i campi a livello 1, tranne il nome della storia (0, `readonly` nel pannello). La sezione `media` non permette più caricamenti nel repository.
- **`verifica-autonomia`** (`scripts/autonomia/`): valuta le proposte sui nuovi file con gli schemi veri (`schemi.ts`), come oggi; una proposta che aggiunge file fuori dalle cartelle consentite resta respinta.
- **Test:** come oggi, unitari e `tests/dist` sulla pagina generata; i test di `tests/dist` scritti per la prova valgono per `/`, e quelli che contano prodotti, post e storie leggono i contenuti delle collection.
- **Guida della redazione** (`docs/onboarding-redazione.md`): come aggiungere un prodotto, un post, una foto a una storia; la chiave delle foto la prima volta su ogni dispositivo; caricare le foto solo dal campo "Immagine", non cancellare dalla libreria.

## 8. Migrazione dei contenuti di oggi

- Le foto usate dalla pagina restano dove sono, nel bucket `alma-living-prova` sotto `prova/`: non si copia niente. I contenuti migrati le citano con l'indirizzo nuovo `https://foto.almalivingviaricasoli.it/prova/…`.
- Gli 8 prodotti, i 13 post e le 8 storie di `dati.ts` diventano file delle collection, con gli stessi testi, colori, categorie, date, soggetti, inviti e inquadrature di oggi. La pagina deve risultare identica all'anteprima di oggi.
- `negozio.json` riceve gli orari veri (§4).
- `scripts/foto-prova/` (preparazione e caricamento delle foto di prova) si toglie o si riduce a ciò che serve alle foto fisse del codice (*lasciato a chi sviluppa*).

## 9. Scelte di Claude (da controllare)

- **Contenuti migrati:** il sito parte con i contenuti di oggi, non vuoto.
- **Messaggio WhatsApp del post senza soggetto:** "Buongiorno, ho visto sul sito il vostro post del 28 ottobre. Mi date qualche informazione in più?".
- **Ordine degli scaffali:** dal prodotto aggiunto più di recente (campo Data), senza un numero d'ordine da gestire. Nella migrazione le date si scelgono in modo da tenere l'ordine di oggi.
- **Etichetta delle storie** ("Oggi", "Nuovo") modificabile da Martina.
- **Via la collection `pagine`** e la home segnaposto.
- **Indirizzo delle foto:** `foto.almalivingviaricasoli.it`.
- **Un ramo nuovo** per il lavoro, `fase2/2-produzione`, staccato dalla punta di `fase2/1-varianti` al momento dell'approvazione di questo documento. Da lì il ramo di prova non cambia più: ogni ritocco di design successivo si fa su `fase2/2-produzione`. "Uguale all'anteprima" vuol dire uguale a quella punta.
- **Descrizione per i motori di ricerca:** senza `pagine`, la meta description della home viene da `negozio.json` (`descrizione`, già nel pannello); il titolo della pagina resta nel codice.
- **Categorie vuote:** quando Martina toglie tutti i prodotti di una categoria, quel filtro sparisce dagli scaffali; solo Mare tiene la sua finestra "Il mare torna in primavera", come oggi. Così nessuna categoria mostra il testo del mare.
- **Anteprime vecchie:** l'anti-obiettivo su `/prova/` riguarda il sito su `almalivingviaricasoli.it`. L'anteprima del ramo di prova su `workers.dev` è `noindex` e non linkata; dopo l'unione eusebjo può cancellare il ramo, ma non serve altro.

## 10. Lasciato a chi sviluppa

- La struttura delle cartelle: dove spostare `src/prova/salvia-social/` e `src/prova/comune/` (per esempio `src/sito/`), cosa togliere della prova.
- Come Sveltia rende l'inquadratura (un elenco di posizioni, per esempio centro, alto, basso), e come si traducono le inquadrature di oggi.
- I limiti numerici dei campi, coerenti con i contenuti di oggi.
- Come Astro autorizza e scarica le foto remote (`image.remotePatterns` o equivalente) e come le foto fisse del codice arrivano alla build.
- La pagina `llms.txt` nuova e cosa entra nella sitemap.
- La verifica, nella documentazione di Sveltia 0.248.0, di: sintassi di `cloudflare_r2` a livello di campo, disattivazione di `media_folder`, comportamento con il flusso editoriale.

## 11. Flusso, anteprima e lancio

1. Il lavoro sta su `fase2/2-produzione`, con commit piccoli e gli stessi controlli di sempre (`npm test`, `npm run build`, `npm run test:dist`). eusebjo guarda l'anteprima di quel ramo.
2. Prima di unire, il ramo si allinea a `main` (oggi `main` ha 2 commit che il ramo di prova non ha: la documentazione del dominio).
3. Pull request verso `main`, controlli `build` e `verifica-autonomia`, unione di eusebjo con il bypass da amministratore, come le altre pull request di sviluppo. Dopo l'unione il sito su `almalivingviaricasoli.it` è la Salvia social, ancora `noindex`.
4. Collaudo veloce con Martina del pannello nuovo (un prodotto, un post, una foto in una storia, la chiave delle foto). Poi Martina corregge dal pannello i testi di prova degli 8 prodotti e delle 8 storie (§3), con le solite approvazioni.
5. **Lancio**, quando lo decide eusebjo: su Cloudflare `SITE_URL=https://almalivingviaricasoli.it` e `SITE_LAUNCHED=true`, poi una build di `main`. Facoltativo: Homepage della GitHub OAuth App sul dominio.

## 12. Cosa serve da eusebjo

Dal dashboard Cloudflare, di persona (Claude non vede chiavi né password):
- collegare al bucket `alma-living-prova` il sottodominio `foto.almalivingviaricasoli.it`;
- impostare il CORS del bucket (Claude prepara il testo);
- creare il token R2 "Object Read & Write" limitato al bucket; comunicare a Claude solo l'Access Key ID e l'Account ID; dare la chiave segreta a Martina di persona;
- approvare questo documento, poi unire la pull request e decidere il lancio.

## 13. Rischi

| Rischio | Mitigazione |
|---|---|
| Martina cancella dalla libreria una foto usata | Guida: foto solo dal campo "Immagine", niente cancellazioni dalla libreria; le foto migrate stanno sotto `prova/`, fuori dalla cartella `cms/` della libreria |
| La chiave segreta resta su un dispositivo perso | Token limitato a un bucket; eusebjo lo revoca e ne crea uno nuovo |
| Il supporto R2 di Sveltia ha comportamenti non documentati | Verifica nella documentazione e prova sull'anteprima prima dell'unione; il resto del sito non dipende dal pannello |
| La build non raggiunge l'indirizzo delle foto | La build fallisce e il sito online resta quello di prima (come oggi per le foto di prova) |
| Contenuti migrati diversi dall'anteprima | I test di `tests/dist` di oggi controllano testi, link e struttura sulla pagina nuova |
