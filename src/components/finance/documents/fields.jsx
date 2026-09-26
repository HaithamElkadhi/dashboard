// Small form primitives shared by the Facture / Reçu editors.

export const inputClass =
  'h-10 w-full rounded-xl border border-border bg-surface px-3 text-sm text-text-strong outline-none transition focus:border-border-strong';

export function Field({ label, children, className = '' }) {
  return (
    <label className={`block space-y-1.5 ${className}`}>
      <span className="text-xs font-medium text-text-muted">{label}</span>
      {children}
    </label>
  );
}

export function Section({ title, children }) {
  return (
    <section className="rounded-2xl border border-border bg-surface p-4 sm:p-5">
      <h3 className="mb-4 text-sm font-semibold text-text-strong">{title}</h3>
      <div className="space-y-4">{children}</div>
    </section>
  );
}
