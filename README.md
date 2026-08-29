# Japan Trip 2027

Real implementation of the `Japan Trip 2027.dc.html` Claude Design prototype: a mobile-styled React
web app with a real Node/Express + SQLite backend.

## Structure

- `backend/` — Express + TypeScript + SQLite (better-sqlite3). Real auth (bcrypt + JWT), trip/itinerary/
  attraction data, budget with live FX rates, notifications, translation dictionary, and a chat endpoint
  backed by the real Anthropic API.
- `frontend/` — React + Vite + TypeScript, React Router, react-leaflet for the country/city maps.

## Running locally

```bash
# backend
cd backend
cp .env.example .env      # add ANTHROPIC_API_KEY to enable the chat agent
npm install
npm run dev                # http://localhost:4000

# frontend (separate terminal)
cd frontend
npm install
npm run dev                # http://localhost:5173, proxies /api to the backend
```

The backend seeds a demo trip on first run (SQLite file at `backend/data/trip.db`):

- Accounts: `uri@example.com` / `partner@example.com`, password `japan2027`
- Trip invite code: `JPN-4K2Q`

## Notes / intentional deviations from the prototype

- The prototype was a client-only mock (no backend, no persistence, fake auth). This build adds a real
  backend: real password auth, a real database, live FX rates (frankfurter.app, cached hourly with a
  static fallback), and a real Claude-powered chat agent (requires `ANTHROPIC_API_KEY`; without it the
  chat replies with a placeholder message instead of failing).
- The country and city maps use real Leaflet + OpenStreetMap tiles (not a custom SVG/iframe), matching
  the prototype's own approach of using real geography.
- The "Today" screen's countdown and day-selection are driven by the real calendar date instead of the
  prototype's fixed demo arithmetic.
- The city-map route builder (tap pins to build a same-day walking order) is currently client-side only
  and resets on reload — it wasn't persisted to the backend to keep scope contained.
- UI language and base-currency selectors are stored but, as in the prototype, don't yet retranslate/
  reconvert the rest of the app.
