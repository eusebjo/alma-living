import { absoluteUrl } from '../config/site';
import type { Negozio } from '../content/schemas';
import { toE164 } from './schemaOrg';

/**
 * Contenuto di `llms.txt` (formato llmstxt.org): titolo, citazione di sintesi,
 * dati del negozio e, se ci sono, l'elenco delle pagine. `pagine[].url` è già
 * un URL assoluto.
 */
export function llmsTxt(
  negozio: Negozio,
  pagine: { titolo: string; descrizione: string; url: string }[],
  siteUrl: string,
): string {
  const { via, civico, cap, citta, provincia } = negozio.indirizzo;

  const righe = [
    `# ${negozio.nome}`,
    '',
    `> ${negozio.descrizione}`,
    '',
    `Sito: ${absoluteUrl(siteUrl, '/')}`,
    `Indirizzo: ${via} ${civico}, ${cap} ${citta} (${provincia})`,
    `Telefono: ${negozio.telefono} (${toE164(negozio.telefono)})`,
  ];
  if (negozio.email) righe.push(`Email: ${negozio.email}`);

  if (pagine.length > 0) {
    righe.push('', '## Pagine', '');
    for (const pagina of pagine) {
      righe.push(`- [${pagina.titolo}](${pagina.url}): ${pagina.descrizione}`);
    }
  }

  return `${righe.join('\n')}\n`;
}
