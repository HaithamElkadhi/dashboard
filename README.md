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

The dashboard requires a username and password. Both `npm run dev` and Vercel
use the same server handlers. `/api/auth/login` verifies a scrypt password hash
in Airtable and creates a random session. Only the SHA-256 session-token hash
is stored in Airtable. The browser receives an HttpOnly, SameSite=Lax cookie,
with Secure enabled in production, valid for 12 hours.

`/api/auth/me` restores the authenticated identity. `/api/auth/logout` deletes
the session and expires its cookie. Protected APIs verify the session expiry
and the user's `is_active` flag on each request. Concurrent checks for the same
session share an in-flight lookup; successful checks are not cached afterward.
All active collaborators have the same dashboard data permissions. Accounts
with the `is_admin` checkbox additionally have access to user administration.

The Airtable proxy injects the PAT server-side and allows only the dashboard's
configured bases and tables. The auth base cannot be accessed through the
browser proxy. Mutations, login, logout and email sending require a matching
Origin. Authenticated records are held in mounted React state, not persisted
in localStorage. Logout clears legacy caches and notifies other open tabs.

### Local and Vercel configuration

- Auth base: `appVHjUwJBU3wGrOW`.
- Users table: `tblYzfwb0CBFXOFsz` with `username`, `display_name`,
  `password_hash`, `is_active`.
- Sessions table: `tblJ85bJE0loqwNvU` with `token_hash`, `user`, `expires_at`.
- `AIRTABLE_API_KEY`: existing dashboard PAT. It also needs records read/write
  access to the auth base unless a separate `AIRTABLE_AUTH_TOKEN` is configured.
- `AIRTABLE_AUTH_TOKEN`: optional dedicated auth-base PAT; never prefix with
  `VITE_` or put it in frontend code.
- `APP_ORIGIN`: optional explicit deployment origin, such as
  `https://dashboard.example.com`. Set separately for preview deployments if
  using this variable. Local development accepts `http://localhost:<port>`.

Run `npm run dev` and open the printed localhost URL. Vite routes API calls
through the same authentication handlers used by the Vercel Functions.
`npm run preview` previews the static bundle only; use `npm run dev` or
`vercel dev` for authentication. Set server-side secrets in Vercel before
deploying. No separate server or database service is required.

### Account maintenance

Administrators can open `/admin/users` to list accounts and create an active
collaborator with a username, display name and password (12–256 characters).
The form can generate a random password and requires confirmation. Passwords
are hashed server-side and never returned by the admin API. Standard users
cannot access this API, even by calling it directly or submitting admin flags.

The `is_admin` checkbox must exist in `App Users`. The setup script
`node scripts/setup-admin.mjs` adds it and promotes the existing `jeexpert`
account; this operation requires explicit approval before execution. After
promotion, refresh the page so `/api/auth/me` loads the updated role.
New accounts always start as collaborators. Creating another administrator
requires editing `is_admin` in Airtable with authorized base access.

Account creation checks uniqueness before and after inserting, serializes
same-username attempts in the current Function instance, and rolls back its
own insert if a concurrent duplicate is detected. Airtable itself does not
provide a unique username constraint.

`scripts/create-auth-user.mjs <username> <display-name>` reads the password
from stdin, creates its scrypt hash and inserts an active Airtable user.
It refuses existing usernames. Never put passwords in committed files.
Keep usernames unique and lowercase. Disable a user by clearing `is_active`;
their next protected API request is refused. An administrative password reset
must also remove that user's sessions.

Run `node scripts/cleanup-auth-sessions.mjs` regularly to remove expired
sessions and login-attempt rows. The script only deletes rows whose
`expires_at` is in the past.

Login attempts are persisted in the sessions table (without a user link):
5 per username and 20 per IP within 15 minutes. Airtable has no atomic counter,
so this is a best-effort limit under concurrent requests. Before exposing the
login publicly, configure a Vercel firewall rate-limit rule on
`/api/auth/login`; do not rely on these counters to stop parallel attacks.
Auth requests are paced within each Function instance and retry one Airtable
429 after 30 seconds. Airtable's per-base limits still apply across instances.

### Validation

Run `node --test tests/auth.test.mjs` and `npm run build`. The auth tests cover
password verification, unauthenticated access, session expiry, inactive users,
auth-table isolation, origin checks and persisted login throttling.

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
- Protected data is fetched on mount and can be refreshed manually.
