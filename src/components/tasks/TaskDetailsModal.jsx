import { useState } from 'react';
import Modal from '../Modal.jsx';
import TaskForm from './TaskForm.jsx';
import { formatShortDate, parseTicketCreatedDate } from '../../lib/taskDates.js';
import { ARCHIVED_STATUS } from '../../lib/config.js';
import { ArchiveIcon, CheckIcon, CopyIcon, TrashIcon } from '../icons.jsx';

function QuickAction({ icon: Icon, label, onClick, danger, disabled }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition disabled:opacity-60 ${
        danger
          ? 'border-red-200 text-red-600 hover:bg-red-50'
          : 'border-border text-text-strong hover:border-border-strong hover:bg-canvas'
      }`}
    >
      <Icon size={13} />
      {label}
    </button>
  );
}

export default function TaskDetailsModal({
  task,
  people,
  onClose,
  onUpdate,
  onDelete,
  onStatusChange,
  onDuplicate,
  onToast,
}) {
  const [busy, setBusy] = useState(false);
  const done = task.status === 'Done';
  const createdISO = parseTicketCreatedDate(task.ticketId);

  const handleToggleDone = async () => {
    setBusy(true);
    try {
      await onStatusChange(task.id, done ? 'Todo' : 'Done');
      onToast(done ? 'Tâche rouverte' : 'Tâche terminée');
    } catch (err) {
      onToast(err.message || 'Échec de la mise à jour');
    } finally {
      setBusy(false);
    }
  };

  const handleArchive = async () => {
    setBusy(true);
    try {
      await onStatusChange(task.id, ARCHIVED_STATUS);
      onToast('Tâche archivée');
      onClose();
    } catch (err) {
      onToast(err.message || 'Échec de l’archivage');
      setBusy(false);
    }
  };

  const handleDuplicate = async () => {
    setBusy(true);
    try {
      const created = await onDuplicate({
        name: task.name,
        type: task.type,
        priority: task.priority,
        assignedTo: task.assignedTo,
        status: 'Todo',
        ddl: task.ddl,
        notes: task.notes,
        prospectName: task.prospectName,
      });
      onToast(
        created.ticketId ? `Tâche dupliquée — ${created.ticketId}` : 'Tâche dupliquée'
      );
    } catch (err) {
      onToast(err.message || 'Échec de la duplication');
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    const ok = window.confirm(
      `Supprimer « ${task.name} »${task.ticketId ? ` (${task.ticketId})` : ''} ?`
    );
    if (!ok) return;
    setBusy(true);
    try {
      await onDelete(task.id);
      onToast('Tâche supprimée');
      onClose();
    } catch (err) {
      onToast(err.message || 'Suppression impossible');
      setBusy(false);
    }
  };

  const handleFormSubmit = async (payload) => {
    await onUpdate(task.id, payload);
    onToast('Tâche mise à jour');
  };

  return (
    <Modal
      title={task.name}
      subtitle={
        [task.ticketId, createdISO ? `Créée le ${formatShortDate(createdISO)}` : null]
          .filter(Boolean)
          .join(' · ') || undefined
      }
      onClose={onClose}
      size="lg"
    >
      <div className="mb-5 flex flex-wrap items-center gap-1.5">
        <QuickAction
          icon={CheckIcon}
          label={done ? 'Rouvrir' : 'Marquer terminée'}
          onClick={handleToggleDone}
          disabled={busy}
        />
        <QuickAction icon={CopyIcon} label="Dupliquer" onClick={handleDuplicate} disabled={busy} />
        <QuickAction icon={ArchiveIcon} label="Archiver" onClick={handleArchive} disabled={busy} />
        <QuickAction
          icon={TrashIcon}
          label="Supprimer"
          onClick={handleDelete}
          disabled={busy}
          danger
        />
      </div>

      <TaskForm
        key={task.id}
        people={people}
        initial={task}
        showStatus
        compact
        submitLabel="Enregistrer"
        onCancel={onClose}
        onSubmit={handleFormSubmit}
      />
    </Modal>
  );
}
