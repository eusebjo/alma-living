# Alma Living: le tre varianti di prova del sito

- **Data:** 2026-10-29
- **Stato:** approvato da eusebjo il 2026-10-29
- **Ambito:** portare in codice, dentro l'architettura esistente, le tre varianti di design scelte da eusebjo, per provarle e correggerle finché una convince. La messa in produzione della variante scelta è un passo successivo con un suo documento (§12).
- **Riferimenti:** architettura in `docs/superpowers/specs/2026-10-19-architettura-alma-living-design.md`; regole di sviluppo in `CLAUDE.md`.

**Aggiornamento del 2026-10-30:** su decisione di eusebjo si costruisce solo la variante Salvia social; Salvia bianca e Cipria app non si realizzano. Il resto del documento vale per Salvia social.

## 1. Intento

eusebjo ha esplorato il design del sito su una tela di Claude Design, in cinque giri di proposte, e ha scelto tre varianti:
- **Salvia social:** bianco e verde salvia, titoli serif classici, storie tonde sotto l'header, apertura con foto che scorrono e una riga in stile post, sezione di Martina come profilo con griglia di post;
- **Salvia bianca:** molto bianco e aria, foto come stampe, saluto in forma di cartolina, sezione di Martina con un post in evidenza e le miniature degli altri;
- **Cipria app:** interfaccia da app in cipria e cacao, sezione di Martina come feed con una colonna laterale.

Ora vuole vederle come siti veri, provarle su telefono e computer, e chiedere cambi (togliere, aggiungere, spostare elementi) finché trova la quadra. Alla fine resterà una sola variante, che diventerà il sito online. È un **lavoro di prova**: conta poter cambiare in fretta e confrontare, senza rompere nulla di quello che già funziona.

## 2. Obiettivi, non obiettivi, anti-obiettivi

**Obiettivi**
1. Le tre varianti in codice, fedeli alle tavole della tela, consultabili su un indirizzo di anteprima stabile.
2. Ogni variante è un sito a pagina singola completo: header, apertura, collezioni, selezione di articoli con filtri e "Chiedi disponibilità", sezione di Martina con post e storie, il negozio con orari e indicazioni, footer, azione sempre visibile sul telefono.
3. Tutto è responsive: ogni pagina si adatta a qualunque larghezza, dal telefono piccolo allo schermo grande.
4. Le correzioni chieste da eusebjo arrivano sull'anteprima in pochi minuti, una variante alla volta, senza toccare le altre.

**Non obiettivi (in questa fase)**
- Collegare post, storie, articoli e collezioni al pannello di Martina: si farà solo per la variante scelta (§12).
- Decidere dove vivranno le foto che Martina caricherà dal pannello nel sito definitivo (§12).
- Lancio, dominio, indicizzazione, dati strutturati della variante scelta.

**Anti-obiettivi (sarebbe un fallimento anche se funziona)**
- Toccare `main`, il sito online o il pannello di Martina durante la prova.
- Foto di prova salvate su GitHub.
- Risorse caricate da terzi a pagina aperta (caratteri da Google, immagini da altri domini, script esterni).
- Pagine di prova indicizzate da Google.
- Un sito che va bene solo a una larghezza.

## 3. Decisioni di eusebjo

- Si parte dalle tre varianti scelte, così come sono state disegnate; le correzioni vengono dopo, provandole.
- È lavoro di prova dentro i flussi e l'architettura che esistono, in sicurezza.
- Le foto non si salvano su GitHub.
- Tutto deve essere responsive.
- Caratteri di terze parti ammessi, purché serviti dal nostro sito (deciso durante l'esplorazione del design).
- Nessun e-commerce, nessuna area riservata. Instagram solo come collegamento.

## 4. Vincoli

Valgono tutti i "Vincoli globali" di `CLAUDE.md`, con una modifica: la regola "Font di sistema in fase 1" diventa "caratteri scaricati alla build e serviti dal sito; nessuna richiesta a terzi a pagina aperta". La modifica di `CLAUDE.md` viaggia nello stesso ramo.

In particolare restano:
- output Astro statico, Node `>=22.22.0`, comandi che funzionano anche su Windows;
- nessun tracciamento, nessuna risorsa da CDN di terzi, nessun contenuto incorporato (niente mappa di Google, niente feed di Instagram);
- prima di ogni invio: `npm test`, `npm run build`, `npm run test:dist` verdi e senza avvisi;
- commit in inglese con il trailer `Co-Authored-By`;
- nessun segreto nel repository.

## 5. Dove si lavora: le anteprime fanno da staging

Non serve un ambiente nuovo. Cloudflare costruisce un'anteprima per ogni ramo.

- **Ramo:** `fase2/1-varianti`, creato da `main`. Lo possono toccare solo gli admin (ruleset `rami-sviluppo`), quindi Martina non lo vede.
- **Indirizzo stabile:** `https://fase2-1-varianti-alma-living.sebjomuho.workers.dev`.
- **Pagine (scelta di Claude):**
  - `/prova/` è una pagina semplice che porta alle tre varianti;
  - `/prova/salvia-social/`, `/prova/salvia-bianca/` e `/prova/cipria-app/` sono le varianti.
  - La home `/` e il pannello `/admin/` restano quelli di oggi.
- **Durante la prova il ramo non si unisce a `main`.** Ogni tanto si riporta `main` dentro il ramo, per avere le ultime modifiche ai dati del negozio.
- Le anteprime non ricevono le variabili di Cloudflare, quindi sono già escluse da Google. In più le pagine `/prova/` portano sempre `noindex` e restano fuori da sitemap e `llms.txt`.

## 6. Dalla tela al codice

Le tavole della tela sono il disegno di riferimento. I sorgenti sono in `research_notes/Design UI/tela/project/`: `SalviaSocial.dc.html`, `SalviaBianca.dc.html`, `CipriaApp.dc.html` e i rispettivi `...Telefono.dc.html`. La cartella è solo locale ed esclusa da git. Le tavole non si copiano: si rifanno in Astro.

- **Fedeltà:** stessi colori, caratteri, impaginazione, testi, foto e interazioni delle tavole. Le differenze ammesse sono quelle che la tela non permetteva:
  - pagina responsive vera, al posto delle due viste fisse;
  - CSS vero (stati al passaggio, media query, `prefers-reduced-motion`);
  - accessibilità completa.
- **Struttura del codice (scelta di Claude, rifinibile):**
  - `src/prova/<variante>/dati.ts`: contenuti di esempio tipizzati di ciascuna variante (collezioni, articoli, post, storie, rubriche), fedeli alla sua tavola. Le tre tavole hanno articoli, storie e post un po' diversi; la prova serve a vedere i design come sono stati disegnati, quindi ognuna tiene i suoi (scelta di Claude). I contenuti definitivi si decidono con il pannello (§12).
  - Nome, indirizzo, telefono e link sono comuni e si leggono da `src/content/negozio/negozio.json`, come già fa la home.
  - **Orari:** durante la prova si usano quelli della scheda Google (lunedì-sabato 9:30-13:00 e 16:00-19:30, domenica chiuso), scritti una volta nei dati comuni di prova. `negozio.json` oggi contiene solo il lunedì inserito al collaudo. Quando Martina li avrà corretti dal pannello, le varianti passeranno a leggerli da `negozio.json` (al più tardi nella messa in produzione, §12).
  - **Colori e caratteri di ogni variante come gettoni** (proprietà CSS personalizzate) raccolti in un solo punto per variante (scelta di Claude). Così uno scambio di palette, per esempio una "Salvia app" con l'interfaccia di Cipria app nei colori salvia, costa poco. Anche una nuova variante costa poco: una cartella in più e una voce nell'elenco che alimenta `/prova/`.
  - `src/prova/comune/`: logica condivisa:
    - stato "aperto ora" e giorno di oggi;
    - link WhatsApp con messaggio già scritto;
    - link a telefono, mappe e Instagram;
    - lettore delle storie, apertura dei post, filtri, caroselli, menu.
  - `src/prova/<variante>/`: componenti e stili di ciascuna variante. Una correzione su una variante non tocca le altre.
  - `src/pages/prova/`: le quattro pagine.
- **Interazioni** in TypeScript del sito, senza librerie esterne, a miglioramento progressivo. Senza JavaScript i contenuti restano leggibili: la tabella degli orari al posto di "aperto ora", i post leggibili in pagina.
- **Orari e "aperto ora":** si calcolano nel browser dai dati del negozio, con il fuso orario di Roma.

## 7. Le foto: un bucket R2, scaricato alla build

- Le foto di prova stanno in un bucket R2 del nostro account Cloudflare, per esempio `alma-living-prova`, con lettura pubblica.
  - Sono le foto di Martina già usate sulla tela, negli originali.
  - La lettura pubblica serve perché le anteprime non ricevono variabili segrete.
- Prima di `astro build`, uno script Node del repository (`scripts/foto-prova/`) scarica nel progetto le foto elencate in un elenco versionato, cioè solo nomi di file.
  - La cartella di destinazione è esclusa da git.
  - Astro poi le ottimizza (AVIF e WebP, misure adatte) e le serve dal sito stesso.
- Se una foto manca o il download fallisce, la build si ferma con un messaggio chiaro: niente pagine con foto rotte.
- L'indirizzo pubblico del bucket non è un segreto e può stare nel codice.
- Nella build locale lo script non riscarica le foto già presenti.

## 8. I caratteri

- Si usano le Fonts API di Astro: i caratteri si scaricano alla build e si servono da `/_astro/fonts`, con alternative di sistema dalle metriche adattate.
- Caratteri per variante, come sulla tela:
  - **Salvia social:** Libre Caslon Display, Libre Caslon Text corsivo, Instrument Sans, Beth Ellen solo per la firma;
  - **Salvia bianca:** DM Serif Display, Instrument Sans, Beth Ellen;
  - **Cipria app:** Plus Jakarta Sans.
- Ogni pagina carica solo i caratteri della sua variante.
- I controlli sul sito generato verificano che nessuna regola `@font-face` e nessun foglio di stile puntino a indirizzi esterni, su tutte le pagine e non solo sul pannello.

## 9. Contenuti di esempio

- Gli stessi della tavola di ciascuna variante:
  - nomi e dettagli degli articoli, collezioni e rubriche;
  - post con date e didascalie nella voce del negozio;
  - storie, la frase del profilo Instagram e la firma "Martina, dal negozio".
- Dati veri: indirizzo, telefono, orari, link a Instagram e a Google Maps. Le stelle Google (5,0 su 5 recensioni) sono il dato attuale, scritto nei dati di esempio.
- Nessun prezzo, nessuna recensione inventata, nessun contatore social.

## 10. Qualità

- **Responsive:** si prova almeno a 360, 390, 768, 1024, 1440 e 1920 px, anche con il telefono ruotato. Nessuno scorrimento orizzontale della pagina.
- **Accessibilità (WCAG 2.2 AA):**
  - contrasto del testo almeno 4,5:1 e bersagli di almeno 24 px (44 px per le azioni principali sul telefono);
  - tutto usabile da tastiera, con focus visibile;
  - storie e post aperti si chiudono con Esc, tengono il focus dentro e lo restituiscono alla chiusura;
  - etichette per i controlli con sola icona;
  - movimento ridotto se chi visita lo chiede.
- **Prestazioni:**
  - la foto principale caricata subito, con priorità alta e senza animazione d'ingresso; le altre in differita;
  - JavaScript solo dove serve;
  - obiettivo Core Web Vitals "buono" (LCP ≤ 2,5 s, INP ≤ 200 ms, CLS ≤ 0,1) sul telefono.
- **Controlli automatici:** `tests/dist` si estende alle pagine `/prova/`:
  - `noindex`;
  - nessuna risorsa esterna;
  - lingua italiana;
  - un solo `h1`;
  - ogni immagine con `alt`;
  - le foto servite da `/_astro/`.

## 11. Il ciclo di prova

1. Claude costruisce le tre varianti sul ramo, verifica i controlli e le larghezze nel browser integrato, e pubblica il ramo.
2. eusebjo prova sull'anteprima, da telefono e computer, e chiede i cambi variante per variante.
3. Claude applica i cambi, ripete i controlli e aggiorna l'anteprima. Ogni cambio è un commit piccolo e descritto, così si può tornare indietro.
4. Si ripete finché eusebjo sceglie la variante.

## 12. Dopo la prova (fuori da questo documento)

Un documento e un piano a parte per la messa in produzione:
- la variante scelta su `/`, le altre e `/prova/` rimosse; restano nella storia di git;
- collezioni, articoli, post e storie nel pannello di Martina (schemi, configurazione Sveltia, regole di autonomia, possibilità di creare e cancellare voci);
- dove salvare le foto caricate da Martina;
- più autonomia per post e storie, dopo i limiti di sicurezza annotati in `CLAUDE.md`;
- lancio.

Il ramo di prova si unisce a `main` solo in quella fase, con il flusso normale: pull request, controlli `build` e `verifica-autonomia`, unione di eusebjo.

## 13. Cosa serve da eusebjo

- Creare il bucket R2 dal dashboard di Cloudflare e attivarne la lettura pubblica (per esempio l'indirizzo `r2.dev`).
- Caricare le foto di prova, oppure fare il login di `wrangler` perché le carichi Claude.
- Approvare questo documento.

**Domande chiuse:**
- **Foto, deciso da eusebjo il 2026-10-29:** le foto di prova possono essere pubbliche (bucket a lettura pubblica, anteprima aperta), comprese quelle dei fornitori o ritoccate. Si usano le 29 foto arrivate su WhatsApp (`foto/`, quasi tutte 600x800). Se Martina ne manda versioni a risoluzione più alta, si sostituiscono nel bucket senza cambiare il codice.
- **Orari, deciso da eusebjo il 2026-10-29:** quelli veri sono della scheda Google (lunedì-sabato 9:30-13:00 e 16:00-19:30, domenica chiuso). Si usano nella prova; Martina li correggerà dal pannello in `negozio.json`, che oggi in produzione mostra solo il lunedì del collaudo.

## 14. Lasciato a chi sviluppa

- Nomi dei file e dei componenti, organizzazione interna delle cartelle `src/prova/`.
- Come rendere il passaggio tra varianti nella pagina `/prova/` (semplice, non fa parte del design).
- Dettagli dello script delle foto: formato dell'elenco, cache, messaggi.
- Come estendere i test esistenti senza indebolirli.
