import { useEffect, useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import Modal from '../components/Modal.jsx';
import Toast from '../components/Toast.jsx';
import { ErrorState } from '../components/states.jsx';
import InvoiceForm from '../components/finance/documents/InvoiceForm.jsx';
import ReceiptForm from '../components/finance/documents/ReceiptForm.jsx';
import { useFinanceData } from '../hooks/useFinanceData.js';
import { buildInvoicePdf, invoiceFilename } from '../lib/financeDocs/invoicePdf.js';
import { buildReceiptPdf, receiptFilename } from '../lib/financeDocs/receiptPdf.js';
import { buildInvoiceEmailBody, buildReceiptEmailBody } from '../lib/financeDocs/emailBodies.js';
import { invoiceFromPaiement, receiptFromPaiement } from '../lib/financeDocs/fromPaiement.js';
import { ArrowLeftIcon, DownloadIcon, EyeIcon, FileCheckIcon, MailIcon } from '../components/icons.jsx';

const DOC_TYPES = [
  { id: 'invoice', label: 'Facture' },
  { id: 'receipt', label: 'Reçu' },
];

const DEFAULT_CC = 'contact@jeexpert-study.com';

const DOCS = {
  invoice: {
    build: buildInvoicePdf,
    filename: invoiceFilename,
    emailBody: buildInvoiceEmailBody,
    subject: (d) => (d.invoiceNumber ? `Your Invoice ${d.invoiceNumber} – Jeexpert` : 'Your Invoice – Jeexpert'),
    validate: (d) => {
      if (!d.clientName.trim()) return 'Le nom du client est requis.';
      if (d.items.every((it) => !it.description.trim())) return 'Ajoutez au moins une ligne avec une description.';
      if (!Object.values(d.paymentMethods).some(Boolean)) return 'Sélectionnez au moins un moyen de paiement.';
      return '';
    },
  },
  receipt: {
    build: buildReceiptPdf,
    filename: receiptFilename,
    emailBody: buildReceiptEmailBody,
    subject: (d) =>
      d.invoiceId ? `Your Payment Receipt ${d.invoiceId} – Jeexpert` : 'Your Payment Receipt – Jeexpert',
    validate: (d) => (d.clientName.trim() ? '' : 'Le nom du client est requis.'),
  },
};

function tabButtonClass(active) {
  return `rounded-lg px-3 py-1.5 text-sm font-medium transition ${
    active ? 'bg-brand text-white shadow-sm' : 'text-text-muted hover:text-text-strong'
  }`;
}

const secondaryBtn =
  'inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3.5 py-2 text-sm font-medium text-text-strong transition hover:border-border-strong disabled:opacity-60';

export default function FinanceDocumentPage() {
  const { paiementId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const docType = searchParams.get('type') === 'receipt' ? 'receipt' : 'invoice';
  const { paiements, status, error, refresh } = useFinanceData();
  const paiement = useMemo(() => paiements.find((p) => p.id === paiementId), [paiements, paiementId]);

  // Both documents are kept in state so switching Facture ↔ Reçu keeps edits.
  const [forms, setForms] = useState(null);
  useEffect(() => {
    if (paiement && !forms) {
      setForms({ invoice: invoiceFromPaiement(paiement), receipt: receiptFromPaiement(paiement) });
    }
  }, [paiement, forms]);

  const data = forms?.[docType];
  const doc = DOCS[docType];
  const setData = (next) => setForms((prev) => ({ ...prev, [docType]: next }));

  const [previewTab, setPreviewTab] = useState('pdf');
  const [pdfUrl, setPdfUrl] = useState('');
  const [busy, setBusy] = useState('');
  const [toast, setToast] = useState('');
  const [emailOpen, setEmailOpen] = useState(false);
  const [emailForm, setEmailForm] = useState({ to: '', cc: DEFAULT_CC, subject: '' });
  const [sendError, setSendError] = useState('');

  // Live PDF preview, debounced so typing doesn't rebuild on every keystroke.
  useEffect(() => {
    if (!data) return undefined;
    let cancelled = false;
    let url = '';
    const timer = setTimeout(async () => {
      try {
        const pdf = await doc.build(data);
        if (cancelled) return;
        url = URL.createObjectURL(pdf.output('blob'));
        setPdfUrl(url);
      } catch (err) {
        console.error('PDF preview failed:', err);
      }
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(timer);
      if (url) URL.revokeObjectURL(url);
    };
  }, [data, doc]);

  const emailHtml = useMemo(() => (data ? doc.emailBody(data) : ''), [data, doc]);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 4500);
  };

  const guard = () => {
    const problem = doc.validate(data);
    if (problem) window.alert(problem);
    return !problem;
  };

  const handleDownload = async () => {
    if (!guard()) return;
    setBusy('download');
    try {
      const pdf = await doc.build(data);
      pdf.save(doc.filename(data));
    } catch {
      window.alert('Échec de la génération du PDF.');
    } finally {
      setBusy('');
    }
  };

  const openEmail = () => {
    if (!guard()) return;
    setSendError('');
    setEmailForm((prev) => ({ ...prev, to: data.clientEmail, subject: doc.subject(data) }));
    setEmailOpen(true);
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!emailForm.to.trim()) {
      setSendError("L'adresse email du destinataire est requise.");
      return;
    }
    setBusy('send');
    setSendError('');
    try {
      const pdf = await doc.build(data);
      const res = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          toName: data.clientName.trim(),
          toEmail: emailForm.to.trim(),
          cc: emailForm.cc.trim(),
          subject: emailForm.subject.trim(),
          body: emailHtml,
          attachments: [{ filename: doc.filename(data), content: pdf.output('datauristring') }],
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setSendError(json.error || "Échec de l'envoi de l'email.");
        return;
      }
      setEmailOpen(false);
      showToast(`Email envoyé à ${emailForm.to.trim()}`);
    } catch {
      setSendError("Échec de l'envoi de l'email. Réessayez.");
    } finally {
      setBusy('');
    }
  };

  const backLink = (
    <Link
      to="/finance"
      state={{ tab: 'paiements' }}
      className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-text-muted transition hover:text-text-strong"
    >
      <ArrowLeftIcon size={14} />
      Paiements
    </Link>
  );

  if (!paiement) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 sm:py-6">
        {backLink}
        {status === 'error' ? (
          <ErrorState message={error} onRetry={refresh} />
        ) : status === 'loading' || status === 'idle' ? (
          <p className="text-sm text-text-muted">Chargement du paiement…</p>
        ) : (
          <p className="text-sm text-text-muted">Paiement introuvable.</p>
        )}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 sm:py-6">
      {backLink}

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="truncate text-lg font-semibold tracking-tight text-text-strong">
            {paiement.fullName || 'Paiement'}
          </h1>
          <p className="text-sm text-text-muted">{paiement.reference || paiement.id}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex gap-1 rounded-xl border border-border bg-surface p-1">
            {DOC_TYPES.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setSearchParams({ type: t.id }, { replace: true })}
                className={tabButtonClass(docType === t.id)}
              >
                {t.label}
              </button>
            ))}
          </div>
          <button type="button" onClick={handleDownload} disabled={!data || busy === 'download'} className={secondaryBtn}>
            <DownloadIcon size={14} />
            {busy === 'download' ? 'Génération…' : 'Télécharger PDF'}
          </button>
          <button
            type="button"
            onClick={openEmail}
            disabled={!data}
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-3.5 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-60"
          >
            <MailIcon size={14} />
            Envoyer par email
          </button>
        </div>
      </div>

      {data && (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
          <div className="min-w-0">
            {docType === 'invoice' ? (
              <InvoiceForm data={data} onChange={setData} />
            ) : (
              <ReceiptForm data={data} onChange={setData} />
            )}
          </div>

          <div className="min-w-0 lg:sticky lg:top-4 lg:self-start">
            <div className="rounded-2xl border border-border bg-surface p-3">
              <div className="mb-3 flex items-center justify-between gap-2">
                <div className="flex gap-1 rounded-xl border border-border bg-canvas p-1">
                  <button type="button" onClick={() => setPreviewTab('pdf')} className={tabButtonClass(previewTab === 'pdf')}>
                    <span className="inline-flex items-center gap-1.5">
                      <FileCheckIcon size={13} />
                      PDF
                    </span>
                  </button>
                  <button type="button" onClick={() => setPreviewTab('email')} className={tabButtonClass(previewTab === 'email')}>
                    <span className="inline-flex items-center gap-1.5">
                      <EyeIcon size={13} />
                      Email
                    </span>
                  </button>
                </div>
                <p className="truncate text-xs text-text-muted">{doc.filename(data)}</p>
              </div>
              {previewTab === 'pdf' ? (
                pdfUrl ? (
                  <iframe
                    title="Aperçu PDF"
                    src={`${pdfUrl}#view=FitH`}
                    className="h-[75vh] min-h-[480px] w-full rounded-lg border border-border bg-white"
                  />
                ) : (
                  <div className="flex h-[75vh] min-h-[480px] items-center justify-center rounded-lg border border-border text-sm text-text-muted">
                    Génération de l'aperçu…
                  </div>
                )
              ) : (
                <>
                  <div className="mb-2 rounded-lg border border-border bg-canvas px-3 py-2 text-xs text-text-muted">
                    <p>
                      <span className="font-semibold">À :</span> {data.clientName || '—'} &lt;{data.clientEmail || '—'}&gt;
                    </p>
                    <p>
                      <span className="font-semibold">Objet :</span> {doc.subject(data)}
                    </p>
                    <p>
                      <span className="font-semibold">Pièce jointe :</span> {doc.filename(data)}
                    </p>
                  </div>
                  <iframe
                    title="Aperçu email"
                    srcDoc={emailHtml}
                    sandbox="allow-same-origin"
                    className="h-[68vh] min-h-[420px] w-full rounded-lg border border-border bg-white"
                  />
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {emailOpen && (
        <Modal
          title={docType === 'invoice' ? 'Envoyer la facture' : 'Envoyer le reçu'}
          subtitle="Le PDF est joint automatiquement à l'email."
          onClose={() => setEmailOpen(false)}
          footer={
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEmailOpen(false)}
                className="rounded-lg border border-border px-3.5 py-2 text-sm font-medium text-text-strong"
              >
                Annuler
              </button>
              <button
                type="submit"
                form="finance-doc-email"
                disabled={busy === 'send'}
                className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-3.5 py-2 text-sm font-medium text-white disabled:opacity-60"
              >
                <MailIcon size={14} />
                {busy === 'send' ? 'Envoi…' : 'Envoyer'}
              </button>
            </div>
          }
        >
          <form id="finance-doc-email" onSubmit={handleSend} className="space-y-4">
            {[
              { key: 'to', label: 'À', type: 'email' },
              { key: 'cc', label: 'Cc (séparés par des virgules)', type: 'text' },
              { key: 'subject', label: 'Objet', type: 'text' },
            ].map((f) => (
              <label key={f.key} className="block space-y-1.5">
                <span className="text-sm font-medium text-text-strong">{f.label}</span>
                <input
                  type={f.type}
                  value={emailForm[f.key]}
                  onChange={(e) => setEmailForm((prev) => ({ ...prev, [f.key]: e.target.value }))}
                  className="h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm text-text-strong outline-none focus:border-border-strong"
                />
              </label>
            ))}
            <div className="flex items-center gap-2 rounded-lg border border-border bg-canvas px-3 py-2 text-sm text-text-strong">
              <FileCheckIcon size={14} />
              {doc.filename(data)}
            </div>
            {sendError && <p className="text-sm text-red-600">{sendError}</p>}
          </form>
        </Modal>
      )}

      {toast && <Toast message={toast} onClose={() => setToast('')} />}
    </div>
  );
}
