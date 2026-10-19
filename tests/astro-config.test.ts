import { afterEach, describe, expect, it, vi } from 'vitest';

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
