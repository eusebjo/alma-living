import { eOggettoSemplice } from './parse';
import type { Livello } from './types';

// Confronto dei campi prima e dopo una modifica, e livello di un campo.
// I percorsi sono chiavi separate da punti (`indirizzo.via`). Le proprietà si
// leggono sempre con `Object.hasOwn`: un campo chiamato `constructor` o
// `__proto__` è un dato come gli altri e non una proprietà ereditata.

function uguali(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a === 'number' && typeof b === 'number') {
    return Number.isNaN(a) && Number.isNaN(b);
  }
  if (Array.isArray(a) || Array.isArray(b)) {
    return (
      Array.isArray(a) &&
      Array.isArray(b) &&
      a.length === b.length &&
      a.every((elemento, i) => uguali(elemento, b[i]))
    );
  }
  if (eOggettoSemplice(a) && eOggettoSemplice(b)) {
    const chiaviA = Object.keys(a);
    return (
      chiaviA.length === Object.keys(b).length &&
      chiaviA.every((chiave) => Object.hasOwn(b, chiave) && uguali(a[chiave], b[chiave]))
    );
  }
  // Oggetti speciali o tipi diversi: nel dubbio si considerano diversi.
  return false;
}

function confronta(
  prima: Record<string, unknown>,
  dopo: Record<string, unknown>,
  segmenti: string[],
  trovati: string[],
): void {
  const chiavi = new Set([...Object.keys(prima), ...Object.keys(dopo)]);
  for (const chiave of chiavi) {
    const percorso = [...segmenti, chiave];
    if (!Object.hasOwn(prima, chiave) || !Object.hasOwn(dopo, chiave)) {
      trovati.push(percorso.join('.'));
      continue;
    }
    const valorePrima = prima[chiave];
    const valoreDopo = dopo[chiave];
    if (eOggettoSemplice(valorePrima) && eOggettoSemplice(valoreDopo)) {
      confronta(valorePrima, valoreDopo, percorso, trovati);
    } else if (!uguali(valorePrima, valoreDopo)) {
      trovati.push(percorso.join('.'));
    }
  }
}

/**
 * Percorsi puntati dei campi che cambiano tra `before` e `after`. Un array
 * conta come un solo valore al suo percorso (confronto in profondità, l'ordine
 * conta). Una chiave aggiunta o rimossa compare con il proprio percorso, senza
 * scendere nel suo contenuto.
 */
export function diffFields(
  before: Record<string, unknown>,
  after: Record<string, unknown>,
): string[] {
  const trovati: string[] = [];
  confronta(before, after, [], trovati);
  return trovati;
}

/**
 * Livello di un campo: vale la regola con il prefisso più lungo, confrontando
 * segmenti interi (la regola `nome` vale per `nome` e `nome.x`, non per
 * `nomecompleto`). Se nessuna regola corrisponde il livello è 0.
 */
export function levelForField(
  campi: Record<string, Livello>,
  path: string,
): Livello {
  const segmenti = path.split('.');
  for (let lunghezza = segmenti.length; lunghezza >= 1; lunghezza--) {
    const prefisso = segmenti.slice(0, lunghezza).join('.');
    if (prefisso !== '' && Object.hasOwn(campi, prefisso)) {
      return campi[prefisso];
    }
  }
  return 0;
}
