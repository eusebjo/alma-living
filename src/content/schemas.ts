import { z } from 'astro/zod';
import { CATEGORIE } from './categorie';
import { eFotoInSottocartella, eIndirizzoFoto, INQUADRATURE } from './foto';
import type { Inquadratura } from './foto';
import { GIORNI, LIMITI } from './limits';

const ORA_24H = /^([01]\d|2[0-3]):[0-5]\d$/;

function minutiDaMezzanotte(ora: string): number {
  return Number(ora.slice(0, 2)) * 60 + Number(ora.slice(3, 5));
}

const orario = z
  .object({
    giorno: z.enum(GIORNI, { error: 'Giorno non valido.' }),
    apertura: z.string().regex(ORA_24H, "L'apertura va scritta come HH:MM."),
    chiusura: z.string().regex(ORA_24H, 'La chiusura va scritta come HH:MM.'),
  })
  .refine(
    // Se uno dei due orari è malformato lo segnala già `regex`: qui non
    // aggiungiamo un secondo errore.
    ({ apertura, chiusura }) =>
      !ORA_24H.test(apertura) ||
      !ORA_24H.test(chiusura) ||
      minutiDaMezzanotte(chiusura) > minutiDaMezzanotte(apertura),
    {
      error: "La chiusura deve essere successiva all'apertura.",
      path: ['chiusura'],
    },
  );

const TELEFONO_FORMATO = /^\+?[\d ]+$/;

const telefono = z
  .string()
  .regex(
    TELEFONO_FORMATO,
    'Il telefono può contenere solo cifre, spazi e un + iniziale.',
  )
  .refine(
    (valore) => {
      // Il formato errato lo segnala già `regex`: niente secondo errore.
      if (!TELEFONO_FORMATO.test(valore)) return true;
      const cifre = valore.replace(/\D/g, '').length;
      return cifre >= 9 && cifre <= 15;
    },
    { error: 'Il telefono deve avere tra 9 e 15 cifre.' },
  );

export const negozioSchema = z.object({
  nome: z
    .string()
    .min(1, 'Il nome è obbligatorio.')
    .max(
      LIMITI.negozio.nome.max,
      `Il nome può avere al massimo ${LIMITI.negozio.nome.max} caratteri.`,
    ),
  descrizione: z
    .string()
    .min(
      LIMITI.negozio.descrizione.min,
      `La descrizione deve avere almeno ${LIMITI.negozio.descrizione.min} caratteri.`,
    )
    .max(
      LIMITI.negozio.descrizione.max,
      `La descrizione può avere al massimo ${LIMITI.negozio.descrizione.max} caratteri.`,
    ),
  indirizzo: z.object({
    via: z.string().min(1, 'La via è obbligatoria.'),
    civico: z
      .string()
      .min(1, 'Il civico è obbligatorio.')
      .max(
        LIMITI.negozio.civico.max,
        `Il civico può avere al massimo ${LIMITI.negozio.civico.max} caratteri.`,
      ),
    cap: z.string().regex(/^\d{5}$/, 'Il CAP deve avere 5 cifre.'),
    citta: z.string().min(1, 'La città è obbligatoria.'),
    provincia: z
      .string()
      .regex(/^[A-Z]{2}$/, 'La provincia è una sigla di 2 lettere maiuscole.'),
  }),
  telefono,
  email: z.email('Indirizzo email non valido.').optional(),
  orari: z.array(orario).default([]),
});

export type Negozio = z.infer<typeof negozioSchema>;

// --- Foto, prodotti, post e storie ---

const NOMI_INQUADRATURA = Object.keys(INQUADRATURE) as Inquadratura[];

/**
 * Una foto del bucket (vedi `foto.ts`), con il testo alternativo e il punto da
 * tenere in vista quando è tagliata. L'indirizzo lo scrive il pannello al
 * caricamento: uno scritto a mano o di un altro sito è rifiutato. Una foto caricata
 * in una cartella creata dal selettore del pannello ha un messaggio suo.
 */
export const fotoSchema = z.object({
  src: z
    .string({ error: 'La foto è obbligatoria.' })
    .refine((valore) => eIndirizzoFoto(valore), {
      error: (problema) =>
        eFotoInSottocartella(String(problema.input))
          ? 'Carica la foto senza metterla in una cartella.'
          : 'La foto va caricata dal pannello.',
    }),
  alt: z
    .string({ error: 'Il testo alternativo è obbligatorio.' })
    .min(
      LIMITI.foto.alt.min,
      `Il testo alternativo deve avere almeno ${LIMITI.foto.alt.min} caratteri.`,
    )
    .max(
      LIMITI.foto.alt.max,
      `Il testo alternativo può avere al massimo ${LIMITI.foto.alt.max} caratteri.`,
    ),
  inquadratura: z.enum(NOMI_INQUADRATURA, { error: 'Inquadratura non valida.' }).default('centro'),
});

const DATA_ISO = /^(\d{4})-(\d{2})-(\d{2})$/;

// `AAAA-MM-GG` è un giorno che esiste davvero (niente 30 febbraio, né 29 febbraio
// negli anni non bisestili).
function eDataVera(valore: string): boolean {
  const parti = DATA_ISO.exec(valore);
  if (parti === null) return false;
  const [anno, mese, giorno] = [Number(parti[1]), Number(parti[2]), Number(parti[3])];
  const data = new Date(0);
  data.setUTCFullYear(anno, mese - 1, giorno);
  return (
    data.getUTCFullYear() === anno && data.getUTCMonth() === mese - 1 && data.getUTCDate() === giorno
  );
}

const dataSchema = z
  .string({ error: 'La data è obbligatoria.' })
  .refine(eDataVera, { error: 'La data non è valida.' });

const ID_CATEGORIE = CATEGORIE.map((categoria) => categoria.id);

const coloreSchema = z.object({
  nome: z
    .string()
    .min(1, 'Il nome del colore è obbligatorio.')
    .max(
      LIMITI.prodotto.colore.max,
      `Il nome del colore può avere al massimo ${LIMITI.prodotto.colore.max} caratteri.`,
    ),
  tinta: z
    .string()
    .regex(/^#[0-9a-f]{6}$/i, 'La tinta va scritta come #RRGGBB, per esempio #3f5a43.'),
  foto: fotoSchema.optional(),
});

/** Un prodotto degli scaffali: un file della collection `prodotti`. */
export const prodottoSchema = z
  .object({
    nome: z
      .string()
      .min(1, 'Il nome è obbligatorio.')
      .max(
        LIMITI.prodotto.nome.max,
        `Il nome può avere al massimo ${LIMITI.prodotto.nome.max} caratteri.`,
      ),
    dettaglio: z
      .string()
      .min(1, 'Il dettaglio è obbligatorio.')
      .max(
        LIMITI.prodotto.dettaglio.max,
        `Il dettaglio può avere al massimo ${LIMITI.prodotto.dettaglio.max} caratteri.`,
      ),
    // La prima categoria dà il nome mostrato sulla scheda.
    categorie: z
      .array(z.enum(ID_CATEGORIE, { error: 'Categoria non valida.' }), {
        error: 'Scegli almeno una categoria.',
      })
      .min(1, 'Scegli almeno una categoria.')
      .refine((scelte) => new Set(scelte).size === scelte.length, {
        error: 'Una categoria è ripetuta.',
      }),
    novita: z.boolean().default(false),
    data: dataSchema,
    foto: fotoSchema,
    secondaFoto: fotoSchema.optional(),
    colori: z
      .array(coloreSchema)
      .max(
        LIMITI.prodotto.colori.max,
        `Un prodotto può avere al massimo ${LIMITI.prodotto.colori.max} colori.`,
      )
      .optional(),
  })
  .refine(
    ({ colori }) =>
      colori === undefined ||
      colori.every((colore) => colore.foto !== undefined) ||
      colori.every((colore) => colore.foto === undefined),
    { error: 'Metti la foto a tutti i colori o a nessuno.', path: ['colori'] },
  );

export type Prodotto = z.infer<typeof prodottoSchema>;

/** Un post del diario: un file della collection `post`. */
export const postSchema = z.object({
  data: dataSchema,
  testo: z
    .string()
    .min(1, 'Il testo è obbligatorio.')
    .max(
      LIMITI.post.testo.max,
      `Il testo può avere al massimo ${LIMITI.post.testo.max} caratteri.`,
    ),
  foto: z
    .array(fotoSchema, { error: 'Il post deve avere almeno una foto.' })
    .min(1, 'Il post deve avere almeno una foto.')
    .max(
      LIMITI.post.foto.max,
      `Il post può avere al massimo ${LIMITI.post.foto.max} foto.`,
    ),
  // Di cosa parla il post, per il messaggio WhatsApp ("sui cuscini di Natale").
  soggetto: z
    .string()
    .max(
      LIMITI.post.soggetto.max,
      `«Di cosa parla» può avere al massimo ${LIMITI.post.soggetto.max} caratteri.`,
    )
    .optional(),
});

export type PostContenuto = z.infer<typeof postSchema>;

const fotoStoriaSchema = fotoSchema.extend({
  frase: z
    .string()
    .min(1, 'La frase è obbligatoria.')
    .max(
      LIMITI.storia.frase.max,
      `La frase può avere al massimo ${LIMITI.storia.frase.max} caratteri.`,
    ),
  // Di che cosa parla la foto, con l'articolo e in minuscolo ("i plaid delle feste").
  soggetto: z
    .string()
    .min(1, 'Il soggetto è obbligatorio.')
    .max(
      LIMITI.storia.soggetto.max,
      `Il soggetto può avere al massimo ${LIMITI.storia.soggetto.max} caratteri.`,
    ),
});

/** Una storia della fila sotto l'header: un file fisso della collection `storie`. */
export const storiaSchema = z.object({
  // Fisso per file: nel pannello è di sola lettura.
  nome: z.string().min(1, 'Il nome è obbligatorio.'),
  data: dataSchema,
  etichetta: z
    .enum(['Oggi', 'Nuovo'], { error: "L'etichetta può essere «Oggi» o «Nuovo»." })
    .optional(),
  invito: z.enum(['whatsapp', 'chiama', 'indicazioni'], { error: 'Invito non valido.' }),
  foto: z
    .array(fotoStoriaSchema, { error: 'La storia deve avere almeno una foto.' })
    .min(1, 'La storia deve avere almeno una foto.')
    .max(
      LIMITI.storia.foto.max,
      `La storia può avere al massimo ${LIMITI.storia.foto.max} foto.`,
    ),
});

export type StoriaContenuto = z.infer<typeof storiaSchema>;
