# Storie "Scheda a richiesta" Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rifare il lettore delle storie di Salvia social come la versione 7 della tela, "Scheda a richiesta": tutto schermo, foto libera, pillola "Chiedi, chiama, vieni" che apre sul posto una scheda con i tre inviti, gesti come le storie delle app e niente menu dell'immagine del browser. Nella scheda **non** ci sono il titolo, la riga dell'invito e lo stato del negozio.

**Architecture:** Il protocollo "Storie" di `src/prova/comune/interazioni.ts` si estende con:
- la durata per foto;
- la scheda degli inviti (una per foto, parallela alle foto);
- la frase con "altro";
- il nascondere l'interfaccia tenendo premuto;
- i trascinamenti in su e in giù;
- il blocco di `contextmenu`.

La logica pura (zone del tocco, gesto verticale, durata) va in `gesti.ts` e `sequenza.ts`, con test. `DialogStorie.astro` è riscritto. I dati delle storie prendono il soggetto di ogni foto e l'invito di ogni storia.

**Tech Stack:** Astro 7 statico, TypeScript, CSS dei componenti, Vitest (unitari e `tests/dist`).

**Spec:** `docs/superpowers/specs/2026-10-29-varianti-di-prova-design.md`, "Aggiornamento del 2026-11-02, terzo: le storie sul telefono". Le regole comuni e la versione 7 sono in `research_notes/Design UI/dodicesima/versioni_storie.md`. La tavola di riferimento è `research_notes/Design UI/tela/project/StorieRichiesta.dc.html`: va **senza** titolo, riga dell'invito e stato. La causa del menu dell'immagine è in `research_notes/Design UI/dodicesima/ricerca_storie_tecnica.md`.

## Global Constraints
- **Lingua.** Codice, commenti e documenti in italiano; i commit in inglese (`feat:`, `fix:`, `chore:`, `docs:`) con riga vuota e `Co-Authored-By: <modello> <noreply@anthropic.com>`.
- **Prima di ogni commit:** `npm test`, `npm run build`, `npm run test:dist`, tutti verdi. L'unico avviso ammesso è quello noto di Vite sulla dimensione del pezzo di `/admin/`.
- **Risorse.** Nessuna risorsa di terzi, nessun tracciamento. Animazioni solo con `transform` e `opacity`.
- **Accessibilità.**
  - Bersagli di almeno 44 px; ogni comando ha un nome per i lettori di schermo; la zona dei tocchi resta `aria-hidden` e fuori dal tab.
  - Il focus da tastiera mette in pausa, come oggi.
  - Con `prefers-reduced-motion: reduce` nulla avanza da solo e niente transizioni.
- **I testi della pagina:**
  - `Chiedi, chiama, vieni`;
  - `Torna alla storia`;
  - `Indicazioni per Via Ricasoli`;
  - `Scrivici su WhatsApp`;
  - `Chiama il negozio`;
  - `altro` / `meno`;
  - `Indietro`, `Avanti`, `Metti in pausa la storia`, `Chiudi la storia` (come oggi).
- **Il messaggio WhatsApp:** `Buongiorno, ho visto la storia «<nome>» sul sito: <soggetto>. ` (con lo spazio finale).
- **Il contenuto della scheda.** Ci sono solo la miniatura, il soggetto, i tre inviti e "Torna alla storia". Mai "In negozio c'è molto di più", la riga dell'invito o lo stato del negozio.
- **Niente video** in questo piano.

## Review Focus
1. **Schermi bassi e telefono in orizzontale** (390 x 640 con le barre del browser, 844 x 390): testata, frase, pillola e scheda non si sovrappongono in modo illeggibile, e la scheda resta usabile. Se serve, scorre.
2. **Tastiera con la scheda aperta.**
   - Il focus entra nel primo invito.
   - Esc chiude la scheda e non il lettore.
   - Tab resta nel dialog.
   - Chiudendo la scheda il focus torna alla pillola.
3. **Trascinare non è toccare.** Un trascinamento (più di 10 px) non fa anche il tocco che va avanti o indietro, con il dito e con il mouse. Un trascinamento che comincia su un link o un pulsante della scheda non la chiude.
4. **Pressione lunga.** Ferma subito. Dopo 500 ms nasconde testata, frase, "altro" e pillola. Il rilascio riporta tutto e non cambia foto. Il menu del browser resta solo su link e pulsanti.
5. **Riduci movimento.** Nessun avanzamento e nessuna transizione, ma "altro", la scheda, i tocchi e le frecce funzionano.

---

### Task 1: Dati e logica pura

**Files:**
- Modify: `src/prova/salvia-social/dati.ts`
- Modify: `src/prova/comune/sequenza.ts`
- Modify: `src/prova/comune/gesti.ts`
- Modify: `src/prova/comune/interazioni.ts` (solo `toccoSullaStoria` e il commento delle zone: niente più "pausa" al centro)
- Modify: `src/prova/salvia-social/DialogStorie.astro` (solo la chiamata a `messaggioStoria`, per tenere la build verde: prima foto del gruppo)
- Test: `tests/prova/salvia-social-dati.test.ts`, `tests/prova/sequenza.test.ts`, `tests/prova/gesti.test.ts`

**Interfaces:**
- Produces:
  - `export type InvitoStoria = 'whatsapp' | 'chiama' | 'indicazioni';`
  - `FotoStoria` aggiunge `soggetto: string`;
  - `Storia` aggiunge `invito: InvitoStoria`;
  - `messaggioStoria(storia: Storia, foto: FotoStoria): string`;
  - `durataFoto(testo: string): number` (ms), in `sequenza.ts`;
  - `azioneDelTocco(x, larghezza, durataMs): 'prec' | 'succ' | null`, in `gesti.ts` (`AzioneTocco` diventa `'prec' | 'succ'`);
  - `SOGLIA_CHIUDI_PX = 80`, `SOGLIA_INVITO_PX = 60`, `SOGLIA_MOVIMENTO_PX = 10` (oltre questo spostamento su un asse non è un tocco);
  - `gestoDellaStoria(dx: number, dy: number): 'chiudi' | 'invito' | null`, in `gesti.ts`.

- [ ] **Step 1: Write the failing tests**

`tests/prova/gesti.test.ts` (sostituisce i casi a terzi di `azioneDelTocco`):
```ts
it('il 25% sinistro torna indietro, il resto va avanti (niente pausa al centro)', () => {
  expect(azioneDelTocco(0, 400, 50)).toBe('prec');
  expect(azioneDelTocco(99, 400, 50)).toBe('prec');
  expect(azioneDelTocco(100, 400, 50)).toBe('succ');
  expect(azioneDelTocco(200, 400, 50)).toBe('succ');
  expect(azioneDelTocco(399, 400, 50)).toBe('succ');
});
it('gestoDellaStoria: in giù da 80 px chiude, in su da 60 px apre la scheda, solo se più verticale che orizzontale', () => {
  expect(gestoDellaStoria(0, 80)).toBe('chiudi');
  expect(gestoDellaStoria(0, 79)).toBeNull();
  expect(gestoDellaStoria(0, -60)).toBe('invito');
  expect(gestoDellaStoria(0, -59)).toBeNull();
  expect(gestoDellaStoria(90, 85)).toBeNull();
  expect(gestoDellaStoria(Number.NaN, 200)).toBeNull();
  expect([SOGLIA_CHIUDI_PX, SOGLIA_INVITO_PX, SOGLIA_MOVIMENTO_PX]).toEqual([80, 60, 10]);
});
```
I casi esistenti su durata lunga, `NaN` e larghezza non valida restano.

`tests/prova/sequenza.test.ts`:
```ts
it('durataFoto: max(5 s, parole / 3 + 1 s), arrotondato al mezzo secondo', () => {
  expect(durataFoto('')).toBe(5000);
  expect(durataFoto('uno due tre quattro cinque sei sette otto nove')).toBe(5000); // 9 parole: 4 s
  expect(durataFoto(Array(13).fill('x').join(' '))).toBe(5500); // 5,33 s
  expect(durataFoto(Array(17).fill('x').join('  '))).toBe(6500); // 6,67 s
  expect(durataFoto(Array(19).fill('x').join('\n'))).toBe(7500); // 7,33 s
});
```

`tests/prova/salvia-social-dati.test.ts`:
- ogni foto di ogni storia ha un `soggetto` non vuoto, minuscolo all'inizio, senza punto finale;
- gli inviti, nell'ordine delle storie, sono:
  `['whatsapp', 'whatsapp', 'indicazioni', 'whatsapp', 'indicazioni', 'chiama', 'whatsapp', 'whatsapp']`;
- `messaggioStoria(arrivi, arrivi.foto[0])` vale esattamente `'Buongiorno, ho visto la storia «Arrivi» sul sito: i plaid delle feste. '`.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run tests/prova/gesti.test.ts tests/prova/sequenza.test.ts tests/prova/salvia-social-dati.test.ts`
Expected: FAIL (funzioni e campi mancanti).

- [ ] **Step 3: Implement**
- **I soggetti**, in `dati.ts` (quarto argomento di `fotoStoria`), nell'ordine delle foto:

  | Storia | Foto | Soggetto |
  |---|---|---|
  | Oggi | `scaffale` | `la parete dei plaid` |
  | Oggi | `camera-rosa` | `il copriletto trapuntato rosa` |
  | Arrivi | `plaid-rosso` | `i plaid delle feste` |
  | Arrivi | abbracciami rosso | `gli Abbracciami rossi e marroni` |
  | Vetrina | `gnomi` | `gli gnomi di stoffa` |
  | Vetrina | `cuori` | `i cuori dorati` |
  | Casette | asciugamano rosso | `l'asciugamano rosso con la casetta` |
  | Casette | asciugamano verde | `l'asciugamano verde con la casetta` |
  | Candele | `candele` | `le candele alla vaniglia` |
  | Bimbi | `neonato` | `gli accappatoi con l'orsetto` |
  | Bimbi | accappatoi appesi | `gli accappatoi rosa, bianchi e azzurri` |
  | Tavola | `tovaglia-volant` | `la tovaglia con il volant` |
  | Tavola | tavola | `la tavola delle domeniche` |
  | Lenzuola | `lenzuola-beige` | `le lenzuola color sabbia` |
  | Lenzuola | `volant` | `le parure con il volant` |

  Le chiavi tra parentesi sono quelle della tela; nel codice vale l'ordine delle foto di ogni storia. L'apostrofo è quello tipografico usato nel file (`’`).
- **`durataFoto`.** Conta le parole con `testo.trim().split(/\s+/).filter(Boolean).length` e restituisce `Math.max(5, Math.round((parole / 3 + 1) * 2) / 2) * 1000`.
- **`azioneDelTocco`.** Con `x < larghezza * 0.25` vale `'prec'`, altrimenti `'succ'`. Le guardie di oggi su durata e larghezza restano.
- **`gestoDellaStoria`.** Vale `null` se `!(Math.abs(dy) > Math.abs(dx))`; `'chiudi'` se `dy >= 80`; `'invito'` se `dy <= -60`; altrimenti `null`.
- **In `interazioni.ts`.** `toccoSullaStoria` perde il ramo `'pausa'`, e il commento del protocollo dice: 25% sinistro indietro, resto avanti, la pausa è il pulsante.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test`, poi `npm run build` e `npm run test:dist`.
Expected: tutti verdi. Se un test di `tests/dist` contava le zone a terzi, si aggiorna a 25/75.

- [ ] **Step 5: Commit**
`feat: stories know each photo's subject, the story's invite and how long a photo stays`

---

### Task 2: Il protocollo "Storie" (interazioni.ts)

**Files:**
- Modify: `src/prova/comune/interazioni.ts` (codice e commento in testa al protocollo "Storie")

**Interfaces:**
- **Consumes** (dal Task 1): `azioneDelTocco`, `gestoDellaStoria`, `SOGLIA_MOVIMENTO_PX`. La durata arriva dall'attributo `data-storia-durata`, scritto dal Task 3 con `durataFoto`.
- **Produces, il markup che il Task 3 scrive:**
  - `[data-storia-foto][data-storia-durata="<ms>"]`: durata della foto. Se non è un numero finito e positivo vale `DURATA_FOTO_MS` (6000).
  - In ogni foto, `[data-storia-frase]` e un `button[data-storia-altro][aria-expanded]` (con `hidden` nell'HTML).
  - In ogni gruppo:
    - un `button[data-storia-invito-apri][aria-expanded="false"]`;
    - tanti `[data-storia-invito]` quante le foto, nello stesso ordine (gli altri `hidden`), ognuno con i suoi link e un `button[data-storia-invito-chiudi]`.
  - **Stati scritti dallo script sul `dialog`:**
    - `data-storia-invito-aperto`;
    - `data-storia-nascosta`;
    - `data-aperta` sulla `[data-storia-frase]` aperta.

- [ ] **Step 1: Implement**
- **`StatoStoria`.** Aggiunge `invitoAperto: boolean`, `fraseAperta: boolean`, `durata: number` (della foto corrente) e il timer per nascondere l'interfaccia. Il tempo conta solo se `premuto`, `pausaUtente`, `invitoAperto` e `fraseAperta` sono tutti falsi. L'avanzamento delle barre usa `s.durata`.
- **`mostraStoria`.**
  - Chiude la scheda (senza spostare il focus) e la frase aperta, e legge `data-storia-durata` della foto.
  - Mostra il `[data-storia-invito]` con l'indice della foto (gli altri `hidden`).
  - Per la frase corrente mostra `data-storia-altro` solo se `scrollHeight > clientHeight + 1`.
- **"altro".** Un clic su `button[data-storia-altro]` alterna `data-aperta` sulla frase della sua foto e `aria-expanded`, e imposta `fraseAperta`.
- **La scheda.**
  - **Aprire** (`button[data-storia-invito-apri]`):
    - mette `data-storia-invito-aperto` sul dialog e `invitoAperto = true`;
    - imposta `aria-expanded="true"` sulle pillole;
    - porta il focus sul primo `a` o `button` del `[data-storia-invito]` visibile.
  - **Chiudere** (`button[data-storia-invito-chiudi]`): fa il contrario e riporta il focus sulla pillola del gruppo corrente.
  - **Esc** a scheda aperta (evento `cancel` del dialog): `preventDefault` e chiude solo la scheda.
- **Tenere premuto.** Al `pointerdown` sulla zona dei tocchi parte un timer di 500 ms (`NASCONDI_DOPO_MS`) che, se si tiene ancora premuto, mette `data-storia-nascosta` sul dialog. Rilascio e annullamento tolgono timer e attributo.
- **I trascinamenti.**
  - Al `pointerdown` si registra il punto di partenza, sulla zona dei tocchi o su un `[data-storia-invito]` aperto, ma non su `a` o `button`.
  - Al rilascio si usa `gestoDellaStoria(dx, dy)`:
    - dalla zona dei tocchi, `'chiudi'` chiude il dialog e `'invito'` apre la scheda;
    - dalla scheda, `'chiudi'` chiude la scheda.
  - Se lo spostamento supera `SOGLIA_MOVIMENTO_PX` su un asse, il clic che segue non conta come tocco (`c.durataTocco = NaN`).
- **Il menu del browser.** Un ascoltatore `contextmenu` sulla radice fa `preventDefault` se il bersaglio è dentro `dialog[data-storie]` e non dentro `a` o `button`.
- **Il commento in testa** descrive tutto questo, nello stile di oggi. Togli dal commento quello che non vale più (terzo centrale, 300 ms come unica regola della pressione).

- [ ] **Step 2: Verify**

Run: `npm test`, `npm run build`, `npm run test:dist`.
Expected: verdi. Il markup nuovo arriva nel Task 3, e il protocollo non deve rompere il lettore di oggi: gli attributi nuovi mancanti non fanno nulla.

- [ ] **Step 3: Commit**
`feat: the stories protocol knows invites, captions with more, hold to hide and vertical swipes`

---

### Task 3: Il lettore "Scheda a richiesta" (DialogStorie.astro)

**Files:**
- Modify: `src/prova/salvia-social/DialogStorie.astro` (markup e CSS riscritti)
- Modify: `src/prova/salvia-social/Icona.astro` (aggiunge `su`: `<path d="M5.5 14.5L12 8l6.5 6.5"/>`)
- Modify: `src/prova/salvia-social/tema.css` (aggiunge `--fondo-storie: #141712`; toglie `--sfondo-storie` se resta senza usi)
- Test: `tests/dist/dist.test.ts`

**Interfaces:**
- **Consumes:** il markup del Task 2, `durataFoto`, `messaggioStoria(storia, foto)`, `linkWhatsApp`, `negozio.telefonoHref`, `negozio.mappeUrl`.

- [ ] **Step 1: Write the failing dist tests** (in `tests/dist/dist.test.ts`, vicino ai test delle storie)
- **Le foto.** Ogni `[data-storia-foto]` ha `data-storia-durata` uguale a `durataFoto(foto.testo)` per le foto di `storie`, nell'ordine.
- **La pillola.** Ogni gruppo ha un solo `button[data-storia-invito-apri]` con `aria-expanded="false"` e testo "Chiedi, chiama, vieni".
- **Le schede.** Ogni gruppo ha tante `[data-storia-invito]` quante foto: la prima senza `hidden`, le altre con `hidden`. Ognuna ha esattamente tre link:
  - `https://wa.me/…?text=` con il messaggio di `messaggioStoria(storia, foto)` (decodificato);
  - `negozio.telefonoHref`;
  - `negozio.mappeUrl`.

  Il primo è quello di `storia.invito`; le altre due seguono, nell'ordine fra quelle rimaste: Indicazioni, WhatsApp, Chiama. Ogni scheda ha anche un `button[data-storia-invito-chiudi]` "Torna alla storia".
- **Cosa non c'è nel dialog delle storie:** "In negozio c’è molto di più", "Aperto ora", "Chiuso", "Poi" e `class="azioni"`.
- **Le frecce per la tastiera.** `[data-storia-prec]` e `[data-storia-succ]` ci sono ancora, come `button` con nome.
- **Il CSS del componente:**
  - le `img` delle storie hanno `pointer-events:none`;
  - la zona dei tocchi ha `touch-action:none`;
  - il fondo del dialog è `var(--fondo-storie)`, opaco.
- **I test di oggi da aggiornare:**
  - "storie e post propongono di chiamare il negozio": ora un link `tel:` per foto delle storie;
  - i test sulla zona dei tocchi e sulle frecce.

- [ ] **Step 2: Run to verify they fail**

Run: `npm run build && npm run test:dist`. Expected: FAIL sui test nuovi.

- [ ] **Step 3: Implement the markup** (un gruppo per storia, come oggi)
- **Ogni foto.** `<li class="foto" data-storia-foto data-storia-durata={durataFoto(foto.testo)}>`, con:
  - `Foto`;
  - `<p class="frase" data-storia-frase>`;
  - `<button type="button" class="altro" data-storia-altro aria-expanded="false" hidden>`. Il testo cambia con il CSS secondo `aria-expanded`: `altro` / `meno`.
- **Ogni gruppo:**
  - barre e testata come oggi (cerchio 32 px, nome, "Alma Living · data");
  - `<button type="button" class="chiedi" data-storia-invito-apri aria-expanded="false">Chiedi, chiama, vieni <Icona nome="su"/></button>`;
  - `<div class="inviti">`, con un `<div class="invito" data-storia-invito role="group" aria-label={`Chiedi, chiama, vieni: ${foto.soggetto}`} hidden={i > 0}>` per foto. Dentro:
    - la miniatura `Foto`, `alt=""`, `larghezze={[112]}`, `sizes="56px"`;
    - `<p class="soggetto">`;
    - i tre link nell'ordine del test: il primo con classe `pieno`, gli altri bordati;
    - `<button data-storia-invito-chiudi>Torna alla storia <Icona nome="giu"/></button>`.
- **A livello di dialog** restano: la zona dei tocchi, i comandi (pausa e X, con `autofocus` sulla X), `[data-storia-prec]` e `[data-storia-succ]`.
- **Via:** `.poi`, `.azioni`, `.lungo` e tutto il codice morto.

- [ ] **Step 4: Implement the CSS** (le misure dalla tavola `StorieRichiesta`)
- **La scena.**
  - Dialog a tutto schermo con fondo `var(--fondo-storie)` e `overscroll-behavior: contain`.
  - `.scena` alta `100dvh`, larga `min(100vw, max(56.25dvh, 360px))`, centrata.
  - In fondo una fascia di `calc(76px + env(safe-area-inset-bottom))` per la pillola, centrata (alta 44 px, bordo bianco al 70%, testo 15 px seminegrassetto).
  - La pila delle foto occupa la scena sopra la fascia, con `object-fit: cover`.
- **In alto.**
  - Barre a 12 px dal bordo: alte 2 px, 4 px tra l'una e l'altra.
  - Testata in una riga sotto le barre, su un velo a gradiente; pausa e X da 44 px.
  - Barre e testata non superano i 64 px oltre i 12 px dal bordo.
- **La frase.** 17 px, bianca, al massimo 2 righe (`line-clamp`) su un velo a gradiente in basso sulla foto, con contrasto di almeno 4,5:1. Con `data-aperta` niente taglio, alta al massimo metà della foto e scorrevole. "altro" sta in fondo a destra della frase.
- **La scheda (`.inviti`).**
  - Copre la scena sotto le barre, su `rgb(20 23 18 / 0.72)` con `backdrop-filter: blur(24px)` (anche `-webkit-`).
  - Il contenuto in colonna: miniatura tonda 56 px, soggetto 14 px, i tre link alti 48 px (il primo bianco pieno, gli altri bordati) e "Torna alla storia".
  - Si vede solo con `[data-storia-invito-aperto]` sul dialog, in dissolvenza di 250 ms (`opacity` e `transform: scale(0.98 → 1)`).
- **Tenendo premuto.** Con `[data-storia-nascosta]`: testata, comandi, frase, "altro" e pillola a `opacity: 0` in 200 ms; le barre restano.
- **Foto e tocchi.** `.foto img` e la miniatura con `pointer-events: none` e `-webkit-user-drag: none`; la zona dei tocchi con `touch-action: none` e `user-select: none`.
- **Frecce.** `[data-storia-prec|succ]` restano ritagliate e invisibili finché non ricevono `:focus-visible`; allora pulsanti tondi bianchi da 44 px a metà altezza.
- **Riduci movimento:** niente transizioni.
- **Via:** i blocchi `@media (min-width: 960px)` e quello in orizzontale, se la scena unica li rende inutili. Controlla 844 x 390 (Review Focus 1).

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npm test`, `npm run build`, `npm run test:dist`. Expected: tutti verdi.

- [ ] **Step 6: Commit**
`feat: stories fill the screen and open the invites on request`
