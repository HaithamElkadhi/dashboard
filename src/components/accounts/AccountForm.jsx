import { useState } from 'react';

const inputClass =
  'w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-text-strong outline-none transition placeholder:text-text-muted focus:border-border-strong';

function emptyForm() {
  return { mailUser: '', label: '', password: '', link: '', delegation: '' };
}

function formFromAccount(account) {
  return {
    mailUser: account.mailUser || '',
    label: account.labels?.[0] || '',
    password: account.password || '',
    link: account.link || '',
    delegation: account.delegation || '',
  };
}

export default function AccountForm({
  onSubmit,
  onCancel,
  account = null,
  labelChoices = [],
  delegationChoices = [],
}) {
  const isEdit = !!account;
  const [form, setForm] = useState(() =>
    isEdit ? formFromAccount(account) : emptyForm()
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const labels =
    form.label && !labelChoices.includes(form.label)
      ? [form.label, ...labelChoices]
      : labelChoices;
  const delegations =
    form.delegation && !delegationChoices.includes(form.delegation)
      ? [form.delegation, ...delegationChoices]
      : delegationChoices;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.mailUser.trim() || !form.label) {
      setError('Email / identifiant et type de compte sont obligatoires.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSubmit({ ...form, mailUser: form.mailUser.trim() });
      if (!isEdit) setForm(emptyForm());
    } catch (err) {
      setError(err.message || 'Échec de l’enregistrement');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-3 rounded-2xl border border-border bg-canvas/40 p-3"
    >
      <p className="text-sm font-semibold text-text-strong">
        {isEdit ? 'Modifier le compte' : 'Assigner un compte'}
      </p>
      <div className="grid gap-2.5 sm:grid-cols-2">
        <input
          className={inputClass}
          value={form.mailUser}
          onChange={set('mailUser')}
          placeholder="Email ou identifiant"
        />
        <select className={inputClass} value={form.label} onChange={set('label')}>
          <option value="">Type de compte…</option>
          {labels.map((l) => (
            <option key={l} value={l}>
              {l}
            </option>
          ))}
        </select>
        <input
          type="password"
          className={inputClass}
          value={form.password}
          onChange={set('password')}
          placeholder="Mot de passe"
          autoComplete="new-password"
        />
        <select className={inputClass} value={form.delegation} onChange={set('delegation')}>
          <option value="">Délégation…</option>
          {delegations.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
        <input
          className={`${inputClass} sm:col-span-2`}
          value={form.link}
          onChange={set('link')}
          placeholder="Lien du portail (optionnel)"
        />
      </div>

      {error && (
        <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-60"
        >
          {saving ? 'Enregistrement…' : isEdit ? 'Enregistrer' : 'Assigner'}
        </button>
        {isEdit && onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={saving}
            className="inline-flex items-center rounded-lg border border-border bg-surface px-4 py-2 text-sm font-medium text-text-strong transition hover:border-border-strong disabled:opacity-60"
          >
            Annuler
          </button>
        )}
      </div>
    </form>
  );
}
