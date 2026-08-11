import Badge from '../Badge.jsx';
import { CAM_SITUATION_COLORS } from '../../lib/config.js';

export default function SituationBadge({ situations }) {
  const hasAdmitted = situations.includes('Admitted');
  const hasEngaged = situations.includes('Engaged');

  let label = '—';
  let color = { bg: '#F1EFE8', text: '#5F5E5A' };
  if (hasAdmitted && hasEngaged) {
    label = 'Admis + Engagé';
    color = CAM_SITUATION_COLORS.Both;
  } else if (hasAdmitted) {
    label = 'Admis';
    color = CAM_SITUATION_COLORS.Admitted;
  } else if (hasEngaged) {
    label = 'Engagé';
    color = CAM_SITUATION_COLORS.Engaged;
  }

  return <Badge label={label} bg={color.bg} text={color.text} />;
}
