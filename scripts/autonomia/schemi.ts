import picomatch from 'picomatch';
import { z } from 'astro/zod';
import { makePaginaSchema, negozioSchema } from '../../src/content/schemas';
import { parseContent } from './parse';
import type { ChangedFile, Rules, Violazione } from './types';

// Controllo di una proposta con gli schemi veri dei contenuti (gli stessi che
// usa la build). Le regole di autonomia dicono chi può cambiare cosa, ma non se
// il valore è valido: una chiusura prima dell'apertura passerebbe dal pannello e
// dalle regole e farebbe fallire solo la build, con un errore in inglese e senza
// dire cosa correggere. Qui lo stesso errore diventa una violazione in italiano.
//
// Sta fuori da `evaluate` per tenerlo senza dipendenze dagli schemi: `evaluate`
// decide solo se la modifica è permessa, questo se il contenuto è valido.

/**
 * Schema di ogni collection di `autonomia.yml`, per nome. Per le pagine
 * `immagine` si controlla solo come testo: nella build è `image()` di Astro, che
 * ha bisogno della build per controllare che il file esista.
 */
const SCHEMI: Record<string, z.ZodType> = {
  negozio: negozioSchema,
  pagine: makePaginaSchema(() =>
    z.string().min(1, "L'immagine della pagina è obbligatoria."),
  ),
};

// Stessa lettura dei percorsi di `evaluate`: `/` come separatore, niente file nascosti.
const OPZIONI_GLOB = { windows: false, dot: false } as const;

/**
 * Messaggio per i problemi che lo schema non descrive da sé (campo mancante,
 * tipo sbagliato): quelli predefiniti di Zod sono in inglese. I messaggi
 * scritti negli schemi hanno la precedenza e restano com'erano.
 */
function messaggioPredefinito(problema: { code: string; input?: unknown }): string {
  if (problema.code === 'invalid_type') {
    return problema.input === undefined
      ? 'Questo campo è obbligatorio.'
      : 'Il valore non è del tipo atteso.';
  }
  return 'Il valore non è valido.';
}

function paraDelProblema(problema: z.core.$ZodIssue): { campo?: string; messaggio: string } {
  // Il percorso del campo senza le posizioni nell'elenco (`orari.chiusura`):
  // la posizione va a chi legge come "riga 2", contando da 1.
  const nomi = problema.path.filter((voce) => typeof voce !== 'number').map(String);
  const righe = problema.path
    .filter((voce): voce is number => typeof voce === 'number')
    .map((posizione) => posizione + 1);
  const dove = righe.length > 0 ? ` (riga ${righe.join(', ')} dell'elenco)` : '';
  const messaggio = `${problema.message}${dove} Correggi il valore nel pannello dei contenuti.`;
  return nomi.length > 0 ? { campo: nomi.join('.'), messaggio } : { messaggio };
}

/**
 * Valida con lo schema della sua collection la nuova versione di ogni file di
 * contenuto della proposta. Salta i file senza testo letto (rimossi, o non
 * letti), quelli che non si leggono come JSON o frontmatter (li segnala già
 * `evaluate`), quelli fuori dalle collection e le collection senza schema.
 * Ogni problema è una violazione con azione `formato`, in italiano.
 */
export function validaConSchemi(files: ChangedFile[], rules: Rules): Violazione[] {
  const collezioni = Object.entries(rules.contenuti).map(([nome, regola]) => ({
    regola,
    schema: SCHEMI[nome],
    corrisponde: picomatch(regola.file, OPZIONI_GLOB),
  }));

  const violazioni: Violazione[] = [];
  for (const file of files) {
    if (file.status === 'removed' || file.after === null) continue;
    const collezione = collezioni.find((c) => c.corrisponde(file.path));
    if (!collezione?.schema) continue;

    let dati: Record<string, unknown>;
    try {
      dati = parseContent(file.after, collezione.regola.formato);
    } catch {
      continue;
    }

    const esito = collezione.schema.safeParse(dati, { error: messaggioPredefinito });
    if (esito.success) continue;
    for (const problema of esito.error.issues) {
      violazioni.push({ file: file.path, azione: 'formato', ...paraDelProblema(problema) });
    }
  }
  return violazioni;
}
