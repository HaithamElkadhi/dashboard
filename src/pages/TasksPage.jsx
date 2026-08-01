import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTasksData } from '../hooks/useTasksData.js';
import { ErrorState } from '../components/states.jsx';
import TaskForm from '../components/tasks/TaskForm.jsx';
import TaskBoard from '../components/tasks/TaskBoard.jsx';
import TaskMetrics from '../components/tasks/TaskMetrics.jsx';

const TABS = [
  { id: 'create', label: 'Create task' },
  { id: 'board', label: 'Task board' },
  { id: 'metrics', label: 'Metrics' },
];

function Toast({ message, onClose }) {
  if (!message) return null;
  return (
    <div className="fixed bottom-5 right-5 z-50 flex max-w-sm items-start gap-3 rounded-xl border border-border bg-surface px-4 py-3 shadow-lg">
      <span className="text-emerald-600">✓</span>
      <p className="flex-1 text-sm text-text-strong">{message}</p>
      <button
        type="button"
        onClick={onClose}
        className="text-text-muted hover:text-text-strong"
        aria-label="Fermer"
      >
        ×
      </button>
    </div>
  );
}

function EditModal({ task, people, onClose, onSave }) {
  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/30 p-4 sm:items-center">
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="Fermer"
        onClick={onClose}
      />
      <div className="relative z-10 max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-border bg-surface p-5 shadow-xl scroll-thin">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-text-strong">
              Modifier la tâche
            </h2>
            {task.ticketId && (
              <p className="text-xs text-text-muted">{task.ticketId}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-border px-2.5 py-1 text-sm text-text-muted hover:border-border-strong"
          >
            Fermer
          </button>
        </div>
        <TaskForm
          key={task.id}
          people={people}
          initial={task}
          showStatus
          submitLabel="Enregistrer"
          onCancel={onClose}
          onSubmit={async (payload) => {
            await onSave(task.id, payload);
            onClose();
          }}
        />
      </div>
    </div>
  );
}

export default function TasksPage() {
  const {
    tasks,
    people,
    status,
    error,
    lastUpdated,
    refresh,
    create,
    update,
    remove,
  } = useTasksData();

  const [tab, setTab] = useState('board');
  const [toast, setToast] = useState('');
  const [editing, setEditing] = useState(null);

  const loading = status === 'loading';

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 4500);
  };

  const handleCreate = async (payload) => {
    const created = await create(payload);
    showToast(
      created.ticketId
        ? `Tâche créée — ${created.ticketId}`
        : 'Tâche créée avec succès'
    );
    setTab('board');
  };

  const handleDelete = async (task) => {
    const ok = window.confirm(
      `Supprimer « ${task.name} »${task.ticketId ? ` (${task.ticketId})` : ''} ?`
    );
    if (!ok) return;
    try {
      await remove(task.id);
      showToast('Tâche supprimée');
    } catch (err) {
      showToast(err.message || 'Suppression impossible');
    }
  };

  return (
    <div className="min-h-full">
      <header className="sticky top-0 z-10 border-b border-border bg-surface/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-2 px-4 py-3 sm:gap-4 sm:px-6 sm:py-3.5">
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <Link
              to="/"
              className="flex shrink-0 items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-sm font-medium text-text-strong transition hover:border-border-strong"
            >
              ←<span className="hidden sm:inline"> Back</span>
            </Link>
            <h1 className="truncate text-sm font-semibold text-text-strong sm:text-base">
              <span className="sm:hidden">Tasks</span>
              <span className="hidden sm:inline">JEExpert — Tasks</span>
            </h1>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            {lastUpdated && (
              <span className="hidden text-xs text-text-muted sm:inline">
                Mis à jour{' '}
                {lastUpdated.toDateString() === new Date().toDateString()
                  ? lastUpdated.toLocaleTimeString('fr-FR', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : lastUpdated.toLocaleString('fr-FR', {
                      day: '2-digit',
                      month: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
              </span>
            )}
            <button
              onClick={refresh}
              disabled={loading}
              className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-3 py-1.5 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-60"
            >
              <span className={loading ? 'inline-block animate-spin' : ''}>↻</span>
              Refresh
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-5 sm:px-6 sm:py-6">
        <div className="flex gap-1 rounded-xl border border-border bg-surface p-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition ${
                tab === t.id
                  ? 'bg-brand text-white shadow-sm'
                  : 'text-text-muted hover:text-text-strong'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {status === 'error' && (
          <div className="mt-4">
            <ErrorState message={error} onRetry={refresh} />
          </div>
        )}

        <div className="mt-5">
          {tab === 'create' && (
            <div className="mx-auto max-w-2xl rounded-2xl border border-border bg-surface p-5 sm:p-6">
              <h2 className="mb-4 text-base font-semibold text-text-strong">
                Nouvelle tâche
              </h2>
              <TaskForm people={people} onSubmit={handleCreate} />
            </div>
          )}

          {tab === 'board' && (
            <TaskBoard
              tasks={tasks}
              onEdit={setEditing}
              onDelete={handleDelete}
            />
          )}

          {tab === 'metrics' && <TaskMetrics tasks={tasks} />}
        </div>
      </main>

      {editing && (
        <EditModal
          task={editing}
          people={people}
          onClose={() => setEditing(null)}
          onSave={async (id, payload) => {
            await update(id, payload);
            showToast('Tâche mise à jour');
          }}
        />
      )}

      <Toast message={toast} onClose={() => setToast('')} />
    </div>
  );
}
