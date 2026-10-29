import { describe, expect, it } from 'vitest';
import { avanti, indietro } from '../../src/prova/comune/sequenza';

// Due gruppi di storie: il primo con due foto, il secondo con una.
const FOTO = [2, 1];

describe('avanti', () => {
  it('passa alla foto successiva, poi al gruppo successivo, poi finisce', () => {
    const seconda = avanti({ gruppo: 0, foto: 0 }, FOTO);
    expect(seconda).toEqual({ gruppo: 0, foto: 1 });
    const terza = avanti(seconda!, FOTO);
    expect(terza).toEqual({ gruppo: 1, foto: 0 });
    expect(avanti(terza!, FOTO)).toBeNull();
  });

  it('non modifica la posizione ricevuta', () => {
    const inizio = { gruppo: 0, foto: 0 };
    avanti(inizio, FOTO);
    expect(inizio).toEqual({ gruppo: 0, foto: 0 });
  });
});

describe('indietro', () => {
  it("torna all'ultima foto del gruppo precedente", () => {
    expect(indietro({ gruppo: 1, foto: 0 }, FOTO)).toEqual({ gruppo: 0, foto: 1 });
  });

  it('torna alla foto precedente dello stesso gruppo', () => {
    expect(indietro({ gruppo: 0, foto: 1 }, FOTO)).toEqual({ gruppo: 0, foto: 0 });
  });

  it('al primo elemento resta lì', () => {
    expect(indietro({ gruppo: 0, foto: 0 }, FOTO)).toEqual({ gruppo: 0, foto: 0 });
  });
});
