# Mailing configuration

Mailing uses the existing Resend account and Airtable business base. It creates no additional Vercel function.

Set `RESEND_API_KEY` and at least one sender: `RESEND_FROM`, `RESEND_FROM_CONTACT`, `RESEND_FROM_ECOLE`. The existing `RESEND_FROM_CONTACT_Ecole` variable is also accepted for École. Addresses must be authorized by Resend. Sender keys are `default`, `contact`, and `ecole`.

Run `node scripts/setup-mailing.mjs` to inspect the schema, then `node scripts/setup-mailing.mjs --apply` to create the templates table and missing fields. Applying changes requires the token scopes `schema.bases:read`, `schema.bases:write`, and access to the business base. The script is idempotent, refuses incompatible fields, and prints the two configuration variables to add locally and on Vercel. Never put the API token in client-side variables.

For manual setup, create `Mailing Templates` in the business base with these fields:

| Field | Airtable type |
| --- | --- |
| Name | Single line text (primary field) |
| Subject | Single line text |
| Body | Long text |
| CC | Long text |
| From Key | Single line text |
| Attachments | Attachment (multiple attachments) |

The JEEXPERT business base has been provisioned with `Mailing Templates` (`tbl3MtMKVAmzwKqcj`) and Attachments (`fldMh2yYS25eewHIM`); these are the application defaults. For a different table, override `MAILING_TEMPLATES_TABLE` with its ID or name and `MAILING_ATTACHMENTS_FIELD` with the `fld...` ID of Attachments. The existing Email History table stores successful sends.

Templates and messages allow up to 10 attachments and 2 MiB total decoded bytes. Attachments are stored in Airtable's attachment field; browser responses expose references without remote URLs. Sending resolves those references on the server using bounded downloads from trusted Airtable hosts. Users can add or remove files before sending without modifying the template. Placeholders `{{fullName}}`, `{{firstName}}`, and `{{email}}` are substituted using the selected student's stored details. Messages are sent as plain text.

If a template upload partially fails, reload the templates and inspect the files before retrying. After an uncertain email send, retry the unchanged message with the same idempotency key. A changed message requires a new key. Delivery acceptance is distinct from inbox delivery; bounce and delivery tracking require a future provider webhook.

## System onboarding email

Choose **Système · Bienvenue / Onboarding JEEXPERT** in Operations → Mailing. This bundled template preserves the supplied onboarding HTML and its contact links. Its design cannot be overwritten from the template library. The student’s first name, surname and email come from the selected Airtable record; the formula comes from Proposal’s selected services. A single pending TND payment prefills its amount and due date. When several pending payments exist, select the intended payment explicitly. Overdue payments are included; paid, exempt and foreign-currency payments are excluded.

Formula, due date and amount remain editable for this email, without modifying the student or payment records. Missing or invalid values block sending. The server reloads the student’s identity, renders the canonical HTML with escaped variables, and embeds the official logo using CID. A plain-text alternative is included. The preview uses a sandboxed iframe; the HTML includes responsive styles for narrow screens.

Add the brochure, student sheet, rules, invoice and platform guide as needed: these files are not generated or attached automatically. The email displays only the fixed five-document checklist; attachment filenames are not inserted into the message. The student portal is https://student.jeexpert.com. The 2 MiB attachment limit includes the embedded logo. No emails are sent automatically when a student or template is selected.
