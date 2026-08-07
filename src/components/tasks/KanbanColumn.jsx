import { useDraggable, useDroppable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import TaskCard from './TaskCard.jsx';
import { STATUS_COLORS } from '../../lib/config.js';
import { statusLabel } from '../../lib/taskLabels.js';
import { InboxIcon, PlusIcon } from '../icons.jsx';

const EMPTY_COPY = {
  Todo: 'Aucune tâche en attente — tout est pris en charge.',
  'In progress': 'Rien en cours pour le moment.',
  Blocked: 'Rien de bloqué — ça avance bien.',
  Done: 'Aucune tâche terminée pour l’instant.',
};

function ColumnEmpty({ status }) {
  return (
    <div className="flex flex-col items-center gap-2 px-2 py-8 text-center text-text-muted">
      <InboxIcon size={20} />
      <p className="text-xs">{EMPTY_COPY[status] || 'Aucune tâche'}</p>
    </div>
  );
}

function DraggableTaskCard({ task, cardProps }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
  });
  const style = {
    transform: transform ? CSS.Translate.toString(transform) : undefined,
    opacity: isDragging ? 0.35 : 1,
  };
  return (
    <div ref={setNodeRef} style={style}>
      <TaskCard task={task} dragHandleProps={{ ...attributes, ...listeners }} {...cardProps} />
    </div>
  );
}

export default function KanbanColumn({ status, tasks, onQuickAdd, ...cardProps }) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  const color = STATUS_COLORS[status];

  return (
    <div
      ref={setNodeRef}
      className={`flex w-72 shrink-0 flex-col rounded-2xl border bg-canvas/60 transition-colors ${
        isOver ? 'border-brand ring-1 ring-brand/40' : 'border-border'
      }`}
    >
      <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2.5">
        <span
          className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold"
          style={{ backgroundColor: color.bg, color: color.text }}
        >
          {statusLabel(status)}
        </span>
        <div className="flex items-center gap-1">
          <span className="text-xs tabular-nums text-text-muted">{tasks.length}</span>
          <button
            type="button"
            onClick={() => onQuickAdd(status)}
            title={`Ajouter une tâche · ${statusLabel(status)}`}
            className="rounded-lg p-1 text-text-muted transition hover:bg-surface hover:text-text-strong"
          >
            <PlusIcon size={13} />
          </button>
        </div>
      </div>
      <div className="flex min-h-[7rem] max-h-[calc(100vh-20rem)] flex-col gap-2 overflow-y-auto p-2 scroll-thin">
        {tasks.length === 0 ? (
          <ColumnEmpty status={status} />
        ) : (
          tasks.map((task) => (
            <DraggableTaskCard key={task.id} task={task} cardProps={cardProps} />
          ))
        )}
      </div>
    </div>
  );
}
