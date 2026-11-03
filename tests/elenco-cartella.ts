import { readdirSync } from 'node:fs';

/**
 * I nomi (file e sottocartelle) di `cartella`, in ordine alfabetico. Una cartella che
 * non esiste è un elenco vuoto: Git toglie la cartella ormai vuota quando la redazione
 * elimina l'ultimo prodotto o l'ultimo post, e i test sulle collection non devono
 * fallire per questo. Ogni altro errore (un file al posto della cartella, i permessi)
 * resta un errore.
 */
export function elencoCartella(cartella: string): string[] {
  try {
    return readdirSync(cartella).sort();
  } catch (errore) {
    if ((errore as { code?: string }).code === 'ENOENT') return [];
    throw errore;
  }
}
