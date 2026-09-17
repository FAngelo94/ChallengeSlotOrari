# Prenotazione slot orari

Sistema di prenotazione slot orari end-to-end (Next.js App Router + TypeScript, SQLite via
Prisma, realtime via Server-Sent Events). Vedi [NOTES.md](./NOTES.md) per le decisioni
tecniche e il ragionamento dietro le scelte.

## Requisiti

- Node.js 22+
- npm

## Setup

```bash
npm install
cp .env.example .env      # già presente con valori di default validi per lo sviluppo locale
npm run db:migrate        # crea prisma/dev.db e applica lo schema
npm run dev                # http://localhost:3000
```

## Test

```bash
npm run test        # Vitest: unit + integration backend, component test frontend
npm run test:e2e     # Playwright: flusso completo + scenario a due tab (lock realtime)
```

`npm run test:e2e` avvia da solo un server Next.js dedicato (porta 3100) su un database
SQLite di test isolato (`prisma/e2e.db`, ricreato ad ogni run), non serve avviare nulla a
mano. Next.js 16 non consente due dev server sulla stessa cartella: se `npm run dev` è
attivo, fermalo prima di lanciare gli E2E.

## Funzionalità

- CRUD su `bookings` (`name`, `date`, `time_slot`, `note`) con vincolo di unicità
  `date + time_slot` a livello di database (`@@unique`), che il backend traduce in un
  `409 SLOT_ALREADY_BOOKED`.
- Vista degli slot occupati/liberi per una data selezionata, creazione ed eliminazione di
  una prenotazione dalla UI, con gestione visibile del conflitto.
- **Bonus realtime**: mentre un utente ha uno slot selezionato (form di prenotazione
  aperto), lo slot viene lockato temporaneamente (TTL configurabile, rinnovato in
  automatico finché il form resta aperto) e tutti gli altri client collegati lo vedono
  come "in prenotazione da altro utente" in tempo reale via SSE — verificabile aprendo due
  tab del browser sulla stessa data (funziona anche duplicando la tab: ogni tab ottiene
  comunque un `clientId` distinto).

## Variabili d'ambiente

Vedi `.env.example`:

- `DATABASE_URL` — connessione SQLite (`file:./dev.db` in sviluppo).
- `LOCK_TTL_MS` — durata del lock temporaneo su uno slot in millisecondi (default 30000).
- `NEXT_TELEMETRY_DISABLED` — disabilita la telemetria anonima di Next.js.

## Struttura del repository

```
src/
  app/               pagina React (App Router) + Route Handlers API (/api/bookings, /api/locks, /api/events)
  components/        componenti React a responsabilità singola
  hooks/              logica client riusabile (clientId per-tab, realtime SSE, heartbeat del lock)
  lib/                logica di dominio condivisa (Prisma, slot orari, lock, event bus, SSE, errori)
  types/              tipi condivisi frontend/backend
prisma/               schema Prisma e migrazioni
tests/
  backend/           test unit/integration sulle API e sulla libreria dei lock
  frontend/           component test (Vitest + React Testing Library)
  e2e/                test Playwright, incluso lo scenario a due tab
```
