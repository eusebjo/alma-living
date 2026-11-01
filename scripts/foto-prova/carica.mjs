// Manda nel bucket R2 le foto di prova che ci mancano: per ogni nome di
// `elenco.json` controlla se la foto è già raggiungibile all'indirizzo pubblico
// del bucket; se non c'è ma è nella cartella locale, la carica con wrangler.
// Le foto già nel bucket non si toccano (non si sovrascrivono). Dopo ogni invio
// ricontrolla l'indirizzo pubblico: la foto deve rispondere 200.
//
// Uso: `npm run foto:carica` (carica davvero: serve `npx wrangler login`, che fa
// eusebjo di persona) oppure `npm run foto:carica -- --prova` (elenca soltanto,
// fa richieste HEAD sugli indirizzi pubblici e non invia nulla).
// Nessun segreto qui dentro: l'accesso al bucket sta nel login di wrangler.
import { constants } from 'node:fs';
import { access, readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  FOTO_PROVA_BASE,
  FOTO_PROVA_BUCKET,
  FOTO_PROVA_LOCALE,
  FOTO_PROVA_PREFISSO,
} from './config.mjs';
import { eseguitoComeComando } from './prepara.mjs';

// Tempo massimo per ogni controllo sul bucket: una rete appesa non deve
// bloccare il comando per sempre.
const ATTESA_MS = 30_000;

async function esiste(percorso) {
  try {
    await access(percorso, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

/**
 * Sceglie cosa fare di ogni foto dell'elenco.
 * @param {string[]} nomi nomi dei file, nell'ordine dell'elenco
 * @param {Set<string>} nelBucket nomi già raggiungibili nel bucket
 * @param {Set<string>} inLocale nomi presenti nella cartella locale
 * @returns {{ carica: string[]; mancanti: string[] }} `carica`: non nel bucket ma
 *   in locale; `mancanti`: né nel bucket né in locale. Entrambe seguono `nomi`.
 */
export function daCaricare(nomi, nelBucket, inLocale) {
  const assenti = nomi.filter((nome) => !nelBucket.has(nome));
  return {
    carica: assenti.filter((nome) => inLocale.has(nome)),
    mancanti: assenti.filter((nome) => !inLocale.has(nome)),
  };
}

/**
 * Dice se la foto è nel bucket, con una richiesta HEAD all'indirizzo pubblico.
 * 200: c'è. 404: non c'è. Qualsiasi altro stato, o un errore di rete, lancia un
 * errore: non si carica alla cieca.
 * @param {string} indirizzo indirizzo pubblico della foto
 * @param {object} [opzioni]
 * @param {typeof fetch} [opzioni.fetchFn] sostituibile nei test
 * @param {number} [opzioni.attesaMs] tempo massimo per la risposta
 * @returns {Promise<boolean>}
 */
export async function controllaFoto(
  indirizzo,
  { fetchFn = fetch, attesaMs = ATTESA_MS } = {},
) {
  let stato;
  try {
    const risposta = await fetchFn(indirizzo, {
      method: 'HEAD',
      signal: AbortSignal.timeout(attesaMs),
    });
    stato = risposta.status;
  } catch (errore) {
    let motivo = errore instanceof Error ? errore.message : String(errore);
    if (errore instanceof Error && errore.name === 'TimeoutError') {
      motivo = `nessuna risposta entro ${String(attesaMs / 1000).replace('.', ',')} s`;
    }
    throw new Error(`Controllo del bucket non riuscito per ${indirizzo}: ${motivo}`);
  }
  if (stato === 200) return true;
  if (stato === 404) return false;
  throw new Error(`Controllo del bucket non riuscito per ${indirizzo}: HTTP ${stato}`);
}

/**
 * Crea la funzione che carica una foto nel bucket con `wrangler r2 object put`.
 * @param {string} bucket nome del bucket R2
 * @param {string} prefisso cartella delle foto nel bucket
 * @param {object} [opzioni]
 * @param {typeof spawnSync} [opzioni.spawn] sostituibile nei test
 * @param {boolean} [opzioni.shell] su Windows `npx` è un file `.cmd` e serve la shell
 * @returns {(nome: string, percorso: string) => Promise<void>}
 */
export function inviaConWrangler(
  bucket,
  prefisso,
  { spawn = spawnSync, shell = process.platform === 'win32' } = {},
) {
  // Con la shell gli argomenti non vengono protetti: un percorso con spazi va
  // messo tra virgolette a mano.
  const argomento = (valore) => (shell && /\s/.test(valore) ? `"${valore}"` : valore);

  return async (nome, percorso) => {
    const risultato = spawn(
      'npx',
      [
        'wrangler',
        'r2',
        'object',
        'put',
        `${bucket}/${prefisso}/${nome}`,
        argomento(`--file=${percorso}`),
        '--content-type=image/jpeg',
        '--remote',
      ],
      { stdio: 'inherit', shell },
    );
    if (risultato.status !== 0) {
      throw new Error(
        `Caricamento non riuscito: ${nome}. Serve \`npx wrangler login\` (lo fa eusebjo).`,
      );
    }
  };
}

/**
 * @param {object} opzioni
 * @param {string[]} opzioni.elenco nomi dei file, per esempio `mare.jpg`
 * @param {string} opzioni.locale cartella locale con gli originali
 * @param {string} opzioni.base indirizzo pubblico del prefisso, senza barra finale
 * @param {string} opzioni.bucket nome del bucket R2
 * @param {string} opzioni.prefisso cartella delle foto nel bucket
 * @param {boolean} [opzioni.prova] se vero elenca soltanto, senza inviare nulla
 * @param {(indirizzo: string) => Promise<boolean>} [opzioni.controlla] la foto è nel bucket?
 * @param {(nome: string, percorso: string) => Promise<void>} [opzioni.invia] carica la foto
 * @param {(riga: string) => void} [opzioni.log]
 * @returns {Promise<{ caricate: string[]; giaPresenti: string[]; mancanti: string[] }>}
 *   Con `prova` le foto da caricare non sono "caricate": `caricate` resta vuoto e
 *   l'elenco esce solo nel log.
 */
export async function caricaFoto({
  elenco,
  locale,
  base,
  bucket,
  prefisso,
  prova = false,
  controlla = controllaFoto,
  invia = inviaConWrangler(bucket, prefisso),
  log = console.log,
}) {
  const indirizzo = (nome) => `${base}/${nome}`;

  // I nomi per cui `domanda(nome)` risponde sì, nell'ordine dell'elenco.
  const filtra = async (domanda) => {
    const esiti = await Promise.all(elenco.map((nome) => domanda(nome)));
    return new Set(elenco.filter((_nome, posizione) => esiti[posizione]));
  };

  // Prima si guarda tutto, poi si invia: un controllo che fallisce (stato
  // inatteso, rete giù) ferma il comando prima di qualunque caricamento.
  const nelBucket = await filtra((nome) => controlla(indirizzo(nome)));
  const inLocale = await filtra((nome) => esiste(join(locale, nome)));

  const { carica, mancanti } = daCaricare(elenco, nelBucket, inLocale);
  const giaPresenti = elenco.filter((nome) => nelBucket.has(nome));

  if (prova) {
    log(
      carica.length > 0
        ? `Da caricare (prova: non si invia nulla): ${carica.join(', ')}`
        : 'Nessuna foto da caricare.',
    );
    return { caricate: [], giaPresenti, mancanti };
  }

  const caricate = [];
  for (const nome of carica) {
    log(`Carico ${nome}...`);
    await invia(nome, join(locale, nome));
    if (!(await controlla(indirizzo(nome)))) {
      throw new Error(
        `Dopo il caricamento ${nome} risulta ancora assente dal bucket (${indirizzo(nome)}).`,
      );
    }
    caricate.push(nome);
  }
  return { caricate, giaPresenti, mancanti };
}

/**
 * Legge gli argomenti del comando. Ammette solo `--prova`: un refuso come
 * `--prov` non deve far partire un caricamento vero.
 * @param {string[]} argomenti
 * @returns {{ prova: boolean }}
 */
export function leggiOpzioni(argomenti) {
  let prova = false;
  for (const argomento of argomenti) {
    if (argomento === '--prova') prova = true;
    else throw new Error(`Opzione sconosciuta: ${argomento}. L'unica ammessa è --prova.`);
  }
  return { prova };
}

// Eseguito come comando: i percorsi di `config.mjs` sono relativi alla radice
// del progetto, qualunque sia la cartella da cui parte il comando.
async function main() {
  const { prova } = leggiOpzioni(process.argv.slice(2));
  const radice = fileURLToPath(new URL('../../', import.meta.url));
  const elenco = JSON.parse(
    await readFile(new URL('./elenco.json', import.meta.url), 'utf8'),
  );
  const { caricate, giaPresenti, mancanti } = await caricaFoto({
    elenco,
    locale: resolve(radice, FOTO_PROVA_LOCALE),
    base: FOTO_PROVA_BASE,
    bucket: FOTO_PROVA_BUCKET,
    prefisso: FOTO_PROVA_PREFISSO,
    prova,
  });
  console.log(
    `Foto di prova (${elenco.length}): ${caricate.length} caricate nel bucket, ` +
      `${giaPresenti.length} già presenti, ${mancanti.length} mancanti` +
      (prova ? ' (prova: nessuna foto inviata).' : '.'),
  );
  if (mancanti.length > 0) {
    console.error(
      `Mancano sia nel bucket sia in "${FOTO_PROVA_LOCALE}": ${mancanti.join(', ')}. ` +
        'Copiale nella cartella locale e rilancia il comando.',
    );
    process.exitCode = 1;
  }
}

if (eseguitoComeComando(import.meta.url, process.argv[1])) {
  main().catch((errore) => {
    console.error(errore instanceof Error ? errore.message : errore);
    process.exitCode = 1;
  });
}
