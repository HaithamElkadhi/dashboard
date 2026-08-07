import { XIcon } from './icons.jsx';

export default function Drawer({ title, subtitle, onClose, children, footer, wide }) {
  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <button
        type="button"
        aria-label="Fermer"
        className="absolute inset-0 bg-black/30"
        onClick={onClose}
      />
      <div
        className={`relative z-10 flex h-full w-full flex-col bg-surface shadow-xl ${
          wide ? 'sm:max-w-xl' : 'sm:max-w-md'
        }`}
      >
        <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
          <div className="min-w-0">
            <h2 className="truncate text-base font-semibold text-text-strong">{title}</h2>
            {subtitle && <p className="truncate text-xs text-text-muted">{subtitle}</p>}
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
        <div className="flex-1 overflow-y-auto scroll-thin px-5 py-4">{children}</div>
        {footer && <div className="border-t border-border px-5 py-3">{footer}</div>}
      </div>
    </div>
  );
}
