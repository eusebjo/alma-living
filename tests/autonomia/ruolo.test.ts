import { describe, expect, it } from 'vitest';
import { eRamoDelPannello, ruoloDi, ruoloEffettivo } from '../../scripts/autonomia/ruolo';
import { rules } from './fixtures';

describe('eRamoDelPannello', () => {
  it.each([
    'cms/negozio/negozio',
    'cms/pagine/home',
    'cms/x',
    'CMS/pagine/home',
    'Cms/pagine/home',
  ])('%s è un ramo del pannello', (ramo) => {
    expect(eRamoDelPannello(ramo)).toBe(true);
  });

  it.each([
    'main',
    'fase1/9-correzioni',
    'fase1/cms/x',
    'cms',
    'cmsx/pagine/home',
    'cms-pagine/home',
    ' cms/pagine/home',
    '',
    null,
    undefined,
  ])('%j non è un ramo del pannello', (ramo) => {
    expect(eRamoDelPannello(ramo)).toBe(false);
  });
});

describe('ruoloEffettivo', () => {
  it('lo sviluppo su un ramo cms/ vale come redazione', () => {
    expect(ruoloEffettivo('eusebjo', 'cms/pagine/home', rules)).toBe('redazione');
    expect(ruoloEffettivo('Eusebjo', 'CMS/pagine/home', rules)).toBe('redazione');
  });

  it('lo sviluppo su un altro ramo, o senza ramo, resta sviluppo', () => {
    expect(ruoloEffettivo('eusebjo', 'fase1/x', rules)).toBe('sviluppo');
    expect(ruoloEffettivo('eusebjo', null, rules)).toBe('sviluppo');
    expect(ruoloEffettivo('eusebjo', undefined, rules)).toBe('sviluppo');
  });

  it('la redazione resta redazione e gli sconosciuti restano sconosciuti, su qualunque ramo', () => {
    for (const ramo of ['cms/pagine/home', 'fase1/x', null]) {
      expect(ruoloEffettivo('lei', ramo, rules)).toBe('redazione');
      expect(ruoloEffettivo('estraneo', ramo, rules)).toBe('sconosciuto');
    }
  });

  it('ruoloDi guarda solo l’autore', () => {
    expect(ruoloDi('eusebjo', rules)).toBe('sviluppo');
    expect(ruoloDi('LEI', rules)).toBe('redazione');
    expect(ruoloDi('estraneo', rules)).toBe('sconosciuto');
  });
});
