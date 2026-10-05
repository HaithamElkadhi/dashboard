import { useState } from 'react';
import Modal from '../Modal.jsx';
import { updateWhatsappNumber } from '../../lib/airtable.js';
import { WhatsAppIcon } from '../icons.jsx';
import { useAuth } from '../../contexts/AuthContext.jsx';

// Before opening WhatsApp: show the number that will be used, let the operator
// correct it (and optionally save it on the prospect), then open wa.me.

// wa.me wants digits only, with the country code: "+216 90 704 420" and
// "0021690704420" both become "21690704420".
export function toWaDigits(value) {
  const digits = String(value || '').replace(/\D/g, '');
  return digits.startsWith('00') ? digits.slice(2) : digits;
}

function defaultNumber(p) {
  if (p.whatsappNumber) return p.whatsappNumber;
  if (p.phone) return p.phone;
  const fromLink = String(p.whatsappLink || '').match(/wa\.me\/(\d+)/);
  return fromLink ? `+${fromLink[1]}` : '';
}

export default function WhatsAppModal({ prospect, onClose, onSaved }) {
  const { readOnly } = useAuth();
  const initial = defaultNumber(prospect);
  const [number, setNumber] = useState(initial);
  const [save, setSave] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const digits = toWaDigits(number);
  const valid = digits.length >= 8 && digits.length <= 15;
  const changed = number.trim() !== String(prospect.whatsappNumber || '').trim();

  const handleContinue = async (e) => {
    e.preventDefault();
    if (!valid) {
      setError('Numéro invalide : mets l’indicatif du pays (ex. +216 90 704 420).');
      return;
    }
    // Open first (inside the click) so the browser doesn't block the tab.
    window.open(`https://wa.me/${digits}`, '_blank', 'noopener,noreferrer');
    if (!readOnly && save && changed) {
      setBusy(true);
      try {
        const saved = await updateWhatsappNumber(prospect.id, number);
        onSaved?.(prospect.id, { whatsappNumber: saved });
      } catch (err) {
        setError(err.message || "Le numéro n'a pas pu être enregistré.");
        setBusy(false);
        return;
      }
    }
    onClose();
  };

  if (readOnly) return (
    <Modal title={`WhatsApp — ${prospect.fullName || 'Student'}`} subtitle="Open the student’s WhatsApp conversation." onClose={onClose} size="sm">
      <p className="text-sm text-text-muted">WhatsApp number</p>
      <p className="mt-2 text-base tabular-nums text-text-strong">{initial || 'No number available'}</p>
      {!valid && <p role="alert" className="mt-3 text-sm text-red-600">A valid phone number with country code is required.</p>}
      <div className="mt-5 flex justify-end gap-2">
        <button type="button" onClick={onClose} className="rounded-lg border border-border px-3.5 py-2 text-sm text-text-strong">Cancel</button>
        {valid && <a href={`https://wa.me/${digits}`} target="_blank" rel="noopener noreferrer" onClick={onClose} className="inline-flex items-center gap-1.5 rounded-lg bg-[#25D366] px-3.5 py-2 text-sm font-semibold text-white"><WhatsAppIcon size={15} />Open WhatsApp</a>}
      </div>
    </Modal>
  );

  return (
    <Modal
      title={`WhatsApp — ${prospect.fullName || 'Prospect'}`}
      subtitle="Vérifie le numéro avant d’ouvrir la conversation."
      onClose={onClose}
      size="sm"
      footer={
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-border px-3.5 py-2 text-sm font-medium text-text-strong"
          >
            Annuler
          </button>
          <button data-write=""
            type="submit"
            form="whatsapp-form"
            disabled={busy || !valid}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#25D366] px-3.5 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
          >
            <WhatsAppIcon size={15} />
            Continuer
          </button>
        </div>
      }
    >
      <form id="whatsapp-form" onSubmit={handleContinue} className="space-y-3">
        <label className="block space-y-1.5">
          <span className="text-xs font-medium text-text-muted">Numéro WhatsApp</span>
          <input
            type="tel"
            value={number}
            onChange={(e) => {
              setNumber(e.target.value);
              setError('');
            }}
            placeholder="+216 90 704 420"
            autoFocus
            className="h-11 w-full rounded-xl border border-border bg-surface px-3 text-base tabular-nums text-text-strong outline-none focus:border-border-strong"
          />
        </label>
        <p className={`text-xs tabular-nums ${valid ? 'text-text-muted' : 'text-red-600'}`}>
          {digits ? `Ouvrira wa.me/${digits}` : 'Aucun numéro'}
          {digits && !valid ? ' — numéro trop court ou trop long' : ''}
        </p>
        {changed && valid && (
          <label className="flex items-center gap-2 text-sm text-text-strong">
            <input type="checkbox" checked={save} onChange={(e) => setSave(e.target.checked)} className="h-4 w-4" />
            Enregistrer ce numéro comme « WhatsApp Number » du prospect
          </label>
        )}
        {error && <p className="text-sm text-red-600">{error}</p>}
      </form>
    </Modal>
  );
}
