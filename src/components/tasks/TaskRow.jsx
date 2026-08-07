import { formatShortDate, isTaskOverdue } from '../../lib/taskDates.js';
import { typeLabel } from '../../lib/taskLabels.js';
import PriorityBadge from './PriorityBadge.jsx';
import AssigneeAvatar from './AssigneeAvatar.jsx';
import TaskQuickActionsMenu from './TaskQuickActionsMenu.jsx';
import { CheckIcon, ClockAlertIcon } from '../icons.jsx';

export default function TaskRow({
  task,
  onOpen,
  onToggleDone,
  onDuplicate,
  onArchive,
  onDelete,
}) {
  const done = task.status === 'Done';
  const overdue = isTaskOverdue(task);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onOpen(task)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') onOpen(task);
      }}
      className="flex cursor-pointer items-center gap-3 rounded-xl px-2.5 py-2 transition hover:bg-canvas focus:bg-canvas focus:outline-none"
    >
      <button
        type="button"
        title={done ? 'Rouvrir la tâche' : 'Marquer comme terminée'}
        onClick={(e) => {
          e.stopPropagation();
          onToggleDone(task);
        }}
        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition ${
          done
            ? 'border-transparent bg-emerald-600 text-white'
            : 'border-border-strong text-transparent hover:border-emerald-500 hover:text-emerald-500'
        }`}
      >
        <CheckIcon size={12} />
      </button>

      <div className="min-w-0 flex-1">
        <p
          className={`truncate text-sm font-medium ${
            done ? 'text-text-muted line-through' : 'text-text-strong'
          }`}
        >
          {task.name}
        </p>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-text-muted">
          {task.prospectName && <span className="truncate">{task.prospectName}</span>}
          {task.prospectName && task.type && <span>·</span>}
          {task.type && <span className="truncate">{typeLabel(task.type)}</span>}
        </div>
      </div>

      <div className="hidden shrink-0 sm:block">
        <PriorityBadge priority={task.priority} />
      </div>

      <div className="w-16 shrink-0 text-right text-xs">
        {task.ddl &&
          (overdue ? (
            <span className="inline-flex items-center gap-1 font-semibold text-red-600">
              <ClockAlertIcon size={11} />
              {formatShortDate(task.ddl)}
            </span>
          ) : (
            <span className="tabular-nums text-text-muted">
              {formatShortDate(task.ddl)}
            </span>
          ))}
      </div>

      <AssigneeAvatar name={task.assignedTo} size={28} />

      <TaskQuickActionsMenu
        done={done}
        onToggleDone={() => onToggleDone(task)}
        onDuplicate={() => onDuplicate(task)}
        onArchive={() => onArchive(task)}
        onDelete={() => onDelete(task)}
      />
    </div>
  );
}
