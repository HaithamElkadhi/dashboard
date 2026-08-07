import { useEffect } from 'react';
import { XIcon } from './icons.jsx';

export default function Modal({
  title,
  subtitle,
  onClose,
  children,
  footer,
  size = 'md',
}) {
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  const maxWidth =
    size === 'lg' ? 'max-w-2xl' : size === 'sm' ? 'max-w-md' : 'max-w-xl';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <button
        type="button"
        aria-label="Fermer"
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        className={`relative z-10 flex max-h-[min(90vh,720px)] w-full ${maxWidth} flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl`}
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-border px-5 py-4 sm:px-6">
          <div className="min-w-0">
            <h2
              id="modal-title"
              className="text-lg font-semibold tracking-tight text-text-strong"
            >
              {title}
            </h2>
            {subtitle && (
              <p className="mt-0.5 text-sm text-text-muted">{subtitle}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="shrink-0 rounded-lg p-1.5 text-text-muted transition hover:bg-canvas hover:text-text-strong"
          >
            <XIcon size={16} />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto scroll-thin px-5 py-5 sm:px-6">
          {children}
        </div>
        {footer && (
          <div className="shrink-0 border-t border-border bg-canvas/50 px-5 py-3.5 sm:px-6">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
