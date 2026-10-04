# Student document workspace

Every Students row/card links to `/students/:studentId/documents` in a new browser tab, across all pipeline views. The route requires the existing authenticated session. The Students navigation remains active.

## Airtable storage

Original data remains in `Documents` (`tbl4qg0oCDDMm6nfc`) and `Bourse-Documents` (`tbl7qGYTAKarKrGNn`). The API resolves inverse links from the Prospects record and confirms source records link back to that student. Linked-record formula values represent names, so filtering those formulas by record ID is intentionally avoided.

- `Document Reviews` (`tblBEikU5IsBAwzZL`) stores per-file review state, requirement, internal note, correction reason, responsible account ID/name, deadline, server timestamp and uploaded versions. Requested checklist items also live here.
- `Document Activity` (`tblRmPz47Tclxz3od`) stores the student ID, document key, action, authenticated actor, timestamp, changes, result, and email message/provider reference.
- Both source tables now have Assigned User ID, Assigned User Name, Review Deadline and Review Note fields. Their existing folder statuses are preserved.

New audit tables are not added to the generic proxy allowlist. Writes use `/api/student-documents`, verify the authenticated session and request origin, and resolve the requested file against the student's current sources/reviews. Platform assignees must be active accounts.

## User workflow

Academic and Scholarship tabs show folders, attachments and requested pieces. History shows document actions and emails. Search and review-status filters narrow the list. Selecting several documents prepares one personalised email about that selection.

Review opens a PDF/image preview, files and previous versions, review status, requirement, internal note, correction reason, responsible user and due date. PDF.js is loaded separately only when a PDF is opened. Other formats can be opened/downloaded. Missing files cannot be marked Received, Under review or Validated. Needs correction requires an explanation. Optional and Not applicable items can be managed separately. Folder status is explicitly managed independently of per-file validation.

Upload accepts PDF, PNG, JPG, WEBP and Word files up to 3 MiB. This limit keeps the base64 request within Vercel's request payload limit. New versions are appended to the review attachment field through Airtable's upload API; original source attachments and previous versions remain. The current review returns to Received.

Request document creates a personalised checklist item; it does not send an email automatically. Add only the pieces actually required for that student's situation. The supplied names are suggestions, not a universal or automatically verified requirements list.

Email student supplies editable received, validated, missing/extra-document and correction templates. Document selection and deadline regenerate the default text; customise it afterwards. The recipient, subject and message are shown in a mandatory preview before Send email. Internal notes and source files are not attached. Existing `RESEND_API_KEY` and `RESEND_FROM_CONTACT`/`RESEND_FROM` configuration is reused. No email is sent by loading, reviewing or requesting a document.

## Reliability and limits

Audit preparation must succeed before a review/folder/upload mutation. Applied confirms the action; Pending indicates an unknown/partially completed result. Confirmed writes with an audit-finalization failure return a visible warning. Airtable tables do not provide a cross-table transaction. A failed upload may leave a review placeholder, and a file accepted before a final update failure can appear after refresh. Refresh before retrying an unknown result to avoid adding a duplicate version.

Existing review rows use their Updated At value to detect stale edits. This is optimistic checking, not an atomic distributed lock; simultaneous first reviews can still create duplicate rows. Direct edits in Airtable are not automatically added to app history, and historical actions are not reconstructed.

Emails have a persistent client request UUID and a Resend idempotency key. Replaying a confirmed send returns its result, and retries with changed content are rejected. Unknown sends older than 23 hours must be checked with the provider before a new send is started. Sent means accepted by Resend, not proof of delivery. Delivery tracking and automatic reminders are not part of this module.

All authenticated collaborators can manage documents, matching the current platform access model. No public student upload portal is created. Sensitive source files are opened only through authenticated app navigation; Airtable attachment URLs remain temporary bearer URLs and should not be shared casually.

## Verification

`node --test tests/*.test.mjs` covers student scoping, source aggregation, review validation, active-user assignment, stale edits, folder updates, version upload, size/type limits, audit preparation/failure, email escaping and idempotency. Provider/API write tests use mocks rather than emailing students or altering their real files.

Run `npm run build` for the frontend and verify both desktop and mobile layouts. The Vite middleware maps the same API handler used by Vercel.
