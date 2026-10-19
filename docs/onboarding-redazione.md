# Guida per la redazione: come proporre una modifica al sito

Guida per eusebjo, da fare insieme alla persona che gestirà i contenuti la prima volta. Le parole tra virgolette sono quelle che si leggono a schermo: il pannello è in italiano, GitHub spesso è in inglese.

Il sito si modifica dal pannello: ogni modifica diventa una **proposta**. La proposta viene controllata in automatico, eusebjo la guarda con l'anteprima e, quando è approvata, il sito si aggiorna da solo.

## Prima volta (una volta sola)

1. **Account GitHub.** Si crea su github.com ("Sign up") con un'email personale.
2. **Verifica in due passaggi.** Su GitHub: foto del profilo, "Settings", "Password and authentication", "Two-factor authentication", "Enable". Meglio con un'app sul telefono. Si conservano i codici di recupero in un posto sicuro.
3. **Invito al sito.** eusebjo invia l'invito al repository `eusebjo/alma-living`. Arriva un'email da GitHub: si apre e si preme "Accept invitation" (oppure si apre https://github.com/eusebjo/alma-living/invitations). Senza invito accettato il pannello non lascia entrare.
4. **Niente email dei controlli automatici.** Su GitHub: "Settings", "Notifications", sezione "System", "Actions": si sceglie di **non essere avvisata** ("Don't notify", oppure si toglie la spunta da "Email"). Quelle email sono in inglese e non servono: l'esito del controllo si legge in italiano nella proposta.
5. **Primo accesso al pannello.** Si apre https://alma-living.sebjomuho.workers.dev/admin/ e si preme **"Accedi con GitHub"**. GitHub chiede di autorizzare l'accesso: si preme "Authorize". Si inserisce il codice della verifica in due passaggi se richiesto.

## Modificare una pagina o i dati del negozio

1. Nel pannello si sceglie "Pagine" oppure "Negozio" e si apre la voce da modificare.
2. Si cambiano i campi. Sotto ogni campo si vedono i limiti (per esempio il numero di caratteri). I campi in grigio, come il nome e l'indirizzo del negozio, non si possono cambiare dal pannello.
3. **Le immagini si caricano dal campo "Immagine" dentro la pagina.** Si può scegliere una foto qualsiasi (anche dal telefono): il pannello la converte e la riduce da solo. Nel testo della pagina non si inseriscono immagini.

## Salvare come bozza e inviare per la revisione

1. **"Salva"** salva la modifica come **bozza**. La bozza non va online e eusebjo non riceve niente: si può continuare con calma, anche in più giorni.
2. Quando la modifica è pronta si preme **"Invia per Revisione"** (compare dopo il salvataggio), oppure "Cambia Stato Voce" e "In Revisione". **Solo da questo momento** eusebjo viene avvisato e la proposta viene controllata.
3. Se serve correggere dopo l'invio: si riporta la voce in "Bozze", si corregge, si salva e si invia di nuovo.

La bacheca "Flusso Editoriale" mostra le voci divise in "Bozze", "In Revisione" e "Pronti".

## Dove si vede l'anteprima

Dopo l'invio l'anteprima del sito con le modifiche è pronta in un paio di minuti. Il link si trova in due posti:

- nel commento automatico "Verifica delle regole" della proposta su GitHub (dal pannello: "Visualizza su GitHub"): è il link da usare, c'è sempre;
- nella voce, con il pulsante "Visualizza Anteprima", se il pannello lo mostra.

Lo stesso commento dice se la modifica rispetta le regole. Se non le rispetta (per esempio una chiusura prima dell'apertura) spiega in italiano cosa correggere: si torna nel pannello, si corregge e si salva di nuovo; il controllo riparte da solo.

## Dopo l'invio

- eusebjo guarda l'anteprima e approva la proposta: quando è approvata e pubblicata, il sito si aggiorna da solo in pochi minuti.
- GitHub manda un'email quando la proposta viene **approvata e pubblicata** e quando qualcuno la **commenta** (per esempio per chiedere una correzione). Le email vanno all'indirizzo dell'account GitHub.

## Cosa non fare

- **Non usare la sezione "File Multimediali" del pannello per caricare, rinominare o eliminare immagini.** Quella sezione salverebbe direttamente sul sito, saltando la revisione, e GitHub la rifiuta con un errore in inglese. Le immagini si caricano sempre dal campo "Immagine" della pagina.
- Non modificare niente direttamente su GitHub: tutto passa dal pannello.
- Se compare un errore che non si capisce, non si ripete l'operazione più volte: si fa una foto dello schermo e si avvisa eusebjo.
