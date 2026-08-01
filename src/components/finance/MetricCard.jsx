export default function MetricCard({ label, value, hint }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-3 sm:p-4">
      <p className="text-[11px] font-medium uppercase tracking-wide text-text-muted sm:text-xs">
        {label}
      </p>
      <p className="mt-1.5 text-xl font-semibold tabular-nums text-text-strong sm:text-2xl">
        {value}
      </p>
      {hint && <p className="mt-0.5 text-xs text-text-muted">{hint}</p>}
    </div>
  );
}
