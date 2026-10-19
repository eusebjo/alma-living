import { z } from 'astro/zod';
import type { ZodTypeAny } from 'astro/zod';
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

// `image` è la funzione che Astro passa a `defineCollection({ schema })`; i test
// ne passano una finta. Tenerla come parametro evita di importare `astro:content`
// (modulo virtuale non disponibile fuori da Astro) in questo file.
export function makePaginaSchema(image: () => ZodTypeAny) {
  return z.object({
    titolo: z
      .string()
      .min(1, 'Il titolo è obbligatorio.')
      .max(
        LIMITI.pagina.titolo.max,
        `Il titolo può avere al massimo ${LIMITI.pagina.titolo.max} caratteri.`,
      ),
    descrizione: z
      .string()
      .min(
        LIMITI.pagina.descrizione.min,
        `La descrizione deve avere almeno ${LIMITI.pagina.descrizione.min} caratteri.`,
      )
      .max(
        LIMITI.pagina.descrizione.max,
        `La descrizione può avere al massimo ${LIMITI.pagina.descrizione.max} caratteri.`,
      ),
    immagine: image(),
    immagine_alt: z
      .string()
      .min(
        LIMITI.pagina.immagine_alt.min,
        `Il testo alternativo deve avere almeno ${LIMITI.pagina.immagine_alt.min} caratteri.`,
      )
      .max(
        LIMITI.pagina.immagine_alt.max,
        `Il testo alternativo può avere al massimo ${LIMITI.pagina.immagine_alt.max} caratteri.`,
      ),
  });
}
