import { describe, expect, it } from 'vitest';
import { diffFields, levelForField } from '../../scripts/autonomia/diff';
import type { Livello } from '../../scripts/autonomia/types';

describe('diffFields', () => {
  it('restituisce il percorso puntato della foglia cambiata', () => {
    expect(diffFields({ a: 1, b: { c: 1 } }, { a: 1, b: { c: 2 } })).toEqual(['b.c']);
  });

  it('una chiave aggiunta compare tra i percorsi', () => {
    expect(diffFields({ a: 1 }, { a: 1, b: 2 })).toEqual(['b']);
  });

  it('una chiave rimossa compare tra i percorsi', () => {
    expect(diffFields({ a: 1, b: 2 }, { a: 1 })).toEqual(['b']);
  });

  it('una chiave annidata aggiunta o rimossa compare con il suo percorso', () => {
    expect(diffFields({ b: { c: 1 } }, { b: { c: 1, d: 2 } })).toEqual(['b.d']);
    expect(diffFields({ b: { c: 1, d: 2 } }, { b: { c: 1 } })).toEqual(['b.d']);
  });

  it('un oggetto aggiunto o rimosso compare con il percorso della sua chiave', () => {
    expect(diffFields({}, { b: { c: 1 } })).toEqual(['b']);
    expect(diffFields({ b: { c: 1 } }, {})).toEqual(['b']);
  });

  it('una chiave con valore null non è la stessa cosa di una chiave assente', () => {
    expect(diffFields({ a: 1 }, { a: 1, b: null })).toEqual(['b']);
  });

  it('un valore che cambia tipo compare con il percorso della chiave', () => {
    expect(diffFields({ a: { b: 1 } }, { a: 'testo' })).toEqual(['a']);
    expect(diffFields({ a: 1 }, { a: '1' })).toEqual(['a']);
    expect(diffFields({ a: [] }, { a: {} })).toEqual(['a']);
    expect(diffFields({ a: null }, { a: {} })).toEqual(['a']);
  });

  it('un array è un solo valore: orari diverso restituisce [orari]', () => {
    const prima = { orari: [{ giorno: 'lunedi', apertura: '09:00', chiusura: '13:00' }] };
    const dopo = { orari: [{ giorno: 'lunedi', apertura: '09:30', chiusura: '13:00' }] };
    expect(diffFields(prima, dopo)).toEqual(['orari']);
    expect(diffFields({ orari: [] }, dopo)).toEqual(['orari']);
    expect(diffFields({ orari: [1, 2] }, { orari: [1, 2, 3] })).toEqual(['orari']);
  });

  it("l'ordine degli elementi di un array conta", () => {
    expect(diffFields({ a: [1, 2] }, { a: [2, 1] })).toEqual(['a']);
  });

  it('array uguali (anche con oggetti dentro) non producono differenze', () => {
    const orari = [{ giorno: 'lunedi', apertura: '09:00', chiusura: '13:00' }];
    expect(diffFields({ orari }, { orari: structuredClone(orari) })).toEqual([]);
  });

  it('oggetti uguali restituiscono []', () => {
    expect(diffFields({}, {})).toEqual([]);
    expect(diffFields({ a: 1, b: { c: [1, { d: 2 }] } }, { a: 1, b: { c: [1, { d: 2 }] } })).toEqual(
      [],
    );
  });

  it("l'ordine delle chiavi non conta", () => {
    expect(diffFields({ a: 1, b: 2 }, { b: 2, a: 1 })).toEqual([]);
  });

  it('elenca tutti i percorsi cambiati, ciascuno una volta', () => {
    const prima = { nome: 'A', indirizzo: { via: 'X', civico: '1' }, orari: [] };
    const dopo = { nome: 'B', indirizzo: { via: 'Y', civico: '1' }, orari: [1] };
    expect(diffFields(prima, dopo).sort()).toEqual(['indirizzo.via', 'nome', 'orari']);
  });

  it('NaN confrontato con NaN è uguale', () => {
    expect(diffFields({ a: Number.NaN }, { a: Number.NaN })).toEqual([]);
  });

  it('i percorsi con chiavi dal nome particolare restano distinti', () => {
    // {"a.b": 1} e {"a": {"b": 1}} hanno lo stesso percorso puntato, ma sono
    // strutture diverse: la differenza non deve sparire.
    expect(diffFields({ 'a.b': 1 }, { a: { b: 1 } }).sort()).toEqual(['a', 'a.b']);
    expect(diffFields({ '': { orari: 1 } }, { '': { orari: 2 } })).toEqual(['.orari']);
  });

  it('chiavi come __proto__ e constructor sono dati normali', () => {
    const prima = JSON.parse('{"a":1}') as Record<string, unknown>;
    const dopo = JSON.parse('{"a":1,"__proto__":{"x":1},"constructor":2}') as Record<
      string,
      unknown
    >;
    expect(diffFields(prima, dopo).sort()).toEqual(['__proto__', 'constructor']);
    expect(diffFields({}, {})).toEqual([]);
  });
});

describe('levelForField', () => {
  const campi: Record<string, Livello> = {
    nome: 0,
    indirizzo: 0,
    descrizione: 1,
    orari: 1,
    'indirizzo.note': 1,
  };

  it('usa la regola esatta del campo', () => {
    expect(levelForField(campi, 'nome')).toBe(0);
    expect(levelForField(campi, 'descrizione')).toBe(1);
    expect(levelForField(campi, 'orari')).toBe(1);
  });

  it('una regola su un oggetto vale anche per i campi che contiene', () => {
    expect(levelForField(campi, 'indirizzo.via')).toBe(0);
    expect(levelForField(campi, 'indirizzo.via.altro')).toBe(0);
  });

  it('vince il prefisso più lungo', () => {
    expect(levelForField(campi, 'indirizzo.note')).toBe(1);
    expect(levelForField(campi, 'indirizzo.note.extra')).toBe(1);
    expect(levelForField(campi, 'indirizzo')).toBe(0);
  });

  it('la corrispondenza è per segmenti interi, non per prefisso di testo', () => {
    expect(levelForField(campi, 'nomecompleto')).toBe(0);
    expect(levelForField({ nome: 1 }, 'nomecompleto')).toBe(0);
    expect(levelForField({ nome: 1 }, 'nome.completo')).toBe(1);
    expect(levelForField({ nome: 1 }, 'nom')).toBe(0);
    expect(levelForField({ orari: 1 }, 'orari2')).toBe(0);
    expect(levelForField({ 'a.b': 1 }, 'a.bc')).toBe(0);
  });

  it('restituisce 0 se non c\'è nessuna regola', () => {
    expect(levelForField(campi, 'sconosciuto')).toBe(0);
    expect(levelForField({}, 'nome')).toBe(0);
    expect(levelForField(campi, '')).toBe(0);
  });

  it('un percorso più corto della regola non la eredita', () => {
    // La regola copre solo `indirizzo.note`: cambiare tutto `indirizzo` non
    // è coperto.
    expect(levelForField({ 'indirizzo.note': 1 }, 'indirizzo')).toBe(0);
  });

  it('non confonde i campi con le proprietà ereditate degli oggetti', () => {
    expect(levelForField({ nome: 1 }, 'constructor')).toBe(0);
    expect(levelForField({ nome: 1 }, '__proto__')).toBe(0);
    expect(levelForField({ nome: 1 }, 'toString')).toBe(0);
    expect(levelForField({ nome: 1 }, 'hasOwnProperty')).toBe(0);
    expect(levelForField({ nome: 1 }, 'constructor.name')).toBe(0);
  });
});
