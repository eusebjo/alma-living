# AGENTS.md: come si modificano i contenuti di Alma Living

Questa guida è per chi propone modifiche ai **contenuti** del sito (persone e agenti). Alma Living è un negozio di biancheria per la casa a Livorno; il sito è statico (Astro) e i contenuti sono file JSON nel repository. Le foto no: stanno su Cloudflare R2 e i contenuti ne citano l'indirizzo.

Per lo sviluppo (codice, layout, configurazioni) vedi `CLAUDE.md`.

## Regole d'oro

1. **Si modificano solo i contenuti**, nelle cartelle indicate sotto. Codice, layout, componenti, stili, configurazioni, workflow e configurazione del pannello non si toccano. Le foto non si aggiungono al repository (è pubblico): si caricano nel bucket R2 dal pannello (vedi "Foto").
2. **Le regole di autonomia sono in `autonomia.yml`; codice e layout non si toccano.** Lì si legge chi può fare cosa e a quale livello. Il file si cambia solo con una proposta di sviluppo approvata da eusebjo.
3. **Ogni modifica è una proposta** (branch e pull request), mai un push su `main`. Prima di andare online passa da `build`, da `verifica-autonomia` e dall'approvazione di eusebjo.
4. **Solo gli account elencati in `autonomia.yml` (sezione `ruoli`) possono proporre modifiche.** Una proposta di qualunque altro account, o da un fork, è sempre respinta, qualunque cosa contenga.
5. **I branch `cms/**` valgono sempre come proposte della redazione.** Sono quelli del pannello: vengono sempre valutati con le regole dei contenuti (campi e livelli di `autonomia.yml`, limiti dello schema), anche se la pull request la apre un account di sviluppo. Per lavoro di sviluppo non si usano branch `cms/`.
6. **Lo schema è l'autorità.** Se un contenuto non lo rispetta la build fallisce e la proposta non si può unire. I messaggi di errore sono in italiano e dicono quale campo e quale limite.

## Cartelle e file

| Percorso | Cosa contiene |
|---|---|
| `src/content/negozio/negozio.json` | Le impostazioni del negozio: un solo file |
| `src/content/prodotti/<id>.json` | I prodotti degli scaffali: un prodotto per file |
| `src/content/post/<id>.json` | I post del diario: un post per file |
| `src/content/storie/<nome>.json` | Le otto storie fisse: `oggi`, `arrivi`, `vetrina`, `casette`, `candele`, `bimbi`, `tavola`, `lenzuola` |

Il nome di un file (senza `.json`) è l'id della voce nella pagina: solo **lettere minuscole, cifre e trattini**. Il pannello dà ai file nuovi di `prodotti` e `post` il nome della data della voce (`2026-11-03.json`, poi `2026-11-03-1.json`…); un file nuovo con un altro nome fa respingere la proposta della redazione, e un post non può chiamarsi `articolo-…` (nella pagina gli articoli degli scaffali sono `articolo-<id>`). Le storie non si creano né si eliminano.

Sola lettura (non si modificano con una proposta di contenuti):

- `src/content/schemas.ts`: lo schema di ogni campo;
- `src/content/limits.ts`: i limiti numerici, nell'oggetto `LIMITI`;
- `src/content/categorie.ts`: le sette categorie dei prodotti;
- `src/content/foto.ts`: l'indirizzo del bucket delle foto e le inquadrature.

## `negozio.json`

Un oggetto JSON piatto. Gli stessi dati alimentano la pagina, i dati strutturati schema.org (JSON-LD) e `llms.txt`.

| Campo | Obbligatorio | Regole |
|---|---|---|
| `nome` | sì | massimo `LIMITI.negozio.nome.max` caratteri |
| `descrizione` | sì | tra `LIMITI.negozio.descrizione.min` e `LIMITI.negozio.descrizione.max` caratteri. È anche la descrizione della pagina nei risultati di ricerca |
| `indirizzo.via` | sì | testo |
| `indirizzo.civico` | sì | massimo `LIMITI.negozio.civico.max` caratteri (es. `51-53`) |
| `indirizzo.cap` | sì | 5 cifre |
| `indirizzo.citta` | sì | testo |
| `indirizzo.provincia` | sì | sigla di 2 lettere maiuscole (es. `LI`) |
| `telefono` | sì | solo cifre, spazi e un `+` iniziale; da 9 a 15 cifre. Senza prefisso internazionale il numero è considerato italiano |
| `email` | no | indirizzo valido. Se non c'è, **ometti il campo**: una stringa vuota fa fallire la build |
| `orari` | no | elenco di fasce; se non ci sono, `[]` |

Ogni fascia di `orari` ha:

- `giorno`: `lunedi`, `martedi`, `mercoledi`, `giovedi`, `venerdi`, `sabato` o `domenica` (minuscolo, senza accenti);
- `apertura` e `chiusura`: ora in formato 24 ore `HH:MM` (es. `09:30`), con la chiusura **dopo** l'apertura.

Una riga per fascia: un giorno con mattina e pomeriggio ha due righe. Un giorno di chiusura non ha righe.

```json
{
  "nome": "Alma Living",
  "descrizione": "Negozio di biancheria per la casa nel centro di Livorno.",
  "indirizzo": {
    "via": "Via Ricasoli",
    "civico": "51-53",
    "cap": "57125",
    "citta": "Livorno",
    "provincia": "LI"
  },
  "telefono": "334 520 5451",
  "orari": [
    { "giorno": "martedi", "apertura": "09:30", "chiusura": "13:00" },
    { "giorno": "martedi", "apertura": "16:00", "chiusura": "19:30" }
  ]
}
```

## Foto

Ogni foto di prodotti, post e storie è un oggetto con questi campi:

| Campo | Obbligatorio | Regole |
|---|---|---|
| `src` | sì | l'indirizzo di una foto del bucket: `https://foto.almalivingviaricasoli.it/cms/<nome>` (caricate dal pannello) o `https://foto.almalivingviaricasoli.it/prova/<nome>` (foto fisse e foto migrate). Nessun altro sito, nessuna sottocartella, niente `..`, query o frammento |
| `alt` | sì | testo alternativo che descrive la foto per chi non la vede, tra `LIMITI.foto.alt.min` e `LIMITI.foto.alt.max` caratteri |
| `inquadratura` | no | quale parte della foto resta in vista quando è tagliata: `alto`, `centro-alto`, `centro` (predefinita), `centro-basso` o `basso` |

```json
{
  "src": "https://foto.almalivingviaricasoli.it/cms/img_1234-0b7c41d2.webp",
  "alt": "Lenzuola color sabbia in primo piano",
  "inquadratura": "centro"
}
```

- Le foto **non si caricano con una proposta**: `autonomia.yml` non ammette file multimediali, e un file aggiunto al repository fa respingere la proposta della redazione. Si caricano dal pannello, dal campo "Foto" della voce (serve la chiave del bucket, che ha chi cura i contenuti): il pannello le converte in WebP, le riduce dentro un riquadro di 2400 x 2400 px (larghezza e altezza massime insieme), porta la qualità a circa 85, toglie i dati Exif e dà loro il nome originale reso adatto agli URL più 8 caratteri casuali (`img_1234-0b7c41d2.webp`), così una foto nuova non sovrascrive mai una già online.
- Chi non ha il pannello (un agente) non può caricare foto: cita foto già presenti nel bucket oppure chiede a eusebjo di caricarle. Come si caricano a mano, la chiave e il CORS del bucket sono in `CLAUDE.md`, "Foto del sito".
- Una foto non si toglie dal bucket finché un contenuto la cita: la build non la trova più e fallisce.

## Prodotti (`src/content/prodotti/<id>.json`)

Un prodotto degli scaffali.

| Campo | Obbligatorio | Regole |
|---|---|---|
| `nome` | sì | massimo `LIMITI.prodotto.nome.max` caratteri. Il nome sulla scheda |
| `dettaglio` | sì | massimo `LIMITI.prodotto.dettaglio.max` caratteri. La riga sotto il nome |
| `categorie` | sì | elenco di almeno una categoria, senza ripetizioni, tra gli id di `src/content/categorie.ts`: `letto`, `bagno`, `bimbi`, `tavola`, `profumi`, `natale`, `mare`. La prima dà il nome mostrato sulla scheda |
| `novita` | no | `true` o `false` (predefinito `false`): con `true` la scheda dice «Novità» al posto della categoria |
| `data` | sì | `AAAA-MM-GG`, un giorno che esiste. Gli scaffali mostrano prima i prodotti più recenti |
| `foto` | sì | la foto principale (vedi "Foto") |
| `secondaFoto` | no | una foto. Se manca, la scheda mostra un dettaglio ingrandito della foto principale: in quel caso **ometti il campo** |
| `colori` | no | elenco di al massimo `LIMITI.prodotto.colori.max` colori; se non ce ne sono, **ometti il campo** |

Ogni colore ha `nome` (massimo `LIMITI.prodotto.colore.max` caratteri), `tinta` (il pallino, `#RRGGBB`) e, facoltativa, `foto`: o la hanno **tutti** i colori o **nessuno**.

```json
{
  "nome": "Lenzuola color sabbia",
  "dettaglio": "Cotone con balza bianca · matrimoniale",
  "categorie": ["letto"],
  "novita": true,
  "data": "2026-10-28",
  "foto": {
    "src": "https://foto.almalivingviaricasoli.it/prova/lenzuola-beige.jpg",
    "alt": "Lenzuola color sabbia in primo piano",
    "inquadratura": "centro-alto"
  }
}
```

## Post (`src/content/post/<id>.json`)

Un post del diario.

| Campo | Obbligatorio | Regole |
|---|---|---|
| `data` | sì | `AAAA-MM-GG`, un giorno che esiste. La griglia mostra prima i post più recenti |
| `testo` | sì | da 1 a `LIMITI.post.testo.max` caratteri |
| `foto` | sì | elenco di foto, da 1 a `LIMITI.post.foto.max`. La prima è quella della griglia; con più foto il post è una galleria |
| `soggetto` | no | massimo `LIMITI.post.soggetto.max` caratteri. Di cosa parla il post, per il messaggio WhatsApp (per esempio «sui cuscini di Natale»); se manca, il messaggio dice solo la data. Se non c'è, **ometti il campo** |

## Storie (`src/content/storie/<nome>.json`)

Le otto storie della fila, nell'ordine di `ORDINE_STORIE` (`src/sito/contenuti.ts`). Si cambia il contenuto, non il nome del file, e non se ne aggiungono né se ne tolgono.

| Campo | Obbligatorio | Regole |
|---|---|---|
| `nome` | sì | fisso: il nome sotto il cerchio della storia. Non si cambia (livello 0 in `autonomia.yml`) |
| `data` | sì | `AAAA-MM-GG`, un giorno che esiste. Il giorno scritto in cima alla storia |
| `etichetta` | no | `Oggi` o `Nuovo`, sul cerchio. Senza etichetta **ometti il campo**: una stringa vuota fa fallire la build |
| `invito` | sì | `whatsapp`, `chiama` o `indicazioni`: il pulsante in evidenza nella scheda della storia |
| `foto` | sì | elenco di foto, da 1 a `LIMITI.storia.foto.max`. La prima è anche la copertina del cerchio |

Oltre ai campi della foto, ogni foto di una storia ha `frase` (da 1 a `LIMITI.storia.frase.max` caratteri: il testo mostrato su quella foto) e `soggetto` (da 1 a `LIMITI.storia.soggetto.max` caratteri, con l'articolo e in minuscolo, per esempio «i plaid delle feste»: lo usano la scheda e il messaggio WhatsApp).

## Limiti

I limiti numerici stanno **solo** in `src/content/limits.ts` (oggetto `LIMITI`): leggili da lì invece di copiarli altrove. Gli stessi valori fanno rispettare lo schema e compaiono nei messaggi di errore della build.

## Cosa è generato (non va scritto a mano)

`robots.txt`, `llms.txt`, la sitemap e i dati strutturati JSON-LD sono generati in build da `negozio.json` e dalla pagina. Le anteprime sono escluse dai motori di ricerca (`noindex`): è voluto. Il sito pubblicato è indicizzabile dal lancio del 2026-11-03.

## Controllare una modifica in locale

```bash
npm test          # test unitari e di contenuto
npm run build     # la build fallisce se un contenuto non rispetta lo schema
```

La build ha bisogno della rete (Google Fonts e `foto.almalivingviaricasoli.it`, da cui scarica le foto). Poi apri la proposta: l'anteprima del sito è nel controllo di Cloudflare della pull request.
