# JEExpert Dashboard

Internal single-page dashboard for JEExpert operators to monitor and manage the client (prospect/student) pipeline. Data is fetched live from Airtable.

**Stack:** React + Vite · React Router v6 · TailwindCSS · Airtable REST API

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create a `.env` file (copy from `.env.example`) with your Airtable Personal Access Token:

   ```
   AIRTABLE_API_KEY=pat...
   ```

3. Start the dev server:

   ```bash
   npm run dev
   ```

   Open the printed URL (default http://localhost:5173).

## How auth works

The Airtable token is **never** bundled into the client. The Vite dev server
exposes a proxy at `/api/airtable/*` (see `vite.config.js`) that forwards
requests to `https://api.airtable.com/v0/*` and injects the
`Authorization: Bearer <token>` header server-side. This also avoids browser
CORS issues.

> Because the proxy only runs during `vite dev`/`vite preview`, this app is
> meant to be run locally by operators. A static production build would need an
> equivalent proxy/serverless function to attach the token.

## Structure

```
src/
├── main.jsx                 # Router setup (/ and /prospects)
├── pages/
│   ├── HomePage.jsx         # Section cards (Client Dashboard + placeholders)
│   └── ProspectsPage.jsx    # KPIs, filter pills, search, table
├── components/
│   ├── ProspectsTable.jsx   # Table, rows, and all cell renderers
│   ├── Badge.jsx / Avatar.jsx
│   └── states.jsx           # Error / Empty / Skeleton states
├── hooks/
│   └── useDashboardData.js  # Fetch + loading/error/refresh state
└── lib/
    ├── config.js            # Base ID, table IDs, field IDs, choices
    ├── airtable.js          # Pagination + payment join logic
    ├── colors.js            # Airtable color token → hex (dynamic badges)
    └── format.js            # Currency / initials formatting
```

## Data notes

- Records are requested with `returnFieldsByFieldId=true`, so field renames in
  Airtable don't break the app.
- Both tables are paginated fully (via Airtable's `offset`) and fetched in
  parallel before rendering.
- Payments are joined to prospects **client-side** on the Prospect ID text
  (the Paiements link field returns the prospect's primary value, e.g.
  `TUNHS26`).
- Filtering and search are entirely client-side (no refetch).
- Badge colors and the Prospect Situation filter list are **fully dynamic**:
  on each load the app reads the base schema (`/meta/bases/{id}/tables`) and
  derives option colors (via Airtable color tokens → `colors.js`) and filter
  choices. Renaming/adding options in Airtable is reflected on the next Refresh
  with no code change. Requires the PAT scope `schema.bases:read`; if missing,
  the app falls back to a static situation list with neutral badge colors.
- Data is loaded manually only (on Refresh), never automatically on mount.
