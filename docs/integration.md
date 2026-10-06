# Student integration

Operations → Integration uses a compact step list and one detail form at a time. On mobile, select the step from a dropdown. Change student and Refresh warn before discarding edits.

- Welcome package: Not sent / Sent; sending date and comment.
- Codice fiscale: Not started / Booked / Received; comment.
- Immatricolazione: Not started / Done; comment.
- Kit permesso: Not prepared / Prepared; comment.
- ISEE / ISEEU: comment only.
- Revolut: Not offered / Link sent / Completed; referral link, sending date and comment.
- Housing: Student dorm / Rent Contract / Family House / Friend House / BnB; comment.

Health insurance is removed from the app. Legacy Airtable rows are retained. The five status workflows are counted separately from ISEE and Housing.

Student Integration table: tblYAnZhQQWOHmML5. Workflow Status: fldFduxqxZ0tJ63dt. Housing Type: fld8aNjtuSurNhMw0. Existing generic fields remain for legacy data, but the app only writes each step's permitted fields. Legacy Done maps to its equivalent completed status.

Admin and Editor can save; View can read and open Revolut links. The server validates per-step fields and statuses, verifies student links, rejects duplicate rows and stale snapshots, and stamps actor/time/history. GET creates no records. The stale check is not an atomic transaction across Vercel instances.

Run node --test tests/integration.test.mjs. Tests use mocked Airtable.

Housing also supports Searching (amber chip). Confirmed accommodation types display a green chip and checkmark, as do completed workflows. Housing Option (fldZxHTA6ZKDj5eDa) stores the expanded dropdown; existing Housing Type values remain readable as a fallback. Housing stays outside the five-workflow completion count.
