import { useEffect, useRef, useState } from 'react';
import { ChevronDownIcon } from '../icons.jsx';

// Multi-choice situation filter for the "Tous" tab: combine situations
// (e.g. Prospect + Candidate). options: [{ id, label, count, color }].
export default function SituationFilter({ options, value, onChange }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const toggle = (id) => onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id]);
  const label =
    value.length === 0
      ? 'Toutes'
      : value.length === 1
        ? options.find((o) => o.id === value[0])?.label || value[0]
        : `${value.length} sélectionnées`;

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className={`inline-flex items-center gap-2 rounded-xl border bg-surface py-2 pl-3 pr-2 text-sm transition ${
          value.length ? 'border-brand' : 'border-border hover:border-border-strong'
        }`}
      >
        <span className="text-text-muted">Situation</span>
        <span className="font-medium text-text-strong">{label}</span>
        <ChevronDownIcon size={14} className="text-text-muted" />
      </button>
      {open && (
        <div className="absolute left-0 z-30 mt-1.5 w-56 rounded-xl border border-border bg-surface p-1.5 shadow-lg">
          {options.map((o) => {
            const checked = value.includes(o.id);
            return (
              <label
                key={o.id}
                className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition hover:bg-canvas"
              >
                <input type="checkbox" checked={checked} onChange={() => toggle(o.id)} className="h-4 w-4" />
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: o.color?.bg || 'currentColor' }}
                />
                <span className="flex-1 text-text-strong">{o.label}</span>
                <span className="text-xs tabular-nums text-text-muted">{o.count}</span>
              </label>
            );
          })}
          {value.length > 0 && (
            <button
              type="button"
              onClick={() => onChange([])}
              className="mt-1 w-full rounded-lg px-2.5 py-1.5 text-left text-xs font-medium text-text-muted transition hover:bg-canvas hover:text-text-strong"
            >
              Tout afficher
            </button>
          )}
        </div>
      )}
    </div>
  );
}
