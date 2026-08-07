export default function EmptyState({ icon: Icon, title, description, actionLabel, onAction }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2.5 px-4 py-12 text-center">
      {Icon && (
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-canvas text-text-muted">
          <Icon size={20} />
        </span>
      )}
      <p className="text-sm font-semibold text-text-strong">{title}</p>
      {description && (
        <p className="max-w-xs text-sm text-text-muted">{description}</p>
      )}
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="mt-1.5 inline-flex items-center gap-1.5 rounded-lg bg-brand px-3.5 py-2 text-sm font-medium text-white transition hover:opacity-90"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
