import { z } from 'astro/zod';
import { leggiYaml } from './parse';
import type { Rules } from './types';

// Lettura e validazione di `autonomia.yml`. Un file di regole sbagliato non
// deve mai essere "aggiustato in silenzio": qualunque problema fa lanciare un
// errore con un messaggio in italiano che dice dove guardare.

const OBBLIGATORIO = 'è obbligatorio';

/** Messaggio d'errore: "è obbligatorio" se il valore manca, altrimenti `descrizione`. */
function errore(descrizione: string) {
  return (problema: { input?: unknown }) =>
    problema.input === undefined ? OBBLIGATORIO : descrizione;
}

const livello = z.literal([0, 1, 2, 3, 4], {
  error: errore('il livello deve essere un numero intero da 0 a 4'),
});

const testo = z
  .string({ error: errore('deve essere un testo') })
  .min(1, 'non può essere vuoto');

const elencoDiTesti = z.array(testo, {
  error: errore('deve essere un elenco di testi tra parentesi quadre'),
});

// Un'estensione è un nome semplice: niente punto, barre o spazi.
const estensione = z
  .string({ error: errore('deve essere un testo') })
  .regex(
    /^[A-Za-z0-9]+$/,
    "deve essere l'estensione scritta senza punto, per esempio webp",
  );

const sezione = { error: errore('deve essere una sezione con le sue voci') };

const regolaCollection = z.object(
  {
    file: testo,
    formato: z.enum(['json', 'markdown'], {
      error: errore('deve essere json oppure markdown'),
    }),
    azioni: z.object({ crea: livello, modifica: livello, elimina: livello }, sezione),
    campi: z.record(z.string(), livello, sezione),
  },
  sezione,
);

const schemaRegole = z.object(
  {
    versione: z.literal(1, { error: errore('deve essere 1') }),
    ruoli: z.object(
      { sviluppo: elencoDiTesti, redazione: elencoDiTesti },
      sezione,
    ),
    proposte: z.object({ stati_inviati: elencoDiTesti }, sezione),
    contenuti: z.record(z.string(), regolaCollection, sezione),
    media: z.object(
      {
        percorsi: elencoDiTesti,
        estensioni: z.array(estensione, {
          error: errore('deve essere un elenco di estensioni tra parentesi quadre'),
        }),
        dimensione_massima_kb: z
          .number({ error: errore('deve essere un numero') })
          .positive('deve essere un numero maggiore di 0'),
        azioni: z.object({ carica: livello, elimina: livello }, sezione),
      },
      sezione,
    ),
  },
  sezione,
);

/**
 * Legge `autonomia.yml` e lo valida. Lancia un `Error` con un messaggio in
 * italiano se il testo non è YAML valido o non rispetta la struttura delle
 * regole (sezioni obbligatorie, livelli interi da 0 a 4).
 */
export function loadRules(yamlText: string): Rules {
  let dati: unknown;
  try {
    dati = leggiYaml(yamlText);
  } catch (causa) {
    const dettaglio = causa instanceof Error ? ` ${causa.message}` : '';
    throw new Error(
      `Il file delle regole di autonomia non è un YAML valido.${dettaglio}`,
      { cause: causa },
    );
  }

  const esito = schemaRegole.safeParse(dati);
  if (!esito.success) {
    const elenco = esito.error.issues
      .map((voce) => {
        const percorso = voce.path.map(String).join('.');
        return `- ${percorso === '' ? 'radice del file' : percorso}: ${voce.message}`;
      })
      .join('\n');
    throw new Error(
      `Il file delle regole di autonomia non è valido:\n${elenco}`,
    );
  }
  return esito.data;
}
