import { describe, expect, it } from 'vitest';
import { formatoDiRipiego } from '../../src/sito/comune/ripiego';

describe('formatoDiRipiego', () => {
  it.each(['jpg', 'jpeg', 'webp', 'png', 'avif'])('una foto %s ripiega su jpg', (formato) => {
    expect(formatoDiRipiego(formato)).toBe('jpg');
  });

  it.each(['gif', 'svg'])('%s tiene il suo formato', (formato) => {
    expect(formatoDiRipiego(formato)).toBe(formato);
  });

  it('le maiuscole non contano', () => {
    expect(formatoDiRipiego('JPG')).toBe('jpg');
    expect(formatoDiRipiego('GIF')).toBe('gif');
    expect(formatoDiRipiego('SVG')).toBe('svg');
  });

  it('un formato che il sito non conosce ripiega su jpg', () => {
    expect(formatoDiRipiego('tiff')).toBe('jpg');
    expect(formatoDiRipiego('')).toBe('jpg');
  });
});
