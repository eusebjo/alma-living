// Tipi del motore delle regole di autonomia. Sono l'interfaccia che usa la
// verifica su GitHub (Task 6): nomi e forme non vanno cambiati alla leggera.

/** 0 = vietato, 1 = serve l'approvazione, 2-4 = più autonomia (fase 2). */
export type Livello = 0 | 1 | 2 | 3 | 4;

export interface CollectionRule {
  /** Percorso o glob (con `/`, come lo restituisce GitHub) dei file. */
  file: string;
  formato: 'json' | 'markdown';
  azioni: { crea: Livello; modifica: Livello; elimina: Livello };
  /** Livello per campo: chiavi puntate (`indirizzo.via`) o un prefisso (`indirizzo`). */
  campi: Record<string, Livello>;
}

export interface Rules {
  versione: 1;
  ruoli: { sviluppo: string[]; redazione: string[] };
  proposte: { stati_inviati: string[] };
  contenuti: Record<string, CollectionRule>;
  media: {
    percorsi: string[];
    /** Estensioni ammesse per i file caricati, senza punto, maiuscole indifferenti. */
    estensioni: string[];
    dimensione_massima_kb: number;
    azioni: { carica: Livello; elimina: Livello };
  };
}

export interface ChangedFile {
  path: string;
  status: 'added' | 'modified' | 'removed' | 'renamed';
  previousPath?: string;
  before: string | null;
  after: string | null;
  sizeBytes?: number;
}

export interface PullRequestInput {
  author: string;
  draft: boolean;
  labels: string[];
  files: ChangedFile[];
}

export type Azione =
  | 'crea'
  | 'modifica'
  | 'elimina'
  | 'carica'
  | 'perimetro'
  | 'formato'
  | 'dimensione'
  | 'autore'
  | 'stato';

export interface Violazione {
  file: string;
  campo?: string;
  azione: Azione;
  messaggio: string;
}

export interface Verdict {
  ruolo: 'sviluppo' | 'redazione' | 'sconosciuto';
  esito: 'consentito' | 'respinto' | 'in_bozza';
  livello: Livello | null;
  violazioni: Violazione[];
}
