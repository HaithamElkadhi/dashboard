import { Link } from 'react-router-dom';

export default function ComingSoonPage({
  icon: Icon,
  title,
  description = 'Cette section est en cours de préparation.',
}) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 px-6 py-16 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-canvas text-text-muted">
        {Icon && <Icon size={26} />}
      </span>
      <div>
        <h2 className="text-base font-semibold text-text-strong">{title}</h2>
        <p className="mt-1 max-w-sm text-sm text-text-muted">{description}</p>
      </div>
      <span className="mt-1 rounded-full bg-canvas px-3 py-1 text-xs font-medium text-text-muted">
        Bientôt disponible
      </span>
      <Link
        to="/"
        className="mt-3 text-sm font-medium text-brand hover:underline"
      >
        Retour à la vue d’ensemble
      </Link>
    </div>
  );
}
