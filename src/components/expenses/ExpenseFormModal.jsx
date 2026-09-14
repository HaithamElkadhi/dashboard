import { useState } from 'react';
import Modal from '../Modal.jsx';
import { ExternalLinkIcon } from '../icons.jsx';
import {
  EXPENSE_CATEGORIES,
  EXPENSE_CURRENCIES,
  EXPENSE_PAYMENT_METHODS,
  EXPENSE_STATUSES,
} from '../../lib/config.js';

const inputClass =
  'w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-text-strong outline-none transition placeholder:text-text-muted focus:border-border-strong';

const inputErrorClass =
  'w-full rounded-xl border border-red-400 bg-surface px-3 py-2.5 text-sm text-text-strong outline-none transition placeholder:text-text-muted focus:border-red-500';

const MAX_INVOICE_BYTES = 5 * 1024 * 1024;

function todayISO() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function emptyForm() {
  return {
    description: '',
    amount: '',
    currency: 'EUR',
    date: todayISO(),
    paidBy: '',
    category: '',
    paymentMethod: '',
    status: 'Paid',
    notes: '',
  };
}

function formFromExpense(expense) {
  return {
    description: expense.description || '',
    amount: expense.amount != null ? String(expense.amount) : '',
    currency: expense.currency || 'EUR',
    date: expense.date || todayISO(),
    paidBy: expense.paidBy || '',
    category: expense.categories?.[0] || '',
    paymentMethod: expense.paymentMethod || '',
    status: expense.status || 'Paid',
    notes: expense.notes || '',
  };
}

function Field({ label, required, error, children }) {
  return (
    <label className="block space-y-1.5">
      <span className="block text-sm font-medium text-text-strong">
        {label}
        {required && <span className="text-red-500"> *</span>}
      </span>
      {children}
      {error && <span className="block text-xs text-red-600">{error}</span>}
    </label>
  );
}

function validate(form, files) {
  const errors = {};
  if (!form.description || !form.description.trim()) {
    errors.description = 'Description is required.';
  }
  const amount = Number(form.amount);
  if (form.amount === '' || form.amount == null) {
    errors.amount = 'Amount is required.';
  } else if (!Number.isFinite(amount) || amount <= 0) {
    errors.amount = 'Amount must be a positive number.';
  }
  if (!form.date) {
    errors.date = 'Date is required.';
  }
  if (form.currency && !EXPENSE_CURRENCIES.includes(form.currency)) {
    errors.currency = 'Invalid currency.';
  }
  if (form.status && !EXPENSE_STATUSES.includes(form.status)) {
    errors.status = 'Invalid status.';
  }
  if (form.category && !EXPENSE_CATEGORIES.includes(form.category)) {
    errors.category = 'Invalid category.';
  }
  if (
    form.paymentMethod &&
    !EXPENSE_PAYMENT_METHODS.includes(form.paymentMethod)
  ) {
    errors.paymentMethod = 'Invalid payment method.';
  }
  const tooBig = files.find((f) => f.size > MAX_INVOICE_BYTES);
  if (tooBig) {
    errors.files = `“${tooBig.name}” is over 5 MB.`;
  }
  return errors;
}

export default function ExpenseFormModal({
  mode,
  expense,
  onClose,
  onSubmit,
}) {
  const [form, setForm] = useState(() =>
    mode === 'edit' && expense ? formFromExpense(expense) : emptyForm()
  );
  const [files, setFiles] = useState([]);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const existingInvoices = mode === 'edit' ? expense?.invoices || [] : [];

  const set = (key) => (e) => {
    const value = e.target.value;
    setForm((f) => ({ ...f, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const handleFilesChange = (e) => {
    const next = Array.from(e.target.files || []);
    setFiles(next);
    if (errors.files) setErrors((prev) => ({ ...prev, files: undefined }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const nextErrors = validate(form, files);
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      return;
    }
    setSaving(true);
    setErrors({});
    try {
      await onSubmit({
        description: form.description.trim(),
        amount: Number(form.amount),
        currency: form.currency || 'EUR',
        date: form.date,
        paidBy: form.paidBy.trim(),
        category: form.category || null,
        paymentMethod: form.paymentMethod || null,
        status: form.status || 'Paid',
        notes: form.notes,
        files,
      });
      onClose();
    } catch {
      // Parent shows the toast; stay on the form so the user can retry.
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title={mode === 'create' ? 'Add expense' : 'Edit expense'}
      subtitle={
        mode === 'edit' ? expense?.description || undefined : undefined
      }
      onClose={onClose}
      size="lg"
      footer={
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-lg border border-border px-3 py-2 text-sm font-medium text-text-muted transition hover:border-border-strong hover:text-text-strong disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="expense-form"
            disabled={saving}
            className="rounded-lg bg-brand px-3 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50"
          >
            {saving ? 'Saving…' : mode === 'create' ? 'Save expense' : 'Save changes'}
          </button>
        </div>
      }
    >
      <form id="expense-form" onSubmit={handleSubmit} className="space-y-4" noValidate>
        <Field label="Description" required error={errors.description}>
          <input
            type="text"
            value={form.description}
            onChange={set('description')}
            className={errors.description ? inputErrorClass : inputClass}
            placeholder="What was this expense for?"
            autoFocus
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-[1fr_8rem]">
          <Field label="Amount" required error={errors.amount}>
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.amount}
              onChange={set('amount')}
              className={errors.amount ? inputErrorClass : inputClass}
              placeholder="0.00"
            />
          </Field>
          <Field label="Currency" error={errors.currency}>
            <select
              value={form.currency}
              onChange={set('currency')}
              className={errors.currency ? inputErrorClass : inputClass}
            >
              {EXPENSE_CURRENCIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Date" required error={errors.date}>
            <input
              type="date"
              value={form.date}
              onChange={set('date')}
              className={errors.date ? inputErrorClass : inputClass}
            />
          </Field>
          <Field label="Paid by">
            <input
              type="text"
              value={form.paidBy}
              onChange={set('paidBy')}
              className={inputClass}
              placeholder="Who paid?"
            />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Category" error={errors.category}>
            <select
              value={form.category}
              onChange={set('category')}
              className={errors.category ? inputErrorClass : inputClass}
            >
              <option value="">—</option>
              {EXPENSE_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Payment method" error={errors.paymentMethod}>
            <select
              value={form.paymentMethod}
              onChange={set('paymentMethod')}
              className={errors.paymentMethod ? inputErrorClass : inputClass}
            >
              <option value="">—</option>
              {EXPENSE_PAYMENT_METHODS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <Field label="Status" error={errors.status}>
          <select
            value={form.status}
            onChange={set('status')}
            className={errors.status ? inputErrorClass : inputClass}
          >
            {EXPENSE_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Notes">
          <textarea
            value={form.notes}
            onChange={set('notes')}
            rows={3}
            className={inputClass}
            placeholder="Optional notes"
          />
        </Field>

        <div className="space-y-2">
          <span className="block text-sm font-medium text-text-strong">
            Invoice / Bill
          </span>
          {existingInvoices.length > 0 && (
            <ul className="space-y-1.5 rounded-xl border border-border bg-canvas px-3 py-2.5">
              {existingInvoices.map((att) => (
                <li key={att.id || att.url}>
                  <a
                    href={att.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm text-brand hover:underline"
                  >
                    {att.filename || 'Invoice'}
                    <ExternalLinkIcon size={12} />
                  </a>
                </li>
              ))}
            </ul>
          )}
          <input
            type="file"
            multiple
            accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx,image/*,application/pdf"
            onChange={handleFilesChange}
            className="block w-full text-sm text-text-muted file:mr-3 file:rounded-lg file:border-0 file:bg-brand file:px-3 file:py-2 file:text-sm file:font-medium file:text-white hover:file:opacity-90"
          />
          {files.length > 0 && (
            <ul className="space-y-1 text-xs text-text-muted">
              {files.map((f) => (
                <li key={`${f.name}-${f.size}`} className="flex items-center justify-between gap-2">
                  <span className="truncate">{f.name}</span>
                  <button
                    type="button"
                    onClick={() =>
                      setFiles((prev) => prev.filter((x) => x !== f))
                    }
                    className="shrink-0 text-text-muted hover:text-red-600"
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}
          <p className="text-xs text-text-muted">
            PDF or image, max 5 MB per file. New files are added to existing ones.
          </p>
          {errors.files && (
            <span className="block text-xs text-red-600">{errors.files}</span>
          )}
        </div>
      </form>
    </Modal>
  );
}
