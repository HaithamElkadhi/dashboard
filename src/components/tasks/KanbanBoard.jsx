import { useMemo, useState } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { STATUS_COLORS, TASK_STATUSES } from '../../lib/config.js';
import { statusLabel } from '../../lib/taskLabels.js';
import KanbanColumn from './KanbanColumn.jsx';
import TaskCard from './TaskCard.jsx';

const noop = () => {};

export default function KanbanBoard({
  tasks,
  onOpen,
  onToggleDone,
  onDuplicate,
  onArchive,
  onDelete,
  onStatusChange,
  onQuickAdd,
}) {
  const [mobileStatus, setMobileStatus] = useState('Todo');
  const [activeTask, setActiveTask] = useState(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  const byStatus = useMemo(() => {
    const map = Object.fromEntries(TASK_STATUSES.map((s) => [s, []]));
    for (const task of tasks) {
      const key = TASK_STATUSES.includes(task.status) ? task.status : 'Todo';
      map[key].push(task);
    }
    return map;
  }, [tasks]);

  const cardProps = { onOpen, onToggleDone, onDuplicate, onArchive, onDelete };

  return (
    <div>
      {/* Mobile: status tabs + vertical list — a horizontal-scroll kanban is
          an unreliable touch target next to the page's own vertical scroll. */}
      <div className="sm:hidden">
        <div className="grid grid-cols-2 gap-1 rounded-xl border border-border bg-surface p-1">
          {TASK_STATUSES.map((status) => {
            const color = STATUS_COLORS[status];
            const active = mobileStatus === status;
            return (
              <button
                key={status}
                type="button"
                onClick={() => setMobileStatus(status)}
                style={active ? { backgroundColor: color.bg, color: color.text } : undefined}
                className={`rounded-lg px-2 py-2 text-xs font-semibold transition ${
                  active ? '' : 'text-text-muted'
                }`}
              >
                {statusLabel(status)}
                <span className="ml-1 tabular-nums opacity-70">
                  ({byStatus[status].length})
                </span>
              </button>
            );
          })}
        </div>
        <div className="mt-3 flex flex-col gap-2">
          {byStatus[mobileStatus].length === 0 ? (
            <p className="px-2 py-8 text-center text-xs text-text-muted">
              Aucune tâche
            </p>
          ) : (
            byStatus[mobileStatus].map((task) => (
              <TaskCard key={task.id} task={task} {...cardProps} />
            ))
          )}
        </div>
      </div>

      {/* Desktop / tablet: drag-and-drop kanban */}
      <DndContext
        sensors={sensors}
        onDragStart={({ active }) => {
          setActiveTask(tasks.find((t) => t.id === active.id) || null);
        }}
        onDragEnd={({ active, over }) => {
          setActiveTask(null);
          if (!over) return;
          const task = tasks.find((t) => t.id === active.id);
          if (!task || task.status === over.id) return;
          onStatusChange(task, over.id);
        }}
        onDragCancel={() => setActiveTask(null)}
      >
        <div className="hidden gap-3 overflow-x-auto pb-2 scroll-thin sm:flex">
          {TASK_STATUSES.map((status) => (
            <KanbanColumn
              key={status}
              status={status}
              tasks={byStatus[status]}
              onQuickAdd={onQuickAdd}
              {...cardProps}
            />
          ))}
        </div>
        <DragOverlay>
          {activeTask ? (
            <div className="w-72 rotate-2 opacity-95">
              <TaskCard
                task={activeTask}
                onOpen={noop}
                onToggleDone={noop}
                onDuplicate={noop}
                onArchive={noop}
                onDelete={noop}
              />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
