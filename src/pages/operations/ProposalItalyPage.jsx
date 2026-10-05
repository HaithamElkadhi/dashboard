import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Modal from '../../components/Modal.jsx';
import ProposalHeader from '../../components/operations/proposalItaly/ProposalHeader.jsx';
import StudentInfo from '../../components/operations/proposalItaly/StudentInfo.jsx';
import ClientProfileSection from '../../components/operations/proposalItaly/ClientProfileSection.jsx';
import StudyPreferencesSection from '../../components/operations/proposalItaly/StudyPreferencesSection.jsx';
import FinancialSituationSection from '../../components/operations/proposalItaly/FinancialSituationSection.jsx';
import ServicesSection from '../../components/operations/proposalItaly/ServicesSection.jsx';
import ProspectSearchModal from '../../components/operations/proposalItaly/ProspectSearchModal.jsx';
import { emptyProposalData } from '../../lib/proposalItaly/initialData.js';
import { generateProposalItalyPDF } from '../../lib/proposalItaly/pdf.js';
import { buildProposalEmailBody } from '../../lib/proposalItaly/emailBody.js';
import { fetchProposalFromProspect, saveProposalToAirtable } from '../../lib/airtable.js';
import {
  ArrowLeftIcon,
  CheckCircleIcon,
  DownloadIcon,
  EyeIcon,
  MailIcon,
  SaveIcon,
  SearchIcon,
} from '../../components/icons.jsx';

const FORM_SECTIONS = [
  { id: 'proposal-info', label: 'Proposal Info' },
  { id: 'student-info', label: 'Student Info' },
  { id: 'student-profile', label: 'Student Profile' },
  { id: 'study-preferences', label: 'Study Preferences' },
  { id: 'financial-situation', label: 'Financial Situation' },
  { id: 'services', label: 'Services' },
];

export default function ProposalItalyPage() {
  const [data, setData] = useState(emptyProposalData);
  const [generating, setGenerating] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [emailOpen, setEmailOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState('');
  const [savingAirtable, setSavingAirtable] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [loadingProspect, setLoadingProspect] = useState(false);
  const [loadedProspect, setLoadedProspect] = useState(null); // name shown in the banner
  const [emailForm, setEmailForm] = useState({
    fullName: '',
    email: '',
    cc: 'contact@jeexpert-study.com',
    subject: 'Your Study Proposal – Jeexpert',
  });

  const updateData = (updates) => setData((prev) => ({ ...prev, ...updates }));

  const completionChecks = [
    Boolean(data.proposalDate),
    Boolean(data.studentName && data.email),
    Boolean(data.studentProfile.academicLevel || data.studentProfile.obtainedDiploma.length > 0),
    Boolean(data.studyPreferences.targetDegreeLevel || data.studyPreferences.fieldOfStudyPrimary),
    Boolean(data.studyPreferences.financingPlan || data.studyPreferences.projectBudget),
    Boolean(data.services.selected.length > 0),
  ];
  const completedSections = completionChecks.filter(Boolean).length;

  const handleSaveAirtable = async () => {
    if (!data.studentName?.trim() || !data.email?.trim()) {
      window.alert('Please fill in Student Name and Email first.');
      return;
    }
    setSavingAirtable(true);
    try {
      const result = await saveProposalToAirtable(data);
      setData((prev) => ({ ...prev, prospectRecordId: result.prospectRecordId }));
      window.alert(
        result.created
          ? 'Prospect created in Airtable and proposal saved.'
          : 'Prospect updated in Airtable and proposal saved.'
      );
    } catch (err) {
      window.alert(err.message || 'Failed to save to Airtable.');
    } finally {
      setSavingAirtable(false);
    }
  };

  // Replaces the whole form with the prospect's data from Airtable.
  const handleSelectProspect = async (prospect) => {
    setSearchOpen(false);
    setLoadingProspect(true);
    try {
      const loaded = await fetchProposalFromProspect(prospect.id);
      setData(loaded);
      setLoadedProspect(loaded.studentName || prospect.fullName);
    } catch (err) {
      window.alert(err.message || 'Failed to load the prospect from Airtable.');
    } finally {
      setLoadingProspect(false);
    }
  };

  // Opened from Prospects → Proposal → "View / modify": load that prospect once.
  const [searchParams] = useSearchParams();
  const prospectParam = searchParams.get('prospect');
  const autoLoaded = useRef(false);
  useEffect(() => {
    if (!prospectParam || autoLoaded.current) return;
    autoLoaded.current = true;
    handleSelectProspect({ id: prospectParam, fullName: '' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prospectParam]);

  const handleGeneratePdf = async () => {
    if (!data.studentName || !data.email) {
      window.alert('Please fill in Student Name and Email first.');
      return;
    }
    setGenerating(true);
    try {
      await generateProposalItalyPDF(data);
    } catch {
      window.alert('Error generating PDF. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  const openEmail = () => {
    setSendError('');
    setEmailForm((prev) => ({
      ...prev,
      fullName: data.studentName,
      email: data.email,
    }));
    setEmailOpen(true);
  };

  const handleSendEmail = async (e) => {
    e.preventDefault();
    if (!emailForm.fullName.trim() || !emailForm.email.trim()) {
      setSendError('Full name and email are required.');
      return;
    }
    setSending(true);
    setSendError('');
    try {
      const html = buildProposalEmailBody(data);
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
      const json = await res.json();
      if (!res.ok) {
        setSendError(json.error || 'Failed to send email.');
        return;
      }
      setEmailOpen(false);
      window.alert('Email sent successfully.');
    } catch {
      setSendError('Failed to send email. Please try again.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-5 sm:px-6 sm:py-6">
      <Link
        to="/operations"
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-text-muted transition hover:text-text-strong"
      >
        <ArrowLeftIcon size={14} />
        Operations
      </Link>

      <div className="sticky top-0 z-10 -mx-4 mb-6 border-b border-border bg-canvas/95 px-4 py-4 backdrop-blur sm:-mx-6 sm:px-6">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            disabled={loadingProspect}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3.5 py-2 text-sm font-medium text-text-strong transition hover:border-border-strong disabled:opacity-60"
          >
            <SearchIcon size={14} />
            {loadingProspect ? 'Loading…' : 'Search Prospect'}
          </button>
          <button
            type="button"
            data-write="" onClick={handleSaveAirtable}
            disabled={savingAirtable}
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-3.5 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-60"
          >
            <SaveIcon size={14} />
            {savingAirtable ? 'Saving…' : 'Save to Airtable'}
          </button>
          <button
            type="button"
            onClick={() => setPreviewOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3.5 py-2 text-sm font-medium text-text-strong transition hover:border-border-strong"
          >
            <EyeIcon size={14} />
            Preview
          </button>
          <button data-write=""
            type="button"
             onClick={openEmail}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3.5 py-2 text-sm font-medium text-text-strong transition hover:border-border-strong"
          >
            <MailIcon size={14} />
            Send email
          </button>
          <button
            type="button"
            onClick={handleGeneratePdf}
            disabled={generating}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-4 py-2 text-sm font-medium text-text-strong transition hover:border-border-strong disabled:opacity-60"
          >
            <DownloadIcon size={14} />
            {generating ? 'Generating…' : 'Generate PDF'}
          </button>
        </div>

        {loadedProspect && (
          <p className="mb-3 flex items-center gap-2 rounded-lg border border-indigo-100 bg-indigo-50 px-3 py-2 text-xs text-indigo-700">
            <CheckCircleIcon size={13} />
            Loaded from Airtable: <span className="font-semibold">{loadedProspect}</span>
          </p>
        )}

        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-semibold text-text-strong">Proposal Progress</p>
          <p className="text-xs text-text-muted">
            {completedSections}/{FORM_SECTIONS.length} sections done
          </p>
        </div>
        <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
          {FORM_SECTIONS.map((section, idx) => (
            <a
              key={section.id}
              href={`#${section.id}`}
              className={`flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                completionChecks[idx]
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                  : 'border-border bg-canvas text-text-muted'
              }`}
            >
              {completionChecks[idx] ? <CheckCircleIcon size={12} /> : <span>{idx + 1}</span>}
              {section.label}
            </a>
          ))}
        </div>
      </div>

      <div className="mx-auto max-w-4xl space-y-6">
        <div id="proposal-info">
          <ProposalHeader data={data} onChange={updateData} />
        </div>
        <div id="student-info">
          <StudentInfo data={data} onChange={updateData} />
        </div>
        <div id="student-profile">
          <ClientProfileSection
            data={data.studentProfile}
            onChange={(studentProfile) => updateData({ studentProfile })}
          />
        </div>
        <div id="study-preferences">
          <StudyPreferencesSection
            data={data.studyPreferences}
            onChange={(studyPreferences) => updateData({ studyPreferences })}
          />
        </div>
        <div id="financial-situation">
          <FinancialSituationSection
            data={data.studyPreferences}
            onChange={(studyPreferences) => updateData({ studyPreferences })}
          />
        </div>
        <div id="services">
          <ServicesSection data={data.services} onChange={(services) => updateData({ services })} />
        </div>
      </div>

      {searchOpen && (
        <ProspectSearchModal onSelect={handleSelectProspect} onClose={() => setSearchOpen(false)} />
      )}

      {previewOpen && (
        <Modal
          title="Email preview"
          subtitle="How the email will look to the student."
          onClose={() => setPreviewOpen(false)}
          size="lg"
          footer={
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setPreviewOpen(false)}
                className="rounded-lg border border-border px-3.5 py-2 text-sm font-medium text-text-strong"
              >
                Close
              </button>
              <button data-write=""
                type="button"
                onClick={() => {
                  setPreviewOpen(false);
                  openEmail();
                }}
                className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-3.5 py-2 text-sm font-medium text-white"
              >
                <MailIcon size={14} />
                Send email
              </button>
            </div>
          }
        >
          <div className="mb-3 rounded-lg border border-border bg-canvas px-3 py-2 text-sm">
            <p>
              <span className="font-semibold text-text-muted">To:</span> {data.studentName || '—'} &lt;
              {data.email || '—'}&gt;
            </p>
          </div>
          <iframe
            title="Email preview"
            srcDoc={buildProposalEmailBody(data)}
            className="h-[420px] w-full rounded-lg border border-border"
            sandbox="allow-same-origin"
          />
        </Modal>
      )}

      {emailOpen && (
        <Modal
          title="Send proposal by email"
          subtitle="Includes student info, profile, study preferences and services."
          onClose={() => setEmailOpen(false)}
        >
          <form onSubmit={handleSendEmail} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-text-strong">Full name</label>
              <input
                value={emailForm.fullName}
                onChange={(e) => setEmailForm((prev) => ({ ...prev, fullName: e.target.value }))}
                className="h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm text-text-strong outline-none focus:border-border-strong"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-text-strong">Email</label>
              <input
                type="email"
                value={emailForm.email}
                onChange={(e) => setEmailForm((prev) => ({ ...prev, email: e.target.value }))}
                className="h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm text-text-strong outline-none focus:border-border-strong"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-text-strong">Subject</label>
              <input
                value={emailForm.subject}
                onChange={(e) => setEmailForm((prev) => ({ ...prev, subject: e.target.value }))}
                className="h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm text-text-strong outline-none focus:border-border-strong"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-text-strong">CC</label>
              <input
                type="email"
                value={emailForm.cc}
                onChange={(e) => setEmailForm((prev) => ({ ...prev, cc: e.target.value }))}
                className="h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm text-text-strong outline-none focus:border-border-strong"
              />
            </div>
            {sendError && <p className="text-sm text-red-600">{sendError}</p>}
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEmailOpen(false)}
                disabled={sending}
                className="rounded-lg border border-border px-3.5 py-2 text-sm font-medium text-text-strong disabled:opacity-60"
              >
                Cancel
              </button>
              <button data-write=""
                type="submit"
                disabled={sending}
                className="rounded-lg bg-brand px-3.5 py-2 text-sm font-medium text-white disabled:opacity-60"
              >
                {sending ? 'Sending…' : 'Send'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
