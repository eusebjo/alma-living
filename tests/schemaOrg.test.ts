import { describe, expect, it } from 'vitest';
import { negozioSchema, type Negozio } from '../src/content/schemas';
import {
  buildStoreJsonLd,
  serializeJsonLd,
  toE164,
} from '../src/lib/schemaOrg';

function negozio(extra: Partial<Negozio> = {}): Negozio {
  return negozioSchema.parse({
    nome: 'Alma Living',
    descrizione: 'Negozio di biancheria per la casa nel centro di Livorno.',
    indirizzo: {
      via: 'Via Ricasoli',
      civico: '51-53',
      cap: '57125',
      citta: 'Livorno',
      provincia: 'LI',
    },
    telefono: '334 520 5451',
    orari: [],
    ...extra,
  });
}

describe('toE164', () => {
  it('aggiunge il prefisso italiano a un numero senza prefisso', () => {
    expect(toE164('334 520 5451')).toBe('+393345205451');
  });

  it('conserva il prefisso internazionale e toglie gli spazi', () => {
    expect(toE164('+39 0586 123456')).toBe('+390586123456');
  });

  it('converte il prefisso 00 in +', () => {
    expect(toE164('0039 334 520 5451')).toBe('+393345205451');
  });

  it('un fisso senza prefisso mantiene lo 0 iniziale', () => {
    expect(toE164('0586 123456')).toBe('+390586123456');
  });

  it('un prefisso straniero resta quello indicato', () => {
    expect(toE164('+44 20 7946 0958')).toBe('+442079460958');
  });
});

describe('buildStoreJsonLd', () => {
  const json = buildStoreJsonLd(negozio(), 'https://x.dev');

  it('descrive il negozio come HomeGoodsStore di schema.org', () => {
    expect(json['@context']).toBe('https://schema.org');
    expect(json['@type']).toBe('HomeGoodsStore');
    expect(json.name).toBe('Alma Living');
    expect(json.description).toBe(
      'Negozio di biancheria per la casa nel centro di Livorno.',
    );
    expect(json.url).toBe('https://x.dev/');
  });

  it("scrive l'indirizzo postale", () => {
    expect(json.address).toEqual({
      '@type': 'PostalAddress',
      streetAddress: 'Via Ricasoli 51-53',
      postalCode: '57125',
      addressLocality: 'Livorno',
      addressRegion: 'LI',
      addressCountry: 'IT',
    });
  });

  it('scrive il telefono in formato E.164', () => {
    expect(json.telephone).toBe('+393345205451');
  });

  it('senza orari non ha la chiave openingHoursSpecification', () => {
    expect(json).not.toHaveProperty('openingHoursSpecification');
  });

  it("senza email non ha la chiave email, con l'email la scrive", () => {
    expect(json).not.toHaveProperty('email');
    const conEmail = buildStoreJsonLd(
      negozio({ email: 'info@example.com' }),
      'https://x.dev',
    );
    expect(conEmail.email).toBe('info@example.com');
  });

  it('con un orario di lunedì scrive giorno, apertura e chiusura', () => {
    const con = buildStoreJsonLd(
      negozio({
        orari: [{ giorno: 'lunedi', apertura: '09:30', chiusura: '13:00' }],
      }),
      'https://x.dev',
    );
    expect(con.openingHoursSpecification).toEqual([
      {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: 'https://schema.org/Monday',
        opens: '09:30',
        closes: '13:00',
      },
    ]);
  });

  it('scrive una specifica per ogni fascia, anche dello stesso giorno', () => {
    const con = buildStoreJsonLd(
      negozio({
        orari: [
          { giorno: 'martedi', apertura: '09:30', chiusura: '13:00' },
          { giorno: 'martedi', apertura: '16:00', chiusura: '19:30' },
        ],
      }),
      'https://x.dev',
    );
    const specifiche = con.openingHoursSpecification as Record<
      string,
      string
    >[];
    expect(specifiche).toHaveLength(2);
    expect(specifiche.map((s) => s.dayOfWeek)).toEqual([
      'https://schema.org/Tuesday',
      'https://schema.org/Tuesday',
    ]);
    expect(specifiche.map((s) => `${s.opens}-${s.closes}`)).toEqual([
      '09:30-13:00',
      '16:00-19:30',
    ]);
  });

  it('mappa tutti i giorni della settimana', () => {
    const giorni = [
      'lunedi',
      'martedi',
      'mercoledi',
      'giovedi',
      'venerdi',
      'sabato',
      'domenica',
    ] as const;
    const con = buildStoreJsonLd(
      negozio({
        orari: giorni.map((giorno) => ({
          giorno,
          apertura: '09:00',
          chiusura: '12:00',
        })),
      }),
      'https://x.dev',
    );
    const specifiche = con.openingHoursSpecification as Record<
      string,
      string
    >[];
    expect(specifiche.map((s) => s.dayOfWeek)).toEqual([
      'https://schema.org/Monday',
      'https://schema.org/Tuesday',
      'https://schema.org/Wednesday',
      'https://schema.org/Thursday',
      'https://schema.org/Friday',
      'https://schema.org/Saturday',
      'https://schema.org/Sunday',
    ]);
  });

  it("l'URL del sito non ha doppia barra se la base finisce con /", () => {
    expect(buildStoreJsonLd(negozio(), 'https://x.dev/').url).toBe(
      'https://x.dev/',
    );
  });

  it('è serializzabile in JSON senza perdite', () => {
    expect(JSON.parse(JSON.stringify(json))).toEqual(json);
  });
});

describe('serializeJsonLd', () => {
  it('produce JSON valido che si rilegge uguale', () => {
    const json = buildStoreJsonLd(negozio(), 'https://x.dev');
    expect(JSON.parse(serializeJsonLd(json))).toEqual(json);
  });

  it('non lascia mai un "<" nel testo, così non si può chiudere il tag script', () => {
    const json = buildStoreJsonLd(
      negozio({ nome: 'Alma </script><script>alert(1)</script> Living' }),
      'https://x.dev',
    );
    const testo = serializeJsonLd(json);
    expect(testo).not.toContain('<');
    expect(testo).not.toContain('</script>');
    // ...ma il valore originale si ricostruisce identico.
    expect(JSON.parse(testo).name).toBe(
      'Alma </script><script>alert(1)</script> Living',
    );
  });
});
