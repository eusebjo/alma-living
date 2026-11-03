// Riprovare e ricordare. Alla build ogni foto remota va "misurata" con una richiesta
// di rete (`inferRemoteSize`, vedi `misure-foto.ts`); Astro non riprova, e un solo
// errore passeggero di rete fermerebbe la build di una proposta della redazione.
// Nessun import da Astro: lo leggono anche i test.

/**
 * Esegue `fai`; se la promessa è rifiutata (o la funzione lancia un errore) aspetta e
 * riprova, fino a `tentativi` volte in tutto (almeno una). Dopo l'ultimo tentativo
 * rilancia l'ultimo errore. `attesaMs(i)` dà i millisecondi da aspettare dopo il
 * tentativo `i` (1 è il primo) che è fallito: dopo l'ultimo tentativo non si aspetta.
 */
export async function conRiprova<T>(
  fai: () => Promise<T>,
  tentativi = 3,
  attesaMs: (i: number) => number = (i) => 1000 * i,
): Promise<T> {
  const ultimo = Math.max(1, tentativi);
  for (let i = 1; ; i++) {
    try {
      return await fai();
    } catch (errore) {
      if (i >= ultimo) throw errore;
    }
    await new Promise<void>((fatto) => setTimeout(fatto, attesaMs(i)));
  }
}

/**
 * Una versione di `fai` che per ogni chiave la esegue una volta sola: chi la chiede di
 * nuovo (anche mentre è ancora in corso) riceve la stessa promessa. Se la promessa è
 * rifiutata la chiave si dimentica, così la richiesta successiva riprova.
 */
export function unaVoltaPerChiave<T>(
  fai: (chiave: string) => Promise<T>,
): (chiave: string) => Promise<T> {
  const ricordate = new Map<string, Promise<T>>();
  return (chiave) => {
    const trovata = ricordate.get(chiave);
    if (trovata) return trovata;
    const promessa: Promise<T> = (async () => fai(chiave))().catch((errore: unknown) => {
      if (ricordate.get(chiave) === promessa) ricordate.delete(chiave);
      throw errore;
    });
    ricordate.set(chiave, promessa);
    return promessa;
  };
}
