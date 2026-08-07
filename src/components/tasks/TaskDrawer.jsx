import Drawer from '../Drawer.jsx';
import TaskForm from './TaskForm.jsx';

export default function TaskDrawer({ people, initialStatus, onClose, onCreate, onToast }) {
  const handleSubmit = async (payload, keepOpen) => {
    const created = await onCreate(payload);
    onToast(created.ticketId ? `Tâche créée — ${created.ticketId}` : 'Tâche créée avec succès');
    if (!keepOpen) onClose();
  };

  return (
    <Drawer title="Nouvelle tâche" onClose={onClose}>
      <TaskForm
        people={people}
        initialStatus={initialStatus}
        submitLabel="Créer la tâche"
        showCreateAnother
        onCancel={onClose}
        onSubmit={handleSubmit}
      />
    </Drawer>
  );
}
