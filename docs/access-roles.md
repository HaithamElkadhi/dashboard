# Dashboard roles

The Users table in authentication base `appVHjUwJBU3wGrOW` has a `role` single-select field: **Admin**, **Editor**, **View**.

- Admin: business writes and user management.
- Editor: existing business access, without user management.
- View: read all modules, details, history, documents and public user information; search, filters, navigation and downloads remain available. Can open WhatsApp using the existing number and append a student contact (date and reason). Other creates, updates, deletes, assignments, uploads, ticket comments and emails are blocked.

Admin → Users supports selecting a role when creating an account and changing another account's role. Your own admin access cannot be removed here. The legacy `is_admin` checkbox is synchronized when roles are changed through the app. An explicit `role` always wins; blank roles retain legacy access. Unknown roles cannot write.

Business endpoints enforce write authorization centrally in `requireUser`, including proxy uploads and email sending. Session logout is explicitly permitted. Account permissions are read from Airtable per request, rather than copied into session records. Returning to the browser refreshes the visible role without forcing a logout.

The contact exception uses only `POST /api/student-contact`. The server reads the current student, rejects stale history and extra fields, preserves existing entries and writes only contact history and latest-contact date. Generic proxy writes remain blocked for View. Requests are serialized per student within a function instance; Airtable does not offer atomic compare-and-swap across function instances.

Only the contact form and its submit button carry `data-view-contact`, which exempts them from the UI read-only guard. No other editing surface should use this marker.

The UI disables native editing forms and explicitly marked `data-write` controls. New inline mutations must carry `data-write`; new forms are read-only by default. Dragging task cards is disabled. Read controls and download links must not be placed inside a write-marked container. This UI is additional protection; the API gate remains authoritative.

Existing accounts were migrated: jeexpert → Admin, nada → Editor. No View user was created or existing account downgraded.
