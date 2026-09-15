import { useEffect, useRef, useState } from 'react';
import { MailIcon, ChevronDownIcon } from '../icons.jsx';
import { BOOKING_EMAIL_KINDS } from '../../lib/bookings/emailTemplates.js';

export default function BookingEmailButton({ booking, onChoose, disabled }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        disabled={disabled || !booking?.email}
        title={!booking?.email ? 'Email manquant' : 'Envoyer un email'}
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1 text-xs font-medium text-text-strong transition hover:border-border-strong disabled:cursor-not-allowed disabled:opacity-40"
      >
        <MailIcon size={12} />
        Email
        <ChevronDownIcon size={12} />
      </button>

      {open && (
        <div className="absolute right-0 z-30 mt-1 w-56 overflow-hidden rounded-xl border border-border bg-surface shadow-lg">
          <ul className="py-1">
            {BOOKING_EMAIL_KINDS.map((opt) => (
              <li key={opt.id}>
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    onChoose(opt.id);
                  }}
                  className="flex w-full flex-col items-start px-3 py-2 text-left transition hover:bg-canvas"
                >
                  <span className="text-sm font-medium text-text-strong">
                    {opt.label}
                  </span>
                  <span className="text-xs text-text-muted">{opt.description}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
