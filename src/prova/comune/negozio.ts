// I dati del negozio come li mostrano le pagine di prova. Nome, indirizzo e
// telefono vengono dalla voce `negozio`; orari, Instagram, mappe, stelle Google e
// frase del marchio sono i valori di esempio della prova (non sono nel pannello).
import type { Negozio } from '../../content/schemas';
import { linkTelefono, linkWhatsApp, numeroInternazionale } from './contatti';
import { ORARI_PROVA, type Fascia } from './orari';

export interface DatiNegozio {
  nome: string;
  /** Su una riga: "Via Ricasoli 51-53, 57125 Livorno". */
  indirizzo: string;
  /** Su una riga, senza CAP: "Via Ricasoli 51-53, Livorno". */
  indirizzoBreve: string;
  /** Le parti dell'indirizzo, per gli altri formati: "Via Ricasoli", "51-53", "57125", "Livorno". */
  via: string;
  civico: string;
  cap: string;
  citta: string;
  telefono: string;
  telefonoHref: string;
  /** Link `https://wa.me/<numero>`: per il messaggio già scritto vedi `linkWhatsApp`. */
  whatsapp: string;
  instagram: { handle: string; url: string };
  mappeUrl: string;
  recensioniUrl: string;
  google: { media: string; recensioni: number };
  frase: string;
  orari: Fascia[];
}

// Un solo link: apre la ricerca del negozio su Google Maps, dove ci sono anche le
// recensioni. Niente mappa incorporata.
const MAPPE_URL =
  'https://www.google.com/maps/search/?api=1&query=Alma%20Living%20Via%20Ricasoli%2051%20Livorno';

export function datiNegozio(negozio: Negozio): DatiNegozio {
  const { via, civico, cap, citta } = negozio.indirizzo;
  return {
    nome: negozio.nome,
    indirizzo: `${via} ${civico}, ${cap} ${citta}`,
    indirizzoBreve: `${via} ${civico}, ${citta}`,
    via,
    civico,
    cap,
    citta,
    telefono: negozio.telefono,
    telefonoHref: linkTelefono(negozio.telefono),
    whatsapp: linkWhatsApp(numeroInternazionale(negozio.telefono)),
    instagram: {
      handle: '@almaliving.viaricasoli',
      url: 'https://www.instagram.com/almaliving.viaricasoli/',
    },
    mappeUrl: MAPPE_URL,
    recensioniUrl: MAPPE_URL,
    google: { media: '5,0', recensioni: 5 },
    frase:
      'Rendiamo la tua casa ancora più casa. Biancheria, profumi e dettagli che scaldano l’ambiente.',
    orari: ORARI_PROVA,
  };
}
