// Link di contatto: WhatsApp con il messaggio già scritto e telefono.

/** Il messaggio di disponibilità che si apre già scritto in WhatsApp. */
export function messaggioDisponibilita(articolo: string): string {
  return `Buongiorno, ho visto sul sito «${articolo}». È disponibile? Misura o colore: …`;
}

/**
 * Numero in forma internazionale, solo cifre (come lo vuole wa.me). Senza `+` né
 * `00` iniziali si intende un numero italiano.
 */
export function numeroInternazionale(telefono: string): string {
  const cifre = telefono.replace(/\D/g, '');
  if (telefono.trim().startsWith('+')) return cifre;
  if (cifre.startsWith('00')) return cifre.slice(2);
  return `39${cifre}`;
}

/**
 * Link `https://wa.me/<numero>`, con il testo già scritto se c'è. Del numero tiene
 * solo le cifre: va bene anche un link wa.me già composto. Il numero è già
 * internazionale (vedi `numeroInternazionale`).
 */
export function linkWhatsApp(numero: string, messaggio?: string): string {
  const base = `https://wa.me/${numero.replace(/\D/g, '')}`;
  return messaggio ? `${base}?text=${encodeURIComponent(messaggio)}` : base;
}

/** Link `tel:` con il prefisso internazionale, per esempio `tel:+393345205451`. */
export function linkTelefono(telefono: string): string {
  return `tel:+${numeroInternazionale(telefono)}`;
}
