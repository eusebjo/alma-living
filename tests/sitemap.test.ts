import { describe, expect, it } from 'vitest';
import { includiInSitemap } from '../src/lib/sitemap';

describe('includiInSitemap', () => {
  it('include le pagine del sito', () => {
    expect(includiInSitemap('https://x.dev/')).toBe(true);
    expect(includiInSitemap('https://x.dev/chi-siamo/')).toBe(true);
  });

  it('esclude il pannello dei contenuti, con o senza barra finale', () => {
    expect(includiInSitemap('https://x.dev/admin/')).toBe(false);
    expect(includiInSitemap('https://x.dev/admin')).toBe(false);
    expect(includiInSitemap('https://x.dev/admin/index.html')).toBe(false);
  });

  it('non esclude pagine che hanno solo "admin" nel nome', () => {
    expect(includiInSitemap('https://x.dev/administration/')).toBe(true);
    expect(includiInSitemap('https://x.dev/chi-siamo/admin-store/')).toBe(true);
  });

  it('il pannello è escluso anche se il sito sta in una sottocartella', () => {
    expect(includiInSitemap('https://x.dev/base/admin/')).toBe(false);
  });
});
