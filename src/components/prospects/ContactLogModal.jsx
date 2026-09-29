import { useEffect, useMemo, useState } from 'react';
import Modal from '../Modal.jsx';
import { addContactLog, fetchProspectLogs, parseContactHistory } from '../../lib/airtable.js';
import { SaveIcon } from '../icons.jsx';

// "Dernier contact": add a contact (date + motif) without overwriting —
// each one becomes a new line in "Historique contacts". The timeline below
// mixes those contacts with the situation changes from the Log table.

const inputClass =
  'w-full rounded-xl border border-border bg-surface px-3 text-sm text-text-strong outline-none transition focus:border-border-strong';

const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export function formatContactDate(iso) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return d && m && y ? `${d}/${m}/${y}` : iso;
}

function formatLogDateTime(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return `${d.toLocaleDateString('fr-FR')} ${d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;
}

export default function ContactLogModal({ prospect, onClose, onSaved }) {
  const [date, setDate] = useState(todayISO);
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [logs, setLogs] = useState(null); // null = loading
  const [logsError, setLogsError] = useState('');

  useEffect(() => {
    let cancelled = false;
    fetchProspectLogs(prospect.id)
      .then((l) => !cancelled && setLogs(l))
      .catch((err) => {
        if (cancelled) return;
        setLogs([]);
        setLogsError(err.message || 'Log indisponible');
      });
    return () => {
      cancelled = true;
    };
  }, [prospect.id]);

  // Contacts (date only) + situation changes (date & time), newest first.
  const timeline = useMemo(() => {
    const contacts = parseContactHistory(prospect.contactHistory).map((h, i) => ({
      key: `c${i}`,
      kind: 'contact',
      sort: h.date || '',
      ...h,
    }));
    const changes = (logs || []).map((l) => ({ key: l.id, kind: 'log', sort: l.at, ...l }));
    return [...contacts, ...changes].sort((a, b) => b.sort.localeCompare(a.sort));
  }, [prospect.contactHistory, logs]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const saved = await addContactLog(prospect.id, { date, reason });
      onSaved?.(prospect.id, saved);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to save to Airtable.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title={`Dernier contact — ${prospect.fullName || 'Prospect'}`}
      subtitle="Chaque contact ajoute une ligne à l'historique, rien n'est écrasé."
      onClose={onClose}
      footer={
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-red-600">{error}</p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-border px-3.5 py-2 text-sm font-medium text-text-strong"
            >
              Annuler
            </button>
            <button
              type="submit"
              form="contact-log-form"
              disabled={saving}
              className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-3.5 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-60"
            >
              <SaveIcon size={14} />
              {saving ? 'Enregistrement…' : 'Ajouter le contact'}
            </button>
          </div>
        </div>
      }
    >
      <form id="contact-log-form" onSubmit={handleSubmit} className="space-y-4">
        <label className="block space-y-1.5">
          <span className="text-xs font-medium text-text-muted">Date du contact</span>
          <input
            type="date"
            value={date}
            max={todayISO()}
            onChange={(e) => setDate(e.target.value)}
            required
            className={`${inputClass} h-10`}
          />
        </label>
        <label className="block space-y-1.5">
          <span className="text-xs font-medium text-text-muted">Motif</span>
          <textarea
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Ex. Appel : intéressé par un Master en informatique, rappeler lundi"
            autoFocus
            required
            className={`${inputClass} py-2`}
          />
        </label>
      </form>

      <div className="mt-6">
        <p className="mb-2 flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-text-muted">
          <span>Historique ({timeline.length})</span>
          {logs === null && <span className="font-normal normal-case">Chargement du log…</span>}
        </p>
        {logsError && <p className="mb-2 text-xs text-red-600">Log : {logsError}</p>}
        {timeline.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border px-4 py-6 text-center text-sm text-text-muted">
            {logs === null ? 'Chargement…' : 'Aucun contact enregistré.'}
          </p>
        ) : (
          <ol className="relative space-y-3 border-l border-border pl-4">
            {timeline.map((h, i) => (
              <li key={h.key} className="relative">
                <span
                  className={`absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-surface ${
                    h.kind === 'log' ? 'bg-violet-500' : i === 0 ? 'bg-brand' : 'bg-border-strong'
                  }`}
                />
                {h.kind === 'log' ? (
                  <>
                    <p className="text-xs font-semibold tabular-nums text-text-muted">
                      {formatLogDateTime(h.at)}
                      {h.by && <span className="font-normal"> · par {h.by}</span>}
                    </p>
                    <p className="text-sm text-text-strong">
                      <span className="mr-1">🔄</span>
                      Situation → <span className="font-medium text-violet-700">{h.situation}</span>
                    </p>
                    {h.notes && <p className="whitespace-pre-line text-xs text-text-muted">{h.notes}</p>}
                  </>
                ) : (
                  <>
                    <p className="text-xs font-semibold tabular-nums text-text-muted">
                      {formatContactDate(h.date) || '—'}
                    </p>
                    <p className="whitespace-pre-line text-sm text-text-strong">
                      <span className="mr-1">💬</span>
                      {h.reason}
                    </p>
                  </>
                )}
              </li>
            ))}
          </ol>
        )}
      </div>
    </Modal>
  );
}
