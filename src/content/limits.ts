// Limiti dei campi dei contenuti. Fonte unica: li usano gli schemi Zod
// (src/content/schemas.ts) e, più avanti, la configurazione del pannello
// Sveltia, così gli editor vedono gli stessi limiti che la build fa rispettare.
export const LIMITI = {
  negozio: {
    nome: { max: 60 },
    descrizione: { min: 20, max: 160 },
    civico: { max: 10 },
  },
  pagina: {
    titolo: { max: 70 },
    descrizione: { min: 50, max: 160 },
    immagine_alt: { min: 5, max: 150 },
  },
} as const;

export const GIORNI = [
  'lunedi',
  'martedi',
  'mercoledi',
  'giovedi',
  'venerdi',
  'sabato',
  'domenica',
] as const;
