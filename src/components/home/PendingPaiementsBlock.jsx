import { Link } from 'react-router-dom';
import { WalletIcon } from '../icons.jsx';
import { formatEUR, formatMoney, formatTND } from '../../lib/format.js';
import { formatShortDate, todayISO } from '../../lib/taskDates.js';

function dueTone(dueDate, today = todayISO()) {
  if (!dueDate) return 'text-text-muted';
  if (dueDate < today) return 'font-semibold text-red-600';
  if (dueDate === today) return 'font-medium text-orange-600';
  return 'text-text-muted';
}

function sumByCurrency(items, currency) {
  return items.reduce((sum, p) => {
    if ((p.currency || 'EUR') !== currency) return sum;
    return sum + (p.amount || 0);
  }, 0);
}

export default function PendingPaiementsBlock({ items, loading }) {
  const totalEur = sumByCurrency(items, 'EUR');
  const totalTnd = sumByCurrency(items, 'TND');

  return (
    <section className="flex h-full min-h-[220px] flex-col overflow-hidden rounded-2xl border border-border bg-surface">
      <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-canvas text-text-muted">
            <WalletIcon size={16} />
          </span>
          <div className="min-w-0">
            {!loading && (
              <p className="truncate text-[11px] font-semibold tabular-nums text-text-muted">
                {formatEUR(totalEur)}
                <span className="mx-1.5 text-border-strong">·</span>
                {formatTND(totalTnd)}
              </p>
            )}
            <h2 className="text-sm font-semibold text-text-strong">Pending Paiement</h2>
          </div>
        </div>
        {!loading && (
          <span className="shrink-0 text-xs tabular-nums text-text-muted">{items.length}</span>
        )}
      </div>

      <div className="flex-1 overflow-y-auto scroll-thin">
        {loading ? (
          <ul className="space-y-2 p-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <li key={i} className="flex items-center justify-between gap-2 px-1 py-1.5">
                <div className="skeleton h-3.5 w-32 rounded" />
                <div className="skeleton h-3.5 w-14 rounded" />
              </li>
            ))}
          </ul>
        ) : items.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-text-muted">
            Aucun paiement à payer
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {items.map((p) => (
              <li key={p.id}>
                <Link
                  to="/finance"
                  className="flex items-center gap-3 px-4 py-2.5 text-sm transition hover:bg-canvas"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-text-strong">
                      {p.fullName || 'Sans nom'}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-text-muted">
                      {formatMoney(p.amount, p.currency)}
                    </p>
                  </div>
                  <span className={`shrink-0 text-xs tabular-nums ${dueTone(p.dueDate)}`}>
                    {p.dueDate ? formatShortDate(p.dueDate) : 'Sans échéance'}
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
