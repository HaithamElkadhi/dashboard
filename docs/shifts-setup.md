# RH / Shift

Shift is an administrator-only planning workspace at `/human-resources/shifts`, beside Candidatures. It shows planned work, not attendance or payroll. The week view is the default; day and month views share the same records.

## Airtable

Base: `appVHjUwJBU3wGrOW`. These tables were created and link to the existing App Users table `tblYzfwb0CBFXOFsz`:

| Table | ID | Data |
| --- | --- | --- |
| RH Shift Rules | tblwm53MMmB2iT3Tn | User, Weekdays (Monday=1), Start Time, End Time, Break Minutes, Mode, Time Zone, Valid From/To, Active, Revision |
| RH Shifts | tbl9ZpRbyyoUroyu8 | User, Start, End, Break Minutes, Mode, Status, Note, Rule, Source Key, Revision |
| RH Absences | tbliEQBQD6eIvoOUp | User, Start, End, Type, Status, Note, Revision |

The server uses AIRTABLE_AUTH_TOKEN (or AIRTABLE_API_KEY fallback), as for App Users. Its access must include read/write records on this base. No employee shifts or absences are seeded.

## Behavior

- Only active users can receive new assignments. Existing records for inactive users stay visible.
- Start/end timestamps are UTC; the UI explicitly selects Africa/Tunis or Europe/Rome. Rules store their local timezone so weekly wall-clock hours survive daylight saving changes.
- Nonexistent or ambiguous DST times are rejected with an actionable error. Night shifts can end on the next day, with a maximum elapsed duration of 24 hours.
- Shift breaks must be nonnegative whole minutes and shorter than elapsed duration. Net planned hours subtract the pause; pause placement is not recorded.
- Absences may be partial-day or multiple days. Enter all-day periods with local midnight boundaries. A shift cannot overlap an active shift or absence for the same user. Adjacent intervals are allowed. Cancel conflicting shifts before adding an absence.
- Rules use inclusive validity end dates. Generation ranges use an exclusive end date, are limited to 62 days and 200 occurrences per operation. Generating is explicit: GET never writes records.
- Previously generated source keys are skipped even when their occurrence was canceled or moved. Editing a rule affects future generation only; it does not silently change existing shifts. Disable a rule to stop future generation.
- Week duplication copies local clock times into the selected timezone, requires Monday dates, retains pauses/mode/notes, and validates all candidate overlaps before writing. Repeating the same copy skips already copied source keys.
- Cancellation retains records. Edits require the current revision; stale changes return 409. Rule deactivation does not cancel already planned occurrences.

## Routing and consistency

`/api/shifts` is handled inside `api/operations.js`, with its own handler in `api/_lib/shifts.js`; local Vite routing and the Vercel rewrite are registered. No extra serverless function is introduced.

Writes are serialized within a function instance, with optimistic revision checks and repeatable source keys. Airtable does not provide a transaction or unique constraint here: simultaneous writes from different function instances may still race. Batch generation preflights conflicts, writes at most ten records per request, and reports confirmed progress on a partial network failure. Refresh and repeat generation to recover existing source keys; manual edits with an unconfirmed response should be refreshed before retrying.

## Validation

Run `node --test tests/shifts.test.mjs tests/vercel-routing.test.mjs` and `npm run build`. Browser checks should use isolated fixtures for mutations so a test never changes a real employee schedule.

## Export PDF par collaborateur

Le bouton de téléchargement ouvre une sélection du collaborateur, des dates de début/fin incluses et du fuseau horaire. La période est limitée à 366 jours; les lectures API sont découpées en tranches de 62 jours, puis dédupliquées par identifiant. Les filtres du planning ne limitent pas le rapport. Les utilisateurs désactivés restent sélectionnables.

Le rapport porte sur le planning, pas sur une présence pointée : il détaille les shifts planifiés, pauses et heures nettes ainsi que les absences et jours non planifiés. Les créneaux annulés sont exclus. Les shifts de nuit sont découpés aux minuits locaux; les pauses sont réparties au prorata quand un créneau est découpé, leur emplacement exact n’étant pas enregistré. Le PDF reprend la marque JEEXPERT avec en-tête, pied de page et pagination.

Tests : `node --test tests/shift-report.test.mjs`.
