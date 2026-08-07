import Badge from '../Badge.jsx';
import { PRIORITY_COLORS } from '../../lib/config.js';
import { priorityLabel } from '../../lib/taskLabels.js';

export default function PriorityBadge({ priority, className }) {
  if (!priority) return null;
  const color = PRIORITY_COLORS[priority] || { bg: '#F1EFE8', text: '#5F5E5A' };
  return (
    <Badge
      label={priorityLabel(priority)}
      bg={color.bg}
      text={color.text}
      className={className}
    />
  );
}
