export default function StatsCard({
  label,
  value,
  icon: Icon,
  tone = 'default',
  hint,
  onClick,
  active = false,
}) {
  const toneClasses = {
    default: 'bg-canvas text-text-muted',
    brand: 'bg-brand/10 text-brand',
    gold: 'bg-gold/15 text-[#8a5c0f]',
    red: 'bg-red-50 text-red-600',
    green: 'bg-emerald-50 text-emerald-600',
  };

  const className = `flex w-full items-center gap-3 rounded-xl border px-3.5 py-3 text-left transition ${
    active
      ? 'border-brand bg-brand/5 shadow-sm'
      : 'border-border bg-surface'
  } ${onClick ? 'cursor-pointer hover:border-border-strong' : ''}`;

  const body = (
    <>
      {Icon && (
        <span
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${toneClasses[tone] || toneClasses.default}`}
        >
          <Icon size={16} />
        </span>
      )}
      <div className="min-w-0">
        <p className="truncate text-[11px] font-medium uppercase tracking-wide text-text-muted">
          {label}
        </p>
        <div className="flex items-baseline gap-1.5">
          <p className="text-lg font-semibold tabular-nums text-text-strong">{value}</p>
          {hint && <span className="truncate text-xs text-text-muted">{hint}</span>}
        </div>
      </div>
    </>
  );

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={className}>
        {body}
      </button>
    );
  }

  return <div className={className}>{body}</div>;
}
