# Applications

Open Operations → Application (`/operations/application`). Select a prospect by name or email, review existing applications, then record a new candidature. The existing list scrolls within a bounded panel. Click an application to load its fields into the form and use Save changes; New application returns to creation. Admin and Editor can create and edit; View can search and read only.

The form uses the existing Prospects Applications table (`tblGP4mMaQs1XeVME`) in the data base. Languages and statuses are filtered to recognized values; degree options come from Airtable. Required fields are university, course, language, degree, status, and candidacy date except for Proposal. Answer dates cannot precede the candidacy date.

`Submitted By` (`fldkwYmUtIwKezkty`) is stamped by the authenticated server account on creation and preserved on edits. The client cannot override it. Existing records without an author display “Not recorded”. The student link is set on creation and cannot be reassigned by editing. PATCH verifies ownership and refuses stale snapshots before writing; this check is not an atomic cross-instance transaction. Prospect phase and other fields are not changed.

Potential duplicates match university, course, degree and language, ignoring case and accents. A separate candidature requires explicit confirmation. This is a warning mechanism, not a distributed uniqueness constraint. If a submission cannot be confirmed, refresh the existing applications before retrying.

This records data in Airtable. It does not submit an application to a university portal or send an email.

The authenticated `/api/applications` endpoint works in local Vite and Vercel. It requires the existing `AIRTABLE_API_KEY` with schema-read and record-read/write access to the data base, plus the existing session configuration. Test with `node --test tests/applications.test.mjs`; tests mock Airtable and create no live records.
