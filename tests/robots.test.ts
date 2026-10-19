import { describe, expect, it } from 'vitest';
import { robotsTxt } from '../src/lib/robots';

describe('robotsTxt', () => {
  it('non indicizzabile: vieta tutto e non cita la sitemap', () => {
    const testo = robotsTxt({ indexable: false, siteUrl: 'https://x.dev' });
    expect(testo).toContain('User-agent: *');
    expect(testo).toContain('Disallow: /');
    expect(testo).not.toMatch(/^Allow:/m);
    expect(testo).not.toContain('Sitemap:');
  });

  it('indicizzabile: consente tutto e indica la sitemap', () => {
    const testo = robotsTxt({ indexable: true, siteUrl: 'https://x.dev' });
    expect(testo).toContain('User-agent: *');
    expect(testo).toContain('Allow: /');
    expect(testo).not.toMatch(/^Disallow: \/$/m);
    expect(testo).toContain('Sitemap: https://x.dev/sitemap-index.xml');
  });

  it('indicizzabile: la sitemap non ha doppia barra con base che finisce con /', () => {
    const testo = robotsTxt({ indexable: true, siteUrl: 'https://x.dev/' });
    expect(testo).toContain('Sitemap: https://x.dev/sitemap-index.xml');
    expect(testo).not.toContain('.dev//');
  });

  it('finisce con un a capo', () => {
    expect(robotsTxt({ indexable: false, siteUrl: 'https://x.dev' })).toMatch(
      /\n$/,
    );
    expect(robotsTxt({ indexable: true, siteUrl: 'https://x.dev' })).toMatch(
      /\n$/,
    );
  });
});
