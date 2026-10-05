# Dashboard roles

The Users table in authentication base `appVHjUwJBU3wGrOW` has a `role` single-select field: **Admin**, **Editor**, **View**.

- Admin: business writes and user management.
- Editor: existing business access, without user management.
- View: read all modules, details, history, documents and public user information; search, filters, navigation and downloads remain available. No creates, updates, deletes, assignments, uploads, comments or emails.

Admin → Users supports selecting a role when creating an account and changing another account's role. Your own admin access cannot be removed here. The legacy `is_admin` checkbox is synchronized when roles are changed through the app. An explicit `role` always wins; blank roles retain legacy access. Unknown roles cannot write.

Business endpoints enforce write authorization centrally in `requireUser`, including proxy uploads and email sending. Session logout is explicitly permitted. Account permissions are read from Airtable per request, rather than copied into session records. Returning to the browser refreshes the visible role without forcing a logout.

The UI disables native editing forms and explicitly marked `data-write` controls. New inline mutations must carry `data-write`; new forms are read-only by default. Dragging task cards is disabled. Read controls and download links must not be placed inside a write-marked container. This UI is additional protection; the API gate remains authoritative.

Existing accounts were migrated: jeexpert → Admin, nada → Editor. No View user was created or existing account downgraded.
