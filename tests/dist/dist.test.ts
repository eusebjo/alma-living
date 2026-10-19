import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('build statica: dist/index.html', () => {
  it('la home esiste ed è in italiano', () => {
    const html = readFileSync('dist/index.html', 'utf8');
    expect(html).toContain('<html lang="it"');
  });

  it('nessuna risorsa da CDN di terzi', () => {
    const html = readFileSync('dist/index.html', 'utf8');
    expect(html).not.toMatch(/<(script|img|iframe)[^>]+src="https?:\/\//);
    expect(html).not.toMatch(/<link[^>]+rel="stylesheet"[^>]+href="https?:\/\//);
    expect(html).not.toContain('fonts.googleapis');
  });
});
