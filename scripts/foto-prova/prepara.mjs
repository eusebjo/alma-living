// Prepara le foto delle pagine di prova prima di `astro build`: le foto non
// sono in git, quindi per ogni nome dell'elenco lo script (nell'ordine)
//   1. lascia stare la foto, se è già nella cartella di destinazione;
//   2. altrimenti la copia dalla cartella locale, se c'è;
//   3. altrimenti la scarica dal bucket R2 pubblico.
// Se anche una sola manca ovunque, si ferma con un messaggio che le nomina tutte:
// meglio una build interrotta che pagine con foto rotte.
//
// Uso: `node scripts/foto-prova/prepara.mjs` (lo lanciano `npm run build` e
// `npm run dev`). Solo Node, nessuna dipendenza.
import { constants, realpathSync } from 'node:fs';
import { access, copyFile, mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  FOTO_PROVA_BASE,
  FOTO_PROVA_DESTINAZIONE,
  FOTO_PROVA_LOCALE,
} from './config.mjs';

// Tempo massimo per scaricare una foto dal bucket: una rete appesa non deve
// bloccare la build per sempre.
const ATTESA_MS = 30_000;

async function esiste(percorso) {
  try {
    await access(percorso, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

// Si scrive in un file temporaneo e poi lo si rinomina: un'interruzione a metà
// non lascia in destinazione una foto tronca, che la volta dopo verrebbe presa
// per buona.
async function consegna(destinazione, nome, scrivi) {
  const finale = join(destinazione, nome);
  const temporaneo = `${finale}.parte`;
  try {
    await scrivi(temporaneo);
    await rename(temporaneo, finale);
  } catch (errore) {
    await rm(temporaneo, { force: true });
    throw errore;
  }
}

/**
 * @param {object} opzioni
 * @param {string[]} opzioni.elenco nomi dei file, per esempio `mare.jpg`
 * @param {string} opzioni.destinazione cartella in cui devono arrivare
 * @param {string} opzioni.sorgenteLocale cartella locale con gli originali
 * @param {string} opzioni.base indirizzo pubblico del bucket, senza barra finale
 * @param {typeof fetch} [opzioni.fetchFn] sostituibile nei test
 * @param {number} [opzioni.attesaMs] tempo massimo per ogni foto da scaricare
 * @returns {Promise<{ presenti: string[]; copiate: string[]; scaricate: string[] }>}
 */
export async function preparaFoto({
  elenco,
  destinazione,
  sorgenteLocale,
  base,
  fetchFn = fetch,
  attesaMs = ATTESA_MS,
}) {
  await mkdir(destinazione, { recursive: true });

  const esiti = await Promise.all(
    elenco.map(async (nome) => {
      if (await esiste(join(destinazione, nome))) return { nome, esito: 'presenti' };

      const locale = join(sorgenteLocale, nome);
      if (await esiste(locale)) {
        await consegna(destinazione, nome, (temporaneo) => copyFile(locale, temporaneo));
        return { nome, esito: 'copiate' };
      }

      const indirizzo = `${base}/${nome}`;
      try {
        // Il segnale vale anche per la lettura del contenuto, non solo per la risposta.
        const risposta = await fetchFn(indirizzo, { signal: AbortSignal.timeout(attesaMs) });
        if (!risposta.ok) return { nome, motivo: `HTTP ${risposta.status}` };
        const byte = Buffer.from(await risposta.arrayBuffer());
        if (byte.length === 0) return { nome, motivo: 'risposta vuota' };
        await consegna(destinazione, nome, (temporaneo) => writeFile(temporaneo, byte));
        return { nome, esito: 'scaricate' };
      } catch (errore) {
        if (errore instanceof Error && errore.name === 'TimeoutError') {
          const secondi = String(attesaMs / 1000).replace('.', ',');
          return { nome, motivo: `nessuna risposta entro ${secondi} s` };
        }
        return { nome, motivo: errore instanceof Error ? errore.message : String(errore) };
      }
    }),
  );

  const mancanti = esiti.filter((e) => !e.esito);
  if (mancanti.length > 0) {
    const nomi = mancanti.map((e) => `${e.nome} (${e.motivo})`).join(', ');
    throw new Error(
      `Foto di prova mancanti: ${nomi}\n` +
        `Non sono in "${sorgenteLocale}" e non si scaricano da ${base}/. ` +
        'Mettile nella cartella locale oppure caricale nel bucket R2.',
    );
  }

  const per = (chiave) => esiti.filter((e) => e.esito === chiave).map((e) => e.nome);
  return { presenti: per('presenti'), copiate: per('copiate'), scaricate: per('scaricate') };
}

/**
 * Vero se il modulo `urlModulo` (`import.meta.url`) è il file lanciato con
 * `node <argv1>`. Si confrontano i percorsi reali: Node risolve i collegamenti
 * simbolici e le giunzioni del modulo, ma non quelli di `process.argv[1]`.
 * @param {string} urlModulo
 * @param {string | undefined} argv1
 */
export function eseguitoComeComando(urlModulo, argv1) {
  if (!argv1) return false;
  try {
    return realpathSync.native(fileURLToPath(urlModulo)) === realpathSync.native(resolve(argv1));
  } catch {
    // Un percorso che non esiste non è il file lanciato.
    return false;
  }
}

// Eseguito come comando: i percorsi di `config.mjs` sono relativi alla radice
// del progetto, qualunque sia la cartella da cui parte il comando.
async function main() {
  const radice = fileURLToPath(new URL('../../', import.meta.url));
  const elenco = JSON.parse(
    await readFile(new URL('./elenco.json', import.meta.url), 'utf8'),
  );
  const { presenti, copiate, scaricate } = await preparaFoto({
    elenco,
    destinazione: resolve(radice, FOTO_PROVA_DESTINAZIONE),
    sorgenteLocale: resolve(radice, FOTO_PROVA_LOCALE),
    base: FOTO_PROVA_BASE,
  });
  console.log(
    `Foto di prova (${elenco.length}): ${copiate.length} copiate da ${FOTO_PROVA_LOCALE}, ` +
      `${scaricate.length} scaricate dal bucket, ${presenti.length} già presenti.`,
  );
}

if (eseguitoComeComando(import.meta.url, process.argv[1])) {
  main().catch((errore) => {
    console.error(errore instanceof Error ? errore.message : errore);
    process.exitCode = 1;
  });
}
