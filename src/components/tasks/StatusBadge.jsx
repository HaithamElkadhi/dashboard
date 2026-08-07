import Badge from '../Badge.jsx';
import { STATUS_COLORS } from '../../lib/config.js';
import { statusLabel } from '../../lib/taskLabels.js';

export default function StatusBadge({ status, className }) {
  const color = STATUS_COLORS[status] || { bg: '#F1EFE8', text: '#5F5E5A' };
  return (
    <Badge label={statusLabel(status)} bg={color.bg} text={color.text} className={className} />
  );
}
