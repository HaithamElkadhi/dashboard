# Admission document requests

Operations → Admission documents opens `/operations/admission-documents`. Search for a prospect, select applicable documents and click Add. Admin and Editor can add requests; View can read only. Scholarship documents is a coming-soon card for the next phase.

The catalog mirrors `forms/form-jeexpert/src/app/admission-italy/buildDocList.ts`, including language and baccalaureate transcript variants. It includes all degree levels; staff select only those relevant to the prospect. Display names are retained in French to match Forms.

The authenticated `/api/admission-documents` endpoint reads and appends to the Prospects multiline field Documents demandés (`fld01awcmxCsnW1GS`). It preserves existing content, skips identical requested names and writes no other fields. A stale list is refused before writing. The comparison is not an atomic cross-instance transaction. No upload, email or admission dossier creation occurs.

Tests mock Airtable: `node --test tests/admission-documents.test.mjs`.
