// Visual chip picker used in TaskForm instead of native <select> elements —
// faster to scan and tap than an OS select, and lets us color-code choices
// (priority, status) the same way the board's filter pills already do.
export default function ChipSelect({ options, value, onChange, colors, labels }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((opt) => {
        const active = value === opt;
        const color = colors?.[opt];
        const style =
          active && color ? { backgroundColor: color.bg, color: color.text } : undefined;
        return (
          <button
            key={opt}
            type="button"
            onClick={() => onChange(opt)}
            style={style}
            className={`rounded-full border px-3 py-1.5 text-sm font-medium transition ${
              active
                ? `border-transparent shadow-sm ${!color ? 'bg-brand text-white' : ''}`
                : 'border-border bg-surface text-text-strong hover:border-border-strong'
            }`}
          >
            {labels?.[opt] || opt}
          </button>
        );
      })}
    </div>
  );
}
