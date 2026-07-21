export function ErrorState({ message, onRetry }) {
  return (
    <div className="mx-4 my-4 flex items-start justify-between gap-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 text-red-500">⚠</span>
        <div>
          <p className="text-sm font-semibold text-red-800">
            Erreur de chargement des données
          </p>
          <p className="mt-0.5 text-sm text-red-600">{message}</p>
        </div>
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="shrink-0 rounded-lg border border-red-300 bg-white px-3 py-1.5 text-sm font-medium text-red-700 transition hover:bg-red-100"
        >
          Réessayer
        </button>
      )}
    </div>
  );
}

export function EmptyState({ message = 'Aucun client trouvé' }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
      <span className="text-3xl">🔍</span>
      <p className="text-sm font-medium text-text-muted">{message}</p>
    </div>
  );
}

export function SkeletonRows({ rows = 8, cols = 9 }) {
  return Array.from({ length: rows }).map((_, r) => (
    <tr key={r} className="border-b border-border">
      {Array.from({ length: cols }).map((_, c) => (
        <td key={c} className="px-4 py-3">
          <div
            className="skeleton h-4 rounded"
            style={{ width: c === 0 ? '11rem' : `${4 + ((r + c) % 3) * 2}rem` }}
          />
        </td>
      ))}
    </tr>
  ));
}
