import { absoluteUrl } from '../config/site';
import type { GIORNI } from '../content/limits';
import type { Negozio } from '../content/schemas';

const GIORNI_SCHEMA_ORG: Record<(typeof GIORNI)[number], string> = {
  lunedi: 'https://schema.org/Monday',
  martedi: 'https://schema.org/Tuesday',
  mercoledi: 'https://schema.org/Wednesday',
  giovedi: 'https://schema.org/Thursday',
  venerdi: 'https://schema.org/Friday',
  sabato: 'https://schema.org/Saturday',
  domenica: 'https://schema.org/Sunday',
};

/**
 * Telefono in formato E.164 (`+393345205451`). Un numero senza prefisso
 * internazionale (né `+` né `00`) si considera italiano. Lo schema dei
 * contenuti accetta solo cifre, spazi e un `+` iniziale.
 */
export function toE164(telefono: string): string {
  const cifre = telefono.replace(/\D/g, '');
  const conPrefisso = telefono.trim().startsWith('+');
  if (conPrefisso) return `+${cifre}`;
  if (cifre.startsWith('00')) return `+${cifre.slice(2)}`;
  return `+39${cifre}`;
}

/**
 * Dati strutturati schema.org del negozio (JSON-LD), ricavati dalle impostazioni
 * del negozio. Una `OpeningHoursSpecification` per ogni fascia oraria; la chiave
 * `openingHoursSpecification` manca se non ci sono orari, e `email` se non c'è.
 */
export function buildStoreJsonLd(
  negozio: Negozio,
  siteUrl: string,
): Record<string, unknown> {
  const { via, civico, cap, citta, provincia } = negozio.indirizzo;

  const json: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'HomeGoodsStore',
    name: negozio.nome,
    description: negozio.descrizione,
    url: absoluteUrl(siteUrl, '/'),
    telephone: toE164(negozio.telefono),
    address: {
      '@type': 'PostalAddress',
      streetAddress: `${via} ${civico}`,
      postalCode: cap,
      addressLocality: citta,
      addressRegion: provincia,
      addressCountry: 'IT',
    },
  };

  if (negozio.email) json.email = negozio.email;

  if (negozio.orari.length > 0) {
    json.openingHoursSpecification = negozio.orari.map((orario) => ({
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: GIORNI_SCHEMA_ORG[orario.giorno],
      opens: orario.apertura,
      closes: orario.chiusura,
    }));
  }

  return json;
}

/**
 * JSON-LD pronto da mettere in un `<script type="application/ld+json">`.
 * Ogni `<` diventa la sequenza di escape JSON `\u003c`: i testi del negozio li
 * scrive una persona dal pannello, e un `</script>` dentro un nome non deve
 * poter chiudere il tag.
 */
export function serializeJsonLd(json: Record<string, unknown>): string {
  return JSON.stringify(json).replace(/</g, '\\u003c');
}
