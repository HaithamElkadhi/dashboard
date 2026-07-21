import { initials } from '../lib/format.js';

// Deterministic soft color from a string so each person keeps a stable avatar.
const PALETTE = [
  { bg: '#E6F1FB', text: '#0C447C' },
  { bg: '#EAF3DE', text: '#27500A' },
  { bg: '#EEEDFE', text: '#3C3489' },
  { bg: '#FBEAF0', text: '#72243E' },
  { bg: '#FAEEDA', text: '#633806' },
  { bg: '#E1F5EE', text: '#085041' },
];

function hash(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h << 5) - h + str.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

export default function Avatar({ first, last, fullName, seed = '' }) {
  const color = PALETTE[hash(seed || fullName || '') % PALETTE.length];
  return (
    <span
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold"
      style={{ backgroundColor: color.bg, color: color.text }}
    >
      {initials(first, last, fullName)}
    </span>
  );
}
