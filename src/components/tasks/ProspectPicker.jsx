import { useEffect, useMemo, useRef, useState } from 'react';

export default function ProspectPicker({ people, value, onChange, sources }) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  const selected = value || [];

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const selectedKeys = new Set(selected.map((s) => s.key));
    return people
      .filter((p) => p.fullName && !selectedKeys.has(p.key))
      .filter((p) => !sources || sources.includes(p.source))
      .filter((p) => {
        if (!q) return true;
        return (
          p.fullName.toLowerCase().includes(q) ||
          String(p.badgeId || '').toLowerCase().includes(q)
        );
      })
      .slice(0, 40);
  }, [people, query, selected]);

  useEffect(() => {
    const onDocDown = (e) => {
      if (!rootRef.current?.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDocDown);
    return () => document.removeEventListener('mousedown', onDocDown);
  }, []);

  const add = (person) => {
    if (!person?.key) return;
    if (selected.some((s) => s.key === person.key)) return;
    onChange([...selected, person]);
    setQuery('');
    setOpen(false);
  };

  const remove = (key) => {
    onChange(selected.filter((s) => s.key !== key));
  };

  return (
    <div ref={rootRef} className="space-y-2">
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5 rounded-xl border border-border bg-canvas px-2.5 py-2">
          {selected.map((s) => (
            <span
              key={s.key}
              className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-border bg-surface px-2.5 py-1 text-xs font-medium text-text-strong"
            >
              <span className="truncate">{s.fullName}</span>
              <span
                className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                  s.source === 'Lead'
                    ? 'bg-amber-50 text-amber-800'
                    : 'bg-blue-50 text-blue-700'
                }`}
              >
                {s.source}
              </span>
              <button
                type="button"
                onClick={() => remove(s.key)}
                className="shrink-0 text-text-muted hover:text-text-strong"
                aria-label={`Retirer ${s.fullName}`}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder={
            selected.length
              ? 'Ajouter un autre…'
              : 'Rechercher un prospect ou lead…'
          }
          className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-text-strong outline-none transition placeholder:text-text-muted focus:border-border-strong"
          autoComplete="off"
        />
        {open && (
          <div className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-xl border border-border bg-surface shadow-lg scroll-thin">
            {filtered.length === 0 ? (
              <p className="px-3 py-2.5 text-sm text-text-muted">
                Aucun résultat
              </p>
            ) : (
              filtered.map((p) => (
                <button
                  key={p.key}
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    add(p);
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition hover:bg-canvas"
                >
                  <span className="min-w-0 flex-1 truncate font-medium text-text-strong">
                    {p.fullName}
                  </span>
                  {p.badgeId && (
                    <span className="shrink-0 rounded bg-canvas px-1.5 py-0.5 text-[11px] font-medium text-text-muted">
                      {p.badgeId}
                    </span>
                  )}
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${
                      p.source === 'Prospect'
                        ? 'bg-blue-50 text-blue-700'
                        : 'bg-amber-50 text-amber-800'
                    }`}
                  >
                    {p.source}
                  </span>
                </button>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
