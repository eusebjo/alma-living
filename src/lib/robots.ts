import { absoluteUrl } from '../config/site';

/**
 * Contenuto di `robots.txt`. Se la build non è indicizzabile (anteprime, build
 * locali, sito non ancora lanciato) vieta tutto e non cita la sitemap, che in
 * quel caso non viene nemmeno generata.
 */
export function robotsTxt(opts: {
  indexable: boolean;
  siteUrl: string;
}): string {
  if (!opts.indexable) {
    return ['User-agent: *', 'Disallow: /', ''].join('\n');
  }
  return [
    'User-agent: *',
    'Allow: /',
    '',
    `Sitemap: ${absoluteUrl(opts.siteUrl, 'sitemap-index.xml')}`,
    '',
  ].join('\n');
}
