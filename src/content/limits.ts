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
  // Testo alternativo di ogni foto di prodotti, post e storie.
  foto: {
    alt: { min: 5, max: 150 },
  },
  prodotto: {
    nome: { max: 60 },
    dettaglio: { max: 90 },
    colori: { max: 6 },
    colore: { max: 30 },
  },
  post: {
    testo: { max: 1000 },
    foto: { max: 10 },
    soggetto: { max: 60 },
  },
  storia: {
    frase: { max: 200 },
    soggetto: { max: 60 },
    foto: { max: 10 },
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
