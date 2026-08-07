import { CheckCircleIcon, XIcon } from './icons.jsx';

export default function Toast({ message, onClose }) {
  if (!message) return null;
  return (
    <div className="fixed bottom-5 right-5 z-50 flex max-w-sm items-start gap-3 rounded-xl border border-border bg-surface px-4 py-3 shadow-lg">
      <span className="mt-0.5 text-emerald-600">
        <CheckCircleIcon size={16} />
      </span>
      <p className="flex-1 text-sm text-text-strong">{message}</p>
      <button
        type="button"
        onClick={onClose}
        className="text-text-muted hover:text-text-strong"
        aria-label="Fermer"
      >
        <XIcon size={14} />
      </button>
    </div>
  );
}
