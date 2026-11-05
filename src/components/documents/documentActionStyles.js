const base = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy/50 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40';
export const documentActions = {
  open: `${base} border-blue-200 bg-blue-50 text-blue-800 hover:bg-blue-100`,
  download: `${base} border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100`,
  email: `${base} border-violet-200 bg-violet-50 text-violet-800 hover:bg-violet-100`,
  remove: `${base} border-red-200 bg-red-50 text-red-700 hover:bg-red-100`,
  confirmRemove: `${base} border-red-700 bg-red-700 text-white hover:bg-red-800`,
};
