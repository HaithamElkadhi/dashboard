import { useState } from 'react';
import Modal from '../Modal.jsx';
import PreparationTimeline from './PreparationTimeline.jsx';
import AdmissionRequirements from '../documents/AdmissionRequirements.jsx';
import { useAuth } from '../../contexts/AuthContext.jsx';

export default function PreparationModal({ prospect, onClose }) {
  const { canWrite } = useAuth();
  const [requiredOpen, setRequiredOpen] = useState(false);
  if (requiredOpen) {
    return <AdmissionRequirements key={prospect.id} studentId={prospect.id} open canWrite={canWrite} onClose={() => setRequiredOpen(false)} />;
  }
  return (
    <Modal title="Préparation du dossier" subtitle={prospect.fullName} size="lg" onClose={onClose}>
      <PreparationTimeline prospect={prospect} onOpenRequired={() => setRequiredOpen(true)} />
    </Modal>
  );
}
