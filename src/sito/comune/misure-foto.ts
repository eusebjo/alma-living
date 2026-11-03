// Le misure di una foto remota, lette da Astro alla build (`inferRemoteSize`).
// Ogni foto compare più volte nella pagina (in griglia, nella scheda rapida, nel
// lettore): la misura si chiede una volta per indirizzo, e se la rete fa un errore
// passeggero si riprova, invece di fermare la build (vedi `riprova.ts`).
// Il modulo importa `astro:assets`, quindi lo usa solo la build: i test provano
// `riprova.ts`.
import { inferRemoteSize } from 'astro:assets';
import { conRiprova, unaVoltaPerChiave } from './riprova';

/** Larghezza, altezza e formato della foto all'indirizzo `src`. */
export const misureFoto = unaVoltaPerChiave((src) => conRiprova(() => inferRemoteSize(src)));
