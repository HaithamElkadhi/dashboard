// Small shared form primitives for the Proposal (Italy) tool — plain HTML
// styled to match this tool's card layout, since the dashboard has no
// component library (shadcn/Radix) to lean on.

export function Card({ accent, children }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
      <div className={`h-1 bg-gradient-to-r ${accent}`} />
      {children}
    </div>
  );
}

export function CardHeader({ icon: Icon, iconBg, iconColor, sectionLabel, title, hint }) {
  return (
    <div className="flex items-center gap-4 border-b border-border px-6 py-5 sm:px-8 sm:py-6">
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${iconBg}`}>
        <Icon size={18} className={iconColor} />
      </div>
      <div className="min-w-0 flex-1">
        <p className={`text-[10px] font-bold uppercase tracking-widest ${iconColor}`}>{sectionLabel}</p>
        <h2 className="text-base font-bold text-text-strong">{title}</h2>
      </div>
      {hint && (
        <p className="ml-auto hidden max-w-[200px] text-right text-xs text-text-muted sm:block">{hint}</p>
      )}
    </div>
  );
}

export function SectionTitle({ children }) {
  return <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-text-muted">{children}</p>;
}

export function FieldLabel({ children }) {
  return <label className="block text-xs font-semibold uppercase tracking-wide text-text-muted">{children}</label>;
}

const inputBase =
  'h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm text-text-strong outline-none transition placeholder:text-text-muted focus:border-border-strong';

export function TextInput(props) {
  return <input {...props} className={`${inputBase} ${props.className || ''}`} />;
}

export function TextArea(props) {
  return (
    <textarea
      {...props}
      className={`w-full resize-y rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-text-strong outline-none transition placeholder:text-text-muted focus:border-border-strong ${props.className || ''}`}
    />
  );
}

export function Select({ options, placeholder, ...props }) {
  return (
    <select {...props} className={`${inputBase} ${props.className || ''}`}>
      <option value="">{placeholder || 'Select…'}</option>
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}

export function PillButton({ selected, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg border px-3.5 py-1.5 text-sm font-medium transition ${
        selected
          ? 'border-brand bg-brand text-white shadow-sm'
          : 'border-border text-text-strong hover:border-border-strong hover:bg-canvas'
      }`}
    >
      {children}
    </button>
  );
}
