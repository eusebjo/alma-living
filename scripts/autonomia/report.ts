import { codice } from './testo';
import type { Verdict, Violazione } from './types';

/** Prima riga del commento: serve a ritrovarlo e aggiornarlo a ogni controllo. */
export const MARCATORE = '<!-- verifica-autonomia -->';

function voce(violazione: Violazione): string {
  const dove = [
    violazione.file === '' ? null : codice(violazione.file),
    violazione.campo === undefined ? null : `(campo ${codice(violazione.campo)})`,
  ].filter((parte) => parte !== null);
  const prefisso = dove.length === 0 ? '' : `${dove.join(' ')}: `;
  // Il messaggio sta su una sola riga, così la voce dell'elenco non si spezza.
  return `- ${prefisso}${violazione.messaggio.replace(/\s+/g, ' ').trim()}`;
}

/** Rapporto in Markdown, in italiano, per chi gestisce i contenuti. */
export function formatReport(v: Verdict): string {
  const righe: string[] = [MARCATORE, ''];

  switch (v.esito) {
    case 'consentito': {
      righe.push('## Verifica delle regole: modifica consentita', '');
      if (v.ruolo === 'sviluppo') {
        righe.push(
          "L'autore fa parte del gruppo sviluppo: le regole sui contenuti non si applicano.",
        );
      } else if (v.livello === 1) {
        righe.push(
          "La modifica rispetta le regole, ma resta in attesa dell'approvazione prima di andare online.",
        );
      } else if (v.livello === null) {
        righe.push('La modifica rispetta le regole.');
      } else {
        righe.push(
          `La modifica rispetta le regole di autonomia (livello ${v.livello}).`,
        );
      }
      break;
    }
    case 'in_bozza': {
      righe.push('## Verifica delle regole: proposta non ancora inviata', '');
      righe.push(...v.violazioni.map(voce));
      if (v.violazioni.length > 0) righe.push('');
      righe.push(
        'Quando la proposta viene inviata per la revisione, i controlli ripartono da soli.',
      );
      break;
    }
    case 'respinto': {
      righe.push('## Verifica delle regole: modifica non consentita', '');
      righe.push(
        "La proposta non rispetta le regole e non può andare online così com'è:",
        '',
      );
      righe.push(...v.violazioni.map(voce));
      if (v.violazioni.length > 0) righe.push('');
      righe.push(
        'Annulla le modifiche indicate, oppure chiedi al responsabile del sito.',
      );
      break;
    }
  }

  return `${righe.join('\n')}\n`;
}
