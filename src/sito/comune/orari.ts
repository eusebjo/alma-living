// Orari di apertura e stato "aperto ora" del sito. Logica pura: la usano lo
// script del browser (`interazioni.ts`) e la pagina, quindi non dipende da Astro. L'ora è sempre quella di Roma, qualunque sia il fuso del
// visitatore.
import { GIORNI } from '../../content/limits';

export type Giorno = (typeof GIORNI)[number];

/** Una fascia di apertura; gli orari sono `HH:MM` (24 ore). */
export type Fascia = { giorno: Giorno; apertura: string; chiusura: string };

/**
 * Orari di esempio: lunedì-sabato 9:30-13:00 e 16:00-19:30, domenica chiuso. Li
 * usano i test di questa logica; la pagina mostra quelli di `negozio.json`.
 */
export const ORARI_PROVA: Fascia[] = (
  ['lunedi', 'martedi', 'mercoledi', 'giovedi', 'venerdi', 'sabato'] as const
).flatMap((giorno) => [
  { giorno, apertura: '09:30', chiusura: '13:00' },
  { giorno, apertura: '16:00', chiusura: '19:30' },
]);

export type StatoNegozio =
  | { aperto: true; chiudeAlle: string }
  | {
      aperto: false;
      apre: { giorno: Giorno; ora: string; quando: 'oggi' | 'domani' | 'giorno' } | null;
    };

const ETICHETTE: Record<Giorno, string> = {
  lunedi: 'Lunedì',
  martedi: 'Martedì',
  mercoledi: 'Mercoledì',
  giovedi: 'Giovedì',
  venerdi: 'Venerdì',
  sabato: 'Sabato',
  domenica: 'Domenica',
};

// Nomi inglesi dei giorni nello stesso ordine di `GIORNI`: `Intl` li dà in questa
// forma con la lingua `en-US`, che non cambia con la lingua del browser.
const GIORNI_INTL = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
];

// `hourCycle: 'h23'` evita l'ora "24" a mezzanotte.
const FORMATO_ROMA = new Intl.DateTimeFormat('en-US', {
  timeZone: 'Europe/Rome',
  weekday: 'long',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

/** Giorno della settimana e minuti dalla mezzanotte a Roma nell'istante `adesso`. */
export function oraDiRoma(adesso: Date): { giorno: Giorno; minuti: number } {
  const parti = Object.fromEntries(
    FORMATO_ROMA.formatToParts(adesso).map(({ type, value }) => [type, value]),
  );
  const indice = GIORNI_INTL.indexOf(parti.weekday ?? '');
  const giorno = GIORNI[indice];
  if (!giorno) throw new Error(`Giorno non riconosciuto: ${parti.weekday}`);
  return { giorno, minuti: Number(parti.hour) * 60 + Number(parti.minute) };
}

function minutiDi(ora: string): number {
  return Number(ora.slice(0, 2)) * 60 + Number(ora.slice(3, 5));
}

// "09:30" → "9:30": nei testi l'ora non ha lo zero iniziale.
function oraLeggibile(ora: string): string {
  return `${Number(ora.slice(0, 2))}:${ora.slice(3, 5)}`;
}

function fasceDelGiorno(fasce: Fascia[], giorno: Giorno): Fascia[] {
  return fasce
    .filter((fascia) => fascia.giorno === giorno)
    .sort((a, b) => minutiDi(a.apertura) - minutiDi(b.apertura));
}

/** Se il negozio è aperto a `adesso` e, se non lo è, quando riapre. */
export function statoNegozio(fasce: Fascia[], adesso: Date): StatoNegozio {
  const { giorno, minuti } = oraDiRoma(adesso);
  const oggi = fasceDelGiorno(fasce, giorno);

  const inCorso = oggi.find(
    (fascia) => minutiDi(fascia.apertura) <= minuti && minuti < minutiDi(fascia.chiusura),
  );
  if (inCorso) {
    // Se un'altra fascia comincia quando questa finisce, il negozio non chiude.
    let chiudeAlle = inCorso.chiusura;
    for (const fascia of oggi) {
      if (
        minutiDi(fascia.apertura) <= minutiDi(chiudeAlle) &&
        minutiDi(fascia.chiusura) > minutiDi(chiudeAlle)
      ) {
        chiudeAlle = fascia.chiusura;
      }
    }
    return { aperto: true, chiudeAlle };
  }

  const piuTardi = oggi.find((fascia) => minutiDi(fascia.apertura) > minuti);
  if (piuTardi) {
    return { aperto: false, apre: { giorno, ora: piuTardi.apertura, quando: 'oggi' } };
  }

  // Nei giorni seguenti; il settimo è lo stesso giorno della settimana dopo.
  const indice = GIORNI.indexOf(giorno);
  for (let scarto = 1; scarto <= 7; scarto++) {
    const altroGiorno = GIORNI[(indice + scarto) % 7];
    const prima = altroGiorno ? fasceDelGiorno(fasce, altroGiorno)[0] : undefined;
    if (altroGiorno && prima) {
      return {
        aperto: false,
        apre: {
          giorno: altroGiorno,
          ora: prima.apertura,
          quando: scarto === 1 ? 'domani' : 'giorno',
        },
      };
    }
  }
  return { aperto: false, apre: null };
}

/** Il testo mostrato al visitatore, per esempio "Chiuso, apre domani alle 9:30". */
export function testoStato(stato: StatoNegozio): string {
  if (stato.aperto) return `Aperto ora, chiude alle ${oraLeggibile(stato.chiudeAlle)}`;
  if (!stato.apre) return 'Chiuso';
  const { giorno, ora, quando } = stato.apre;
  const orario = oraLeggibile(ora);
  if (quando === 'oggi') return `Chiuso, apre alle ${orario}`;
  if (quando === 'domani') return `Chiuso, apre domani alle ${orario}`;
  return `Chiuso, apre ${ETICHETTE[giorno].toLowerCase()} alle ${orario}`;
}

/** Sette righe, da lunedì a domenica, con le fasce del giorno unite ("9:30–13:00, 16:00–19:30"). */
export function righeOrari(fasce: Fascia[]): { giorno: Giorno; etichetta: string; testo: string }[] {
  return GIORNI.map((giorno) => {
    const delGiorno = fasceDelGiorno(fasce, giorno);
    const testo =
      delGiorno.length === 0
        ? 'Chiuso'
        : delGiorno
            .map((fascia) => `${oraLeggibile(fascia.apertura)}–${oraLeggibile(fascia.chiusura)}`)
            .join(', ');
    return { giorno, etichetta: ETICHETTE[giorno], testo };
  });
}
