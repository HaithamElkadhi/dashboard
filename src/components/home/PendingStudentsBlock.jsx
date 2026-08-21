import { Link } from 'react-router-dom';
import { UsersIcon } from '../icons.jsx';

export default function PendingStudentsBlock({ items, loading }) {
  return (
    <section className="flex h-full min-h-[220px] flex-col overflow-hidden rounded-2xl border border-border bg-surface">
      <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-canvas text-text-muted">
            <UsersIcon size={16} />
          </span>
          <h2 className="text-sm font-semibold text-text-strong">Pending Student</h2>
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
            Aucun étudiant en attente
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {items.map((p) => {
              const n = Number(p.nbrApplications) || 0;
              return (
                <li key={p.id}>
                  <Link
                    to="/prospects"
                    className="flex items-center gap-3 px-4 py-2.5 text-sm transition hover:bg-canvas"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-text-strong">
                        {p.fullName || 'Sans nom'}
                      </p>
                      {(p.situations || []).length > 0 && (
                        <p className="mt-0.5 truncate text-xs text-text-muted">
                          {(p.situations || []).join(', ')}
                        </p>
                      )}
                    </div>
                    <span className="shrink-0 text-xs font-semibold tabular-nums text-text-muted">
                      {n} app{n > 1 ? 's' : ''}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
