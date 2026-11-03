// Dai contenuti delle collection (`prodotti`, `post`, `storie`, vedi
// `src/content.config.ts`) ai dati che usano i componenti della pagina
// (`Articolo`, `Post`, `Storia` di `componenti/dati.ts`).
//
// Funzioni pure, senza `astro:content`: la pagina chiama `getCollection` e passa
// le voci qui; i test sul sito generato leggono i file JSON delle collection e li
// passano alle stesse funzioni, così confrontano la pagina con i contenuti che la
// redazione ha davvero scritto.
import { CATEGORIE } from '../content/categorie';
import { INQUADRATURE } from '../content/foto';
import type { PostContenuto, Prodotto, StoriaContenuto } from '../content/schemas';
import {
  SCALA_DETTAGLIO,
  type Articolo,
  type Colore,
  type Post,
  type Scatto,
  type ScattoArticolo,
  type Storia,
} from './componenti/dati';

/** Una foto di un contenuto: indirizzo, testo alternativo e inquadratura. */
type FotoContenuto = Prodotto['foto'];

/** Una voce di una collection, come la dà `getCollection`: l'id (il nome del file) e i dati. */
export interface Voce<T> {
  id: string;
  data: T;
}

const MESI = [
  'gennaio',
  'febbraio',
  'marzo',
  'aprile',
  'maggio',
  'giugno',
  'luglio',
  'agosto',
  'settembre',
  'ottobre',
  'novembre',
  'dicembre',
] as const;

/**
 * La data `AAAA-MM-GG` come la scrive la pagina: il giorno senza zero davanti e
 * il mese in lettere, senza l'anno (`2026-07-08` → `8 luglio`). La data è già
 * stata controllata dallo schema.
 */
export function dataBreve(iso: string): string {
  const [, mese, giorno] = iso.split('-');
  return `${Number(giorno)} ${MESI[Number(mese) - 1]}`;
}

/** La foto come la mostrano i componenti: l'inquadratura diventa un `object-position`. */
function scattoDa(foto: FotoContenuto): Scatto {
  return { src: foto.src, alt: foto.alt, posizione: INQUADRATURE[foto.inquadratura] };
}

/**
 * Un prodotto come articolo degli scaffali. Senza seconda foto, il secondo
 * scatto è la prima foto ingrandita al centro, con il testo alternativo
 * "Dettaglio di <nome>".
 */
export function articoloDa(id: string, p: Prodotto): Articolo {
  const primo = scattoDa(p.foto);
  const secondo: ScattoArticolo = p.secondaFoto
    ? scattoDa(p.secondaFoto)
    : {
        ...primo,
        alt: `Dettaglio di ${p.nome}`,
        ingrandimento: { scala: SCALA_DETTAGLIO, origine: '50% 50%' },
      };
  const articolo: Articolo = {
    id,
    nome: p.nome,
    dettaglio: p.dettaglio,
    categorie: [...p.categorie],
    novita: p.novita,
    scatti: [primo, secondo],
  };
  if (p.colori) {
    articolo.colori = p.colori.map(({ nome, tinta, foto }): Colore =>
      foto ? { nome, tinta, foto: scattoDa(foto) } : { nome, tinta },
    );
  }
  return articolo;
}

/**
 * Un post del diario. "Di cosa parla" (`soggetto`) diventa `chiedi`, per il
 * messaggio WhatsApp; vuoto o di soli spazi vale come assente, e il messaggio dice
 * solo la data del post.
 */
export function postDa(id: string, p: PostContenuto): Post {
  const voce: Post = { id, data: dataBreve(p.data), testo: p.testo, foto: p.foto.map(scattoDa) };
  const chiedi = p.soggetto?.trim();
  if (chiedi) voce.chiedi = chiedi;
  return voce;
}

/** Una storia della fila: la frase di ogni foto è il testo che la storia mostra. */
export function storiaDa(id: string, s: StoriaContenuto): Storia {
  const storia: Storia = {
    id,
    nome: s.nome,
    data: dataBreve(s.data),
    invito: s.invito,
    foto: s.foto.map((foto) => ({ ...scattoDa(foto), testo: foto.frase, soggetto: foto.soggetto })),
  };
  if (s.etichetta) storia.etichetta = s.etichetta;
  return storia;
}

/**
 * Dal più recente (`data` è `AAAA-MM-GG`, quindi l'ordine del testo è quello
 * delle date); a parità di data, l'id minore prima. Restituisce un elenco nuovo.
 */
function perData<T extends { id: string; data: string }>(voci: readonly T[]): T[] {
  return [...voci].sort((a, b) =>
    a.data !== b.data ? (a.data < b.data ? 1 : -1) : a.id < b.id ? -1 : a.id > b.id ? 1 : 0,
  );
}

/** Gli scaffali: dal prodotto aggiunto più di recente. */
export const ordinaArticoli = perData;

/** La griglia dei post: dal più recente. */
export const ordinaPost = perData;

/** Le otto storie fisse, nell'ordine della fila. */
export const ORDINE_STORIE = [
  'oggi',
  'arrivi',
  'vetrina',
  'casette',
  'candele',
  'bimbi',
  'tavola',
  'lenzuola',
] as const;

/** La posizione di una storia nella fila: quelle fuori dall'elenco fisso vanno in fondo. */
function postoStoria(id: string): number {
  const posto = (ORDINE_STORIE as readonly string[]).indexOf(id);
  return posto === -1 ? ORDINE_STORIE.length : posto;
}

/** Gli articoli degli scaffali dalle voci della collection `prodotti`, in ordine. */
export function elencoArticoli(voci: readonly Voce<Prodotto>[]): Articolo[] {
  return ordinaArticoli(voci.map((voce) => ({ id: voce.id, data: voce.data.data, voce }))).map(
    ({ voce }) => articoloDa(voce.id, voce.data),
  );
}

/** I post del diario dalle voci della collection `post`, in ordine. */
export function elencoPost(voci: readonly Voce<PostContenuto>[]): Post[] {
  return ordinaPost(voci.map((voce) => ({ id: voce.id, data: voce.data.data, voce }))).map(
    ({ voce }) => postDa(voce.id, voce.data),
  );
}

/** Le storie dalle voci della collection `storie`, nell'ordine fisso (`ORDINE_STORIE`). */
export function elencoStorie(voci: readonly Voce<StoriaContenuto>[]): Storia[] {
  return [...voci]
    .sort((a, b) => postoStoria(a.id) - postoStoria(b.id) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
    .map((voce) => storiaDa(voce.id, voce.data));
}

/**
 * I filtri degli scaffali: le categorie con almeno un articolo, nell'ordine di
 * `CATEGORIE`. Mare c'è sempre: senza articoli mostra la sua finestra ("Il mare
 * torna in primavera"); le altre categorie vuote spariscono.
 */
export function categorieVisibili(articoli: readonly Articolo[]): (typeof CATEGORIE)[number][] {
  return CATEGORIE.filter(
    ({ id }) => id === 'mare' || articoli.some((articolo) => articolo.categorie.includes(id)),
  );
}
