import { afterEach, describe, expect, it, vi } from 'vitest';
import { CARATTERI_PER_VARIANTE } from '../src/prova/comune/caratteri';
import { VARIANTI } from '../src/prova/varianti';

// La configurazione di Astro legge le variabili d'ambiente quando viene
// caricata: per provarla con valori diversi la si reimporta ogni volta.
async function caricaConfig(env: Record<string, string | undefined>) {
  vi.resetModules();
  for (const nome of ['SITE_URL', 'SITE_LAUNCHED', 'WORKERS_CI_BRANCH']) {
    vi.stubEnv(nome, env[nome]);
  }
  return (await import('../astro.config.mjs')).default;
}

function nomiIntegrazioni(config: { integrations?: unknown }) {
  const integrazioni = (config.integrations ?? []) as { name: string }[];
  return integrazioni.map((integrazione) => integrazione.name);
}

afterEach(() => {
  vi.unstubAllEnvs();
});

// Il primo caricamento della configurazione importa Astro da zero: con tutti
// i file di test in parallelo può superare i 5 secondi predefiniti.
describe('astro.config: site e sitemap', { timeout: 30_000 }, () => {
  it('site deriva da getSiteConfig (SITE_URL senza barra finale)', async () => {
    const config = await caricaConfig({ SITE_URL: 'https://x.dev/' });
    expect(config.site).toBe('https://x.dev');
  });

  it('una SITE_URL vuota ripiega su localhost', async () => {
    const config = await caricaConfig({ SITE_URL: '' });
    expect(config.site).toBe('http://localhost:4321');
  });

  it('build di lancio su main: la sitemap è attiva', async () => {
    const config = await caricaConfig({
      SITE_URL: 'https://x.dev',
      SITE_LAUNCHED: 'true',
      WORKERS_CI_BRANCH: 'main',
    });
    expect(nomiIntegrazioni(config)).toEqual(['@astrojs/sitemap']);
  });

  it('build di anteprima: nessuna sitemap', async () => {
    const config = await caricaConfig({
      SITE_URL: 'https://x.dev',
      SITE_LAUNCHED: 'true',
      WORKERS_CI_BRANCH: 'fase1/x',
    });
    expect(nomiIntegrazioni(config)).toEqual([]);
  });

  it('sito non ancora lanciato: nessuna sitemap, anche su main', async () => {
    const config = await caricaConfig({
      SITE_URL: 'https://x.dev',
      SITE_LAUNCHED: 'false',
      WORKERS_CI_BRANCH: 'main',
    });
    expect(nomiIntegrazioni(config)).toEqual([]);
  });

  it('build locale: nessuna sitemap', async () => {
    const config = await caricaConfig({});
    expect(nomiIntegrazioni(config)).toEqual([]);
  });
});

describe('astro.config: caratteri della prova', { timeout: 30_000 }, () => {
  it('dichiara i caratteri della prova, dal provider Google', async () => {
    const config = await caricaConfig({});
    const nomi = (config.fonts ?? []).map((f: { name: string }) => f.name);
    // Elenco esatto: un carattere in più sarebbe scaricato a ogni build senza
    // che nessuna pagina lo usi (come i due delle varianti annullate).
    expect([...nomi].sort()).toEqual(
      [
        'Libre Caslon Display',
        'Libre Caslon Text',
        'Instrument Sans',
        'Beth Ellen',
      ].sort(),
    );
  });

  it('ogni variante ha i suoi caratteri, e sono tutti dichiarati', async () => {
    const config = await caricaConfig({});
    const dichiarati = (config.fonts ?? []).map(
      (f: { cssVariable: string }) => f.cssVariable,
    );
    expect(Object.keys(CARATTERI_PER_VARIANTE).sort()).toEqual(
      VARIANTI.map((variante) => variante.id).sort(),
    );
    for (const [id, variabili] of Object.entries(CARATTERI_PER_VARIANTE)) {
      for (const variabile of variabili) {
        expect(dichiarati, `${id}: ${variabile}`).toContain(variabile);
      }
    }
  });

  it('ogni carattere dichiarato è usato da almeno una variante', async () => {
    const config = await caricaConfig({});
    const dichiarati = (config.fonts ?? []).map(
      (f: { cssVariable: string }) => f.cssVariable,
    );
    const usati = new Set(Object.values(CARATTERI_PER_VARIANTE).flat());
    for (const variabile of dichiarati) {
      expect(usati, variabile).toContain(variabile);
    }
  });
});
