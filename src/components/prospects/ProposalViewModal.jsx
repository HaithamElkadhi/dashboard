import { useEffect, useMemo, useState } from 'react';
import Modal from '../Modal.jsx';
import ProposalSummary from './ProposalSummary.jsx';
import ProposalHeader from '../operations/proposalItaly/ProposalHeader.jsx';
import StudentInfo from '../operations/proposalItaly/StudentInfo.jsx';
import ClientProfileSection from '../operations/proposalItaly/ClientProfileSection.jsx';
import StudyPreferencesSection from '../operations/proposalItaly/StudyPreferencesSection.jsx';
import FinancialSituationSection from '../operations/proposalItaly/FinancialSituationSection.jsx';
import ServicesSection from '../operations/proposalItaly/ServicesSection.jsx';
import { fetchProposalFromProspect, saveProposalToAirtable } from '../../lib/airtable.js';
import { generateProposalItalyPDF } from '../../lib/proposalItaly/pdf.js';
import { buildProposalEmailBody } from '../../lib/proposalItaly/emailBody.js';
import { ArrowLeftIcon, DownloadIcon, MailIcon, PencilIcon, SaveIcon } from '../icons.jsx';

const DEFAULT_CC = 'contact@jeexpert-study.com';
const DEFAULT_SUBJECT = 'Your Study Proposal – Jeexpert';

const inputClass =
  'h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm text-text-strong outline-none focus:border-border-strong';
const secondaryBtn =
  'inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3.5 py-2 text-sm font-medium text-text-strong transition hover:border-border-strong disabled:opacity-60';
const primaryBtn =
  'inline-flex items-center gap-1.5 rounded-lg bg-brand px-3.5 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-60';

// Proposal — Italy for one prospect, loaded from Airtable. Opens on an
// organised read-only view; "Modify" edits it in place with the Proposal
// page's own form sections and saves back to Airtable; also Download PDF and
// Send by email.
export default function ProposalViewModal({ prospect, onClose, onSaved }) {
  const [data, setData] = useState(null);
  const [draft, setDraft] = useState(null); // copy being edited in 'edit' mode
  const [error, setError] = useState('');
  const [mode, setMode] = useState('view'); // 'view' | 'edit' | 'email'
  const [saveError, setSaveError] = useState('');
  const [busy, setBusy] = useState('');
  const [sendError, setSendError] = useState('');
  const [sent, setSent] = useState('');
  const [emailForm, setEmailForm] = useState({ fullName: '', email: '', cc: DEFAULT_CC, subject: DEFAULT_SUBJECT });

  useEffect(() => {
    let cancelled = false;
    fetchProposalFromProspect(prospect.id)
      .then((loaded) => {
        if (cancelled) return;
        setData(loaded);
        setEmailForm((prev) => ({ ...prev, fullName: loaded.studentName, email: loaded.email }));
      })
      .catch((err) => !cancelled && setError(err.message || 'Failed to load the proposal from Airtable.'));
    return () => {
      cancelled = true;
    };
  }, [prospect.id]);

  const html = useMemo(() => (data ? buildProposalEmailBody(data) : ''), [data]);

  const handleDownload = async () => {
    setBusy('download');
    try {
      await generateProposalItalyPDF(data);
    } catch {
      window.alert('Error generating PDF. Please try again.');
    } finally {
      setBusy('');
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!emailForm.fullName.trim() || !emailForm.email.trim()) {
      setSendError('Full name and email are required.');
      return;
    }
    setBusy('send');
    setSendError('');
    try {
      const res = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          toName: emailForm.fullName.trim(),
          toEmail: emailForm.email.trim(),
          cc: emailForm.cc.trim(),
          subject: emailForm.subject.trim(),
          body: html,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setSendError(json.error || 'Failed to send email.');
        return;
      }
      setSent(emailForm.email.trim());
      setMode('view');
    } catch {
      setSendError('Failed to send email. Please try again.');
    } finally {
      setBusy('');
    }
  };

  const startEdit = () => {
    setDraft(data);
    setSaveError('');
    setSent('');
    setMode('edit');
  };
  const updateDraft = (updates) => setDraft((prev) => ({ ...prev, ...updates }));

  const handleSave = async () => {
    if (!draft.studentName?.trim() || !draft.email?.trim()) {
      setSaveError('Student name and email are required.');
      return;
    }
    setBusy('save');
    setSaveError('');
    try {
      const result = await saveProposalToAirtable(draft);
      const saved = { ...draft, prospectRecordId: result.prospectRecordId };
      setData(saved);
      onSaved?.(result.prospectRecordId);
      setEmailForm((prev) => ({ ...prev, fullName: saved.studentName, email: saved.email }));
      setMode('view');
    } catch (err) {
      setSaveError(err.message || 'Failed to save to Airtable.');
    } finally {
      setBusy('');
    }
  };

  const footer =
    data &&
    (mode === 'view' ? (
      <div className="flex flex-wrap justify-end gap-2">
        <button type="button" onClick={startEdit} className={secondaryBtn}>
          <PencilIcon size={14} />
          Modify
        </button>
        <button type="button" onClick={handleDownload} disabled={busy === 'download'} className={secondaryBtn}>
          <DownloadIcon size={14} />
          {busy === 'download' ? 'Generating…' : 'Download PDF'}
        </button>
        <button
          type="button"
          onClick={() => {
            setSendError('');
            setMode('email');
          }}
          className={primaryBtn}
        >
          <MailIcon size={14} />
          Send via email
        </button>
      </div>
    ) : mode === 'edit' ? (
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-red-600">{saveError}</p>
        <div className="flex gap-2">
          <button type="button" onClick={() => setMode('view')} disabled={busy === 'save'} className={secondaryBtn}>
            Cancel
          </button>
          <button type="button" onClick={handleSave} disabled={busy === 'save'} className={primaryBtn}>
            <SaveIcon size={14} />
            {busy === 'save' ? 'Saving…' : 'Save to Airtable'}
          </button>
        </div>
      </div>
    ) : (
      <div className="flex justify-between gap-2">
        <button type="button" onClick={() => setMode('view')} className={secondaryBtn}>
          <ArrowLeftIcon size={14} />
          Back
        </button>
        <button type="submit" form="proposal-view-email" disabled={busy === 'send'} className={primaryBtn}>
          <MailIcon size={14} />
          {busy === 'send' ? 'Sending…' : 'Send'}
        </button>
      </div>
    ));

  return (
    <Modal
      title={`Proposal — ${prospect.fullName || 'Prospect'}`}
      subtitle={
        mode === 'email'
          ? 'Send the proposal to the student.'
          : mode === 'edit'
            ? 'Edit the proposal, then save it to Airtable.'
            : 'Proposal Italy, loaded from Airtable.'
      }
      onClose={onClose}
      size="xl"
      footer={footer}
    >
      {error && <p className="text-sm text-red-600">{error}</p>}
      {!error && !data && <p className="py-10 text-center text-sm text-text-muted">Loading proposal…</p>}

      {data && mode === 'view' && (
        <>
          {sent && (
            <p className="mb-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              Proposal sent to {sent}.
            </p>
          )}
          <ProposalSummary data={data} />
        </>
      )}

      {draft && mode === 'edit' && (
        <div className="space-y-5">
          <ProposalHeader data={draft} onChange={updateDraft} />
          <StudentInfo data={draft} onChange={updateDraft} />
          <ClientProfileSection
            data={draft.studentProfile}
            onChange={(studentProfile) => updateDraft({ studentProfile })}
          />
          <StudyPreferencesSection
            data={draft.studyPreferences}
            onChange={(studyPreferences) => updateDraft({ studyPreferences })}
          />
          <FinancialSituationSection
            data={draft.studyPreferences}
            onChange={(studyPreferences) => updateDraft({ studyPreferences })}
          />
          <ServicesSection data={draft.services} onChange={(services) => updateDraft({ services })} />
        </div>
      )}

      {data && mode === 'email' && (
        <form id="proposal-view-email" onSubmit={handleSend} className="space-y-4">
          {[
            { key: 'fullName', label: 'Full name', type: 'text' },
            { key: 'email', label: 'Email', type: 'email' },
            { key: 'cc', label: 'Cc (comma-separated)', type: 'text' },
            { key: 'subject', label: 'Subject', type: 'text' },
          ].map((f) => (
            <label key={f.key} className="block space-y-1.5">
              <span className="text-sm font-medium text-text-strong">{f.label}</span>
              <input
                type={f.type}
                value={emailForm[f.key]}
                onChange={(e) => setEmailForm((prev) => ({ ...prev, [f.key]: e.target.value }))}
                className={inputClass}
              />
            </label>
          ))}
          {sendError && <p className="text-sm text-red-600">{sendError}</p>}
        </form>
      )}
    </Modal>
  );
}
