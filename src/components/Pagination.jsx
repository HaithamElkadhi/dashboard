import { ChevronLeftIcon, ChevronRightIcon } from './icons.jsx';
import { PAGE_SIZE_OPTIONS } from '../hooks/usePagination.js';

function pageNumbers(page, pageCount) {
  if (pageCount <= 7) {
    return Array.from({ length: pageCount }, (_, i) => i + 1);
  }
  const pages = new Set([1, pageCount, page, page - 1, page + 1]);
  if (page <= 3) {
    pages.add(2);
    pages.add(3);
    pages.add(4);
  }
  if (page >= pageCount - 2) {
    pages.add(pageCount - 1);
    pages.add(pageCount - 2);
    pages.add(pageCount - 3);
  }
  return [...pages].filter((p) => p >= 1 && p <= pageCount).sort((a, b) => a - b);
}

export default function Pagination({
  page,
  pageCount,
  total,
  from,
  to,
  onPageChange,
  pageSize,
  onPageSizeChange,
  className = '',
}) {
  if (total === 0) return null;

  const numbers = pageNumbers(page, pageCount);

  return (
    <div
      className={`flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3 ${className}`}
    >
      <p className="text-sm text-text-muted">
        Affichage{' '}
        <span className="font-medium tabular-nums text-text-strong">
          {from}–{to}
        </span>{' '}
        sur <span className="font-medium tabular-nums text-text-strong">{total}</span>
      </p>

      <div className="flex flex-wrap items-center gap-2">
        {onPageSizeChange && (
          <label className="flex items-center gap-1.5 text-sm text-text-muted">
            Par page
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className="rounded-lg border border-border bg-surface px-2 py-1.5 text-sm text-text-strong outline-none transition hover:border-border-strong"
            >
              {PAGE_SIZE_OPTIONS.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
        )}

        <div className="flex items-center gap-1">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
            aria-label="Page précédente"
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border text-text-muted transition hover:border-border-strong hover:text-text-strong disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ChevronLeftIcon size={16} />
          </button>

          {numbers.map((n, i) => {
            const prev = numbers[i - 1];
            const showEllipsis = prev != null && n - prev > 1;
            return (
              <span key={n} className="contents">
                {showEllipsis && (
                  <span className="px-1 text-sm text-text-muted" aria-hidden>
                    …
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => onPageChange(n)}
                  aria-label={`Page ${n}`}
                  aria-current={n === page ? 'page' : undefined}
                  className={`inline-flex h-8 min-w-8 items-center justify-center rounded-lg px-2 text-sm font-medium tabular-nums transition ${
                    n === page
                      ? 'bg-brand text-white'
                      : 'border border-border text-text-strong hover:border-border-strong'
                  }`}
                >
                  {n}
                </button>
              </span>
            );
          })}

          <button
            type="button"
            disabled={page >= pageCount}
            onClick={() => onPageChange(page + 1)}
            aria-label="Page suivante"
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border text-text-muted transition hover:border-border-strong hover:text-text-strong disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ChevronRightIcon size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
