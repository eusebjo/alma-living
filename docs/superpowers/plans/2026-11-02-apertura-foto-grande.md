# Apertura "La foto grande" Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Sostituire, nella variante di prova Salvia social, l'apertura di oggi e "Per ogni stanza della casa" con l'apertura "La foto grande" (dodici foto di prodotti che scorrono da sole, pausa nascosta) e mostrare le storie solo sul telefono.

**Architecture:** Le interazioni restano protocolli `data-*` in `src/prova/comune/interazioni.ts`. La "Galleria" si estende con un giro automatico (orologio come le storie), una pausa senza pulsante visibile, foto saltate per media query e didascalie parallele alle foto. La logica pura (gesto, passo dell'orologio, foto successiva) va in moduli con test. `Apertura.astro` è riscritta. `Collezioni.astro` e il protocollo `data-filtro-scegli`, che solo lei usava, si tolgono. `FilaStorie.astro` si vede solo sotto i 768 px.

**Tech Stack:** Astro 7 (statico), TypeScript, CSS dei componenti, Vitest (unitari e `tests/dist`).

**Spec:** `docs/superpowers/specs/2026-10-29-varianti-di-prova-design.md`, "Aggiornamento del 2026-11-02, secondo: l'apertura". La tavola di riferimento è `research_notes/Design UI/tela/project/FotoGrande2.dc.html`: i commenti in `renderVals`, dalla riga 1067 circa, descrivono misure e comportamento.

## Global Constraints

### Testi
- **Claim** (`h1`): `Rendiamo la tua casa ancora più casa.`
- **Frase da 768 px:** `Biancheria, profumi e dettagli che scaldano l’ambiente, scelti uno per uno per il negozio di Via Ricasoli, nell’isola pedonale di Livorno.`
- **Frase sotto i 768 px:** `Biancheria, profumi e dettagli scelti uno per uno, nel negozio di Via Ricasoli a Livorno.`
- **Sequenza fissa delle foto, `vetrina`.** Nome del prodotto, foto, posizione computer / posizione telefono; ★ = nella cornice del computer:

  | # | Nome | Foto | Computer | Telefono |
  |---|---|---|---|---|
  | 1 ★ | `Lenzuola e copriletto a righe rosa` | `righe-rosa` | `50% 24%` | `50% 40%` |
  | 2 ★ | `Coperta in maglia` | `coperta` | `50% 52%` | `50% 50%` |
  | 3 | `Plaid Abbracciami` | `abbracciami-verde` | `50% 50%` | `50% 50%` |
  | 4 | `Asciugamano con casetta` | `asciugamano-rosso` | `50% 50%` | `50% 50%` |
  | 5 | `Lenzuola color sabbia` | `lenzuola-beige` | `50% 40%` | `50% 40%` |
  | 6 | `Accappatoio con orsetto` | `neonato` | `50% 40%` | `50% 40%` |
  | 7 ★ | `Tovaglia con volant` | `tovaglia-volant` | `50% 45%` | `50% 50%` |
  | 8 | `Parure con volant` | `volant` | `50% 50%` | `50% 50%` |
  | 9 | `Candele nelle ciotole di legno` | `candele` | `50% 60%` | `50% 60%` |
  | 10 | `Copriletto rosso con volant` | `copriletto-rosso` | `50% 50%` | `50% 50%` |
  | 11 ★ | `Cuscini delle feste` | `ig-cuscini-1` | `50% 62%` | `50% 55%` |
  | 12 ★ | `Saponi e profumi` | `bagno-prodotti` | `50% 62%` | `50% 78%` |

- **Pausa:**
  - pulsante da tastiera: `Metti in pausa le foto` / `Riprendi le foto`;
  - pillola sul telefono e sul tablet: `In pausa · tocca per riprendere`;
  - pillola sul computer: `In pausa · clic per riprendere`.
- **Menu** (`sezioni`), in quest'ordine: `Collezioni` → `#selezione`, `Dal negozio` → `#diario`, `Il negozio` → `#negozio`.

### Misure
- **Punti di rottura:** telefono fino a 767 px; tablet `(767px < width <= 1023px)`; computer `(width > 1023px)`. Sono le stesse forme di `LIMITI_SELEZIONE`.
- **Computer:**
  - apertura `max-width: var(--larghezza)`, margini laterali `var(--margine)`, come header e scaffali;
  - claim 38 px; frase 17 px, larga al massimo 40em, 10 px sotto il claim;
  - palco 24 px sotto la frase, con colonne `minmax(0, 204fr) minmax(0, 872fr) minmax(0, 204fr)` e 24 px tra le colonne;
  - cornice `aspect-ratio: 872 / 580`;
  - miniature 3:4 larghe quanto la colonna, 12 px tra l'una e l'altra;
  - colonna sinistra: foto 3, 4, 5, 6, che salgono; colonna destra: foto 8, 9, 10, che scendono. Ogni giro dura 80 s;
  - sotto la cornice, 14 px più giù e alla sua larghezza: nome a sinistra, 5 tacche a destra.
- **Tablet:** margini 40 px, claim 34 px, frase 17 px; cornice larga quanto il contenuto, `aspect-ratio: 4 / 3`; niente miniature; contatore. È una scelta di sviluppo: la tela non ha il tablet.
- **Telefono:**
  - margini 16 px, claim 30 px, frase 15 px, 8 px sotto il claim;
  - cornice 16 px sotto la frase, `aspect-ratio: 358 / 440`, raggio `var(--raggio-telefono)`;
  - nella cornice, in alto a sinistra la pillola bianca con il nome e in alto a destra il contatore in una pillola scura; sotto il nome, da ferma, la pillola della pausa.
- **Tempi:**
  - una foto ogni 5000 ms (`data-galleria-auto="5000"`), dissolvenza di 1100 ms;
  - tocco: meno di 10 px di spostamento su entrambi gli assi;
  - trascinamento: la soglia di oggi, `SOGLIA_TRASCINAMENTO_PX` = 40.
- **Storie:** si vedono solo fino a 767 px.

### Regole
- **Movimento:** solo `transform` e `opacity`. Con `prefers-reduced-motion: reduce` non si muove nulla, né le foto né le miniature.
- **Senza JavaScript:** si vede la prima foto e le miniature sono ferme.
- **Una sola immagine con priorità alta:** la prima foto della cornice (`principale`). Le altre undici della cornice sono `lazy` e lo script fa caricare in anticipo la successiva del giro. Le miniature sono `lazy` e decorative: `alt=""`, colonne `aria-hidden="true"`.
- **Codice e commenti in italiano.** Commit in inglese (`feat:`, `fix:`, `test:`, `docs:`, `chore:`), con il trailer `Co-Authored-By` del modello che scrive il commit.
- **Prima di ogni commit:** `npm test`, `npm run build`, `npm run test:dist`, tutti verdi. L'unico avviso ammesso è quello noto del pezzo di `/admin/`.

## Review Focus

1. **Riduci movimento.**
   - Atteso: nessuna foto cambia da sola e le miniature stanno ferme; la pillola della pausa si vede; il pulsante da tastiera dice "Riprendi le foto".
   - Un tocco o un clic sulla foto fa partire il giro.
   - Test: `giro.test.ts` copre l'orologio fermo; il resto lo verifica il controllo nel browser.
2. **La finestra attraversa i 1024 px mentre il giro corre** (tablet ruotato, finestra ridimensionata).
   - Atteso: la foto mostrata è sempre una del giro attivo; mai una cornice vuota; il contatore si aggiorna.
   - Test: `fotoDelGiro` con elenchi di foto attive diversi.
3. **Scorrere la pagina in verticale partendo dalla cornice, sul telefono.**
   - Atteso: non ferma il giro e non cambia foto (il browser manda `pointercancel`, oppure lo spostamento è verticale).
   - Test: `gestoDellaGalleria` con spostamento verticale.
4. **Scheda nascosta e poi tornata visibile.**
   - Atteso: si riprende dalla foto di prima, senza saltarne diverse.
   - Test: `passoDelGiro` con un `dt` enorme dopo la ripresa: l'orologio riparte da `ultimoFrame` riallineato, al massimo un passo.
5. **Tastiera.**
   - Atteso: il primo elemento attivabile dell'apertura è il pulsante della pausa, che si vede quando ha il focus; poi vengono le tacche (computer); l'ordine del codice è quello di lettura.
   - Test in `tests/dist`.

---

### Task 1: La galleria che gira da sola (protocollo)

**Files:**
- Modify: `src/prova/comune/gesti.ts` (aggiunge `SOGLIA_TOCCO_PX` e `gestoDellaGalleria`)
- Create: `src/prova/comune/giro.ts`
- Modify: `src/prova/comune/interazioni.ts` (estende la "Galleria"; aggiorna il commento dei protocolli in testa)
- Test: `tests/prova/gesti.test.ts`, `tests/prova/giro.test.ts`
- Modify: `tests/dist/dist.test.ts`, solo `incoerenzeProtocolli`, se serve per i nuovi attributi

**Interfaces:**
- **Produces, in `gesti.ts`:**
  - `export const SOGLIA_TOCCO_PX = 10`;
  - `export function gestoDellaGalleria(dx: number, dy: number): 'tocco' | -1 | 1 | null`. Restituisce `'tocco'` se `|dx| < 10` e `|dy| < 10`; altrimenti `versoTrascinamento(dx, dy)` quando non è 0; altrimenti `null`.
- **Produces, in `giro.ts`:**
  - `export function passoDelGiro(trascorso: number, dt: number, inCorsa: boolean, durata: number): { trascorso: number; avanza: boolean }`. Se non è in corsa restituisce `{ trascorso, avanza: false }`. Altrimenti `t = trascorso + max(0, dt)`: se `t >= durata` restituisce `{ trascorso: 0, avanza: true }`, se no `{ trascorso: t, avanza: false }`.
  - `export function fotoDelGiro(attive: readonly number[], attuale: number, passo: 1 | -1): number`. Restituisce l'indice (sull'elenco completo) della foto attiva dopo o prima di `attuale`, a giro. Se `attuale` non è tra le attive: con `passo` 1 la prima attiva dopo `attuale`, a giro; con -1 l'ultima prima. Se `attive` è vuoto, `attuale`.
- **Produces, il protocollo** (da scrivere nel commento in testa a `interazioni.ts`, nello stile degli altri):
  - **Giro.** `[data-galleria][data-galleria-auto="<ms>"]` avanza da solo di una foto ogni `<ms>`. Ha un orologio a `requestAnimationFrame` come quello delle storie, che conta solo il tempo in corsa. All'avvio lo script dà alla galleria `data-galleria-avviata`.
  - **Pausa.** `data-galleria-ferma` vuol dire ferma per scelta, o per "riduci movimento", all'avvio o quando la preferenza cambia. `data-galleria-in-sosta` vale mentre un puntatore `mouse` è sopra un `[data-galleria-sosta]` della galleria. L'orologio conta solo se la galleria non è ferma, non è in sosta e la pagina è visibile. Al ritorno visibile, l'ultimo fotogramma si riallinea.
  - **Avanzamento.** `--avanzamento` (da 0 a 1) va sul `[data-galleria-punto]` della foto attuale.
  - **Pulsante.** `button[data-galleria-pausa]`, senza `aria-pressed` (come il controllo di rotazione del carosello W3C APG: cambia l'etichetta): un clic alterna. Lo stato sta solo in `data-galleria-ferma` sulla galleria. Lo script non scrive testi: la variante mette nel pulsante i due testi e mostra con il CSS quello giusto secondo `data-galleria-ferma`; l'altro ha `display: none`, così non si legge.
  - **Tocco e trascinamento.** In una galleria con giro, un gesto su `[data-galleria-trascina]` che non comincia su `button` o `a` si decide con `gestoDellaGalleria`:
    - `'tocco'` alterna la pausa;
    - `1` o `-1` cambia foto e ferma;
    - `null` non fa nulla.

    `pointercancel` annulla, come oggi. Nelle gallerie senza giro il trascinamento resta com'è oggi.
  - **Comandi.** `[data-galleria-prec|succ]` e `[data-galleria-punto]` in una galleria con giro cambiano foto e la fermano.
  - **Foto saltate.** `[data-galleria-foto][data-galleria-salta="<media>"]`: quando la media è vera, la foto non fa parte del giro né del contatore. Quando una di quelle media cambia, se la foto attuale non è più attiva si mostra `fotoDelGiro(attive, attuale, 1)`.
  - **Tacche.** `[data-galleria-punto="<n>"]` con un valore numerico indica la foto n dell'elenco completo, contando da 0. Senza valore resta posizionale, come oggi.
  - **Didascalie.** `[data-galleria-didascalia]`, nello stesso ordine delle foto: si vede solo quella della foto attuale (le altre `hidden`).
  - **Contatore.** `[data-galleria-contatore]` conta sulle foto attive: "3 di 12".
  - **Annuncio.** `[data-galleria-annuncio]` riceve `aria-live="polite"` quando la galleria è ferma, `"off"` mentre gira.
  - **Precarico.** Quando una foto diventa attuale, le `img[loading="lazy"]` della foto successiva del giro passano a `loading="eager"`.
  - **Compatibilità.** Le gallerie senza `data-galleria-auto` né `data-galleria-salta` si comportano esattamente come oggi: schede rapide, post, colori.

- [ ] **Step 1: Write the failing tests**

`tests/prova/gesti.test.ts`:
```ts
describe('gestoDellaGalleria', () => {
  it('uno spostamento sotto i 10 px su entrambi gli assi è un tocco', () => {
    expect(gestoDellaGalleria(0, 0)).toBe('tocco');
    expect(gestoDellaGalleria(9, -9)).toBe('tocco');
  });
  it('un trascinamento orizzontale oltre la soglia cambia foto', () => {
    expect(gestoDellaGalleria(-41, 3)).toBe(1);
    expect(gestoDellaGalleria(41, 3)).toBe(-1);
  });
  it('tra il tocco e la soglia, o in verticale, non è nulla', () => {
    expect(gestoDellaGalleria(20, 0)).toBeNull();
    expect(gestoDellaGalleria(5, 60)).toBeNull();
    expect(gestoDellaGalleria(-50, -80)).toBeNull();
  });
});
```
`tests/prova/giro.test.ts`:
```ts
describe('passoDelGiro', () => {
  it('fermo non conta il tempo', () => {
    expect(passoDelGiro(1200, 500, false, 5000)).toEqual({ trascorso: 1200, avanza: false });
  });
  it('in corsa accumula e, raggiunta la durata, avanza e riparte da zero', () => {
    expect(passoDelGiro(4000, 900, true, 5000)).toEqual({ trascorso: 4900, avanza: false });
    expect(passoDelGiro(4900, 100, true, 5000)).toEqual({ trascorso: 0, avanza: true });
  });
  it('un intervallo enorme fa avanzare di una foto sola', () => {
    expect(passoDelGiro(0, 60_000, true, 5000)).toEqual({ trascorso: 0, avanza: true });
  });
  it('un intervallo negativo non toglie tempo', () => {
    expect(passoDelGiro(300, -50, true, 5000)).toEqual({ trascorso: 300, avanza: false });
  });
});
describe('fotoDelGiro', () => {
  const tutte = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
  const grandi = [0, 1, 6, 10, 11];
  it('passa alla foto attiva dopo, a giro', () => {
    expect(fotoDelGiro(tutte, 11, 1)).toBe(0);
    expect(fotoDelGiro(grandi, 1, 1)).toBe(6);
    expect(fotoDelGiro(grandi, 11, 1)).toBe(0);
  });
  it('e a quella prima', () => {
    expect(fotoDelGiro(grandi, 0, -1)).toBe(11);
    expect(fotoDelGiro(grandi, 6, -1)).toBe(1);
  });
  it('da una foto non attiva va alla prima attiva dopo, o all’ultima prima', () => {
    expect(fotoDelGiro(grandi, 3, 1)).toBe(6);
    expect(fotoDelGiro(grandi, 3, -1)).toBe(1);
  });
  it('senza foto attive resta dov’è', () => {
    expect(fotoDelGiro([], 4, 1)).toBe(4);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail.** Run: `npx vitest run tests/prova/gesti.test.ts tests/prova/giro.test.ts`. Expected: FAIL, because `gestoDellaGalleria` and `giro.ts` don't exist yet.
- [ ] **Step 3: Implement `gestoDellaGalleria` and `giro.ts`.** Firme e valori come nell'Interfaces block.
- [ ] **Step 4: Run the tests to verify they pass.** Same command. Expected: PASS.
- [ ] **Step 5: Extend the gallery in `interazioni.ts`.**
  - **Lo stato.** In `Contesto` aggiungi `giri: Map<HTMLElement, { trascorso: number; ultimoFrame: number; frame: number; durata: number }>`.
  - **L'avvio.** In `avviaInterazioni` registra i giri delle `[data-galleria-auto]` presenti all'avvio e gli ascoltatori `matchMedia`, sia per le media di `data-galleria-salta` sia per `prefers-reduced-motion`.
  - **Sosta e visibilità.** `pointerover`/`pointerout`, con `pointerType === 'mouse'`, sui `[data-galleria-sosta]` gestiscono la sosta. Il `visibilitychange` che esiste già riallinea `ultimoFrame` dei giri.
  - **Le funzioni di oggi.** `fotoCorrente`/`mostraFoto` lavorano sulle foto attive (`data-galleria-salta`). Aggiornano anche didascalie, tacche con valore numerico, contatore e precarico. Una galleria senza i nuovi attributi deve dare lo stesso DOM di oggi.
  - **Riuso.** `movimentoRidotto()` e il disegno di `fotogramma` delle storie sono il modello: non duplicare logica che `giro.ts` già fa.
  - **La documentazione.** Aggiorna il commento in testa (sezione "Galleria") con il protocollo nuovo.
- [ ] **Step 6: Run everything.** Run: `npm test`, `npm run build`, `npm run test:dist`. Expected: all PASS. Nessuna variante usa ancora il giro, quindi il sito non cambia.
- [ ] **Step 7: Commit.**
```bash
git add src/prova/comune/gesti.ts src/prova/comune/giro.ts src/prova/comune/interazioni.ts tests/prova/gesti.test.ts tests/prova/giro.test.ts
git commit -m "feat: galleries can play by themselves, with a hidden pause"
```

### Task 2: La nuova apertura e la pagina senza "Per ogni stanza della casa"

**Files:**
- Modify: `src/prova/salvia-social/dati.ts`:
  - `apertura` diventa `vetrina`;
  - `fotoDeiFiltri` non deriva più dalle stanze;
  - si tolgono `collezioni`, `altreCollezioni`, `Stanza`, `AltraCollezione`, `scattoDellaCollezione`;
  - `sezioni` cambia;
  - `ALT` resta com'è.
- Rewrite: `src/prova/salvia-social/Apertura.astro`
- Delete: `src/prova/salvia-social/Collezioni.astro`
- Modify: `src/pages/prova/salvia-social/index.astro` (toglie `<Collezioni />` e il suo import)
- Modify: `src/prova/comune/interazioni.ts` (toglie `scegliFiltroDaLink`, la sua voce nella tabella dei clic e la riga del protocollo "Filtri" sui link `data-filtro-scegli`: nessuno li usa più)
- Test: `tests/prova/salvia-social-dati.test.ts`, `tests/dist/dist.test.ts`

**Interfaces:**
- **Consumes** (dal Task 1): `data-galleria-auto`, `data-galleria-sosta`, `data-galleria-pausa`, `data-galleria-salta`, `data-galleria-punto="<n>"`, `data-galleria-didascalia`, `data-galleria-annuncio`, `data-galleria-contatore`, e gli stati `data-galleria-avviata`, `data-galleria-ferma`, `data-galleria-in-sosta`.
- **Produces, in `dati.ts`:**
```ts
export interface ProdottoInVetrina {
  nome: string;
  /** Nella cornice del computer (le cinque foto più larghe). */
  grande: boolean;
  /** Lo scatto: `posizione` è quella del computer. */
  scatto: Scatto;
  /** `object-position` sul telefono e sul tablet. */
  posizioneTelefono: string;
}
export const vetrina: ProdottoInVetrina[]; // i 12 della tabella, in ordine
```
- **`fotoDeiFiltri`** resta con gli stessi valori di oggi, scritti per esteso:
  - `tutti`: `scaffale` `50% 45%`;
  - `letto`: `camera-rosa` `50% 55%`;
  - `bagno`: `bagno` `50% 58%`;
  - `bimbi`: `accappatoi-appesi` `50% 24%`;
  - `tavola`: `tavola` `40% 55%`;
  - `profumi`: `candele` `50% 60%`;
  - `natale`: `gnomi` `50% 45%`;
  - `mare`: `mare` `50% 60%`.
- **Il markup di `#apertura`**, in quest'ordine. Le classi sono libere; gli attributi sono il contratto:
  1. **La sezione:** `<section id="apertura" aria-labelledby="apertura-titolo" data-galleria data-galleria-auto="5000">`.
  2. **La testa:** `h1#apertura-titolo` con il claim, poi un `p` con la frase lunga e la frase corta in due `span`, uno solo visibile per misura.
  3. **Il palco**, con `data-galleria-sosta`, che contiene:
     - **La colonna sinistra** (`aria-hidden="true"`): un binario con le miniature 3, 4, 5, 6 e la loro copia.
     - **Il centro**, che contiene:
       - **la cornice** (`data-galleria-trascina`), con:
         - per primo, `button[data-galleria-pausa]` (senza `aria-pressed`) con i due testi del pulsante;
         - poi la pila delle 12 foto `[data-galleria-foto]` in ordine. Le non `grande` hanno `data-galleria-salta="(width > 1023px)"`. La prima è visibile e `principale`, le altre `hidden`.
       - Le 12 didascalie `[data-galleria-didascalia]`, dentro un contenitore `[data-galleria-annuncio]`: sono il nome. Sul telefono stanno nella pillola sulla foto, sul computer sotto la cornice.
       - La pillola della pausa, con i due testi, telefono e computer, scelti dal CSS con `(hover: hover) and (pointer: fine)`.
       - Il contatore `[data-galleria-contatore]`, testo iniziale `1 di 12` (sul computer nascosto).
       - Le 5 tacche `button[data-galleria-punto="0|1|6|10|11"]`, con `aria-label` `<nome>, foto <k> di 5`. Sul telefono e sul tablet sono nascoste.
     - **La colonna destra** (`aria-hidden="true"`): un binario con le miniature 8, 9, 10 e la loro copia.

**Il CSS**, con le misure delle Global Constraints:
- **Pila e dissolvenza.**
  - Pila: foto in `position: absolute; inset: 0`.
  - Dissolvenza: `transition: opacity 1100ms ease, display 1100ms allow-discrete`, `[hidden] { opacity: 0 }`, foto visibile con `z-index: 1`.
  - `@starting-style { [data-galleria-avviata] … :not([hidden]) { opacity: 0 } }`: la prima foto non entra in dissolvenza al caricamento.
  - Se il `display: none !important` di `[hidden]` (da `Interazioni.astro`) impedisce la dissolvenza in un browser, il cambio resta netto: va bene, ma scrivilo nel report.
- **Miniature.**
  - Due `@keyframes` (sale: `translateY(0)` → `translateY(calc(-50% - 6px))`; scende: l'inverso), 80 s, lineari, infinite.
  - `animation-play-state: paused` di base, `running` solo dentro `[data-galleria-avviata]:not([data-galleria-ferma]):not([data-galleria-in-sosta])`.
- **Riduci movimento.** Con `prefers-reduced-motion: reduce`: niente animazioni e niente transizioni.
- **Il pulsante della pausa.** È ritagliato (`clip-path: inset(50%)`, `pointer-events: none`) finché non ha `:focus-visible`. Con il focus diventa una pillola bianca da 48 px al centro della cornice. Il testo giusto dipende da `data-galleria-ferma` sulla galleria; l'altro ha `display: none`.
- **La pillola della pausa** si vede solo dentro `[data-galleria-ferma]`.
- **Le tacche.** La barretta interna si riempie con `transform: scaleX(var(--avanzamento, 0))`. Bersagli da 44 px.

**Altri vincoli:**
- **Foto e misure.** Le foto della cornice usano `posizione` sul computer e `posizioneTelefono` sotto i 1024 px: per esempio con una custom property nello stile del `li` e una regola che la legge. `sizes` della cornice: `(width > 1023px) min(61vw, 872px), 100vw`; larghezze `[400, 600, 800, 1000]`. Miniature: `sizes="204px"`, larghezze `[200, 300, 400]`.
- **Niente più link** a WhatsApp, "Scopri le collezioni", riga in stile post, biglietto o stato del negozio nell'apertura.

- [ ] **Step 1: Write the failing tests.**
  - **`tests/prova/salvia-social-dati.test.ts`:**
    - **Rimpiazza** "l'apertura ha tre foto, ognuna con la sua frase" con:
```ts
it('la vetrina ha i 12 prodotti della sequenza, cinque grandi', () => {
  expect(vetrina.map((p) => p.nome)).toEqual([
    'Lenzuola e copriletto a righe rosa', 'Coperta in maglia', 'Plaid Abbracciami',
    'Asciugamano con casetta', 'Lenzuola color sabbia', 'Accappatoio con orsetto',
    'Tovaglia con volant', 'Parure con volant', 'Candele nelle ciotole di legno',
    'Copriletto rosso con volant', 'Cuscini delle feste', 'Saponi e profumi',
  ]);
  expect(vetrina.map((p, i) => (p.grande ? i : -1)).filter((i) => i >= 0)).toEqual([0, 1, 6, 10, 11]);
});
```
    - **Aggiorna l'elenco `scatti`:** `...vetrina.map((p) => p.scatto)` al posto di `...apertura`; via `collezioni` e `altreCollezioni`.
    - **Il test delle categorie** (riga 97) non usa più le stanze: ogni chiave di `fotoDeiFiltri` è `tutti` o una categoria.
    - **Il test di `sezioni`** (riga 244): `['#selezione', '#diario', '#negozio']`, con i nomi `['Collezioni', 'Dal negozio', 'Il negozio']`.
    - **Le altre righe** che leggono `collezioni`/`altreCollezioni` (intorno alla 160) si tolgono o passano a `fotoDeiFiltri`.
  - **`tests/dist/dist.test.ts`:**
    - **Ordine delle sezioni:** "le sezioni si susseguono" diventa `apertura, selezione, diario, negozio`, e `id="collezioni"` non c'è più.
    - **Togli** "i riquadri delle collezioni e le pillole scelgono il loro filtro…" e aggiungi: nessun `data-filtro-scegli` e nessun `href="#collezioni"` nella pagina.
    - **Aggiungi** "l'apertura è una galleria che gira da sola":
      - la sezione ha `data-galleria-auto="5000"`;
      - 12 `data-galleria-foto` con gli `alt` di `vetrina`, nell'ordine;
      - esattamente 7 con `data-galleria-salta="(width > 1023px)"`, le non grandi;
      - 12 didascalie con i nomi;
      - 5 tacche con `data-galleria-punto` uguale a `0,1,6,10,11`;
      - un contatore che dice `1 di 12`.
    - **Aggiungi** "il primo elemento attivabile dell'apertura è la pausa": il primo `button` o `a` dentro `#apertura` è `button[data-galleria-pausa]` senza `aria-pressed`, e contiene i testi `Metti in pausa le foto` e `Riprendi le foto`.
    - **Aggiungi** "le miniature sono decorative": due contenitori `aria-hidden="true"` dentro `#apertura`, con 8 e 6 `img` (le foto 3-6 e 8-10 due volte), tutte con `alt=""` e `loading="lazy"`.
    - **Aggiorna** i due test di priorità: l'unica `fetchpriority="high"` è la prima foto della cornice; le altre 11 foto della cornice sono `loading="lazy"`; a parte i loghi, nessun'altra immagine si carica subito.
    - **Aggiungi** "claim e frase": l'`h1` dell'apertura è il claim; la pagina contiene le due frasi, lunga e corta, alla lettera.
    - **Aggiungi**, in `incoerenzeProtocolli`, i controlli dei nuovi attributi: `data-galleria-pausa`, `-salta`, `-didascalia`, `-sosta` e `-annuncio` devono stare dentro un `[data-galleria]`; il numero di didascalie è uguale a quello delle foto della stessa galleria. Aggiungi un caso al test che verifica `incoerenzeProtocolli`.
- [ ] **Step 2: Run the tests.** Run: `npm test` (i test dei dati falliscono). Poi `npm run build` e `npm run test:dist`: i test dist nuovi falliscono.
- [ ] **Step 3: Implement.** `dati.ts`, `Apertura.astro`, `index.astro`; elimina `Collezioni.astro`; togli `scegliFiltroDaLink` e il suo protocollo da `interazioni.ts`. Aggiorna i commenti in testa ad `Apertura.astro` e `dati.ts`.
- [ ] **Step 4: Run everything.** Run: `npm test`, `npm run build`, `npm run test:dist`. Expected: all PASS, senza avvisi nuovi.
- [ ] **Step 5: Commit.**
```bash
git add -A src/prova/salvia-social src/pages/prova/salvia-social src/prova/comune/interazioni.ts tests
git commit -m "feat: the opening becomes the big product photo, and the rooms block goes"
```

### Task 3: Le storie solo sul telefono

**Files:**
- Modify: `src/prova/salvia-social/FilaStorie.astro`
- Test: `tests/dist/dist.test.ts`

**Interfaces:**
- **Consumes:** nulla dai task precedenti.
- **Produces:**
  - la sezione `.storie` ha `display: none` in `(width > 767px)`;
  - il riquadro `.invito` ("Le storie del negozio", "Vedi i post") e il suo CSS si tolgono;
  - il commento in testa dice che la fila si vede solo sul telefono.

  `DialogStorie` non cambia.

- [ ] **Step 1: Write the failing tests.**
  - In `tests/dist/dist.test.ts` togli "accanto alle storie, Le storie del negozio" e "accanto alla fila delle storie Vedi i post porta al diario".
  - Aggiungi:
```ts
it('la fila delle storie si vede solo sul telefono, senza invito ai post', () => {
  const css = cssDellaPagina();
  expect(css).toMatch(/@media \(width ?> ?767px\)\{[^}]*\.storie\[[^\]]*\]\{display:none\}/);
  expect(decodifica(html())).not.toContain('Vedi i post');
  expect(decodifica(html())).not.toContain('Le storie del negozio');
});
```
  - L'espressione regolare va adattata al CSS minificato da Astro; il senso resta lo stesso.
- [ ] **Step 2: Run.** Run: `npm run build` e `npm run test:dist`. Expected: il nuovo test FAIL.
- [ ] **Step 3: Implement** in `FilaStorie.astro`.
- [ ] **Step 4: Run everything.** Run: `npm test`, `npm run build`, `npm run test:dist`. Expected: PASS.
- [ ] **Step 5: Commit.**
```bash
git add src/prova/salvia-social/FilaStorie.astro tests/dist/dist.test.ts
git commit -m "feat: stories show only on the phone"
```

## Note per il controllo finale (nel browser, a cura di chi coordina)
- **Le misure.**
  - A 1440 x 900 il claim e il bordo sinistro della colonna di miniature stanno a x = 56, il bordo destro dell'altra colonna a x = 1384.
  - La cornice è 872 x 580 e sta nel primo schermo.
  - Alle altre misure di computer le proporzioni restano le stesse.
- **Il telefono.**
  - A 390 x 844 la cornice è 358 x 440, con il nome e il contatore.
  - Un tocco ferma e mostra la pillola; un altro riparte.
  - Il trascinamento cambia foto.
  - Scorrere in verticale non fa nulla.
- **Il tablet.** A 800 px la cornice è 4:3, senza miniature e senza storie.
- **Il movimento.**
  - Con "riduci movimento" emulato tutto è fermo.
  - La dissolvenza si vede in Chromium.
- **Le storie.** Con la scheda in background e poi di nuovo visibile, nessun salto. La finestra delle storie si apre ancora dal telefono.
