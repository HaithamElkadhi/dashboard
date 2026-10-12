export const inputClass = 'w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-text-strong outline-none focus:border-brand focus:ring-2 focus:ring-brand/15 disabled:opacity-50';
const buttonBase = 'inline-flex min-h-11 items-center justify-center rounded-lg border px-3 py-2 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50';
export const buttonClass = `${buttonBase} border-border bg-surface text-text-strong hover:bg-canvas`;
export const primaryClass = `${buttonBase} border-brand bg-brand text-white hover:bg-brand/90`;
export const actionClasses = {
  whatsapp: `${buttonBase} border-emerald-700 bg-emerald-700 text-white hover:bg-emerald-800`,
  activity: `${buttonBase} border-brand bg-brand text-white hover:bg-brand/90`,
  edit: `${buttonBase} border-amber-200 bg-amber-100 text-amber-900 hover:bg-amber-200`,
  delete: `${buttonBase} border-red-200 bg-red-100 text-red-800 hover:bg-red-200`,
  import: `${buttonBase} border-sky-200 bg-sky-100 text-sky-900 hover:bg-sky-200`,
};
export function Field({ label, children }) { return <label className="block space-y-1.5"><span className="text-sm font-medium text-text-strong">{label}</span>{children}</label>; }
export function ErrorMessage({ children }) { return children ? <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{children}</p> : null; }
export async function prospectionApi(body, signal) {
  const response = await fetch('/api/prospection', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'Impossible d’enregistrer.');
  return result;
}
