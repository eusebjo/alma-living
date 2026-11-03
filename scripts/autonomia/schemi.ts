import picomatch from 'picomatch';
import { z } from 'astro/zod';
import {
  negozioSchema,
  postSchema,
  prodottoSchema,
  storiaSchema,
} from '../../src/content/schemas';
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
 * Schema di ogni collection di `autonomia.yml`, per nome. Le foto si
 * controllano come indirizzi del bucket (`fotoSchema`): una foto presa da un
 * altro sito è rifiutata qui come nella build.
 */
const SCHEMI: Record<string, z.ZodType> = {
  negozio: negozioSchema,
  prodotti: prodottoSchema,
  post: postSchema,
  storie: storiaSchema,
};

// Stessa lettura dei percorsi di `evaluate`: `/` come separatore, niente file nascosti.
const OPZIONI_GLOB = { windows: false, dot: false } as const;

/**
 * Il nome di un file nuovo (aggiunto o rinominato) di prodotti e post è l'id
 * della voce nella pagina: la build legge solo minuscole, cifre e trattini
 * (vedi `tests/dist`). Il pannello scrive nomi così (la data, `AAAA-MM-GG`); un
 * nome diverso arriva solo da un file scritto a mano. Un post non può chiamarsi
 * `articolo-…`: nella pagina gli articoli degli scaffali sono `articolo-<id>`,
 * accanto ai post.
 */
const NOME_VOCE = /^[a-z0-9-]+\.json$/;
const NOMI_CONTROLLATI = new Set(['prodotti', 'post']);
const PREFISSO_POST_VIETATO = 'articolo-';

// Per una persona che non conosce Git: niente gergo, niente percorsi (il
// rapporto mostra già il file accanto al messaggio).
const MESSAGGI_NOME = {
  caratteri: 'Il nome del file non è valido: usa solo lettere minuscole, numeri e trattini.',
  articolo: `Il nome di un post non può cominciare con «${PREFISSO_POST_VIETATO}».`,
} as const;

/** Le violazioni sul nome di un file nuovo della collection `collezione`. */
function controllaNome(file: ChangedFile, collezione: string): Violazione[] {
  if (file.status !== 'added' && file.status !== 'renamed') return [];
  if (!NOMI_CONTROLLATI.has(collezione)) return [];
  const nome = file.path.slice(file.path.lastIndexOf('/') + 1);
  const violazioni: Violazione[] = [];
  if (!NOME_VOCE.test(nome)) {
    violazioni.push({ file: file.path, azione: 'formato', messaggio: MESSAGGI_NOME.caratteri });
  }
  if (collezione === 'post' && nome.startsWith(PREFISSO_POST_VIETATO)) {
    violazioni.push({ file: file.path, azione: 'formato', messaggio: MESSAGGI_NOME.articolo });
  }
  return violazioni;
}

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
 * contenuto della proposta, e il nome dei file nuovi (aggiunti o rinominati) di
 * prodotti e post. Lo schema non si applica ai file senza testo letto (rimossi,
 * o non letti), a quelli che non si leggono come JSON o frontmatter (li segnala
 * già `evaluate`) e alle collection senza schema; i file fuori dalle collection
 * si saltano del tutto. Ogni problema è una violazione con azione `formato`, in
 * italiano.
 */
export function validaConSchemi(files: ChangedFile[], rules: Rules): Violazione[] {
  const collezioni = Object.entries(rules.contenuti).map(([nome, regola]) => ({
    nome,
    regola,
    schema: SCHEMI[nome],
    corrisponde: picomatch(regola.file, OPZIONI_GLOB),
  }));

  const violazioni: Violazione[] = [];
  for (const file of files) {
    if (file.status === 'removed') continue;
    const collezione = collezioni.find((c) => c.corrisponde(file.path));
    if (!collezione) continue;
    violazioni.push(...controllaNome(file, collezione.nome));
    if (file.after === null || !collezione.schema) continue;

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
