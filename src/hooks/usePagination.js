import { useEffect, useMemo, useState } from 'react';

export const PAGE_SIZE_OPTIONS = [10, 25, 50];

/**
 * Client-side pagination helper.
 * Resets to page 1 when `resetKey` changes (filters, search, sort, etc.).
 */
export function usePagination(items, { pageSize: initialSize = 25, resetKey } = {}) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialSize);

  useEffect(() => {
    setPage(1);
  }, [resetKey, pageSize]);

  const total = items.length;
  const pageCount = Math.max(1, Math.ceil(total / pageSize) || 1);
  const safePage = Math.min(page, pageCount);

  useEffect(() => {
    if (page !== safePage) setPage(safePage);
  }, [page, safePage]);

  const start = (safePage - 1) * pageSize;
  const pageItems = useMemo(
    () => items.slice(start, start + pageSize),
    [items, start, pageSize]
  );

  return {
    page: safePage,
    setPage,
    pageSize,
    setPageSize,
    pageCount,
    total,
    pageItems,
    from: total === 0 ? 0 : start + 1,
    to: Math.min(start + pageSize, total),
  };
}
