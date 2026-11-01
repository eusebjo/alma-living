# Salvia social, versione 3: piano di lavoro

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** portare in codice, sul ramo `fase2/1-varianti`, la versione 3 di Salvia social: diario dopo la selezione e senza profilo, fascia Instagram, foto d'apertura che si trascinano, storie con le zone di tocco, selezione a griglia sul telefono e sul tablet.

**Architecture:**
- Le tre interazioni nuove sono estensioni dei protocolli `data-*` di `src/prova/comune/interazioni.ts`, documentate in cima al file. La loro logica pura sta in due moduli nuovi di `src/prova/comune/` (`gesti.ts`, `limite.ts`), testati in `tests/prova/`. La variante resta senza JavaScript proprio.
- Il resto è markup, stile e dati di `src/prova/salvia-social/`: ordine delle sezioni, diario, fascia nuova, etichette.
- `tests/dist/dist.test.ts` fissa il markup generato: rimandi dei protocolli (`incoerenzeProtocolli`), ordine delle sezioni, punti in cui compare Instagram, contenuto leggibile senza JavaScript.

**Tech Stack:** Astro 7.4 (output statico), TypeScript, Vitest; browser integrato per la verifica finale.

**Spec:** `docs/superpowers/specs/2026-10-29-varianti-di-prova-design.md`: l'"Aggiornamento del 2026-11-01" è l'elenco autorevole dei cambi; valgono §6 e §10. Riferimento visivo (solo locale, escluso da git): `research_notes/Design UI/tela/project/DiarioFascia.dc.html` e `DiarioFasciaTelefono.dc.html`. Per ordine, trascinamento, tocchi e griglia vedi anche `SalviaSocial2.dc.html` (i commenti in `renderVals()` danno le regole del tablet). Le note sono in `research_notes/Design UI/settima/versioni_diario.md` (§1) e `ottava/versioni_ottava.md`.

## Global Constraints

- **Ramo:** solo `fase2/1-varianti`, mai unito a `main` durante la prova; anteprima `https://fase2-1-varianti-alma-living.sebjomuho.workers.dev/prova/salvia-social/`.
- **Pagine `/prova/`:** sempre `noindex, nofollow`, nessun JSON-LD, nessuna risorsa esterna a pagina aperta.
- **Instagram solo come link**, in esattamente tre punti: l'icona dell'header, la fascia, la riga del footer (`Segui @almaliving.viaricasoli`). URL `https://www.instagram.com/almaliving.viaricasoli/`.
- **Nessun JavaScript per variante:** ogni interazione passa da `interazioni.ts` con un protocollo documentato in cima al file. La logica che si può isolare sta in un modulo puro di `src/prova/comune/` con il suo test.
- **Miglioramento progressivo:** senza JavaScript il contenuto si legge: tutte le schede della selezione, didascalie e foto di storie e post nell'HTML, link semplici.
- **Valori fissati dalle tavole:**
  - trascinamento: almeno 40 px in orizzontale, e più orizzontale che verticale (`|dx| ≥ |dy|`); verso sinistra la foto dopo, verso destra quella prima, a giro;
  - storie: tre terzi uguali (sinistra indietro, centro pausa, destra avanti); una pressione oltre 300 ms ferma soltanto;
  - selezione: 4 schede sotto 768 px (2 colonne), 6 da 768 a 1023 px (3 colonne), nessun limite da 1024 px (carosello con le frecce). Il limite vale sulla lista filtrata.
- **Testi esatti:**
  - "Vedi i post", "Post dal negozio", "Aggiornato il 27 ottobre", "Chiama il negozio", autore del post "Alma Living";
  - "Mostra tutti gli 8": `gli` davanti ai numeri che cominciano per 8 e all'11, altrimenti `i`;
  - fascia: "Seguici anche su Instagram", "@almaliving.viaricasoli", "Le foto di ogni giorno sono anche lì.", "Apri Instagram" con `aria-label="Apri Instagram: @almaliving.viaricasoli"`.
- **Accessibilità (WCAG 2.2 AA):**
  - pulsanti veri, nomi dei controlli con sola icona;
  - focus visibile, Esc e ritorno del focus nei dialog come oggi;
  - bersagli di almeno 24 px (44 px per le azioni sul telefono), contrasto almeno 4,5:1;
  - con `prefers-reduced-motion` le storie non avanzano da sole, come oggi.
- **Stile:** colori, ombre e raggi solo dai gettoni di `src/prova/salvia-social/tema.css`; le linee della fascia sono `--bordo` (`#d6d3c9`).
- **Verifica di ogni compito:** `npm test`, `npm run build`, `npm run test:dist`, tutti verdi e senza avvisi.
- **Commit:** piccoli, in inglese (`feat:`, `fix:`, `docs:`), chiusi da una riga vuota e dal trailer:

  ```bash
  git commit -F - <<'EOF'
  feat: short description

  Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
  EOF
  ```
- **Lingua:** codice, commenti e testi in italiano; la terminologia tecnica resta in inglese.

## Scelte di questo piano (dove spec e tavole non decidono)

1. **Schede piegate della selezione:** il limite lo applica solo lo script.
   - Senza JavaScript la griglia mostra tutte le 8 schede e "Mostra tutti" resta `hidden`: sono il contenuto principale, ognuna con il suo link WhatsApp, e non vanno nascoste senza un modo di aprirle.
   - I post del diario restano piegati già nell'HTML, come oggi.
   - Lo script applica il limite al caricamento, e la selezione sta sotto apertura e collezioni: lo spostamento avviene fuori dallo schermo.
2. **"Mostra tutti":** premuto una volta, vale per tutti i filtri successivi, come sulla tavola. Sparisce e il focus va alla prima scheda comparsa.
3. **Zone di tocco delle storie:** un solo `div` trasparente, `aria-hidden` e non focalizzabile, invece dei tre pulsanti invisibili della tavola. Tastiera e lettori di schermo hanno già Indietro, Avanti, la pausa e le frecce della tastiera: tre pulsanti in più sarebbero tre fermate di tab inutili.
4. **Fascia Instagram:**
   - è una `<section id="instagram" aria-labelledby="instagram-titolo">`, non l'`<aside>` della tavola: un `aside` dentro `main` è un punto di riferimento annidato, che axe segnala;
   - sotto 960 px è centrata come sul telefono, con il pulsante largo al più 420 px; da 960 px va in riga, come il resto del "computer" del codice.
5. **Punti di rottura della selezione:** 768 e 1024 px come dice la spec, non i 960 del resto della pagina. Le regole in `LIMITI_SELEZIONE` e le media query di `Selezione.astro` vanno tenute uguali, con un commento nei due punti.
6. **Trascinamento:** fa parte del protocollo Galleria in generale, ma lo usa solo l'apertura; la spec non lo chiede per i post.
7. **Testi dei messaggi:** dalla tavola versione 3 viene anche il messaggio WhatsApp dei post, con la preposizione articolata nel campo `chiedi` ("…del 27 ottobre sui plaid delle feste").

## Review Focus

1. **Scorrere la pagina col dito partendo dalla foto d'apertura** (in verticale o in diagonale): la pagina scorre e la foto non cambia. Un trascinamento orizzontale cambia una foto sola; uno che comincia su una freccia o un pallino non conta. Test in Task 3, verifica in Task 6.
2. **Pressione lunga su una storia, poi rilascio:** la storia riprende e non va né avanti né indietro. Test in Task 4.
3. **Telefono ruotato o finestra ridimensionata oltre 768 o 1024 px, con un filtro scelto:** il limite si ricalcola, nel carosello nessuna scheda resta nascosta, il pulsante dice il numero giusto. Test in Task 5, verifica in Task 6.
4. **Filtro con meno schede del limite** (Bagno 3, Natale 3, Letto 4) **o senza schede** (Mare): nessun "Mostra tutti" e, per Mare, solo la tessera "Il mare torna in primavera". Test in Task 5.
5. **JavaScript assente o bloccato:** tutte le schede in griglia, nessun pulsante "Mostra tutti", storie e post leggibili nell'HTML, la fascia come semplice link. Test in Task 5 (selezione) e Task 2 (fascia).

---

### Task 1: diario dopo la selezione, senza profilo né storie in evidenza

**Files:**
- Commit: `docs/superpowers/specs/2026-10-29-varianti-di-prova-design.md` (già aggiornata), questo piano
- Modify: `src/prova/salvia-social/dati.ts` (`sezioni`, togliere `storieInEvidenza`), `src/pages/prova/salvia-social/index.astro`, `src/prova/salvia-social/Diario.astro`, `src/prova/salvia-social/CerchioStoria.astro` (commento), `src/prova/salvia-social/tema.css`
- Test: `tests/prova/salvia-social-dati.test.ts`, `tests/dist/dist.test.ts`

**Interfaces:**
- Produces:
  - `sezioni` in ordine `#collezioni`, `#selezione`, `#diario`, `#negozio` (nomi invariati). Header, menu del telefono e footer la leggono già.
  - `storieInEvidenza` non esiste più: `storie` è l'unico elenco e la pagina ha un solo `DialogStorie` (`etichetta="Storie dal negozio"`).
  - Nel diario la scheda bianca si chiama `.riquadro`. I gettoni `--ombra-profilo` e `--raggio-profilo-telefono` diventano `--ombra-riquadro` e `--raggio-riquadro-telefono`, con gli stessi valori.

- [ ] **Step 1: committare spec e piano**

```bash
git add docs/superpowers/specs/2026-10-29-varianti-di-prova-design.md docs/superpowers/plans/2026-11-01-salvia-social-versione-3.md
git commit -F - <<'EOF'
docs: spec update and plan for Salvia social version 3

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

- [ ] **Step 2: scrivere i test che falliscono**

`tests/prova/salvia-social-dati.test.ts`:
- togliere `storieInEvidenza` dall'import e da ogni `[...storie, ...storieInEvidenza]`, che diventa `storie`;
- aggiungere:

```ts
it('le sezioni seguono la pagina: il diario dopo la selezione', () => {
  expect(sezioni.map((s) => s.href)).toEqual(['#collezioni', '#selezione', '#diario', '#negozio']);
});
```

`tests/dist/dist.test.ts`, nel `describe('Salvia social …')`:
- import senza `storieInEvidenza` e con `sezioni`;
- il test delle storie scorre solo `storie`;
- "griglia del profilo" diventa "griglia dei post";
- nuovi test:

```ts
it('le sezioni si susseguono: collezioni, selezione, diario, negozio', () => {
  const posizioni = ['collezioni', 'selezione', 'diario', 'negozio'].map((id) =>
    html().indexOf(`id="${id}"`),
  );
  for (const p of posizioni) expect(p).toBeGreaterThanOrEqual(0);
  expect([...posizioni].sort((a, b) => a - b)).toEqual(posizioni);
});

it("header, menu del telefono e piè di pagina elencano le sezioni nell'ordine della pagina", () => {
  const ancore = sezioni.map((s) => s.href);
  const elenchi = [...html().matchAll(/<nav\b[\s\S]*?<\/nav>/g)]
    .map((m) => [...m[0].matchAll(/href="(#[^"]+)"/g)].map((h) => h[1]!).filter((a) => ancore.includes(a)))
    .filter((elenco) => elenco.length > 0);
  expect(elenchi).toHaveLength(3);
  for (const elenco of elenchi) expect(elenco).toEqual(ancore);
});

it('il diario non è più un profilo: niente storie, un riquadro "Post dal negozio"', () => {
  const diario = decodifica(contenutiCon(html(), 'id', 'diario')[0] ?? '');
  expect(diario).not.toMatch(/\sdata-storia-apri=/);
  expect(diario).not.toContain('Storie in evidenza');
  expect(diario).toMatch(/<h3\b[^>]*>Post dal negozio<\/h3>/);
  expect(diario).toContain(`Aggiornato il ${post[0]!.data}`);
});

it('un solo lettore di storie', () => {
  expect(dialogCon('data-storie')).toHaveLength(1);
});
```

- [ ] **Step 3: verificare che falliscano**

Run: `npm test -- tests/prova/salvia-social-dati.test.ts` e `npm run build && npm run test:dist`
Expected: FAIL. Nel primo, l'ordine delle sezioni è sbagliato. Nel secondo falliscono ordine, `nav`, diario e lettore, perché i dialog di storie sono due.

- [ ] **Step 4: implementare**
- `dati.ts`:
  - `sezioni` nel nuovo ordine;
  - togliere `storieInEvidenza` e il suo commento.
- `index.astro`:
  - in `main`: `Apertura`, `Collezioni`, `Selezione`, `Diario`, `Negozio`;
  - un solo `<DialogStorie storie={storie} etichetta="Storie dal negozio" …/>`.
- `Diario.astro`:
  - da togliere: `.profilo-testa` (avatar che apre la storia di oggi, nome Instagram, sottotitolo, bio, indirizzo e stato, "Segui su Instagram", "Scrivici", storie in evidenza), la riga `.schede` con la scheda "Post", il link "Vedi tutti i post su Instagram" e le sue regole (`.tutti`);
  - da togliere anche gli import che restano inutili e `margin-top: var(--sezione)` della sezione: ora viene dopo la selezione, che ha già il suo spazio in basso.
  - In cima al `.riquadro` va `<div class="testa"><h3>Post dal negozio</h3><p class="aggiornato">Aggiornato il {post[0]!.data}</p></div>`, con le misure della tavola:
    - telefono: colonna, `align-items: flex-start`, `gap: 2px`, `padding: 22px 18px 16px`; `h3` con `--titoli`, 24px, peso 400, `line-height: 1.15`; `.aggiornato` 14px, `line-height: 1.4`, `--grigio-testo`;
    - da 600 px (dove il riquadro già cambia): riga, `align-items: baseline`, `justify-content: space-between`, `gap: 16px`, `padding: 30px 32px 24px`, `h3` 28px.
  - `.altri` contiene solo "Mostra altri post" e sparisce quando il pulsante è nascosto: `.altri:has(> .mostra[hidden]) { display: none }`.
  - Aggiornare il commento in cima al file (niente più profilo).
- `tema.css`: rinominare i due gettoni come da Interfaces.
- `CerchioStoria.astro`: il commento non parla più di storie in evidenza.

- [ ] **Step 5: verificare**

Run: `npm test && npm run build && npm run test:dist`
Expected: tutto PASS, nessun avviso.

- [ ] **Step 6: commit**

```bash
git add src/prova/salvia-social src/pages/prova/salvia-social tests
git commit -F - <<'EOF'
feat: diary after the selection, without profile and highlight stories

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

---

### Task 2: Instagram in un punto solo (la fascia) ed etichette della versione 3

**Files:**
- Create: `src/prova/salvia-social/FasciaInstagram.astro`
- Modify:
  - `src/prova/salvia-social/Icona.astro` (icona `esterno`);
  - `src/pages/prova/salvia-social/index.astro` (fascia tra `Diario` e `Negozio`, commento e `description`);
  - `src/prova/salvia-social/FilaStorie.astro`, `DialogStorie.astro`, `DialogPost.astro`;
  - `src/prova/salvia-social/dati.ts` (`chiedi`, `messaggioPost`, commento in cima);
  - `src/prova/salvia-social/tema.css` (commento in cima), `src/prova/varianti.ts` (descrizione).
- Test: `tests/prova/salvia-social-dati.test.ts`, `tests/dist/dist.test.ts`

**Interfaces:**
- Consumes: `DatiNegozio` (`instagram.handle`, `instagram.url`, `telefonoHref`, `nome`) da `src/prova/comune/negozio.ts`.
- Produces:
  - `FasciaInstagram.astro`, props `{ negozio: DatiNegozio }`: `<section id="instagram" class="fascia" aria-labelledby="instagram-titolo">`;
  - `Icona` accetta `nome="esterno"`, con il tratto `<path d="M7.5 16.5l9-9M9.5 7.5h7v7"/>`;
  - `messaggioPost(voce: Post): string` restituisce `` `Buongiorno, ho visto sul sito il vostro post del ${voce.data} ${voce.chiedi}. Mi date qualche informazione in più?` ``. `Post.chiedi` comincia con la preposizione articolata.

- [ ] **Step 1: scrivere i test che falliscono**

`tests/prova/salvia-social-dati.test.ts`:

```ts
it('il messaggio WhatsApp di un post dice di che cosa parla, con la preposizione', () => {
  expect(messaggioPost(post[0]!)).toBe(
    'Buongiorno, ho visto sul sito il vostro post del 27 ottobre sui plaid delle feste. Mi date qualche informazione in più?',
  );
  for (const voce of post) expect(voce.chiedi, voce.id).toMatch(/^su(?:l|llo|lla|i|gli|lle)? /);
});
```

`tests/dist/dist.test.ts`, nel `describe` di Salvia social (importare `messaggioPost`):

```ts
const INSTAGRAM = 'href="https://www.instagram.com/almaliving.viaricasoli/"';

it("Instagram in tre punti soltanto: icona dell'header, fascia, piè di pagina", () => {
  const pagina = html();
  expect(pagina.split(INSTAGRAM)).toHaveLength(4);
  expect(/<header\b[\s\S]*?<\/header>/.exec(pagina)?.[0]).toContain(INSTAGRAM);
  expect(contenutiCon(pagina, 'id', 'instagram')[0]).toContain(INSTAGRAM);
  expect(/<footer\b[\s\S]*?<\/footer>/.exec(pagina)?.[0]).toContain(INSTAGRAM);
});

it('la fascia Instagram sta tra il diario e il negozio, ed è senza foto', () => {
  const pagina = html();
  const [diario, fascia, negozio] = ['id="diario"', 'id="instagram"', 'id="negozio"'].map((s) =>
    pagina.indexOf(s),
  );
  expect(diario).toBeGreaterThanOrEqual(0);
  expect(fascia).toBeGreaterThan(diario!);
  expect(negozio).toBeGreaterThan(fascia!);
  const contenuto = decodifica(contenutiCon(pagina, 'id', 'instagram')[0] ?? '');
  expect(contenuto).toMatch(/<h2\b[^>]*\sid="instagram-titolo"[^>]*>Seguici anche su Instagram<\/h2>/);
  expect(contenuto).toContain('@almaliving.viaricasoli');
  expect(contenuto).toContain('Le foto di ogni giorno sono anche lì.');
  expect(contenuto).toContain('aria-label="Apri Instagram: @almaliving.viaricasoli"');
  expect(contenuto).not.toMatch(/<(?:img|picture)\b/);
});

it('accanto alla fila delle storie "Vedi i post" porta al diario', () => {
  expect(html()).toMatch(/<a\b[^>]*\shref="#diario"[^>]*>Vedi i post/);
  expect(html()).not.toContain('Vedi il profilo');
});

it('storie e post propongono di chiamare il negozio, non Instagram', () => {
  const testo = (s: string) => s.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  expect(decodifica(html())).not.toContain('Vedi su Instagram');
  const chiama = [...html().matchAll(/<a\b[^>]*\shref="tel:\+393345205451"[^>]*>([\s\S]*?)<\/a>/g)]
    .map((m) => testo(m[1]!))
    .filter((t) => t === 'Chiama il negozio');
  expect(chiama).toHaveLength(storie.length + post.length);
  for (const { contenuto } of [...dialogCon('data-storie'), ...dialogCon('data-post')]) {
    expect(contenuto).not.toContain('almaliving.viaricasoli');
  }
});

it("il post aperto è firmato Alma Living e il suo WhatsApp ha il messaggio del post", () => {
  const dialog = new Map(dialogCon('data-post').map(({ apertura, contenuto }) => [valore(apertura, 'data-post'), contenuto]));
  for (const voce of post) {
    const contenuto = dialog.get(voce.id) ?? '';
    expect(contenuto, voce.id).toMatch(/>Alma Living</);
    expect(contenuto, voce.id).toContain(
      `href="https://wa.me/393345205451?text=${encodeURIComponent(messaggioPost(voce))}"`,
    );
  }
});
```

- [ ] **Step 2: verificare che falliscano**

Run: `npm test -- tests/prova/salvia-social-dati.test.ts` e `npm run build && npm run test:dist`
Expected: FAIL (testo del messaggio; i link Instagram oggi sono più di 3; la fascia manca).

- [ ] **Step 3: implementare**
- `dati.ts`:
  - nei dodici `chiedi` l'articolo iniziale diventa la preposizione articolata, come sulla tavola versione 3: `i` → `sui`, `gli` → `sugli`, `la` → `sulla`, `le` → `sulle` (per esempio `sui plaid delle feste`, `sugli gnomi di stoffa`, `sulla parete dei plaid`, `sulle candele alla vaniglia`); il resto del testo non cambia;
  - `messaggioPost` come da Interfaces; il commento di `chiedi` va aggiornato;
  - il commento in cima cita la tavola `DiarioFascia.dc.html` (versione 3). Lo stesso per il commento di `tema.css`.
- `FasciaInstagram.astro`, con le misure della tavola:
  - fondo `--bianco`; dentro, `max-width: var(--larghezza)` e `padding: 28px var(--margine)`, che diventa `40px var(--margine)` da 960 px;
  - riga interna tra due linee: `box-shadow: inset 0 1px 0 var(--bordo), inset 0 -1px 0 var(--bordo)`.
  - Sotto 960 px, colonna centrata con `padding: 28px 4px`:
    - simbolo tondo di 56 px (bordo `inset 0 0 0 1px var(--bordo)`), icona `instagram` di 26 px, `aria-hidden`;
    - `h2#instagram-titolo` "Seguici anche su Instagram": margine 16px sopra, `--titoli`, 26px, peso 400, `line-height: 1.15`, `letter-spacing: -0.01em`, `text-wrap: balance`;
    - un `p` con tre `span`:
      - il nome Instagram (15px, peso 600, `overflow-wrap: anywhere`, su una riga sua);
      - il separatore " · " (`aria-hidden`, nascosto sul telefono);
      - "Le foto di ogni giorno sono anche lì." (15px, `line-height: 1.45`, `--grigio-testo`, margine 2px sopra, su una riga sua).
    - Il link `href={negozio.instagram.url}`, con `aria-label` dai Global Constraints:
      - dentro: icona `instagram` 20, "Apri Instagram", icona `esterno` 18;
      - `width: min(100%, 420px)`, `min-height: 52px`, margine 20px sopra;
      - fondo `--salvia-scura`, testo `--bianco`, `--pillola`, 16px, peso 600.
  - Da 960 px, riga con `align-items: center`, `gap: 28px` e `padding: 30px 8px`:
    - simbolo di 76 px con icona di 32 px;
    - titolo e testo a sinistra, che occupano lo spazio: `h2` 36px con `line-height: 1.1` e nessun margine; il `p` su una riga, 17px con `line-height: 1.5`, il nome in `--nero` e peso 600, il separatore visibile;
    - il link a destra: `flex: none`, `min-height: 54px`, `padding: 0 24px 0 22px`, `--salvia-scura-sopra` al passaggio.
- `index.astro`:
  - `<FasciaInstagram negozio={negozio} />` tra `Diario` e `Negozio`;
  - commento e `description` senza "profilo di Martina" (per esempio "…storie dal negozio, la selezione e il diario di Martina.").
- `FilaStorie.astro`: "Vedi il profilo" diventa "Vedi i post" (stesso `href="#diario"`); aggiornare il commento in cima.
- `DialogStorie.astro`, al posto del link Instagram:
  - `<a class="chiama" href={negozio.telefonoHref}>` con icona `telefono` 18 e `<span>Chiama<span class="lungo"> il negozio</span></span>`;
  - stesso stile del vecchio `.instagram`: bordo `inset 0 0 0 1.5px var(--bordo-storia)`, testo bianco;
  - con il telefono ruotato resta "Chiama", come oggi per "Chiedi su WhatsApp".
- `DialogPost.astro`:
  - nell'intestazione `negozio.nome` al posto del nome Instagram; togliere la costante `handle`;
  - il secondo link diventa `href={negozio.telefonoHref}`, con icona `telefono` e "Chiama il negozio".
- `varianti.ts`: descrizione senza "profilo", per esempio "Bianco e verde salvia, titoli serif classici, storie tonde sotto l’header, selezione dal negozio e diario di Martina con la griglia dei post."

- [ ] **Step 4: verificare**

Run: `npm test && npm run build && npm run test:dist`
Expected: tutto PASS, nessun avviso.

- [ ] **Step 5: commit**

```bash
git add src/prova src/pages/prova tests
git commit -F - <<'EOF'
feat: Instagram band after the diary, call the shop from stories and posts

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

---

### Task 3: le foto d'apertura si trascinano

**Files:**
- Create: `src/prova/comune/gesti.ts`
- Modify: `src/prova/comune/interazioni.ts` (protocollo Galleria e documentazione in cima), `src/prova/salvia-social/Apertura.astro`
- Test: `tests/prova/gesti.test.ts`, `tests/dist/dist.test.ts`

**Interfaces:**
- Produces, in `gesti.ts` (puro, senza DOM):
  - `export const SOGLIA_TRASCINAMENTO_PX = 40;`
  - `export function versoTrascinamento(dx: number, dy: number): -1 | 0 | 1`: `1` è la foto dopo (dito verso sinistra, `dx ≤ -40`), `-1` quella prima (`dx ≥ 40`), `0` niente. Restituisce `0` se `|dx| < 40` o `|dx| < |dy|`.
- Protocollo, da aggiungere alla voce "Galleria" in cima a `interazioni.ts`:
  - dentro `[data-galleria]`, l'area `[data-galleria-trascina]`: un trascinamento con il dito o con il mouse (pulsante principale) cambia foto secondo `versoTrascinamento`, a giro, come le frecce;
  - non conta un trascinamento che comincia su un `button` o un `a`;
  - al `pointerdown` lo script cattura il puntatore (`setPointerCapture`), così anche un rilascio fuori dall'area conta. Al `pointerup` dello stesso puntatore decide; un `pointercancel` (il browser ha preso lo scorrimento della pagina) annulla;
  - il trascinamento nativo delle immagini dentro l'area è bloccato (`dragstart` annullato);
  - la variante dà all'area `touch-action: pan-y`, così la pagina scorre in verticale.
- `Contesto` riceve `trascinamento: { galleria: HTMLElement; id: number; x: number; y: number } | null`.

- [ ] **Step 1: scrivere i test che falliscono**

`tests/prova/gesti.test.ts`:

```ts
describe('versoTrascinamento', () => {
  it.each([
    [-40, 0, 1], [-120, 30, 1], [-60, 60, 1], [40, 0, -1], [90, -20, -1],
    [-39, 0, 0], [39, 0, 0], [0, 0, 0], [-60, 61, 0], [50, -200, 0],
  ])('dx %i, dy %i → %i', (dx, dy, atteso) => {
    expect(versoTrascinamento(dx, dy)).toBe(atteso);
  });

  it('la soglia è di 40 px', () => {
    expect(SOGLIA_TRASCINAMENTO_PX).toBe(40);
  });
});
```

`tests/dist/dist.test.ts`, nel `describe` di Salvia social:

```ts
it("l'apertura è una galleria che si trascina: un'area sola, che contiene le foto", () => {
  const sezione = /<section\b[^>]*\sid="apertura"[^>]*>/.exec(html())?.[0] ?? '';
  expect(sezione).toMatch(/\sdata-galleria(?=[\s=>])/);
  const dentro = contenutiCon(html(), 'id', 'apertura')[0] ?? '';
  expect(dentro.match(/\sdata-galleria-trascina(?=[\s=>])/g) ?? []).toHaveLength(1);
  const area = dentro.search(/\sdata-galleria-trascina(?=[\s=>])/);
  expect(area).toBeLessThan(dentro.search(/\sdata-galleria-foto(?=[\s=>])/));
});
```

- [ ] **Step 2: verificare che falliscano**

Run: `npm test -- tests/prova/gesti.test.ts` e `npm run build && npm run test:dist`
Expected: FAIL (modulo `gesti.ts` assente; nessun `data-galleria-trascina`).

- [ ] **Step 3: implementare**
- `gesti.ts` come da Interfaces.
- `interazioni.ts`:
  - ascoltatori `pointerdown`, `pointerup`, `pointercancel` e `dragstart` sulla radice, per delega come gli altri;
  - il cambio di foto usa `mostraFoto(galleria, fotoCorrente(galleria) + verso)`;
  - documentazione in cima.
- `Apertura.astro`:
  - `data-galleria-trascina` sul `div.foto`;
  - in CSS: `touch-action: pan-y`, `user-select: none`, `-webkit-user-select: none`, `cursor: grab`.

- [ ] **Step 4: verificare**

Run: `npm test && npm run build && npm run test:dist`
Expected: tutto PASS, nessun avviso.

- [ ] **Step 5: commit**

```bash
git add src/prova/comune src/prova/salvia-social/Apertura.astro tests
git commit -F - <<'EOF'
feat: drag the opening photos with a finger or the mouse

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

---

### Task 4: zone di tocco delle storie

**Files:**
- Modify: `src/prova/comune/gesti.ts`, `src/prova/comune/interazioni.ts` (protocollo Storie e documentazione in cima), `src/prova/salvia-social/DialogStorie.astro`
- Test: `tests/prova/gesti.test.ts`, `tests/dist/dist.test.ts`

**Interfaces:**
- Consumes: `gesti.ts` (Task 3).
- Produces, in `gesti.ts`:
  - `export const PRESSIONE_LUNGA_MS = 300;`
  - `export type AzioneTocco = 'prec' | 'pausa' | 'succ';`
  - `export function azioneDelTocco(x: number, larghezza: number, durataMs: number): AzioneTocco | null`:
    - `null` se `durataMs > 300` o `larghezza <= 0`;
    - altrimenti `'prec'` per `x < larghezza / 3`, `'pausa'` per `x < 2 * larghezza / 3`, `'succ'` dopo.
- Protocollo, da aggiungere alla voce "Storie" in cima a `interazioni.ts`:
  - `[data-storia-tocchi]` è un elemento per dialog, sopra le foto e sotto i controlli, con `aria-hidden="true"` e non focalizzabile;
  - un clic o un tocco esegue `azioneDelTocco(x dal bordo sinistro della zona, larghezza della zona, durata dal pointerdown al pointerup)`:
    - `prec` e `succ` fanno come `[data-storia-prec|succ]`;
    - `pausa` fa come `[data-storia-pausa]`, che resta e ne riflette lo stato con `aria-pressed`.
  - Tenere premuto ferma la storia, come oggi, e la pressione lunga al rilascio non fa altro.
  - Da tastiera restano i pulsanti e le frecce.
- `Contesto` riceve `inizioTocco: number` e `durataTocco: number`; le voci di `AZIONI` ricevono anche l'evento: `(c: Contesto, el: HTMLElement, evento: MouseEvent) => void`.

- [ ] **Step 1: scrivere i test che falliscono**

`tests/prova/gesti.test.ts`:

```ts
describe('azioneDelTocco', () => {
  it.each([
    [10, 300, 120, 'prec'], [99, 300, 120, 'prec'], [100, 300, 120, 'pausa'],
    [199, 300, 120, 'pausa'], [200, 300, 120, 'succ'], [299, 300, 120, 'succ'],
    [150, 300, 300, 'pausa'], [150, 300, 301, null], [10, 300, 900, null], [5, 0, 50, null],
  ])('x %i su %i px, %i ms → %s', (x, larghezza, durata, attesa) => {
    expect(azioneDelTocco(x, larghezza, durata)).toBe(attesa);
  });

  it('una pressione è lunga oltre 300 ms', () => {
    expect(PRESSIONE_LUNGA_MS).toBe(300);
  });
});
```

`tests/dist/dist.test.ts`, nel `describe` di Salvia social:

```ts
it('il lettore delle storie ha una zona di tocco, nascosta ai lettori di schermo e fuori dal tab', () => {
  for (const { contenuto } of dialogCon('data-storie')) {
    const zone = [...contenuto.matchAll(/<([a-z]+)\b[^>]*\sdata-storia-tocchi(?=[\s=>])[^>]*>/g)];
    expect(zone).toHaveLength(1);
    expect(zone[0]![1]).toBe('div');
    expect(zone[0]![0]).toMatch(/\saria-hidden="true"/);
    expect(zone[0]![0]).not.toMatch(/\s(?:tabindex|role)=/);
  }
});
```

Il test esistente sul pulsante di pausa (`data-storia-pausa` con `aria-pressed="false"`) resta com'è.

- [ ] **Step 2: verificare che falliscano**

Run: `npm test -- tests/prova/gesti.test.ts` e `npm run build && npm run test:dist`
Expected: FAIL (`azioneDelTocco` non esportata; nessun `data-storia-tocchi`).

- [ ] **Step 3: implementare**
- `gesti.ts` come da Interfaces.
- `interazioni.ts`:
  - al `pointerdown` sulla zona si segna `inizioTocco`, al `pointerup` `durataTocco`;
  - un'azione `['[data-storia-tocchi]', …]` in `AZIONI` chiama `indietroStoria`, `alternaPausa` o `avantiStoria`;
  - la pressione che ferma la storia (`premuto`) resta quella di oggi;
  - documentazione in cima.
- `DialogStorie.astro`:
  - dentro `.scheda`, dopo i gruppi e prima di `.comandi`: `<div class="tocchi" data-storia-tocchi aria-hidden="true"></div>`;
  - `.tocchi`: `position: absolute; inset: 0; z-index: 1; touch-action: manipulation; user-select: none; -webkit-user-select: none; -webkit-touch-callout: none; cursor: pointer`. Sta sopra le foto (`.foto` senza `z-index`) e sotto barre, testata e azioni (2), comandi (3) e frecce (4);
  - i tocchi passano attraverso ciò che non si usa: `.barre`, `.testa` e il contenitore `.azioni` hanno `pointer-events: none`, i link `.azioni a` `pointer-events: auto`.

- [ ] **Step 4: verificare**

Run: `npm test && npm run build && npm run test:dist`
Expected: tutto PASS, nessun avviso.

- [ ] **Step 5: commit**

```bash
git add src/prova/comune src/prova/salvia-social/DialogStorie.astro tests
git commit -F - <<'EOF'
feat: tap left, centre or right of a story to go back, pause or go on

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

---

### Task 5: selezione a griglia sul telefono e sul tablet, carosello sul computer

**Files:**
- Create: `src/prova/comune/limite.ts`
- Modify:
  - `src/prova/comune/interazioni.ts` (protocollo "Limite" e documentazione in cima);
  - `src/prova/salvia-social/dati.ts` (`LIMITI_SELEZIONE`);
  - `src/prova/salvia-social/Selezione.astro`, `src/prova/salvia-social/SchedaArticolo.astro`.
- Test: `tests/prova/limite.test.ts`, `tests/prova/salvia-social-dati.test.ts`, `tests/dist/dist.test.ts` (anche `incoerenzeProtocolli`)

**Interfaces:**
- Produces:
  - `limite.ts` (puro):
    - `export interface RegolaLimite { media: string; limite: number }`;
    - `export function limiteAttivo(regole: readonly RegolaLimite[], corrisponde: (media: string) => boolean): number | null`: il `limite` della prima regola che corrisponde; `null` se nessuna corrisponde;
    - `export function quanteMostrare(passano: number, limite: number | null, tutte: boolean): number`: `passano` se `tutte` o `limite === null`, altrimenti `Math.min(passano, limite)`;
    - `export function testoMostraTutti(quante: number): string`: `Mostra tutti gli <n>` se `String(n)` comincia per `8` o `n === 11`, altrimenti `Mostra tutti i <n>`.
  - `dati.ts`: `export const LIMITI_SELEZIONE: readonly RegolaLimite[] = [{ media: '(max-width: 767px)', limite: 4 }, { media: '(max-width: 1023px)', limite: 6 }]`, con il commento che le media query di `Selezione.astro` sono le stesse.
- Protocollo "Limite", da documentare in cima a `interazioni.ts`:
  - `[data-limite="<nome>"]` con `data-limite-regole` (JSON di `RegolaLimite[]`, letto con `matchMedia`): delle voci `[data-filtrabile="<nome>"]` che passano il filtro si vedono solo le prime `quanteMostrare(passano, limiteAttivo(…), aperto)`, nell'ordine della pagina. Regole illeggibili: nessun limite.
  - `button[data-limite-mostra="<nome>"]`, `hidden` nella pagina:
    - si mostra solo se resta fuori qualche voce, e lo script scrive `testoMostraTutti(passano)` nel suo `[data-limite-testo]`;
    - premuto, il nome resta aperto per ogni filtro successivo: il pulsante sparisce e il focus va al primo `a[href]` o `button` della prima voce comparsa.
  - Si ricalcola in `applicaFiltri` (cambio di filtro, "Mostra altri") e al `change` di ogni `matchMedia` delle regole, non a ogni `resize`.
  - Senza JavaScript si vedono tutte le voci.
- `Contesto` riceve `limiteAperto: Set<string>`.

- [ ] **Step 1: scrivere i test che falliscono**

`tests/prova/limite.test.ts`:

```ts
const REGOLE = [
  { media: '(max-width: 767px)', limite: 4 },
  { media: '(max-width: 1023px)', limite: 6 },
];

describe('limiteAttivo', () => {
  it('vince la prima regola che corrisponde', () => {
    expect(limiteAttivo(REGOLE, () => true)).toBe(4);
    expect(limiteAttivo(REGOLE, (m) => m === '(max-width: 1023px)')).toBe(6);
  });
  it('nessuna regola che corrisponde: nessun limite', () => {
    expect(limiteAttivo(REGOLE, () => false)).toBeNull();
    expect(limiteAttivo([], () => true)).toBeNull();
  });
});

describe('quanteMostrare', () => {
  it.each([
    [8, 4, false, 4], [8, 6, false, 6], [4, 4, false, 4], [3, 4, false, 3],
    [0, 4, false, 0], [8, null, false, 8], [8, 4, true, 8],
  ])('%i voci, limite %s, tutte %s → %i', (passano, limite, tutte, attese) => {
    expect(quanteMostrare(passano, limite, tutte)).toBe(attese);
  });
});

describe('testoMostraTutti', () => {
  it.each([
    [8, 'Mostra tutti gli 8'], [11, 'Mostra tutti gli 11'], [80, 'Mostra tutti gli 80'],
    [5, 'Mostra tutti i 5'], [7, 'Mostra tutti i 7'], [18, 'Mostra tutti i 18'],
  ])('%i → %s', (n, atteso) => {
    expect(testoMostraTutti(n)).toBe(atteso);
  });
});
```

`tests/prova/salvia-social-dati.test.ts`:

```ts
it('la selezione mostra 4 schede sul telefono e 6 sul tablet, e ne ha di più', () => {
  expect(LIMITI_SELEZIONE).toEqual([
    { media: '(max-width: 767px)', limite: 4 },
    { media: '(max-width: 1023px)', limite: 6 },
  ]);
  expect(articoli.length).toBeGreaterThan(6);
});
```

`tests/dist/dist.test.ts`, `incoerenzeProtocolli`:
- regole nuove:
  - ogni `data-limite-mostra="N"` vuole un `data-limite="N"`;
  - ogni `data-limite="N"` vuole un `data-filtrabile="N"` e un `data-limite-mostra="N"`.
- In `segnala %s`:
  - `'<button data-limite-mostra="s" hidden>Mostra tutti</button>'`;
  - `'<ul data-limite="s" data-limite-regole="[]"></ul><button data-limite-mostra="s" hidden></button>'`, senza voci;
  - `'<ul data-limite="s" data-limite-regole="[]"><li data-filtrabile="s" data-categorie="a">x</li></ul><div data-filtri="s"><button data-filtro="a">A</button></div><p data-filtro-vuoto="s" hidden></p>'`, senza pulsante.
- In `non segnala %s`, lo stesso ultimo frammento con in più `<button data-limite-mostra="s" hidden><span data-limite-testo></span></button>`.

`tests/dist/dist.test.ts`, nel `describe` di Salvia social (importare `LIMITI_SELEZIONE`):

```ts
it('la selezione ha il limite per misura, e senza JavaScript mostra tutte le schede', () => {
  const contenitori = tagCon('ul', 'data-limite');
  expect(contenitori.map((t) => valore(t, 'data-limite'))).toEqual(['selezione']);
  expect(JSON.parse(valore(contenitori[0]!, 'data-limite-regole') ?? '')).toEqual(LIMITI_SELEZIONE);
  const mostra = tagCon('button', 'data-limite-mostra');
  expect(mostra.map((t) => valore(t, 'data-limite-mostra'))).toEqual(['selezione']);
  expect(mostra[0]).toMatch(/\shidden(?=[\s=>])/);
  for (const voce of tagCon('[a-z]+', 'data-filtrabile')) expect(voce).not.toMatch(/\shidden(?=[\s=>])/);
});
```

- [ ] **Step 2: verificare che falliscano**

Run: `npm test -- tests/prova` e `npm run build && npm run test:dist`
Expected: FAIL (`limite.ts` e `LIMITI_SELEZIONE` assenti; nessun `data-limite` nella pagina).

- [ ] **Step 3: implementare**
- `limite.ts` e `LIMITI_SELEZIONE` come da Interfaces.
- `interazioni.ts`:
  - il limite si applica in `applicaFiltri`, dopo il filtro e `data-altro`: una voce è visibile se passa il filtro, non è piegata e sta entro il limite;
  - `mostraTutti` in `AZIONI` per `[data-limite-mostra]`;
  - ascoltatori `matchMedia(…).addEventListener('change', …)` registrati una volta all'avvio, uno per `media` distinta;
  - documentazione in cima.
- `Selezione.astro`, markup:
  - `ul.binario` riceve `data-limite="selezione"` e `data-limite-regole={JSON.stringify(LIMITI_SELEZIONE)}`;
  - dopo `li[data-filtro-vuoto]` e prima di `.voce-altro` va un `li.voce-mostra` con `<button type="button" class="mostra-tutti" data-limite-mostra="selezione" hidden><span data-limite-testo>Mostra tutti</span><Icona nome="giu" misura={18} /></button>`;
  - `.voce-mostra:has(> [hidden]) { display: none }`.
- `Selezione.astro`, stile sotto 768 px (griglia):
  - `.binario` in griglia: `repeat(2, minmax(0, 1fr))`, `gap: 16px 12px`, `padding: 6px var(--margine) 28px`, senza scorrimento né scroll-snap;
  - `.voce` con `min-width: 0` e senza larghezza fissa;
  - `.voce-mostra`, `[data-filtro-vuoto]` e `.voce-altro` con `grid-column: 1 / -1`; `.voce-mostra` centra il pulsante con `padding: 4px 0`;
  - pulsante: `min-height: 46px`, `padding: 0 22px`, `--pillola`, fondo `--bianco`, `box-shadow: inset 0 0 0 1px var(--nero)`, 15px, peso 600, `gap: 10px`, `--latte-sopra` al passaggio;
  - il pannello "Chiedi disponibilità" copre la riga, perché il messaggio resti leggibile:
    - `.voce:nth-child(odd of [data-filtrabile]:not([hidden])) :global(.pannello) { right: calc(-100% - 12px) }`;
    - `.voce:nth-child(even of [data-filtrabile]:not([hidden])) :global(.pannello) { left: calc(-100% - 12px) }`;
    - su ogni misura della griglia il pannello ha `bottom: auto` e `min-height: 100%`.
- `Selezione.astro`, stile da 768 a 1023 px: tre colonne, `gap: 20px 16px`.
- `Selezione.astro`, stile da 1024 px:
  - il blocco `@media (min-width: 960px)` di oggi diventa `(min-width: 1024px)` e contiene tutto il carosello: binario `flex` a scorrimento con scroll-snap, `.voce` `flex: 0 0 300px`, frecce visibili, `min-height: 420px` della tessera;
  - resta la regola oltre i 1440 px;
  - le voci della griglia tornano in fila.
- `SchedaArticolo.astro`:
  - sotto 768 px: `.corpo` con `padding: 0 4px`; categoria 11px, nome 18px, dettaglio 13px;
  - sotto 768 px il pulsante "Chiedi" è largo quanto la scheda (`width: 100%`, `padding: 0 10px`, `gap: 7px`). Il testo visibile è "Chiedi", con `<span class="lungo"> disponibilità</span>` nascosto alla vista ma letto, con la tecnica di `.solo-lettori`: il nome resta "Chiedi disponibilità";
  - da 768 px il testo del computer (nome 23px, dettaglio 15px, pulsante intero): il blocco `@media (min-width: 960px)` dei caratteri scende a 768 px; quello del passaggio del mouse resta a 960;
  - `sizes` della foto: `(min-width: 1024px) 280px, (min-width: 768px) 31vw, 46vw`.
- Aggiornare i commenti in cima a `Selezione.astro`.

- [ ] **Step 4: verificare**

Run: `npm test && npm run build && npm run test:dist`
Expected: tutto PASS, nessun avviso.

- [ ] **Step 5: commit**

```bash
git add src/prova tests
git commit -F - <<'EOF'
feat: selection grid with the first cards on phone and tablet

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

---

### Task 6: verifica nel browser integrato e invio del ramo

**Files:**
- Modify: solo i file da correggere, se la verifica trova qualcosa. Ogni correzione è un commit `fix:` piccolo, con i tre comandi verdi.

- [ ] **Step 1: verifica completa**

Run: `npm test && npm run build && npm run test:dist`
Expected: tutto PASS, nessun avviso.

- [ ] **Step 2: aprire la pagina**

Nel browser integrato: `preview_start` con la configurazione `sito-dev` di `.claude/launch.json`, poi `http://localhost:4321/prova/salvia-social/`.

- [ ] **Step 3: a 390 px** (`resize_window` 390 x 844)
- Nessuno scorrimento orizzontale: `document.documentElement.scrollWidth <= innerWidth` è `true`, anche con il menu aperto.
- Menu e footer elencano Collezioni, Selezione, Dal negozio, Il negozio; nella pagina il diario viene dopo "Sugli scaffali adesso".
- Apertura:
  - `left_click_drag` di 150 px verso sinistra sulla foto: il contatore passa a "2 di 3"; verso destra torna a "1 di 3";
  - un trascinamento verticale di 150 px, o uno di 30 px in orizzontale, non cambia foto;
  - un clic sulle frecce cambia una foto sola.
- Storie (aprire "Oggi"):
  - un clic nel terzo destro della scheda va alla foto dopo, nel sinistro torna indietro;
  - un clic al centro porta il pulsante di pausa ad `aria-pressed="true"` e le barre si fermano; un altro clic lo riporta a `false`;
  - pressione lunga, con `javascript_tool` sulla zona `[data-storia-tocchi]`: `pointerdown` nel terzo sinistro, attesa di 400 ms, poi `pointerup` e `click`. La storia resta sulla stessa foto e riprende ad avanzare;
  - "Chiama il negozio" è presente; Esc chiude e il focus torna al cerchio.
- Selezione:
  - 4 schede su due colonne e "Mostra tutti gli 8";
  - con Bagno, 3 schede e nessun pulsante; con Mare, solo la tessera "Il mare torna in primavera"; con Tutto, di nuovo 4 schede e il pulsante;
  - premuto il pulsante: 8 schede e il focus su "Chiedi" della quinta; scegliendo Bagno e poi di nuovo Tutto restano 8 schede, senza pulsante;
  - "Chiedi" su una scheda di destra apre il pannello largo quanto la riga.
- Diario: "Post dal negozio", "Aggiornato il 27 ottobre", 9 post e "Mostra altri post"; un post aperto è firmato "Alma Living", con "Chiama il negozio".
- Fascia: centrata, tra due linee, con il pulsante largo quanto la riga.

- [ ] **Step 4: a 768 px** (768 x 1024)
- Nessuno scorrimento orizzontale.
- Selezione su tre colonne con 6 schede, "Mostra tutti gli 8" e il pulsante "Chiedi disponibilità" intero.
- Fascia centrata, con il pulsante largo 420 px.
- Cambio di misura, dopo aver ricaricato la pagina (senza "Mostra tutti" premuto), con `resize_window`:
  - a 1023 px, 6 schede e il pulsante; a 1024 px, il carosello con le 8 schede e le frecce; a 767 px, 4 schede e "Mostra tutti gli 8";
  - con Natale scelto a 1024 px, le sue 3 schede; tornando a 767 px restano 3, senza pulsante.

- [ ] **Step 5: a 1440 px** (1440 x 900)
- Carosello con le frecce e nessun "Mostra tutti".
- Fascia in riga: simbolo, titolo e testo, "Apri Instagram" a destra.
- Trascinamento con il mouse sull'apertura: cambia foto, e il cursore è la mano.
- Storie: frecce ai lati della scheda; tocchi nei tre terzi della scheda di 420 px.
- Nessuno scorrimento orizzontale anche a 360, 1024 e 1920 px (§10).
- Poi `resize_window` con `preset: "desktop"`.

- [ ] **Step 6: correggere quanto trovato**, un commit `fix:` per problema, poi di nuovo Step 1.

- [ ] **Step 7: inviare il ramo, solo con il via di eusebjo**

```bash
git push origin fase2/1-varianti
```

Attendere la build Cloudflare del ramo, poi ripetere i controlli a 390 e 1440 px sull'anteprima `https://fase2-1-varianti-alma-living.sebjomuho.workers.dev/prova/salvia-social/`. Infine consegnare a eusebjo l'indirizzo e l'elenco dei cambi da provare.
