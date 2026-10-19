# AGENTS.md: come si modificano i contenuti di Alma Living

Questa guida è per chi propone modifiche ai **contenuti** del sito (persone e agenti). Alma Living è un negozio di biancheria per la casa a Livorno; il sito è statico (Astro) e i contenuti sono file nel repository.

Per lo sviluppo (codice, layout, configurazioni) vedi `CLAUDE.md`.

## Regole d'oro

1. **Si modificano solo contenuti e immagini**, nelle cartelle indicate sotto. Codice, layout, componenti, stili, configurazioni, workflow e configurazione del pannello non si toccano.
2. **Le regole di autonomia sono in `autonomia.yml`; codice e layout non si toccano.** Lì si legge chi può fare cosa e a quale livello. Il file si cambia solo con una proposta di sviluppo approvata da eusebjo.
3. **Ogni modifica è una proposta** (branch e pull request), mai un push su `main`. Prima di andare online passa da `build`, da `verifica-autonomia` e dall'approvazione di eusebjo.
4. **Solo gli account elencati in `autonomia.yml` (sezione `ruoli`) possono proporre modifiche.** Una proposta di qualunque altro account, o da un fork, è sempre respinta, qualunque cosa contenga.
5. **I branch `cms/**` valgono sempre come proposte della redazione.** Sono quelli del pannello: vengono sempre valutati con le regole dei contenuti (campi e livelli di `autonomia.yml`, limiti dello schema), anche se la pull request la apre un account di sviluppo. Per lavoro di sviluppo non si usano branch `cms/`.
6. **Lo schema è l'autorità.** Se un contenuto non lo rispetta la build fallisce e la proposta non si può unire. I messaggi di errore sono in italiano e dicono quale campo e quale limite.

## Cartelle e file

| Percorso | Cosa contiene |
|---|---|
| `src/content/negozio/negozio.json` | Le impostazioni del negozio: un solo file |
| `src/content/pagine/<id>.md` | Una pagina per file (`home.md` è la home) |
| `src/content/pagine/immagini/` | Le immagini delle pagine |

Sola lettura (non si modificano con una proposta di contenuti):

- `src/content/schemas.ts`: lo schema di ogni campo;
- `src/content/limits.ts`: i limiti numerici, nell'oggetto `LIMITI`.

## `negozio.json`

Un oggetto JSON piatto. Gli stessi dati alimentano la pagina, i dati strutturati schema.org (JSON-LD) e `llms.txt`.

| Campo | Obbligatorio | Regole |
|---|---|---|
| `nome` | sì | massimo `LIMITI.negozio.nome.max` caratteri |
| `descrizione` | sì | tra `LIMITI.negozio.descrizione.min` e `LIMITI.negozio.descrizione.max` caratteri |
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

## Pagine (`src/content/pagine/<id>.md`)

Frontmatter YAML più il testo in Markdown.

| Campo | Obbligatorio | Regole |
|---|---|---|
| `titolo` | sì | massimo `LIMITI.pagina.titolo.max` caratteri. È il titolo della pagina nei motori di ricerca |
| `descrizione` | sì | tra `LIMITI.pagina.descrizione.min` e `LIMITI.pagina.descrizione.max` caratteri. È la descrizione nei risultati di ricerca |
| `immagine` | sì | percorso relativo a un file in `immagini/`: `immagini/home.webp` (come lo scrive il pannello) oppure `./immagini/home.webp`, entrambi validi |
| `immagine_alt` | sì | testo alternativo che descrive l'immagine, tra `LIMITI.pagina.immagine_alt.min` e `LIMITI.pagina.immagine_alt.max` caratteri |
| corpo | sì | Markdown dopo il frontmatter |

```markdown
---
titolo: Titolo della pagina
descrizione: Una descrizione della pagina lunga abbastanza da rispettare il minimo previsto.
immagine: immagini/home.webp
immagine_alt: Descrizione dell'immagine per chi non la vede
---

Testo della pagina in **Markdown**.
```

Il testo si scrive solo in Markdown: l'HTML grezzo (`<script>`, `<iframe>`, `style`, ecc.) la build lo toglie, quindi non serve e non funziona. Nel testo non si inseriscono immagini (il pannello non lo offre): la build toglie quelle con un indirizzo esterno (`https://...`, `//...`, `data:`...), perché il sito non carica risorse di terzi. L'immagine della pagina è il campo `immagine`.

Creare o eliminare pagine non rientra nei contenuti modificabili in fase 1. Una pagina nuova richiede anche una rotta nel codice, quindi è lavoro di sviluppo.

## Immagini

- Stanno in `src/content/pagine/immagini/`, accanto alle pagine che le usano.
- Formato **WebP**. Il pannello converte in WebP, riduce la foto dentro un riquadro di 2400 x 2400 px (larghezza e altezza massime: una foto verticale non supera i 2400 px in altezza), porta la qualità a circa 85 e toglie i dati Exif. Se aggiungi un file senza il pannello, fai lo stesso.
- Nomi dei file in minuscolo, con trattini al posto degli spazi.
- Il testo alternativo (`immagine_alt`) è obbligatorio.
- Le foto troppo pesanti vengono respinte da `verifica-autonomia`: il peso massimo è in `autonomia.yml`. Vengono respinti anche i file di un tipo diverso da quelli elencati in `media.estensioni` (webp, jpg, jpeg, png, avif): niente SVG né HTML.

## Limiti

I limiti numerici stanno **solo** in `src/content/limits.ts` (oggetto `LIMITI`): leggili da lì invece di copiarli altrove. Gli stessi valori fanno rispettare lo schema e compaiono nei messaggi di errore della build.

## Cosa è generato (non va scritto a mano)

`robots.txt`, `llms.txt`, la sitemap e i dati strutturati JSON-LD sono generati in build da `negozio.json` e dalle pagine. Prima del lancio e nelle anteprime il sito è escluso dai motori di ricerca (`noindex`): è voluto.

## Controllare una modifica in locale

```bash
npm test          # test unitari e di contenuto
npm run build     # la build fallisce se un contenuto non rispetta lo schema
```

Poi apri la proposta: l'anteprima del sito è nel controllo di Cloudflare della pull request.
