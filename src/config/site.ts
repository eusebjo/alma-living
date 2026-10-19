// Configurazione del sito che dipende da dove e come si costruisce.
// Fonte unica: la usano astro.config.mjs (`site`, sitemap), SeoHead, robots.txt
// e llms.txt, così non possono dare risposte diverse.

export type SiteEnv = Record<string, string | undefined>;

export interface SiteConfig {
  /** URL pubblico del sito, senza barra finale. */
  siteUrl: string;
  /** `SITE_LAUNCHED=true`: il sito è stato lanciato davvero. */
  launched: boolean;
  /**
   * I motori di ricerca possono indicizzare questa build: sito lanciato E
   * build di produzione (ramo `main` su Workers Builds). Le anteprime e le
   * build locali non lo sono mai.
   */
  indexable: boolean;
}

export const SITE_URL_PREDEFINITO = 'http://localhost:4321';

// Ramo di produzione configurato su Cloudflare Workers Builds.
export const RAMO_PRODUZIONE = 'main';

/**
 * Legge la configurazione dalle variabili d'ambiente di build:
 * - `SITE_URL`: URL pubblico; se manca, è vuota o di soli spazi vale
 *   `http://localhost:4321`;
 * - `SITE_LAUNCHED`: vale `true` solo dopo il lancio vero (impostata su
 *   Cloudflare, per produzione e anteprime);
 * - `WORKERS_CI_BRANCH`: ramo della build, impostata solo da Workers Builds
 *   (assente nelle build locali).
 *
 * `indexable` richiede entrambe le condizioni: lanciato e ramo `main`.
 */
export function getSiteConfig(env: SiteEnv): SiteConfig {
  const siteUrlGrezzo = env.SITE_URL?.trim();
  const siteUrl = (siteUrlGrezzo || SITE_URL_PREDEFINITO).replace(/\/+$/, '');
  const launched = env.SITE_LAUNCHED?.trim().toLowerCase() === 'true';
  const indexable = launched && env.WORKERS_CI_BRANCH === RAMO_PRODUZIONE;
  return { siteUrl, launched, indexable };
}

/** Unisce l'URL del sito e un percorso con una sola barra in mezzo. */
export function absoluteUrl(siteUrl: string, percorso: string): string {
  return `${siteUrl.replace(/\/+$/, '')}/${percorso.replace(/^\/+/, '')}`;
}
