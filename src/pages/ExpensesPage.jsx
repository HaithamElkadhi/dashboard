import { useState } from 'react';
import { useExpensesData } from '../hooks/useExpensesData.js';
import { usePageRefreshRegistration } from '../contexts/PageRefreshContext.jsx';
import { ErrorState } from '../components/states.jsx';
import Toast from '../components/Toast.jsx';
import ExpensesDashboard from '../components/expenses/ExpensesDashboard.jsx';
import ExpensesList from '../components/expenses/ExpensesList.jsx';
import ExpenseFormModal from '../components/expenses/ExpenseFormModal.jsx';
import ExpenseDeleteDialog from '../components/expenses/ExpenseDeleteDialog.jsx';
import { PlusIcon } from '../components/icons.jsx';

const TABS = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'list', label: 'Expenses' },
];

export default function ExpensesPage() {
  const {
    expenses,
    status,
    error,
    lastUpdated,
    refresh,
    create,
    update,
    remove,
  } = useExpensesData();
  usePageRefreshRegistration({
    lastUpdated,
    refresh,
    loading: status === 'loading',
  });

  const [tab, setTab] = useState('dashboard');
  const [toast, setToast] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [editExpense, setEditExpense] = useState(null);
  const [deleteExpense, setDeleteExpense] = useState(null);
  const [formKey, setFormKey] = useState(0);

  const loading = status === 'loading';

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 4500);
  };

  const openNew = () => {
    setFormKey((k) => k + 1);
    setCreateOpen(true);
  };

  const handleCreate = async (payload) => {
    try {
      await create(payload);
      showToast('Expense saved');
      setTab('list');
    } catch (err) {
      showToast('Could not save. Try again.');
      throw err;
    }
  };

  const handleUpdate = async (payload) => {
    try {
      await update(editExpense.id, payload);
      showToast('Expense updated');
    } catch (err) {
      showToast('Could not update. Try again.');
      throw err;
    }
  };

  const handleDelete = async () => {
    try {
      await remove(deleteExpense.id);
      showToast('Expense deleted');
      setDeleteExpense(null);
    } catch {
      showToast('Could not delete. Try again.');
      setDeleteExpense(null);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 sm:py-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1 rounded-xl border border-border bg-surface p-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                tab === t.id
                  ? 'bg-brand text-white shadow-sm'
                  : 'text-text-muted hover:text-text-strong'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={openNew}
          className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-3 py-2 text-sm font-medium text-white transition hover:opacity-90"
        >
          <PlusIcon size={14} />
          Add expense
        </button>
      </div>

      {status === 'error' && (
        <div className="mt-4">
          <ErrorState message={error} onRetry={refresh} />
        </div>
      )}

      <div className="mt-5">
        {tab === 'dashboard' && <ExpensesDashboard expenses={expenses} />}
        {tab === 'list' && (
          <ExpensesList
            expenses={expenses}
            loading={loading && expenses.length === 0}
            onEdit={(e) => setEditExpense(e)}
            onDelete={(e) => setDeleteExpense(e)}
            onRefresh={refresh}
            refreshing={loading}
          />
        )}
      </div>

      {createOpen && (
        <ExpenseFormModal
          key={formKey}
          mode="create"
          onClose={() => setCreateOpen(false)}
          onSubmit={handleCreate}
        />
      )}

      {editExpense && (
        <ExpenseFormModal
          key={editExpense.id}
          mode="edit"
          expense={editExpense}
          onClose={() => setEditExpense(null)}
          onSubmit={handleUpdate}
        />
      )}

      {deleteExpense && (
        <ExpenseDeleteDialog
          expense={deleteExpense}
          onClose={() => setDeleteExpense(null)}
          onConfirm={handleDelete}
        />
      )}

      <Toast message={toast} onClose={() => setToast('')} />
    </div>
  );
}
