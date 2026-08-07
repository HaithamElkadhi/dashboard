import Modal from '../Modal.jsx';
import TaskForm from './TaskForm.jsx';

export default function TaskCreateModal({
  people,
  initialStatus,
  onClose,
  onCreate,
  onToast,
}) {
  const handleSubmit = async (payload, keepOpen) => {
    const created = await onCreate(payload);
    onToast(
      created.ticketId ? `Tâche créée — ${created.ticketId}` : 'Tâche créée avec succès'
    );
    if (!keepOpen) onClose();
  };

  return (
    <Modal
      title="Nouvelle tâche"
      subtitle="Renseignez les informations essentielles pour créer la tâche."
      onClose={onClose}
      size="lg"
    >
      <TaskForm
        people={people}
        initialStatus={initialStatus}
        submitLabel="Créer la tâche"
        showCreateAnother
        compact
        onCancel={onClose}
        onSubmit={handleSubmit}
      />
    </Modal>
  );
}
