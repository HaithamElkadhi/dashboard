import Badge from '../Badge.jsx';
import { SITUATION_CHOICES } from '../../lib/config.js';

// Prospect Situation(s) as small badges — now that Comptes clients lists every
// prospect, not only Candidates / Students.
const SITUATION_COLORS = {
  Lead: { bg: '#E1F5EE', text: '#085041' },
  Prospect: { bg: '#E6F1FB', text: '#0C447C' },
  Candidate: { bg: '#EAF3DE', text: '#27500A' },
  Student: { bg: '#EEEDFE', text: '#3C3489' },
  Lost: { bg: '#FBEAF0', text: '#72243E' },
};
const NEUTRAL = { bg: '#F1EFE8', text: '#5F5E5A' };

export default function SituationBadge({ situations }) {
  if (!situations?.length) return <Badge label="—" bg={NEUTRAL.bg} text={NEUTRAL.text} />;
  const ordered = [...situations].sort(
    (a, b) => SITUATION_CHOICES.indexOf(a) - SITUATION_CHOICES.indexOf(b)
  );
  return (
    <span className="flex flex-wrap justify-end gap-1">
      {ordered.map((s) => {
        const c = SITUATION_COLORS[s] || NEUTRAL;
        return <Badge key={s} label={s} bg={c.bg} text={c.text} />;
      })}
    </span>
  );
}
