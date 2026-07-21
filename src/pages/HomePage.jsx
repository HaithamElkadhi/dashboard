import { Link } from 'react-router-dom';

function SectionCard({ to, icon, title, description, disabled }) {
  const inner = (
    <div
      className={`group flex items-center gap-4 rounded-2xl border border-border bg-surface p-5 transition ${
        disabled
          ? 'cursor-not-allowed opacity-55'
          : 'hover:border-border-strong hover:shadow-[0_8px_30px_rgba(0,0,0,0.06)]'
      }`}
    >
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-canvas text-2xl">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h3 className="text-base font-semibold text-text-strong">{title}</h3>
          {disabled && (
            <span className="rounded-full bg-canvas px-2 py-0.5 text-[11px] font-medium text-text-muted">
              Bientôt
            </span>
          )}
        </div>
        <p className="mt-0.5 text-sm text-text-muted">{description}</p>
      </div>
      {!disabled && (
        <span className="text-xl text-text-muted transition group-hover:translate-x-0.5 group-hover:text-text-strong">
          →
        </span>
      )}
    </div>
  );

  if (disabled) return inner;
  return (
    <Link to={to} className="block">
      {inner}
    </Link>
  );
}

export default function HomePage() {
  return (
    <div className="min-h-full">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand text-sm font-bold text-white">
              J
            </span>
            <h1 className="text-lg font-semibold text-text-strong">
              JEExpert Dashboard
            </h1>
          </div>
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 shadow-[0_0_0_3px_rgba(16,185,129,0.18)]" />
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-10">
        <p className="mb-4 text-sm font-medium uppercase tracking-wide text-text-muted">
          Sections
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <SectionCard
            to="/prospects"
            icon="📋"
            title="Client Dashboard"
            description="View and manage all prospects"
          />
          <SectionCard
            disabled
            icon="💶"
            title="Finance"
            description="Suivi des paiements et revenus"
          />
          <SectionCard
            disabled
            icon="🛂"
            title="Visa Pipeline"
            description="Suivi des demandes de visa"
          />
          <SectionCard
            disabled
            icon="🎓"
            title="Scholarship"
            description="Suivi des bourses d'études"
          />
        </div>
      </main>
    </div>
  );
}
