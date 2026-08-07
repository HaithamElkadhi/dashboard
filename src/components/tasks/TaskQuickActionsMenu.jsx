import { useEffect, useRef, useState } from 'react';
import { MoreHorizontalIcon } from '../icons.jsx';

export default function TaskQuickActionsMenu({ done, onToggleDone, onDuplicate, onArchive, onDelete }) {
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

  const item = (label, onClick, danger) => (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
        setOpen(false);
      }}
      className={`block w-full rounded-lg px-2.5 py-1.5 text-left text-sm transition hover:bg-canvas ${
        danger ? 'text-red-600' : 'text-text-strong'
      }`}
    >
      {label}
    </button>
  );

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        className="rounded-lg p-1.5 text-text-muted transition hover:bg-canvas hover:text-text-strong"
        aria-label="Actions rapides"
        title="Actions rapides"
      >
        <MoreHorizontalIcon size={16} />
      </button>
      {open && (
        <div className="absolute right-0 top-full z-20 mt-1 w-44 rounded-xl border border-border bg-surface p-1.5 shadow-lg">
          {item(done ? 'Rouvrir' : 'Marquer terminée', onToggleDone)}
          {item('Dupliquer', onDuplicate)}
          {item('Archiver', onArchive)}
          {item('Supprimer', onDelete, true)}
        </div>
      )}
    </div>
  );
}
