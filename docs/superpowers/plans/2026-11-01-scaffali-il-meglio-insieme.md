# Scaffali "Il meglio insieme" e niente "Martina": piano di lavoro

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** sul ramo `fase2/1-varianti`, togliere "Martina" da tutta la pagina di Salvia social e rifare "Sugli scaffali adesso" come la variante 9 della tela, "Il meglio insieme". Gli elementi sono:
- una sola griglia;
- schede con due scatti;
- la finestra sullo scaffale;
- la scheda rapida "Chiedi disponibilità" con i colori.

**Architecture:**
- Le interazioni nuove sono protocolli `data-*` di `src/prova/comune/interazioni.ts`, documentati in cima al file:
  - due protocolli piccoli e nuovi, Interruttore e Colori;
  - un'estensione di Post: il dialog si apre anche da un link.
- I protocolli Chiedi e Carosello non li usa più nessuno: si tolgono. La variante resta senza JavaScript proprio.
- I testi li generano `src/prova/salvia-social/dati.ts` e `src/prova/comune/contatti.ts`, con i loro test, e la pagina li scrive negli attributi: nomi con il colore, messaggi WhatsApp, "scegli tra …". Lo script copia valori, non compone frasi.
- La finestra sta dopo la prima riga per solo CSS: `order` e `:nth-child(… of …)` sulle colonne note di ogni misura.
- `tests/dist/dist.test.ts` fissa il markup generato, `incoerenzeProtocolli` compreso. Il resto si controlla nel browser integrato: passaggio del mouse, posizione a vista, foglio dal basso.

**Tech Stack:** Astro 7.4 (output statico), TypeScript, Vitest; browser integrato per le verifiche.

**Spec:** `docs/superpowers/specs/2026-10-29-varianti-di-prova-design.md`.
- L'"Aggiornamento del 2026-11-01, secondo" è l'elenco autorevole dei cambi; valgono anche §6 e §10.
- Riferimento visivo, solo locale: `research_notes/Design UI/tela/project/ScaffaliInsieme.dc.html` (con `ScaffaliInsiemeTelefono.dc.html`). Le misure sono nella sezione `#selezione`, nel blocco della scheda rapida (dopo la fascia Instagram), nei valori `s.*` di `renderVals()` e nei commenti dalla riga 1102.
- Rispetto a `DiarioFascia.dc.html`, la versione 3 oggi in codice: `diff --strip-trailing-cr`.
- Note: `research_notes/Design UI/nona/brief_nona.md`, `versioni_scaffali_2.md` (§6-§9), `ricerca_schede.md`.

## Global Constraints

- **Ramo:** solo `fase2/1-varianti`, mai unito a `main` durante la prova. Anteprima: `https://fase2-1-varianti-alma-living.sebjomuho.workers.dev/prova/salvia-social/`.
- **Pagine `/prova/`:** sempre `noindex, nofollow`, nessun JSON-LD, nessuna risorsa esterna a pagina aperta.
- **Nessun JavaScript per variante:** ogni interazione passa da `interazioni.ts`, con il protocollo documentato in cima al file e le regole dei rimandi in `incoerenzeProtocolli`.
- **Miglioramento progressivo:** senza JavaScript si vedono tutte le 8 schede, leggibili. Toccare una scheda apre WhatsApp con il messaggio di disponibilità; le due finestre sono link semplici. La scheda rapida esiste solo con lo script.
- **Misure della griglia:**
  - fino a 767 px: 2 colonne, 4 schede, la finestra dopo la 2ª;
  - da 768 a 1023 px: 3 colonne, 6 schede, la finestra dopo la 3ª;
  - da 1024 px: 4 colonne, nessun limite, la finestra dopo la 4ª.
  - Il limite vale sulla lista filtrata (`LIMITI_SELEZIONE` non cambia). Se le schede non riempiono la prima riga, la finestra viene subito dopo.
  - Le media query sono quelle di oggi: `(max-width: 767px)`, `(767px < width <= 1023px)`, `(width > 1023px)`.
- **Foto:**
  - nessuna foto nuova da caricare: `elenco.json` non cambia e `npm run foto:carica` non serve;
  - torna in uso `asciugamano-bianco`;
  - il secondo scatto, dove manca una foto vera, è la stessa foto ingrandita 1,7 volte intorno a un punto;
  - le foto restano fuori da git.
- **Testi esatti:**
  - storie: "Le storie del negozio" e "Arrivi, vetrina e novità, per categoria";
  - diario:
    - occhiello "Il diario del negozio";
    - "Fotografiamo quello che succede in Via Ricasoli: gli arrivi, la vetrina che cambia, le confezioni preparate al banco. Tocca una foto per aprirla.";
    - `aria-label="Dal negozio, il diario"`;
  - finestra:
    - "Non lo trovi qui?", "In negozio c’è molto di più di quello che vedi qui.";
    - "Dicci cosa cerchi, per quale stanza e in che colore: ti rispondiamo con le foto su WhatsApp.";
    - "Scrivici su WhatsApp";
  - finestra con il filtro Mare:
    - "Collezione mare", "Il mare torna in primavera";
    - "Teli e plaid leggeri arrivano con la bella stagione. Se ti serve qualcosa adesso, chiedici cosa è rimasto in negozio.";
    - "Chiedi su WhatsApp";
    - sul telefono i due pulsanti dicono "Scrivici" e "Chiedi", e " su WhatsApp" resta per i lettori di schermo;
  - scheda: occhiello "Novità" oppure il nome della categoria, "Seconda foto: <nome>", "Chiedi disponibilità: <nome>";
  - scheda rapida:
    - "Chiedi disponibilità", "Chiudi", "Colore:", "Scegli il colore", "Colore <colore>";
    - "Il messaggio è già scritto: puoi cambiarlo prima di inviarlo.";
    - "Invia su WhatsApp", "Preferisci chiamare? 334 520 5451";
  - messaggio senza colore: "Buongiorno, ho visto sul sito «<nome>». È disponibile? Misura o colore: …";
  - messaggio con colore: "Buongiorno, ho visto sul sito «<nome> · <colore>». È disponibile?";
  - filtro senza articoli, per i lettori di schermo: ", nessun articolo adesso".
- **Accessibilità (WCAG 2.2 AA):**
  - pulsanti veri, con `aria-pressed` dove hanno uno stato;
  - focus visibile; Esc chiude e il focus torna dove era, come negli altri dialog;
  - bersagli di almeno 24 px, e 44 px per le azioni principali sul telefono;
  - contrasto del testo almeno 4,5:1, e 3:1 per i pallini colore;
  - `prefers-reduced-motion` toglie dissolvenze e ingrandimenti (la regola globale di `tema.css` basta).
- **Stile:** colori, ombre e raggi solo dai gettoni di `src/prova/salvia-social/tema.css`. Fanno eccezione le tinte dei pallini colore: sono dati dell'articolo e stanno in `dati.ts`.
- **Verifica di ogni compito:** `npm test`, `npm run build`, `npm run test:dist`, tutti verdi e senza avvisi, tranne quello già noto dei chunk di `/admin/`.
- **Commit:**
  - piccoli e in inglese (`feat:`, `fix:`, `docs:`);
  - chiusi da una riga vuota e dal trailer con il nome del modello che fa il commit, per esempio:

  ```bash
  git commit -F - <<'EOF'
  feat: short description

  Co-Authored-By: <modello che fa il commit> <noreply@anthropic.com>
  EOF
  ```
- **Lingua:** codice, commenti e testi in italiano; la terminologia tecnica resta in inglese.

## Scelte di questo piano (dove spec e tavola non decidono)

1. **La finestra dopo la prima riga, solo con il CSS.**
   - Nel DOM la finestra sta dopo le schede e dopo "Mostra tutti": così lettori di schermo e tabulazione leggono prima gli articoli, poi l'invito.
   - A vista la mette `order`: le prime K schede visibili, contate con `:nth-child(-n + K of [data-filtrabile]:not([hidden]))`, hanno `order: 1`, la finestra 2, le altre schede 3, "Mostra tutti" 4. K vale 2, 3 o 4 con le media query della griglia.
   - Funziona con filtri, limite e "Mostra tutti" senza ricalcoli, perché filtro e limite nascondono con `hidden`.
   - Si accetta un salto del focus: dalla 4ª scheda (sul computer dall'8ª) si torna su alla finestra. L'ordine non cambia il significato (WCAG 1.3.2 e 2.4.3).
   - Scartate due alternative:
     - un protocollo che sposta la finestra nel DOM a ogni filtro e a ogni cambio di misura: più codice, più fragile;
     - tre finestre per tre misure: contenuto ripetuto.
2. **La scheda si apre da un link, non da un pulsante.**
   - Tutta la scheda è coperta da `a.apri`, un link a WhatsApp con il messaggio di disponibilità: senza script porta lì, e la spec chiede che ogni scheda porti comunque a WhatsApp.
   - Con lo script, il protocollo Post esteso apre il dialog e annulla la navigazione. Con Ctrl, Cmd, Maiusc o Alt il link fa il suo.
   - Lo script aggiunge `aria-haspopup="dialog"` all'avvio: nell'HTML il link è un link semplice.
   - Il link è il primo elemento della scheda: dopo "Mostra tutti" il focus arriva lì e non sull'interruttore.
3. **Doppio scatto: due foto sovrapposte e un Interruttore, non la Galleria.**
   - La Galleria nasconde con `hidden`, che vince su tutto (`display: none !important`): niente dissolvenza e niente secondo scatto al passaggio del mouse, che la spec chiede.
   - Due pallini come pulsanti farebbero due fermate di tab per scheda.
   - Le due foto restano sempre nel DOM, il secondo scatto a opacità 0. `button[data-interruttore]` con `aria-pressed` passa all'altro scatto, e il CSS legge lo stato.
   - È lo stesso pulsante da 56 x 44 px a ogni misura, con due pallini disegnati: con due scatti, "scegliere lo scatto" e "passare all'altro" coincidono.
   - Le due foto hanno ciascuna il proprio `alt`, diverso: il CSS non può togliere dall'albero dell'accessibilità ciò che il passaggio del mouse mostra o nasconde, quindi chi usa un lettore di schermo sente le due foto, come in una piccola galleria.
4. **Passaggio del mouse e pallini, sul computer** (`(hover: hover) and (width > 1023px)`):

   | Situazione | Foto visibile e pallino lungo |
   |---|---|
   | Nessun passaggio | quella di `aria-pressed` (`false`: la prima) |
   | Mouse sulla scheda, non sull'interruttore | la seconda, ingrandita a 1,04 |
   | Mouse sull'interruttore | quella di `aria-pressed`, così il clic si vede |

   Sul tablet e sul telefono non c'è passaggio: valgono i pallini.
5. **La scheda rapida è un dialog per articolo, con il protocollo Post.** Apertura, chiusura con X, Esc o tocco fuori, e ritorno del focus ci sono già.
   - Fino a 767 px è un foglio dal basso.
   - Da 768 px è una finestra centrata: larga 680 px sul tablet, 780 px sul computer.
   - Nessuna voce nella cronologia per "Indietro": la spec non la chiede. Android Chrome chiude già un `dialog` modale con il tasto Indietro; va provato sul telefono vero (vedi le Note).
   - Si apre sempre sulla sua prima foto, non su quella mostrata dalla scheda.
   - Tiene il colore scelto finché la pagina non si ricarica.
6. **Colori: un protocollo nuovo.**
   - Plaid Abbracciami e Asciugamano con casetta hanno la foto di ogni colore. Lì la foto della scheda rapida è una Galleria di quelle foto, senza frecce né pallini bianchi: i pallini colore la comandano (`mostraFoto`), come sulla tavola.
   - L'Accappatoio con orsetto ha i colori senza foto: tiene i due scatti e l'Interruttore.
   - Premere un colore già scelto non fa nulla.
   - Il bordo dei pallini è più scuro della tavola: `rgb(28 28 26 / 0.5)` invece di 0,2. Il pallino bianco sul fondo bianco arriva così a 3:1 (WCAG 1.4.11).
7. **Misure del tablet,** che la tavola non ha:
   - schede con le misure del computer: freccia 44 px, testi 12, 24 e 15 px;
   - finestra alta 300 px, con il testo del computer, `padding: 32px 40px` e titolo di 30 px;
   - scheda rapida con la colonna della foto di 330 px (alta almeno 440 px) e il nome di 26 px;
   - filtri che scorrono di lato come sul telefono e vanno a capo da 1024 px.
8. **Codice che si toglie:** i protocolli Chiedi e Carosello, le regole di `incoerenzeProtocolli` su `data-chiedi`, la tessera "Non lo trovi qui?" in fondo alla lista e le regole del pannello che copriva la riga.
9. **Etichetta del diario:** la spec chiede l'`aria-label` "Dal negozio, il diario". Prende il posto di `aria-labelledby`; l'`h2` "Dal negozio" resta.
10. **Interruttore senza script:** non funzionerebbe, quindi con `@media (scripting: none)` non si mostra. Se lo script non si carica il pulsante resta visibile ma inerte: è un caso raro, e il link della scheda funziona comunque.

## Review Focus

1. **Clic sulla scheda con lo script attivo:** apre la scheda rapida e non WhatsApp. Con un tasto modificatore, o senza script, il link va a WhatsApp. Il test è in Task 4 (markup e `incoerenzeProtocolli`), la verifica in Task 4, step 5, e in Task 6.
2. **Mouse prima sulla scheda e poi sui pallini, sul computer:** sopra i pallini si vede lo scatto scelto, e il clic cambia davvero la foto, senza che il passaggio lo copra. Verifica in Task 2, step 6.
3. **La finestra con un filtro, con il limite o a un'altra misura:**
   - sempre dopo la prima riga di schede visibili;
   - con Bagno (3 schede): a 1440 px dopo la 3ª, a 390 px dopo la 2ª;
   - mai in cima, mai due finestre insieme;
   - con Mare, solo "Il mare torna in primavera".

   Test in Task 3 (ordine nel DOM, contenuti), verifica in Task 3, step 6, e in Task 6.
4. **Telefono ruotato o schermo basso, con la scheda rapida aperta:**
   - il foglio, o la finestra, scorre al suo interno e la X resta raggiungibile;
   - la pagina dietro non scorre;
   - un tocco sul velo chiude, un trascinamento che parte dentro no.

   Verifica in Task 4, step 5, e in Task 6.
5. **La frase accanto alle storie, più lunga di oggi:** da 1150 a 1920 px gli otto cerchi non scorrono mai di lato. La soglia si misura in Task 1, step 4, e si ricontrolla in Task 6.

---

### Task 1: il sito parla come Alma Living, senza "Martina" né carattere a mano

**Files:**
- Commit: `docs/superpowers/specs/2026-10-29-varianti-di-prova-design.md` (già aggiornata), questo piano
- Modify:
  - `src/prova/salvia-social/Apertura.astro`: commento in cima, `figcaption`, regole `.firmato` e `.firma`;
  - `src/prova/salvia-social/Diario.astro`: commento, occhiello, presentazione, `figcaption` del biglietto, regole `figcaption` e `.firma`, etichetta della sezione;
  - `src/prova/salvia-social/FilaStorie.astro`: commento, frase, soglia della frase;
  - `src/prova/salvia-social/dati.ts`: commento dell'apertura;
  - `src/prova/salvia-social/tema.css`: `--firma`;
  - `src/pages/prova/salvia-social/index.astro`: commento e `description`;
  - `src/prova/varianti.ts`;
  - `src/prova/comune/caratteri-config.ts`, `src/prova/comune/caratteri.ts`.
- Test: `tests/prova/salvia-social-dati.test.ts`, `tests/astro-config.test.ts`, `tests/dist/dist.test.ts`

**Interfaces:**
- Produces:
  - `CARATTERI_PROVA` e `CARATTERI_PER_VARIANTE['salvia-social']` senza Beth Ellen (`--font-beth-ellen`);
  - il gettone `--firma` non esiste più.

- [ ] **Step 1: committare spec e piano**

```bash
git add docs/superpowers/specs/2026-10-29-varianti-di-prova-design.md docs/superpowers/plans/2026-11-01-scaffali-il-meglio-insieme.md
git commit -F - <<'EOF'
docs: spec update and plan for the shelves and the shop voice

Co-Authored-By: <modello che fa il commit> <noreply@anthropic.com>
EOF
```

- [ ] **Step 2: scrivere i test che falliscono**

`tests/prova/salvia-social-dati.test.ts`:
- il test "l'apertura ha tre foto, ognuna con la frase di Martina" diventa "…ognuna con la sua frase";
- in più:

```ts
/** I sorgenti testuali sotto `cartella` (le foto e i loghi no). */
function sorgenti(cartella: string): string[] {
  return readdirSync(cartella, { withFileTypes: true }).flatMap((voce) => {
    const percorso = join(cartella, voce.name);
    if (voce.isDirectory()) return sorgenti(percorso);
    return /\.(astro|ts|css|mjs)$/.test(voce.name) ? [percorso] : [];
  });
}

it('nessun file della variante, dello script comune o delle pagine di prova nomina Martina', () => {
  const file = [...sorgenti('src/prova'), ...sorgenti('src/pages/prova')];
  expect(file.length).toBeGreaterThan(20);
  for (const f of file) expect(readFileSync(f, 'utf8'), f).not.toMatch(/martina/i);
});
```

`tests/astro-config.test.ts`: l'elenco esatto dei caratteri è `['Libre Caslon Display', 'Libre Caslon Text', 'Instrument Sans']`.

`tests/dist/dist.test.ts`, nel `describe` di Salvia social:

```ts
/** Il testo decodificato, con gli spazi (a capo compresi) ridotti a uno. */
const normalizza = (s: string) => decodifica(s).replace(/\s+/g, ' ');

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
```

- [ ] **Step 3: verificare che falliscano**

Run: `npm test -- tests/prova/salvia-social-dati.test.ts tests/astro-config.test.ts`, poi `npm run build && npm run test:dist`
Expected: FAIL. Nei sorgenti "Martina" c'è ancora, Beth Ellen è dichiarato, e nella pagina i testi sono quelli vecchi.

- [ ] **Step 4: implementare**
- `Apertura.astro`:
  - nel `figcaption` resta solo `.conta`, con `justify-content: flex-end`;
  - via le regole `.firmato` e `.firma`, anche nel blocco del computer;
  - il commento in cima parla di "il biglietto con la frase della foto mostrata".
- `Diario.astro`:
  - occhiello "Il diario del negozio" e presentazione dai Global Constraints;
  - via il `figcaption` del biglietto e le regole `figcaption` e `.firma`;
  - la sezione ha `aria-label="Dal negozio, il diario"` al posto di `aria-labelledby`;
  - nel commento, "Il diario del negozio: a sinistra l'introduzione con il biglietto; …".
- `FilaStorie.astro`:
  - `<p><span>Le storie del negozio</span>Arrivi, vetrina e novità, per categoria</p>`;
  - commento senza Martina.
  - **Soglia della frase** (Review Focus 5). La riga nuova è più lunga, quindi la soglia di 1380 px va alzata:
    1. nel browser integrato (`preview_start` con `sito-dev`, pagina `/prova/salvia-social/`, `resize_window` 1440 x 900), prima di cambiare il testo, annotare `document.querySelector('.invito p').getBoundingClientRect().width`;
    2. dopo il cambio, rileggere la stessa misura;
    3. alzare la soglia `@media (min-width: 1380px)` della differenza, arrotondata per eccesso alla decina;
    4. alla nuova soglia controllare che `const f = document.querySelector('.storie .fila'); f.scrollWidth <= f.clientWidth` sia `true`;
    5. aggiornare il commento sopra le due media query: "il solo link da 1150 px, anche la frase da <soglia> px".
- `dati.ts`: "ognuna con la frase di Martina" diventa "ognuna con la sua frase".
- `tema.css`: togliere `--firma`.
- `caratteri-config.ts`: togliere la voce Beth Ellen. `caratteri.ts`: togliere `'--font-beth-ellen'`.
- `index.astro`:
  - commento: "…storie sotto l'header, apertura come Diario, selezione, diario del negozio con griglia di post e fascia Instagram…";
  - `description="Variante di prova del sito di Alma Living: bianco e verde salvia, storie dal negozio, la selezione e il diario del negozio."`.
- `varianti.ts`: "Bianco e verde salvia, titoli serif classici, storie tonde sotto l’header, selezione dal negozio e diario con la griglia dei post."

- [ ] **Step 5: verificare**

Run: `npm test && npm run build && npm run test:dist`
Expected: tutto PASS, nessun avviso nuovo.

- [ ] **Step 6: commit**

```bash
git add src tests
git commit -F - <<'EOF'
feat: the page speaks as Alma Living, without Martina and the handwritten font

Co-Authored-By: <modello che fa il commit> <noreply@anthropic.com>
EOF
```

---

### Task 2: la scheda con due scatti e la freccia tonda

**Files:**
- Create: `src/prova/salvia-social/DueScatti.astro`
- Modify:
  - `src/prova/salvia-social/dati.ts`: `Articolo`, `articoli`, `occhielloArticolo`, `SCALA_DETTAGLIO`;
  - `src/prova/salvia-social/Foto.astro`: ingrandimento;
  - `src/prova/salvia-social/SchedaArticolo.astro`: riscritta;
  - `src/prova/salvia-social/Selezione.astro`: via le regole `.voce :global(.pannello)`;
  - `src/prova/comune/interazioni.ts`: Interruttore, via Chiedi, documentazione in cima.
- Test: `tests/prova/salvia-social-dati.test.ts`, `tests/dist/dist.test.ts` (anche `incoerenzeProtocolli`)

**Interfaces:**
- Produces, in `dati.ts`:
  - `export const SCALA_DETTAGLIO = 1.7;`
  - `export interface Ingrandimento { scala: number; origine: string }`: `origine` è il `transform-origin`, per esempio `'40% 68%'`;
  - `export interface ScattoArticolo extends Scatto { ingrandimento?: Ingrandimento }`;
  - `Articolo` non estende più `Scatto`: `{ id: string; nome: string; dettaglio: string; categorie: Categoria[]; novita: boolean; scatti: readonly [ScattoArticolo, ScattoArticolo] }`;
  - `export function occhielloArticolo(articolo: Articolo): string`: `'Novità'` se `novita`, altrimenti il `nome` della prima categoria.
- `Foto.astro`:
  - `scatto: Scatto | ScattoArticolo`;
  - con `ingrandimento`, lo `style` dell'immagine aggiunge `transform-origin: <origine>; --scala: <scala>`.
- `DueScatti.astro`:
  - props `{ scatti: readonly [ScattoArticolo, ScattoArticolo]; nome: string; larghezze: number[]; sizes: string }`;
  - disegna `div.due` con le due `Foto` (`class="scatto"`, la seconda `class="scatto secondo"`) e, dopo, `<button type="button" class="interruttore" data-interruttore aria-pressed="false" aria-label={`Seconda foto: ${nome}`}><span></span><span></span></button>`;
  - legge due proprietà CSS dal contenitore:
    - `--secondo`: 0 o 1, quale scatto si vede; vale 1 quando l'interruttore ha `aria-pressed="true"`;
    - `--interruttore-basso`: la distanza dell'interruttore dal fondo, predefinita 16px;
  - ingrandimento: `transform: scale(calc(var(--scala, 1) * var(--zoom, 1)))`.
- Protocollo Interruttore, da aggiungere in cima a `interazioni.ts`:
  - `button[data-interruttore]` con `aria-pressed`: un clic inverte `aria-pressed`;
  - il resto lo fa il CSS della variante, che legge lo stato, per esempio con `:has()`;
  - senza JavaScript il pulsante non fa nulla, e la variante lo nasconde con `@media (scripting: none)`.
- Il protocollo Chiedi non c'è più:
  - `PANNELLI = '[data-menu]'` e `APRITORI = '[data-menu-apri]'`;
  - `pannelloDelBottone` usa solo `aria-controls`;
  - in `alternaPannello` va via il ramo che porta il focus dentro `[data-chiedi-pannello]`.

- [ ] **Step 1: scrivere i test che falliscono**

`tests/prova/salvia-social-dati.test.ts`:
- nell'elenco `scatti`, `...articoli` diventa `...articoli.flatMap((a) => a.scatti)`;
- in più:

```ts
it('le coppie di scatti sono quelle della tavola', () => {
  expect(Object.fromEntries(articoli.map((a) => [a.id, a.scatti.map((s) => s.foto)]))).toEqual({
    sabbia: ['lenzuola-beige', 'lenzuola-beige'],
    abbracciami: ['abbracciami-verde', 'abbracciami-rosso'],
    orsetto: ['neonato', 'accappatoi-appesi'],
    volant: ['volant', 'trapunta'],
    casetta: ['asciugamano-rosso', 'asciugamano-verde'],
    tovaglia: ['tovaglia-volant', 'tovaglia-volant'],
    coperta: ['coperta', 'coperta'],
    saponi: ['bagno-prodotti', 'bagno-prodotti'],
  });
});

it('il secondo scatto è un altro: una foto vera, o un dettaglio ingrandito 1,7 volte con il suo alt', () => {
  expect(SCALA_DETTAGLIO).toBe(1.7);
  for (const { id, scatti: [primo, secondo] } of articoli) {
    expect(secondo.alt, id).not.toBe(primo.alt);
    if (secondo.foto === primo.foto) {
      expect(secondo.ingrandimento?.scala, id).toBe(SCALA_DETTAGLIO);
      expect(secondo.ingrandimento?.origine, id).toMatch(/^\d{1,3}% \d{1,3}%$/);
    } else {
      expect(secondo.ingrandimento, id).toBeUndefined();
    }
  }
});

it("l'occhiello è «Novità» al posto della categoria", () => {
  const per = (id: string) => occhielloArticolo(articoli.find((a) => a.id === id)!);
  expect(per('sabbia')).toBe('Novità');
  expect(per('orsetto')).toBe('Bimbi');
  expect(per('saponi')).toBe('Profumi per la casa');
});
```

`tests/dist/dist.test.ts`, `incoerenzeProtocolli`:
- via le regole e i casi su `data-chiedi`;
- regola nuova: ogni elemento con `data-interruttore` è un `button` con `aria-pressed="true|false"`;
- in `segnala %s`: `'<div data-interruttore></div>'` e `'<button data-interruttore>x</button>'`;
- in `non segnala %s`: `'<button type="button" data-interruttore aria-pressed="false">x</button>'`.

`tests/dist/dist.test.ts`, nel `describe` di Salvia social (importare `occhielloArticolo` e `messaggioDisponibilita` da `../../src/prova/comune/contatti`):

```ts
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
    const interruttore = /<button\b[^>]*\sdata-interruttore(?=[\s=>])[^>]*>/.exec(scheda)?.[0] ?? '';
    expect(valore(interruttore, 'aria-pressed')).toBe('false');
    expect(valore(interruttore, 'aria-label')).toBe(`Seconda foto: ${articolo.nome}`);
    expect(scheda).toContain(`>${occhielloArticolo(articolo)}</p>`);
    expect(scheda).toMatch(new RegExp(`<h3\\b[^>]*>${articolo.nome}</h3>`));
    expect(scheda).toContain(articolo.dettaglio);
  });
  expect(html()).not.toMatch(/\sdata-chiedi(?:-pannello)?=/);
});
```

- [ ] **Step 2: verificare che falliscano**

Run: `npm test -- tests/prova/salvia-social-dati.test.ts`, poi `npm run build && npm run test:dist`
Expected: FAIL. `scatti`, `SCALA_DETTAGLIO` e `occhielloArticolo` mancano; nella pagina ci sono ancora "Chiedi" e il pannello.

- [ ] **Step 3: implementare dati e protocollo**
- `dati.ts`, i due scatti di ogni articolo:
  - un helper locale `ingrandito(base: Scatto, origine: string, alt: string): ScattoArticolo` restituisce `{ ...base, alt, ingrandimento: { scala: SCALA_DETTAGLIO, origine } }`;
  - le coppie, con `posizione`, origine e alt dalla tavola:

    | id | primo scatto | secondo scatto |
    |---|---|---|
    | sabbia | `lenzuola-beige` `50% 40%` | ingrandito, origine `40% 68%`, "Dettaglio della balza bianca sulle lenzuola color sabbia" |
    | abbracciami | `abbracciami-verde` `50% 58%` | `abbracciami-rosso` `50% 40%` |
    | orsetto | `neonato` `50% 40%` | `accappatoi-appesi` `50% 30%` |
    | volant | `volant` | `trapunta` |
    | casetta | `asciugamano-rosso` | `asciugamano-verde` |
    | tovaglia | `tovaglia-volant` | ingrandito, origine `63% 48%`, "Dettaglio del volant e del profilo rosso della tovaglia" |
    | coperta | `coperta` | ingrandito, origine `54% 45%`, "Dettaglio del fiocco e del cartellino sulla coperta in maglia" |
    | saponi | `bagno-prodotti` `50% 72%` | ingrandito, origine `70% 64%`, "Dettaglio del cesto di saponi legato con lo spago e il cartellino" |

  - un ingrandito tiene la `posizione` del primo scatto;
  - `occhielloArticolo` come da Interfaces.
- `interazioni.ts`:
  - in `AZIONI`, `['[data-interruttore]', …]`, che inverte `aria-pressed`;
  - togliere Chiedi come da Interfaces;
  - aggiornare la documentazione in cima: via la voce Chiedi, aggiunta la voce Interruttore.

- [ ] **Step 4: implementare la scheda**

`DueScatti.astro`, come da Interfaces:
- `.due`: `position: relative; width: 100%; height: 100%`. Le immagini: `position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover`, con `transition: opacity 600ms ease, transform 900ms cubic-bezier(0.2, 0.7, 0.2, 1)`.
- `.secondo`: `opacity: var(--secondo, 0)`. `.due:has(> .interruttore[aria-pressed='true'])`: `--secondo: 1`.
- `.interruttore`:
  - `position: absolute; z-index: 2; left: 50%; bottom: var(--interruttore-basso, 16px); transform: translateX(-50%)`;
  - 56 x 44 px, `gap: 6px`, senza fondo né bordo;
  - pallini alti 7 px e arrotondati, con ombra `--ombra-punto`;
  - lo scatto mostrato ha il pallino lungo 18 px e `--bianco`, l'altro 7 px e `--punto-spento`, con `transition: width 300ms ease, background-color 300ms ease`;
  - focus visibile sulla foto: `outline: 2px solid var(--bianco); box-shadow: 0 0 0 4px var(--salvia-scura)`, raggio `--pillola`;
  - con `@media (scripting: none)`, `display: none`.
- `.due` e i suoi contenitori non creano un contesto di sovrapposizione (niente `z-index`, `isolation`, `transform`, `filter`): altrimenti l'interruttore resterebbe sotto il link della scheda.

`SchedaArticolo.astro`, il markup in quest'ordine:
- `<article class="scheda" aria-labelledby={titolo}>`, con dentro:
  - `<a class="apri" href={linkWhatsApp(negozio.whatsapp, messaggioDisponibilita(articolo.nome))} aria-label={`Chiedi disponibilità: ${articolo.nome}`}></a>`;
  - `div.foto`, con `<DueScatti … larghezze={[300, 450, 600]} sizes="(min-width: 1440px) 314px, (min-width: 1024px) 22vw, (min-width: 768px) 30vw, 46vw" />` e `<span class="freccia" aria-hidden="true"><Icona nome="freccia" misura={18} /></span>`;
  - `div.testo`, con:
    - `p.occhiello`, che ha anche la classe `novita` se l'articolo è nuovo. Se nuovo, prima del testo, `<span class="punto" aria-hidden="true"></span>`, poi `{occhielloArticolo(articolo)}`;
    - `h3`;
    - `p.dettaglio`.

`SchedaArticolo.astro`, lo stile per il telefono (fino a 767 px):
- `.scheda`: `position: relative`, nessun fondo né riempimento.
- `.apri`: `position: absolute; inset: 0; z-index: 1`, con il raggio della foto. Focus: `outline` `--salvia-scura`, `outline-offset: 4px`.
- `.foto`: `position: relative; aspect-ratio: 3 / 4; overflow: hidden`, raggio `--raggio-telefono` (18px), fondo `--sabbia`, `--interruttore-basso: 4px`.
- `.freccia`:
  - 36 px, a 8 px da destra e dal fondo, icona di 16 px (con il CSS);
  - fondo `--bianco`, testo `--nero`;
  - `box-shadow: inset 0 0 0 1px var(--bordo), var(--ombra-etichetta)`;
  - `transition` di fondo, colore e ombra in 250ms.
- `.testo`: `padding: 12px 2px 0`.
- `.occhiello`:
  - 11px, peso 600, `letter-spacing: 0.12em`, maiuscolo, `line-height: 1.4`;
  - colore `--grigio-testo`, che diventa `--salvia-scura` con `.novita`;
  - `display: flex; align-items: center; gap: 7px`;
  - `.punto` 6 px, tondo, `--salvia-scura`.
- `h3`: `--titoli`, 18px, peso 400, `line-height: 1.15`, `text-wrap: balance`, margine 4px sopra.
- `.dettaglio`: 13px, `line-height: 1.45`, `--grigio-testo`, `text-wrap: pretty`, margine 4px sopra.

`SchedaArticolo.astro`, da 768 px:
- foto con raggio `--raggio` (20px) e `--interruttore-basso: 16px`;
- `.freccia` di 44 px a 16 px dai bordi, icona di 18 px;
- `.testo` con `padding: 18px 4px 0`;
- occhiello 12px, `h3` 24px, dettaglio 15px, margini di 6px.

`SchedaArticolo.astro`, sul computer con il mouse (`(hover: hover) and (width > 1023px)`, scelta 4):
- `.scheda:hover:not(:has([data-interruttore]:hover))` imposta `--secondo: 1`;
- `.scheda:hover` imposta `--zoom: 1.04`;
- `.freccia` diventa piena (`--salvia-scura`, testo `--bianco`, anello `--salvia-scura`) con `.scheda:hover` e con `.apri:focus-visible ~ .foto .freccia`.

`Selezione.astro`: togliere le regole `.voce :global(.pannello)`.

- [ ] **Step 5: verificare**

Run: `npm test && npm run build && npm run test:dist`
Expected: tutto PASS, nessun avviso nuovo.

- [ ] **Step 6: provare il passaggio e i pallini (Review Focus 2)**

Nel browser integrato, a 1440 x 900, sulla prima scheda:
1. `computer` `hover` sulla foto, lontano dai pallini, poi 1 secondo di attesa: `getComputedStyle(document.querySelector('[data-filtrabile] img.secondo')).opacity` è `'1'`;
2. `hover` sull'interruttore: vale `'0'`;
3. clic sull'interruttore: `aria-pressed="true"` e l'opacità vale `'1'`;
4. un altro clic: `aria-pressed="false"` e l'opacità torna a `'0'`.

A 390 x 844, un clic sull'interruttore cambia la foto, e quello sulla foto (fuori dall'interruttore) porta a `wa.me`. Non seguire il link: basta controllare `href`.

- [ ] **Step 7: commit**

```bash
git add src tests
git commit -F - <<'EOF'
feat: selection cards with two shots and the round arrow

Co-Authored-By: <modello che fa il commit> <noreply@anthropic.com>
EOF
```

---

### Task 3: una sola griglia, i filtri con la foto e la finestra sullo scaffale

**Files:**
- Create: `src/prova/salvia-social/Finestra.astro`
- Modify:
  - `src/prova/salvia-social/Selezione.astro`, in buona parte riscritta;
  - `src/prova/salvia-social/dati.ts`: `fotoDeiFiltri`, `fotoFinestra`, commento di `LIMITI_SELEZIONE`;
  - `src/prova/comune/interazioni.ts`: via Carosello, documentazione in cima.
- Test: `tests/prova/salvia-social-dati.test.ts`, `tests/dist/dist.test.ts`

**Interfaces:**
- Consumes: `SchedaArticolo` (Task 2), invariata.
- Produces:
  - in `dati.ts`, `export const fotoDeiFiltri: Readonly<Record<'tutti' | Categoria, Scatto>>`:
    - `tutti` è `scaffale` a `50% 45%`;
    - ogni categoria ha lo scatto della sua voce in `collezioni` o in `altreCollezioni`, ricavato da quelle liste e non riscritto;
  - in `dati.ts`, `export const fotoFinestra: { scaffale: Scatto; mare: Scatto }`: `scaffale` a `50% 45%`, `mare` a `50% 35%`;
  - il commento di `LIMITI_SELEZIONE` dice "nessun limite da 1024 px (quattro colonne)" e che le stesse media query sono in `Selezione.astro`, `SchedaArticolo.astro` e `SchedaRapida.astro` (Task 4);
  - `Finestra.astro`, props `{ scatto: Scatto; occhiello: string; titolo: string; testo: string; href: string; azione: string; resto: string }`. Il pulsante mostra `azione` e, dentro `<span class="lungo">`, `resto`: per esempio "Scrivici" e " su WhatsApp".
- Il protocollo Carosello non c'è più. Si tolgono:
  - `aggiornaCarosello`, `aggiornaCaroselli` e `scorriCarosello`;
  - le due voci di `AZIONI`;
  - l'ascoltatore di `scroll` in cattura e quello di `resize`;
  - in `scegliFiltro`, il ritorno a sinistra dei binari;
  - le chiamate ad `aggiornaCaroselli` in `scegliFiltro`, `mostraTutti`, all'avvio e nell'ascoltatore di `matchMedia`;
  - la voce nella documentazione.

- [ ] **Step 1: scrivere i test che falliscono**

`tests/prova/salvia-social-dati.test.ts`: nell'elenco `scatti` vanno anche `...Object.values(fotoDeiFiltri)` e `...Object.values(fotoFinestra)`. In più:

```ts
it('ogni filtro ha il cerchietto foto della sua collezione, e "Tutto" lo scaffale', () => {
  expect(Object.keys(fotoDeiFiltri).sort()).toEqual(['tutti', ...categorie.map((c) => c.id)].sort());
  expect(fotoDeiFiltri.tutti).toMatchObject({ foto: 'scaffale', posizione: '50% 45%' });
  for (const c of [...collezioni, ...altreCollezioni]) {
    expect(fotoDeiFiltri[c.id], c.id).toMatchObject({ foto: c.foto, posizione: c.posizione });
  }
});
```

`tests/dist/dist.test.ts`, nel `describe` di Salvia social (importare `fotoFinestra` e `messaggi`):

```ts
it('niente carosello: una griglia sola', () => {
  expect(html()).not.toMatch(/\sdata-carosello/);
});

it('ogni filtro ha il cerchietto foto, decorativo; Mare dice che non ha articoli', () => {
  const filtri = [...html().matchAll(/<button\b[^>]*\sdata-filtro="([^"]+)"[^>]*>([\s\S]*?)<\/button>/g)];
  expect(filtri.map((m) => m[1])).toEqual(['tutti', ...categorie.map((c) => c.id)]);
  for (const [, id, dentro] of filtri) {
    const img = dentro!.match(/<img\b[^>]*>/g) ?? [];
    expect(img, id).toHaveLength(1);
    expect(img[0], id).toMatch(/\salt(?:="")?(?=[\s/>])/);
  }
  expect(decodifica(filtri.find((m) => m[1] === 'mare')![2]!)).toContain(', nessun articolo adesso');
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
  expect(vuota).toContain(`href="https://wa.me/393345205451?text=${encodeURIComponent(messaggi.mare)}"`);

  const scaffale = griglia.slice(finestra);
  expect(scaffale).toContain('In negozio c’è molto di più di quello che vedi qui.');
  expect(scaffale).toContain(`alt="${fotoFinestra.scaffale.alt}"`);
  expect(scaffale).toContain(`href="https://wa.me/393345205451?text=${encodeURIComponent(messaggi.cerco)}"`);
});
```

- [ ] **Step 2: verificare che falliscano**

Run: `npm test -- tests/prova/salvia-social-dati.test.ts`, poi `npm run build && npm run test:dist`
Expected: FAIL. `fotoDeiFiltri` manca, il carosello c'è ancora e i filtri sono senza foto.

- [ ] **Step 3: implementare dati, finestra e protocollo**
- `dati.ts` come da Interfaces.
- `interazioni.ts`: togliere Carosello come da Interfaces.
- `Finestra.astro`, il markup:
  - `div.finestra`, con `div.foto` che contiene la `Foto` (`larghezze={[300, 450, 600]}`, `sizes="(min-width: 1024px) 532px, 40vw"`);
  - poi `div.testo`, con `p.occhiello`, `h3`, `p.frase` e il link `a.azione`, che contiene l'icona `whatsapp` di 18 px, `{azione}` e `<span class="lungo">{resto}</span>`.
- `Finestra.astro`, lo stile della tavola:
  - `.finestra`:
    - griglia `minmax(0, 2fr) minmax(0, 3fr)`, cioè la foto al 40%;
    - fondo `--salvia-chiara`, `overflow: hidden`;
    - telefono: `min-height: 200px`, raggio `--raggio-telefono`;
    - tablet: 300px; computer: 360px; raggio `--raggio` da 768 px.
  - Foto:
    - `position: relative`, fondo `--sabbia`, immagine `absolute`, `inset: 0`, `object-fit: cover`;
    - sul computer, al passaggio, `scale(1.04)` in 900ms.
  - `.testo`: colonna centrata in verticale, allineata a sinistra.
    - Padding: `16px 14px 16px 16px` sul telefono, `32px 40px` sul tablet, `48px 64px` sul computer.
  - `.occhiello`: 11px, 12px dal tablet, 13px dal computer; peso 600, `letter-spacing: 0.12em`, maiuscolo, `--salvia-scura`.
  - `h3`: `--titoli`, peso 400, `line-height: 1.12`, `max-width: 15em`, `text-wrap: balance`.
    - Misura: 19px sul telefono, 30px sul tablet, 40px sul computer.
    - Margine sopra: 6px sul telefono, 12px dal tablet.
  - `.frase`:
    - nascosta fino a 767 px;
    - poi 17px, `line-height: 1.55`, `--verde-notte`, `max-width: 30em`, margine 14px sopra.
  - `.azione`: fondo `--salvia-scura`, che diventa `--salvia-scura-sopra` al passaggio; testo `--bianco`, peso 600, `white-space: nowrap`.
    - Telefono: `min-height: 44px`, margine 14px sopra, `padding: 0 16px 0 14px`, 14px.
    - Da 768 px: 50px di altezza, 28px sopra, `padding: 0 26px 0 22px`, 15px.
  - `.lungo` fino a 767 px: nascosto alla vista e letto, come `.solo-lettori`.
- `Selezione.astro`, il markup:
  - Togliere `div.carosello`, `.comandi` e `.frecce`.
  - I filtri (`div.filtri`) vengono subito dopo `.intestazione`.
  - In ogni `button.filtro`, prima del nome, va `<Foto scatto={fotoDeiFiltri[id]} alt="" larghezze={[56, 84]} sizes="28px" class="cerchietto" />`.
  - Per il conteggio zero, al posto di `.quanti` va `<span class="solo-lettori">, nessun articolo adesso</span>`.
  - `ul.griglia` (non più `binario`, niente `data-carosello-binario`) tiene `data-limite`, `data-limite-regole` e `role="list"`. Contiene, in quest'ordine:
    1. le 8 `li.voce[data-filtrabile]`;
    2. `li.voce-mostra` con "Mostra tutti", com'è oggi;
    3. `<li class="voce-finestra" data-filtro-vuoto="selezione" hidden>`, con la `Finestra` del mare: `fotoFinestra.mare`, "Collezione mare", `messaggi.mare`, "Chiedi" e " su WhatsApp";
    4. `<li class="voce-finestra">`, con la `Finestra` dello scaffale: `fotoFinestra.scaffale`, "Non lo trovi qui?", `messaggi.cerco`, "Scrivici" e " su WhatsApp".
  - La tessera vecchia (`.voce-altro`, `.tessera`) va via.
  - Il commento in cima va riscritto: una griglia, colonne, limite, finestra, scelte 1 e 7.
- `Selezione.astro`, lo stile:
  - `.selezione`:
    - `padding-inline`: 16px fino a 767 px, 40px sul tablet, `var(--margine)` sul computer;
    - in basso 44px, 88px sul computer;
    - `.intestazione` senza un suo margine laterale.
  - `.filtri`:
    - fino a 1023 px: margine 20px sopra (32px sul tablet), scorrimento di lato a tutta pagina; `margin-inline` negativo pari al riempimento della sezione e `padding: 0 <stesso> 4px`;
    - da 1024 px: a capo, margine 32px sopra.
  - `.filtro`:
    - `padding: 0 16px 0 8px`;
    - `.cerchietto`: 28 x 28, tondo, `object-fit: cover`;
    - anello `0 0 0 1.5px`: `--vetro-chiaro` sul filtro premuto, `--grigio-chiaro` sugli altri (gettoni esistenti, i più vicini a 0,85 bianco e 0,08 nero della tavola).
  - `.griglia`:
    - `display: grid`, `list-style: none`, `padding: 0`;
    - telefono: `repeat(2, minmax(0, 1fr))`, `gap: 30px 10px`, margine 20px sopra;
    - tablet: tre colonne, `gap: 48px 20px`, margine 36px sopra;
    - computer: quattro colonne, `gap: 60px 24px`, margine 36px sopra.
  - `.voce-mostra` e `.voce-finestra`: `grid-column: 1 / -1`. `.voce-mostra` è centrata e senza riempimento.
  - Quando la finestra del mare si vede, l'altra sparisce: `.griglia:has(> [data-filtro-vuoto]:not([hidden])) > .voce-finestra:not([data-filtro-vuoto]) { display: none }`.
  - Togliere `.binario`, le frecce, `.tessera` e la regola oltre i 1441 px.
  - **Ordine a vista** (scelta 1):

```css
/* La finestra viene dopo la prima riga di schede visibili (filtro e limite
   nascondono con `hidden`): stesse media query di `LIMITI_SELEZIONE`. */
.voce { order: 3; }
.voce-finestra { order: 2; }
.voce-mostra { order: 4; }

@media (max-width: 767px) {
  .voce:nth-child(-n + 2 of [data-filtrabile]:not([hidden])) { order: 1; }
}
@media (767px < width <= 1023px) {
  .voce:nth-child(-n + 3 of [data-filtrabile]:not([hidden])) { order: 1; }
}
@media (width > 1023px) {
  .voce:nth-child(-n + 4 of [data-filtrabile]:not([hidden])) { order: 1; }
}
```

- [ ] **Step 4: verificare**

Run: `npm test && npm run build && npm run test:dist`
Expected: tutto PASS, nessun avviso nuovo.

- [ ] **Step 5: niente di più da togliere**

Run: `git grep -n "carosello\|chiedi-pannello\|data-chiedi=" -- src tests`
Expected: nessuna riga.

- [ ] **Step 6: la finestra a vista (Review Focus 3)**

Nel browser integrato, con `javascript_tool`, questa funzione verifica che la finestra visibile stia tra la riga N e la successiva:

```js
const sotto = (n) => {
  const schede = [...document.querySelectorAll('[data-filtrabile]:not([hidden])')];
  const finestra = [...document.querySelectorAll('.voce-finestra')].find((f) => f.offsetParent);
  const f = finestra.getBoundingClientRect();
  const prima = schede[n - 1]?.getBoundingClientRect();
  const dopo = schede[n]?.getBoundingClientRect();
  return (!prima || prima.bottom <= f.top) && (!dopo || f.bottom <= dopo.top);
};
```

Controlli:
- a 390 x 844, `sotto(2)` con Tutto, con Bagno e dopo "Mostra tutti";
- a 768 x 1024, `sotto(3)`;
- a 1440 x 900: `sotto(4)` con Tutto, `sotto(3)` con Bagno;
- con Mare, a ogni misura, si vede solo la finestra del mare.

- [ ] **Step 7: commit**

```bash
git add src tests
git commit -F - <<'EOF'
feat: one selection grid, filters with a photo and the shelf window after the first row

Co-Authored-By: <modello che fa il commit> <noreply@anthropic.com>
EOF
```

---

### Task 4: la scheda rapida "Chiedi disponibilità"

**Files:**
- Create: `src/prova/salvia-social/SchedaRapida.astro`
- Modify:
  - `src/prova/salvia-social/dati.ts`: `idSchedaRapida`;
  - `src/prova/salvia-social/SchedaArticolo.astro`: `data-post-apri` sul link;
  - `src/prova/salvia-social/Selezione.astro`: un dialog per articolo, dopo la `ul`;
  - `src/prova/comune/interazioni.ts`: protocollo Post e documentazione in cima;
  - `src/prova/salvia-social/tema.css`: gettoni e tinta della striscia della barra di scorrimento.
- Test: `tests/dist/dist.test.ts` (anche `incoerenzeProtocolli`)

**Interfaces:**
- Consumes: `DueScatti` e `occhielloArticolo` (Task 2), `messaggioDisponibilita` e `linkWhatsApp` di `comune/contatti.ts`.
- Produces:
  - `export function idSchedaRapida(articolo: Articolo): string` restituisce `` `articolo-${articolo.id}` ``. Lo usano il link della scheda (`data-post-apri`) e il dialog (`data-post`);
  - `SchedaRapida.astro`, props `{ articolo: Articolo; negozio: DatiNegozio }`: `<dialog class="scheda-rapida" data-post={idSchedaRapida(articolo)} aria-labelledby="<id titolo> <id nome>">`;
  - in `tema.css`:
    - `--velo-scheda: rgb(24 28 22 / 0.55)`, che da 768 px diventa `rgb(24 28 22 / 0.6)`;
    - `--ombra-rapida: 0 40px 120px -30px rgb(0 0 0 / 0.6)`;
    - `--raggio-foto-rapida: 14px`.
- Protocollo Post, da aggiungere alla sua voce in cima a `interazioni.ts`:
  - `[data-post-apri]` può essere anche un link `a[href]`, per esempio a WhatsApp.
  - Con lo script, un clic senza Ctrl, Cmd, Maiusc o Alt apre il dialog e annulla la navigazione (`preventDefault`).
  - Con un tasto modificatore, o se il dialog manca, il link fa il suo. Senza JavaScript porta al suo `href`.
  - All'avvio lo script dà `aria-haspopup="dialog"` ai link `a[data-post-apri]` che hanno il loro dialog.
  - `apriPost(c: Contesto, apri: HTMLElement, evento: MouseEvent): void`.

- [ ] **Step 1: scrivere i test che falliscono**

`tests/dist/dist.test.ts`, `incoerenzeProtocolli`:
- regola nuova: un `data-post-apri` sta su un `button`, oppure su un `a` con `href`;
- in `segnala %s`:
  - `'<a data-post-apri="x">Apri</a><dialog data-post="x"></dialog>'`;
  - `'<div data-post-apri="x"></div><dialog data-post="x"></dialog>'`;
- in `non segnala %s`: `'<a href="https://wa.me/1" data-post-apri="x"></a><dialog data-post="x"></dialog>'`.

`tests/dist/dist.test.ts`, nel `describe` di Salvia social:
- un helper `tagIn(testo, nome, attributo)` con la logica di `tagCon`, che diventa `tagIn(html(), nome, attributo)`;
- nel test "griglia dei post" l'elenco dei dialog si limita ai post: `dialogCon('data-post').filter(({ apertura }) => !valore(apertura, 'data-post')!.startsWith('articolo-'))`;
- test nuovi (importare `idSchedaRapida`):

```ts
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
```

- [ ] **Step 2: verificare che falliscano**

Run: `npm run build && npm run test:dist`
Expected: FAIL. Il link della scheda non ha `data-post-apri` e mancano i dialog.

- [ ] **Step 3: implementare**
- `dati.ts`: `idSchedaRapida` come da Interfaces.
- `interazioni.ts`:
  - `apriPost` riceve l'evento e annulla la navigazione solo se apre davvero il dialog e senza tasti modificatori;
  - all'avvio aggiunge `aria-haspopup` come da Interfaces;
  - documentazione in cima.
- `SchedaArticolo.astro`: sul link `.apri`, `data-post-apri={idSchedaRapida(articolo)}`.
- `Selezione.astro`: `{articoli.map((a) => <SchedaRapida articolo={a} negozio={negozio} />)}` dopo la `ul`, come `DialogPost` nel diario.
- `SchedaRapida.astro`, il markup:
  - nel dialog c'è `<article class="foglio">`, che contiene:
  - `.testa`, con:
    - `<span class="maniglia" aria-hidden="true">`, solo sul telefono;
    - `p.titolo#<id titolo>` "Chiedi disponibilità";
    - `<button type="button" class="chiudi" data-post-chiudi aria-label="Chiudi" autofocus>` con l'icona `chiudi` di 18 px;
  - `.foto`, con `<DueScatti … larghezze={[400, 600, 800]} sizes="(min-width: 1024px) 380px, (min-width: 768px) 330px, 156px" />`;
  - `.capo`, con `p.occhiello` (come sulla scheda, con il punto di Novità), `h2.nome#<id nome>` e `p.dettaglio`;
  - `.corpo`, con:
    - `div` con `p.messaggio` (`messaggioDisponibilita(articolo.nome)`) e `p.nota`;
    - `.azioni`, con `a.invia` (`linkWhatsApp(negozio.whatsapp, messaggio)`, icona `whatsapp`, "Invia su WhatsApp") e `a.chiama` (`negozio.telefonoHref`, "Preferisci chiamare? {negozio.telefono}").
  - Gli id derivano da `idSchedaRapida`, per esempio `<id>-titolo` e `<id>-nome`.
- `SchedaRapida.astro`, lo stile del dialog. È come `DialogPost`: il dialog copre lo schermo e non ha riempimento, così un tocco fuori dal foglio cade sul dialog e lo chiude.
  - `width: 100%; max-width: none; height: 100%; max-height: none; margin: 0; padding: 0; border: 0; background: var(--velo-scheda); overflow: hidden`;
  - `::backdrop` trasparente.
- Telefono (fino a 767 px), foglio dal basso:
  - Dialog aperto: `display: flex; align-items: flex-end`.
  - `.foglio`:
    - larghezza 100%, `max-height: calc(100dvh - 40px)`, `overflow-y: auto`, `overscroll-behavior: contain`;
    - griglia `156px minmax(0, 1fr)`, righe `auto auto auto`, `column-gap: 14px`;
    - `padding: 8px 16px max(16px, env(safe-area-inset-bottom))`;
    - raggio `var(--raggio-scheda) var(--raggio-scheda) 0 0`, fondo `--bianco`, ombra `--ombra-rapida`.
  - `.testa`: `grid-column: 1 / -1`, `padding: 0 0 8px`.
    - Maniglia: 36 x 4, raggio 2px, `--bordo`, centrata, 6px sotto.
    - Riga: titolo (12px, peso 600, `letter-spacing: 0.12em`, maiuscolo, `--salvia-scura`) e X (44 px, tonda, `--latte`, `--latte-sopra` al passaggio, `margin-right: -6px`).
  - `.foto`: colonna 1, riga 2, `position: relative`, `aspect-ratio: 3 / 4`, raggio `--raggio-foto-rapida`, `overflow: hidden`, fondo `--sabbia`; `--interruttore-basso: 6px`.
  - `.capo`: colonna 2, riga 2, `align-self: center`.
    - Occhiello 12px.
    - Nome: `--titoli`, 20px, `line-height: 1.12`, `text-wrap: balance`, margine 6px sopra.
    - Dettaglio: 14px, `--grigio-testo`, margine 6px sopra.
  - `.corpo`: `grid-column: 1 / -1`, riga 3, `padding-top: 16px`, colonna con `gap: 14px`.
    - Messaggio: `padding: 12px 14px`, raggio `var(--raggio-medio) var(--raggio-medio) var(--raggio-medio) 4px`, `--salvia-chiara`, 15px, `line-height: 1.45`.
    - Nota: 13px, `--grigio-testo`, margine 8px sopra.
  - `.azioni`: griglia con `gap: 2px`.
    - `.invia`: `min-height: 50px`, `--pillola`, `--salvia-scura` (`--salvia-scura-sopra` al passaggio), testo `--bianco`, 15px, peso 600.
    - `.chiama`: `min-height: 44px`, 14px, peso 500, `--nero`, sottolineato con spessore 1px e `text-underline-offset: 4px`.
- Da 768 px, finestra centrata:
  - Dialog aperto: `align-items: center; justify-content: center`.
  - `.foglio`:
    - `margin: 40px 56px` (sul tablet 40px), `max-height: calc(100dvh - 80px)`, raggio `--raggio-scheda`, nessun riempimento, nessuno spazio tra le colonne;
    - computer: larghezza `min(780px, 100vw - 112px)`, colonne `380px minmax(0, 1fr)`;
    - tablet: larghezza `min(680px, 100vw - 80px)`, colonne `330px minmax(0, 1fr)`;
    - righe `auto auto minmax(0, 1fr)`.
  - `.foto`:
    - colonna 1, righe `1 / span 3`, `aspect-ratio: auto`, raggio 0;
    - altezza minima 507 px sul computer, 440 sul tablet.
  - `.testa`: colonna 2, riga 1, `padding: 20px 22px 0 32px` (tablet `18px 18px 0 28px`); maniglia nascosta.
  - `.capo`: colonna 2, riga 2, `align-self: start`, `padding: 6px 32px 0` (tablet `6px 28px 0`), nome 30px (tablet 26px), dettaglio 15px.
  - `.corpo`: colonna 2, riga 3, `justify-content: flex-end`, `padding: 22px 32px 28px` (tablet `20px 28px 24px`).
- Schermi bassi da 768 px, cioè il telefono ruotato (`(width > 767px) and (max-height: 560px)`): `.foglio` con `margin: 16px` e `max-height: calc(100dvh - 32px)`, prima colonna di 220px, `.foto` con `min-height: 0`.
- `tema.css`:
  - i gettoni come da Interfaces;
  - dopo la regola di `dialog[data-post][open]`, una per `dialog.scheda-rapida[open]`: `background-color: color-mix(in srgb, rgb(24 28 22) 55%, #ffffff)`, che da 768 px diventa 60%.

- [ ] **Step 4: verificare**

Run: `npm test && npm run build && npm run test:dist`
Expected: tutto PASS, nessun avviso nuovo.

- [ ] **Step 5: provare nel browser (Review Focus 1 e 4)**. Se qualcosa non va, si corregge prima del commit e si ripete lo Step 4.

A 390 x 844:
1. un clic sulla foto della 1ª scheda, fuori dall'interruttore, apre `dialog[data-post="articolo-sabbia"]`:
   - il foglio tocca il fondo: `Math.round(document.querySelector('dialog[open] .foglio').getBoundingClientRect().bottom) === innerHeight`;
   - il focus è sulla X;
   - il link ha `aria-haspopup="dialog"`;
2. Esc lo chiude e il focus torna al link della scheda;
3. un clic sul velo in alto lo chiude;
4. un `left_click_drag` dal messaggio al velo non lo chiude.

Tasto modificatore, con `javascript_tool`:
- registrare `addEventListener('click', (e) => { window.__fatto = e.defaultPrevented; e.preventDefault(); }, { once: true })`;
- inviare al link un `new MouseEvent('click', { bubbles: true, cancelable: true, ctrlKey: true })`;
- `window.__fatto` è `false` e nessun dialog è aperto.

A 844 x 390 (telefono ruotato): la scheda rapida aperta scorre dentro (`.foglio`, `scrollHeight > clientHeight` e `scrollTop` che cambia) e la X si vede.

A 1440 x 900: finestra centrata larga 780 px, foto a sinistra.

- [ ] **Step 6: commit**

```bash
git add src tests
git commit -F - <<'EOF'
feat: quick view to ask availability, a sheet on the phone and a window on wider screens

Co-Authored-By: <modello che fa il commit> <noreply@anthropic.com>
EOF
```

---

### Task 5: i colori nella scheda rapida

**Files:**
- Modify:
  - `src/prova/comune/contatti.ts`: `messaggioDisponibilita`;
  - `src/prova/salvia-social/dati.ts`: `Colore`, `colori` dei tre articoli, `testoColori`, `nomeConColore`;
  - `src/prova/salvia-social/SchedaRapida.astro`;
  - `src/prova/comune/interazioni.ts`: protocollo Colori, documentazione in cima;
  - `src/prova/salvia-social/tema.css`: `--anello-pallino`.
- Test: `tests/prova/contatti.test.ts`, `tests/prova/salvia-social-dati.test.ts`, `tests/dist/dist.test.ts` (anche `incoerenzeProtocolli`)

**Interfaces:**
- Consumes: `SchedaRapida` e `idSchedaRapida` (Task 4); `mostraFoto` della Galleria.
- Produces:
  - in `contatti.ts`, `messaggioDisponibilita(articolo: string, colore?: string): string`:
    - senza colore, la frase di oggi;
    - con il colore, `` `Buongiorno, ho visto sul sito «${articolo} · ${colore}». È disponibile?` ``;
  - in `dati.ts`:
    - `export interface Colore { nome: string; tinta: string; foto?: Scatto }`;
    - `Articolo` riceve `colori?: readonly Colore[]`;
    - `export function nomeConColore(nome: string, colore: Colore): string` restituisce `` `${nome} · ${colore.nome}` ``;
    - `export function testoColori(colori: readonly Colore[]): string`: con due o più colori "scegli tra verde e rosso" o "scegli tra rosso, bianco e verde"; con uno, il suo nome; con nessuno, `''`;
  - `tema.css`: `--anello-pallino: rgb(28 28 26 / 0.5)` (scelta 6).
- Protocollo Colori, da aggiungere in cima a `interazioni.ts`:
  - Un contenitore `[data-colori="<nome>"]` con i pulsanti `button[data-colore="<colore>"]` (`aria-pressed`): premerne uno lo sceglie, ed è l'unico premuto; ripremerlo non fa nulla.
  - Ogni pulsante porta i testi del suo colore, già scritti nella pagina: `data-colore-nome`, `data-colore-testo`, `data-colore-messaggio` e `data-colore-href`.
  - Scelto un colore, gli elementi del contenitore con `[data-colore-dove="nome"]`, `"testo"` o `"messaggio"` ricevono come testo il valore corrispondente, e ogni `a[data-colore-dove="link"]` riceve `data-colore-href` come `href`.
  - Con `data-colore-foto="<n>"`, la galleria del contenitore (`[data-galleria]`) mostra la foto n, contando da 0.
  - Lo script non compone testi.

- [ ] **Step 1: scrivere i test che falliscono**

`tests/prova/contatti.test.ts`:

```ts
it('con il colore, il nome lo cita e la domanda su misura e colore sparisce', () => {
  expect(messaggioDisponibilita('Plaid Abbracciami', 'verde')).toBe(
    'Buongiorno, ho visto sul sito «Plaid Abbracciami · verde». È disponibile?',
  );
});
```

`tests/prova/salvia-social-dati.test.ts`: nell'elenco `scatti` vanno anche le foto dei colori. In più:

```ts
it('i colori sono quelli della tavola, con le foto dove ci sono', () => {
  const colori = Object.fromEntries(
    articoli.filter((a) => a.colori).map((a) => [a.id, a.colori!.map((c) => [c.nome, c.tinta, c.foto?.foto])]),
  );
  expect(colori).toEqual({
    abbracciami: [['verde', '#5e654f', 'abbracciami-verde'], ['rosso', '#b8263a', 'abbracciami-rosso']],
    orsetto: [['rosa', '#ddb3b8', undefined], ['sabbia', '#cdb896', undefined], ['azzurro', '#a9c7e0', undefined]],
    casetta: [
      ['rosso', '#a62630', 'asciugamano-rosso'],
      ['bianco', '#f4f1ea', 'asciugamano-bianco'],
      ['verde', '#2f5734', 'asciugamano-verde'],
    ],
  });
  // Un articolo ha la foto per tutti i suoi colori o per nessuno: altrimenti un pallino cambierebbe foto e un altro no.
  for (const a of articoli) {
    const conFoto = (a.colori ?? []).filter((c) => c.foto).length;
    expect([0, a.colori?.length ?? 0], a.id).toContain(conFoto);
  }
});

it('i testi dei colori', () => {
  const verde = { nome: 'verde', tinta: '#000' };
  const rosso = { nome: 'rosso', tinta: '#000' };
  const bianco = { nome: 'bianco', tinta: '#000' };
  expect(testoColori([verde, rosso])).toBe('scegli tra verde e rosso');
  expect(testoColori([rosso, bianco, verde])).toBe('scegli tra rosso, bianco e verde');
  expect(testoColori([verde])).toBe('verde');
  expect(testoColori([])).toBe('');
  expect(nomeConColore('Plaid Abbracciami', verde)).toBe('Plaid Abbracciami · verde');
});
```

`tests/dist/dist.test.ts`, `incoerenzeProtocolli`:
- regole nuove:
  - ogni `button[data-colore]` sta dentro un `[data-colori]`: il numero di pulsanti nella pagina è la somma di quelli dentro i contenitori (`contenutiCon`);
  - in ogni contenitore, ogni `data-colore-foto="n"` è minore del numero di `[data-galleria-foto]` del contenitore.
- In `segnala %s`:
  - `'<button data-colore="verde" aria-pressed="false"></button>'`;
  - `'<div data-colori="a"><div data-galleria><div data-galleria-foto></div></div><button data-colore="verde" data-colore-foto="1" aria-pressed="false"></button></div>'`.
- In `non segnala %s`: lo stesso secondo frammento con due `data-galleria-foto`.

`tests/dist/dist.test.ts`, nel `describe` di Salvia social (importare `nomeConColore` e `testoColori`):

```ts
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
    const conFoto = colori.every((c) => c.foto);
    // Con le foto dei colori: una galleria di quelle foto e niente interruttore; senza, i due scatti.
    expect((testo.match(/\sdata-galleria-foto(?=[\s=>])/g) ?? []).length, articolo.id).toBe(conFoto ? colori.length : 0);
    expect(/\sdata-interruttore(?=[\s=>])/.test(testo), articolo.id).toBe(!conFoto);
  }
});
```

- [ ] **Step 2: verificare che falliscano**

Run: `npm test -- tests/prova`, poi `npm run build && npm run test:dist`
Expected: FAIL. Mancano il secondo parametro di `messaggioDisponibilita`, `colori`, `testoColori` e i pulsanti nella pagina.

- [ ] **Step 3: implementare**
- `contatti.ts` e `dati.ts` come da Interfaces.
  - I `colori`, dalla tavola:
    - abbracciami: verde (`#5e654f`, `abbracciami-verde` a `50% 58%`) e rosso (`#b8263a`, `abbracciami-rosso` a `50% 40%`);
    - casetta: rosso (`#a62630`, `asciugamano-rosso`), bianco (`#f4f1ea`, `asciugamano-bianco`) e verde (`#2f5734`, `asciugamano-verde`);
    - orsetto: rosa (`#ddb3b8`), sabbia (`#cdb896`) e azzurro (`#a9c7e0`), senza foto.
  - Il commento di `tinta` dice che è un dato dell'articolo e non un gettone del tema.
- `interazioni.ts`:
  - `scegliColore(c: Contesto, pulsante: HTMLElement): void` in `AZIONI` per `[data-colore]`;
  - la foto passa da `mostraFoto(galleria, n)`;
  - documentazione in cima.
- `SchedaRapida.astro`, solo per gli articoli con `colori`:
  - `.foglio` riceve `data-colori={articolo.id}`.
  - Se tutti i colori hanno la foto (`conFoto`), al posto di `DueScatti` c'è `<div class="galleria" data-galleria>`:
    - un `<div class="diapositiva" data-galleria-foto hidden={i > 0}>` per colore, con la sua `Foto`;
    - nessuna freccia, nessun pallino bianco.
  - In testa a `.corpo`:
    - `<p class="colore"><span class="etichetta">Colore:</span> <span data-colore-dove="testo">{testoColori(colori)}</span></p>`;
    - `<div class="pallini" role="group" aria-label="Scegli il colore">`, con un `<button type="button" class="pallino" style={`--tinta: ${c.tinta}`}>` per colore e dentro `<span></span>`. Gli attributi del pulsante sono quelli del protocollo:
      - `data-colore={c.nome}`;
      - `aria-pressed="false"` e `aria-label={`Colore ${c.nome}`}`;
      - `data-colore-nome`, `data-colore-testo`, `data-colore-messaggio`, `data-colore-href`;
      - `data-colore-foto={conFoto ? i : undefined}`.
  - `data-colore-dove="nome"` sull'`h2`, `"messaggio"` su `p.messaggio`, `"link"` su `a.invia`.
- `SchedaRapida.astro`, lo stile:
  - `.colore`: 14px, `--grigio-testo`; `.etichetta` peso 600, `--nero`.
  - `.pallini`: `display: flex; margin: 2px 0 0 -12px`.
  - `.pallino`: 44 x 44, senza fondo né bordo.
    - Il `span` è un tondo di 20 px con fondo `var(--tinta)` e `box-shadow: inset 0 0 0 1px var(--anello-pallino)`.
    - Con `[aria-pressed='true']`: `0 0 0 2px var(--bianco), 0 0 0 3.5px var(--nero), inset 0 0 0 1px var(--anello-pallino)`, `transition` 200ms.
  - `.galleria` e `.diapositiva`: `position: absolute; inset: 0`; le immagini coprono il riquadro (`object-fit: cover`).

- [ ] **Step 4: verificare**

Run: `npm test && npm run build && npm run test:dist`
Expected: tutto PASS, nessun avviso nuovo.

- [ ] **Step 5: commit**

```bash
git add src tests
git commit -F - <<'EOF'
feat: colour swatches in the quick view change photo, name and message

Co-Authored-By: <modello che fa il commit> <noreply@anthropic.com>
EOF
```

---

### Task 6: verifica nel browser integrato e invio del ramo

**Files:**
- Modify: solo i file da correggere, se la verifica trova qualcosa. Ogni correzione è un commit `fix:` piccolo, con i tre comandi verdi.

- [ ] **Step 1: verifica completa**

Run: `npm test && npm run build && npm run test:dist`
Expected: tutto PASS, nessun avviso nuovo.

- [ ] **Step 2: aprire la pagina**

Nel browser integrato: `preview_start` con la configurazione `sito-dev` di `.claude/launch.json`, poi `http://localhost:4321/prova/salvia-social/`. A ogni misura: nessuno scorrimento orizzontale (`document.documentElement.scrollWidth <= innerWidth`) e nessun "Martina" (`get_page_text`).

- [ ] **Step 3: a 390 px** (`resize_window` 390 x 844)

Apertura e diario:
- il biglietto dell'apertura ha solo la frase e "1 di 3";
- il diario dice "Il diario del negozio", e il suo biglietto è senza firma.

Selezione:
- due colonne;
- 2 schede, la finestra (con "Scrivici", senza la riga di testo), 2 schede e "Mostra tutti gli 8": `sotto(2)` del Task 3;
- con Bagno, 3 schede, la finestra dopo la 2ª e nessun pulsante;
- con Mare, solo "Il mare torna in primavera", con "Chiedi";
- con Tutto e "Mostra tutti": 8 schede, la finestra dopo la 2ª, il focus sul link della 5ª scheda (`document.activeElement.closest('[data-filtrabile]')` è la 5ª visibile).

Scheda:
- l'interruttore cambia la foto, e il pallino lungo segue;
- il pulsante tondo misura 36 px e non tocca l'interruttore.

Scheda rapida:
- Plaid Abbracciami, foglio dal basso:
  - "Colore: scegli tra verde e rosso";
  - "Colore rosso" porta `aria-pressed="true"`, il nome "Plaid Abbracciami · rosso", la foto rossa, il messaggio e l'`href` di "Invia su WhatsApp" con "· rosso";
  - chiusa e riaperta, resta rosso.
- Accappatoio con orsetto: "azzurro" cambia nome e messaggio ma non la foto; l'interruttore cambia la foto.
- Asciugamano con casetta: "bianco" mostra `asciugamano-bianco`.
- Ripetere i controlli dello step 5 del Task 4: velo, Esc, trascinamento, tasto modificatore.

- [ ] **Step 4: a 768 px** (768 x 1024)
- Tre colonne, 6 schede, la finestra dopo la 3ª (`sotto(3)`), con la riga di testo e "Scrivici su WhatsApp", e "Mostra tutti gli 8".
- Nessun effetto al passaggio del mouse.
- Scheda rapida centrata, larga 680 px.
- A 844 x 390 (telefono ruotato), con la scheda rapida aperta: scorre dentro e la X si vede (Review Focus 4).

- [ ] **Step 5: a 1024 px** (1024 x 768)
- Quattro colonne, le 8 schede, la finestra dopo la 4ª, nessun "Mostra tutti".
- Filtri a capo.
- Scheda rapida centrata (780 px), alta al più lo schermo meno 80 px.
- Cambio di misura senza ricaricare, con `resize_window`:
  - a 1023 px, 6 schede e il pulsante;
  - a 767 px, 4 schede;
  - di nuovo a 1024 px, tutte, con la finestra sempre dopo la prima riga.

- [ ] **Step 6: a 1440 px** (1440 x 900)
- Colonne da circa 314 px, `gap` di 24 px e 60 px.
- Passaggio del mouse e pallini come nel Task 2, step 6 (Review Focus 2).
- Pulsante tondo verde al passaggio; foto della finestra che si avvicina.
- Con Bagno, la finestra dopo la 3ª scheda.
- Fila delle storie con la frase: `.fila` senza scorrimento a 1440 px, alla soglia del Task 1 e a 1920 px (Review Focus 5).
- Nessuno scorrimento orizzontale anche a 360, 1024 e 1920 px (§10).
- Poi `resize_window` con `preset: "desktop"`.

- [ ] **Step 7: correggere quanto trovato**, un commit `fix:` per problema, poi di nuovo Step 1.

- [ ] **Step 8: inviare il ramo, solo con il via di eusebjo**

```bash
git push origin fase2/1-varianti
```

Attendere la build Cloudflare del ramo, poi ripetere i controlli a 390 e 1440 px sull'anteprima `https://fase2-1-varianti-alma-living.sebjomuho.workers.dev/prova/salvia-social/`. Infine consegnare a eusebjo l'indirizzo e l'elenco dei cambi da provare.

---

## Note

**Superate dal nuovo disegno.** Queste voci delle "Note finali" del piano `2026-11-01-salvia-social-versione-3.md` non valgono più:
- il pannello "Chiedi disponibilità" che copriva la scheda vicina sul telefono, e il cambio di limite che nascondeva la scheda con il focus mentre il pannello era aperto: il pannello non c'è più;
- la pillola "Chiedi disponibilità" stretta sul tablet: non c'è più;
- tra le foto della banca non usate, `asciugamano-bianco` torna in uso. Restano `plaid-verde` e `asciugamani-bimbo`.

**Da rimandare alla messa in produzione (spec §12):**
- **Prove su iOS Safari e Android Chrome:**
  - il foglio dal basso;
  - il tasto Indietro di Android sulla scheda rapida, che Chrome dovrebbe già trattare come Esc. Su iOS il gesto indietro lascia la pagina: se serve, una voce nella cronologia all'apertura;
  - l'interruttore a 4 px dal fondo della foto.
- **Fuori dalla spec, non fatto:**
  - sfogliare con il dito la foto della scheda (lo suggeriscono la tavola e la ricerca);
  - aprire la scheda rapida sullo scatto mostrato dalla scheda;
  - frecce della tastiera per cambiare foto o colore nella scheda rapida.
- **Test del codice nel browser** (happy-dom o simile) per Interruttore, Colori e l'apertura da link, come per gli altri protocolli.
