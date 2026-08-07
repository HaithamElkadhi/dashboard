import Badge from '../Badge.jsx';
import { PRIORITY_COLORS } from '../../lib/config.js';
import { formatShortDate, isTaskOverdue } from '../../lib/taskDates.js';
import { priorityLabel, typeLabel } from '../../lib/taskLabels.js';
import AssigneeAvatar from './AssigneeAvatar.jsx';
import TaskQuickActionsMenu from './TaskQuickActionsMenu.jsx';
import { CheckIcon, ClockAlertIcon } from '../icons.jsx';

export default function TaskCard({
  task,
  onOpen,
  onToggleDone,
  onDuplicate,
  onArchive,
  onDelete,
  dragHandleProps,
}) {
  const priority = PRIORITY_COLORS[task.priority] || { bg: '#F1EFE8', text: '#5F5E5A' };
  const overdue = isTaskOverdue(task);
  const done = task.status === 'Done';

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onOpen(task)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') onOpen(task);
      }}
      {...dragHandleProps}
      className="relative cursor-pointer overflow-hidden rounded-xl border border-border bg-surface pl-3.5 pr-2.5 py-3 text-left shadow-sm transition hover:border-border-strong hover:shadow-md"
    >
      <span
        className="absolute inset-y-0 left-0 w-1.5"
        style={{ backgroundColor: priority.text }}
      />
      <div className="flex items-start justify-between gap-1.5">
        <div className="flex min-w-0 items-center gap-2">
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
          <span className="truncate text-[11px] font-medium text-text-muted">
            {task.ticketId || '—'}
          </span>
        </div>
        <TaskQuickActionsMenu
          done={done}
          onToggleDone={() => onToggleDone(task)}
          onDuplicate={() => onDuplicate(task)}
          onArchive={() => onArchive(task)}
          onDelete={() => onDelete(task)}
        />
      </div>

      <p
        className={`mt-1.5 text-sm font-semibold line-clamp-2 ${
          done ? 'text-text-muted line-through' : 'text-text-strong'
        }`}
      >
        {task.name}
      </p>

      <div className="mt-2 flex flex-wrap gap-1.5">
        {task.priority && (
          <Badge label={priorityLabel(task.priority)} bg={priority.bg} text={priority.text} />
        )}
        {task.type && <Badge label={typeLabel(task.type)} bg="#F1EFE8" text="#5F5E5A" />}
      </div>

      {task.prospectName && (
        <p className="mt-2 truncate text-xs text-text-muted">{task.prospectName}</p>
      )}

      <div className="mt-2 flex items-center justify-between gap-2 text-xs">
        {task.ddl ? (
          overdue ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 font-semibold text-red-700">
              <ClockAlertIcon size={11} />
              {formatShortDate(task.ddl)}
            </span>
          ) : (
            <span className="tabular-nums text-text-muted">{formatShortDate(task.ddl)}</span>
          )
        ) : (
          <span />
        )}
        <AssigneeAvatar name={task.assignedTo} size={26} />
      </div>
    </div>
  );
}
