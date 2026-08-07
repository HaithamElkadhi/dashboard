export default function StatsCard({ label, value, icon: Icon, tone = 'default', hint }) {
  const toneClasses = {
    default: 'bg-canvas text-text-muted',
    brand: 'bg-brand/10 text-brand',
    gold: 'bg-gold/15 text-[#8a5c0f]',
    red: 'bg-red-50 text-red-600',
    green: 'bg-emerald-50 text-emerald-600',
  };

  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-surface px-3.5 py-3">
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
    </div>
  );
}
