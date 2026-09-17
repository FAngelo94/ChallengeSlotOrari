# NOTES

## 1. Decisioni tecniche

Next.js 16 (App Router) + TypeScript per frontend e backend nello stesso progetto/processo:
un solo comando (`npm run dev`) avvia sia le API (Route Handlers) sia la UI React, il che
semplifica valutazione e coerenza tra i due layer. Persistenza con **SQLite + Prisma**:
reale ma senza infrastruttura esterna, con `@@unique([date, timeSlot])` come garanzia
definitiva anti-conflitto (indipendente dai lock applicativi). Bonus realtime implementato
con **Server-Sent Events** (nessun custom server, compatibile con i Route Handler) più un
lock temporaneo in-memory (`Map` + `EventEmitter`, entrambi singleton su `globalThis`),
TTL configurabile via `LOCK_TTL_MS` e rinnovato dal client (heartbeat a metà TTL) finché il
form di prenotazione resta aperto. Lato client il lock non è gestito direttamente
dall'effetto React ma da un piccolo manager (`lib/lockClient.ts`) che serializza le chiamate
sullo stesso slot e ritarda il rilascio di una manciata di millisecondi: senza questo, il
rimontaggio dell'effetto (React StrictMode ne fa uno ad ogni mount) spara `POST`, `DELETE` e
`POST` in parallelo e, se il `DELETE` viene servito per ultimo, lo slot risulta di nuovo
libero agli altri utenti pur avendo il form aperto. Alla chiusura della tab il lock viene
rilasciato su `pagehide`, e in ogni caso il TTL lato server fa da rete di sicurezza. L'identità del client è un id per-tab in `sessionStorage`:
poiché duplicare una tab ne copia il contenuto, ogni tab "rivendica" il proprio id su un
`BroadcastChannel` e chi lo possiede già risponde, costringendo la copia a rigenerarlo —
senza questo passaggio due tab duplicate condividerebbero l'id e vedrebbero i lock altrui
come propri. Tailwind per lo styling, con un unico tema chiaro esplicito (`color-scheme:
light`) per garantire contrasti leggibili anche con OS in dark mode. Struttura granulare (`lib/`, `components/`, `hooks/`) per
rispettare il vincolo delle 300 righe per file — il file più grande del progetto è 115 righe.

## 2. Uso dell'AI

- **Tool usato**: Claude Code (Anthropic), unico strumento AI nel workflow.
- **Per cosa**: intera architettura (discussa e validata prima di scrivere codice, incluse
  le insidie di Next.js con SSE/route handler/Prisma+SQLite nei test), boilerplate di
  route/hook/componenti, debug (es. bug di boundary nella generazione degli slot orari,
  trovato scrivendone i test), scrittura dei test (unit, integration, component, E2E).
- **Cosa è stato verificato manualmente**: ogni endpoint testato via `curl` prima di
  scrivere i test automatici (creazione, conflitto 409, validazione 422, lock, delete,
  stream SSE); l'intera suite di test (37 unit/integration/component + 4 E2E, incluso lo
  scenario a due tab per il lock realtime) eseguita e verificata verde prima di considerare
  il task completo; scelte architetturali (Prisma 7 vs 6, generator client) validate
  leggendo l'output reale dei comandi invece di fidarsi ciecamente del codice generato.

## 3. Cosa farei con più tempo

- Spostare lock e pub/sub degli eventi su Redis (`SETEX` + Pub/Sub) per reggere il
  deployment multi-istanza: lo stato in-memory attuale è singolo-processo per design.
- Aggiungere autenticazione/rate-limiting sulle API pubbliche (oggi chiunque può
  creare/eliminare prenotazioni).
- Paginazione o vista a settimana/mese oltre al singolo giorno selezionato.
- Test di carico sul lock/SSE con molte tab concorrenti sullo stesso slot.
- CI (GitHub Actions) che esegua `npm run test` e `npm run test:e2e` ad ogni push.
