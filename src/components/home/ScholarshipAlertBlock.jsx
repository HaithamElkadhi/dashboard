import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { BellIcon, InfoIcon } from '../icons.jsx';
import { formatShortDate } from '../../lib/taskDates.js';

function daysLabel(n) {
  if (n === 0) return "Aujourd'hui";
  if (n === 1) return 'Dans 1 jour';
  return `Dans ${n} jours`;
}

function daysTone(n) {
  if (n <= 3) return 'font-semibold text-red-600';
  if (n <= 7) return 'font-medium text-orange-600';
  return 'text-text-muted';
}

const ALERT_TYPES = [
  {
    type: 'Bourse',
    description:
      'Étudiants sans statut bourse ou “Not Started”, avec une DDL dans les 15 prochains jours.',
  },
];

function AlertInfoButton() {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    function handle(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="rounded-full p-0.5 text-text-muted transition hover:bg-canvas hover:text-text-strong"
        aria-label="Types d’alertes"
        aria-expanded={open}
      >
        <InfoIcon size={15} />
      </button>
      {open && (
        <div className="absolute left-0 top-full z-20 mt-2 w-64 rounded-xl border border-border bg-surface p-3 shadow-lg sm:w-72">
          <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">
            Types d’alertes
          </p>
          <ul className="mt-2 space-y-2.5">
            {ALERT_TYPES.map((a) => (
              <li key={a.type} className="text-sm">
                <span className="inline-flex rounded-md bg-gold/15 px-1.5 py-0.5 text-[11px] font-semibold text-[#8a5c0f]">
                  {a.type}
                </span>
                <p className="mt-1 text-xs leading-snug text-text-muted">{a.description}</p>
              </li>
            ))}
          </ul>
          <p className="mt-3 border-t border-border pt-2 text-[11px] text-text-muted">
            D’autres types d’alertes seront ajoutés ici.
          </p>
        </div>
      )}
    </div>
  );
}

export default function ScholarshipAlertBlock({ items, loading }) {
  return (
    <section className="flex h-full min-h-[220px] flex-col overflow-hidden rounded-2xl border border-border bg-surface">
      <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-canvas text-text-muted">
            <BellIcon size={16} />
          </span>
          <div className="flex items-center gap-1.5">
            <h2 className="text-sm font-semibold text-text-strong">Alerte</h2>
            <AlertInfoButton />
          </div>
        </div>
        {!loading && (
          <span className="text-xs tabular-nums text-text-muted">{items.length}</span>
        )}
      </div>

      <div className="flex-1 overflow-y-auto scroll-thin">
        {loading ? (
          <ul className="space-y-2 p-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <li key={i} className="flex items-center justify-between gap-2 px-1 py-1.5">
                <div className="skeleton h-3.5 w-32 rounded" />
                <div className="skeleton h-3.5 w-10 rounded" />
              </li>
            ))}
          </ul>
        ) : items.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-text-muted">
            Aucune alerte
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {items.map((p) => (
              <li key={p.id}>
                <Link
                  to="/prospects"
                  className="flex items-center gap-3 px-4 py-2.5 text-sm transition hover:bg-canvas"
                >
                  <span className="shrink-0 rounded-md bg-gold/15 px-1.5 py-0.5 text-[11px] font-semibold text-[#8a5c0f]">
                    Bourse
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-text-strong">
                      {p.fullName || 'Sans nom'}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-text-muted">
                      DDL bourse : {formatShortDate(p.scholarshipDDL)}
                    </p>
                  </div>
                  <span className={`shrink-0 text-xs tabular-nums ${daysTone(p.daysLeft)}`}>
                    {daysLabel(p.daysLeft)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
