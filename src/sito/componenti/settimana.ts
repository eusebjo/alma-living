// La settimana riassunta in gruppi di giorni consecutivi con gli stessi orari,
// per i testi brevi della pagina ("Lunedì–sabato 9:30–13:00 e 16:00–19:30",
// "Domenica chiuso"). Logica pura, senza Astro.
import { righeOrari, type Fascia } from '../comune/orari';

export interface GruppoGiorni {
  /** "Lunedì–sabato" oppure "Domenica". */
  giorni: string;
  /** "9:30–13:00 e 16:00–19:30" oppure "chiuso". */
  ore: string;
  chiuso: boolean;
}

export function settimana(fasce: Fascia[]): GruppoGiorni[] {
  const gruppi: { primo: string; ultimo: string; testo: string }[] = [];
  for (const { etichetta, testo } of righeOrari(fasce)) {
    const ultimo = gruppi.at(-1);
    if (ultimo && ultimo.testo === testo) ultimo.ultimo = etichetta;
    else gruppi.push({ primo: etichetta, ultimo: etichetta, testo });
  }
  return gruppi.map(({ primo, ultimo, testo }) => {
    const chiuso = testo === 'Chiuso';
    return {
      giorni: primo === ultimo ? primo : `${primo}–${ultimo.toLowerCase()}`,
      ore: chiuso ? 'chiuso' : testo.replaceAll(', ', ' e '),
      chiuso,
    };
  });
}

/** Una riga sola, per esempio "Lunedì–sabato 9:30–13:00 e 16:00–19:30". */
export function orariInBreve(fasce: Fascia[]): string {
  const aperti = settimana(fasce).filter((gruppo) => !gruppo.chiuso);
  if (aperti.length === 0) return 'Chiuso';
  return aperti.map(({ giorni, ore }) => `${giorni} ${ore}`).join('; ');
}
