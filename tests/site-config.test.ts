import { describe, expect, it } from 'vitest';
import { absoluteUrl, getSiteConfig } from '../src/config/site';

const LANCIO = {
  SITE_URL: 'https://x.dev',
  SITE_LAUNCHED: 'true',
  WORKERS_CI_BRANCH: 'main',
};

describe('getSiteConfig: indicizzazione', () => {
  it('è indicizzabile solo con sito lanciato e build del ramo main', () => {
    expect(getSiteConfig(LANCIO)).toEqual({
      siteUrl: 'https://x.dev',
      launched: true,
      indexable: true,
    });
  });

  it('non è indicizzabile se SITE_LAUNCHED manca', () => {
    const { SITE_LAUNCHED: _, ...senzaLancio } = LANCIO;
    const config = getSiteConfig(senzaLancio);
    expect(config.launched).toBe(false);
    expect(config.indexable).toBe(false);
  });

  it('non è indicizzabile se SITE_LAUNCHED è "false"', () => {
    const config = getSiteConfig({ ...LANCIO, SITE_LAUNCHED: 'false' });
    expect(config.launched).toBe(false);
    expect(config.indexable).toBe(false);
  });

  it('non è indicizzabile in una build di anteprima (ramo diverso da main)', () => {
    const config = getSiteConfig({ ...LANCIO, WORKERS_CI_BRANCH: 'fase1/x' });
    expect(config.launched).toBe(true);
    expect(config.indexable).toBe(false);
  });

  it('non è indicizzabile in una build locale (nessuna variabile di ramo)', () => {
    const { WORKERS_CI_BRANCH: _, ...locale } = LANCIO;
    expect(getSiteConfig(locale).indexable).toBe(false);
  });

  it('un ramo che contiene solo "main" nel nome non conta come main', () => {
    expect(
      getSiteConfig({ ...LANCIO, WORKERS_CI_BRANCH: 'main-fix' }).indexable,
    ).toBe(false);
    expect(
      getSiteConfig({ ...LANCIO, WORKERS_CI_BRANCH: 'feature/main' }).indexable,
    ).toBe(false);
  });

  it('SITE_LAUNCHED vale solo "true" (spazi e maiuscole tollerati, altro no)', () => {
    expect(getSiteConfig({ ...LANCIO, SITE_LAUNCHED: ' TRUE ' }).launched).toBe(
      true,
    );
    for (const valore of ['1', 'yes', 'si', '', 'vero']) {
      expect(getSiteConfig({ ...LANCIO, SITE_LAUNCHED: valore }).launched).toBe(
        false,
      );
    }
  });
});

describe('getSiteConfig: siteUrl', () => {
  it('usa SITE_URL quando è impostato', () => {
    expect(getSiteConfig({ SITE_URL: 'https://x.dev' }).siteUrl).toBe(
      'https://x.dev',
    );
  });

  it('senza SITE_URL ripiega su http://localhost:4321', () => {
    expect(getSiteConfig({}).siteUrl).toBe('http://localhost:4321');
  });

  it('una SITE_URL vuota o di soli spazi vale come mancante', () => {
    expect(getSiteConfig({ SITE_URL: '' }).siteUrl).toBe(
      'http://localhost:4321',
    );
    expect(getSiteConfig({ SITE_URL: '   ' }).siteUrl).toBe(
      'http://localhost:4321',
    );
  });

  it('toglie la barra finale e gli spazi attorno', () => {
    expect(getSiteConfig({ SITE_URL: 'https://x.dev/' }).siteUrl).toBe(
      'https://x.dev',
    );
    expect(getSiteConfig({ SITE_URL: ' https://x.dev// ' }).siteUrl).toBe(
      'https://x.dev',
    );
  });
});

describe('absoluteUrl', () => {
  it('unisce base e percorso con una sola barra', () => {
    expect(absoluteUrl('https://x.dev', '/')).toBe('https://x.dev/');
    expect(absoluteUrl('https://x.dev/', '/')).toBe('https://x.dev/');
    expect(absoluteUrl('https://x.dev', '/chi-siamo/')).toBe(
      'https://x.dev/chi-siamo/',
    );
    expect(absoluteUrl('https://x.dev/', 'sitemap-index.xml')).toBe(
      'https://x.dev/sitemap-index.xml',
    );
  });
});
