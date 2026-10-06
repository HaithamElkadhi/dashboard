# Last contact activity

Students merges manual contact history and situation logs with ticket creation, appointment booking and confirmed platform emails. Open tickets have a count badge. Appointment events use the booking record creation date, show the appointment date separately and display current cancellation/status information. No cancellation timestamp is invented.

The authenticated read-only `/api/contact-activity` loads ticket, booking, document-email and Platform Email History sources. Events prefer linked student IDs; unlinked events use an exact unique email match. Names alone never match. Provider IDs deduplicate email events. Partial source failures produce a visible warning rather than invented empty activity.

Last contact dates are calculated in the app, using Tunis dates, without overwriting Airtable's manual contact history or manual last-contact date. Existing ticket open status never moves its creation date forward. Refresh reloads the source events.

Platform Email History (`tblh1SfFHOgW7gLPK`) records future confirmed `/api/send-email` sends. Existing document email history is included only when Result is Sent. Earlier general emails have no saved history and cannot be backfilled reliably. An email history failure preserves the successful send result with a warning; it never retries sending the email.

Tests: `node --test tests/contact-activity.test.mjs`. Read-only verification does not send emails or create student events.
