# NOTES

## 1. Decisioni tecniche

### Stack
- **Next.js 16 (App Router) + TypeScript** per frontend e backend nello stesso progetto: un solo comando (`npm run dev`) avvia sia le API (Route Handlers) sia la UI React, semplificando la valutazione e la coerenza tra i due layer. Essendoci poco scambio di dati tra frontend e backend, questa configurazione è sufficiente.
- **SQLite + Prisma** per la persistenza: un database reale ma senza infrastruttura esterna. Il vincolo `@@unique([date, timeSlot])` è la garanzia definitiva contro le doppie prenotazioni, indipendente dai lock applicativi.
- **Tailwind** per lo styling

### Aggiornamenti in tempo reale e prenotazione "in corso" (bonus)
- **Tutti vedono le novità senza ricaricare la pagina.** Quando qualcuno prenota o cancella un orario, il server avvisa subito tutti gli altri utenti collegati e la griglia degli orari si aggiorna da sola.
- **Un orario può essere "tenuto da parte" mentre lo si prenota.** Appena un utente apre il modulo di prenotazione, quell'orario appare occupato agli altri. 
- **La riserva non resta bloccata per sempre.** Finché il modulo è aperto, la pagina conferma periodicamente al server che l'utente sta ancora prenotando. Se l'utente chiude la pagina, l'orario viene liberato subito. Se invece la pagina si chiude male (per esempio cade la connessione o si blocca il computer), il server libera comunque l'orario dopo un breve periodo, 30 secondi per default.

### Struttura del codice
Organizzazione granulare (`lib/`, `components/`, `hooks/`) per rispettare il vincolo delle 300 righe per file: il file più grande del progetto è di 115 righe.\
In questo modo il codice rimane modulare, leggibile e facilmente manutenibile.

## 2. Uso dell'AI

- **Tool usato**: Claude Code (Anthropic), unico strumento AI nel workflow.
- **Per cosa**: intera architettura (discussa e validata prima di scrivere codice, incluse
  le insidie di Next.js con SSE/route handler/Prisma+SQLite nei test), boilerplate di
  route/hook/componenti, debug (es. bug di boundary nella generazione degli slot orari,
  trovato scrivendone i test), scrittura dei test (unit, integration, component, E2E).
- **Cosa è stato scritto manualmente**: il prompt da passare a Claude con il pdf delle richieste in allegato e, successivamente, la revisione e l'integrazione delle risposte generate dall'AI.
- **Cosa è stato verificato manualmente**: il corretto funzionamento della logica di lock e rilascio degli slot in scenari reali, inclusi casi di chiusura improvvisa della pagina e concorrenza tra più utenti.

## 3. Cosa farei con più tempo
Dipende molto dal contesto e dai requisiti del progetto, in generale si potrebbe:
  deployment multi-istanza: lo stato in-memory attuale è singolo-processo per design.
- Aggiungere autenticazione/rate-limiting sulle API pubbliche (oggi chiunque può
  creare/eliminare prenotazioni).
- Paginazione o vista a settimana/mese oltre al singolo giorno selezionato.
- CI (GitHub Actions) che esegua `npm run test` e `npm run test:e2e` ad ogni push.
- Sincronizzazione con altri calendari (Google Calendar, Outlook, ecc.)
