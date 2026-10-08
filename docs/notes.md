# Notes

The Notes menu (`/notes`) centralizes call decisions and follow-up actions. A note has title, content, optional student and call date, Open/In progress/Completed status, action checklist and history. Actions have stable IDs, active platform-user assignment, deadlines and completion flags. Completed notes require all actions done. Filters support text, student, status, my notes (author or assigned action) and overdue unfinished actions.

Airtable Notes table: `tblvPsY4Ie2xUYkFv`. Actions are stored as JSON in one multiline field so changes to note content and checklist are saved together. Invalid action JSON is reported instead of overwritten. Server stamps creator, editor, timestamp and changed-field history. View is consultation only. Updates reject stale snapshots; serialization is within one runtime, not an atomic transaction across Vercel instances.

Save a student-linked note before creating a ticket from an unfinished action. Choose its ticket category and priority. The existing ticket API enforces permissions, valid category/priority and assignment, and writes ticket history. A stable note/action marker recovers an existing ticket if saving the note link fails. Linked actions cannot be removed or have their student changed; mark them done instead. Action completion and ticket status remain separate.

Student-linked notes appear in Last contact with a link back to the note. Only a supplied call date counts as a contact date; edits never move it forward automatically. No note content is copied into manual contact history.

Tests: `node --test tests/notes.test.mjs`. No test sends an email or creates live student records.
