// Maps Airtable select-option color tokens (e.g. "greenLight2", "blueDark1")
// to hex values, so badge colors follow whatever is configured in Airtable.
// Families: gray, blue, cyan, teal, green, yellow, orange, red, pink, purple.
// Variants: Light2 (palest) · Light1 · Bright · Dark1 (most saturated).

const HEX = {
  blueLight2: '#cfdfff', blueLight1: '#9cc7ff', blueBright: '#2d7ff9', blueDark1: '#2750ae',
  cyanLight2: '#d0f0fd', cyanLight1: '#77d1f3', cyanBright: '#18bfff', cyanDark1: '#0b76b7',
  tealLight2: '#c2f5e9', tealLight1: '#72ddc3', tealBright: '#20d9d2', tealDark1: '#06a09b',
  greenLight2: '#d1f7c4', greenLight1: '#93e088', greenBright: '#20c933', greenDark1: '#338a17',
  yellowLight2: '#ffeab6', yellowLight1: '#ffd66e', yellowBright: '#fcb400', yellowDark1: '#b87503',
  orangeLight2: '#fee2d5', orangeLight1: '#ffa981', orangeBright: '#ff6f2c', orangeDark1: '#d74d26',
  redLight2: '#ffdce5', redLight1: '#ff9eb7', redBright: '#f82b60', redDark1: '#ba1e45',
  pinkLight2: '#ffdaf6', pinkLight1: '#f99de2', pinkBright: '#ff08c2', pinkDark1: '#b2158b',
  purpleLight2: '#ede2fe', purpleLight1: '#cdb0ff', purpleBright: '#8b46ff', purpleDark1: '#6b1cb0',
  grayLight2: '#eeeeee', grayLight1: '#cccccc', grayBright: '#666666', grayDark1: '#444444',
};

const FAMILY_BRIGHT = {
  blue: '#2d7ff9', cyan: '#18bfff', teal: '#20d9d2', green: '#20c933',
  yellow: '#fcb400', orange: '#ff6f2c', red: '#f82b60', pink: '#ff08c2',
  purple: '#8b46ff', gray: '#9b9b9b',
};

const FAMILY_DARK = {
  blue: '#2750ae', cyan: '#0b76b7', teal: '#06a09b', green: '#338a17',
  yellow: '#b87503', orange: '#d74d26', red: '#ba1e45', pink: '#b2158b',
  purple: '#6b1cb0', gray: '#5f5e5a',
};

const NEUTRAL = { bg: '#F1EFE8', text: '#5F5E5A' };

export function familyOf(token) {
  if (!token) return null;
  const m = /^([a-z]+?)(Light2|Light1|Bright|Dark1)?$/.exec(token);
  return m ? m[1] : null;
}

function hexToRgb(hex) {
  const h = hex.replace('#', '');
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

// Perceived luminance (0..1) to decide whether text should be dark or light.
function luminance(hex) {
  const [r, g, b] = hexToRgb(hex);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

// Returns { bg, text } for a colored chip based on the Airtable token.
export function chipStyle(token) {
  const bg = HEX[token];
  if (!bg) return NEUTRAL;
  const text = luminance(bg) > 0.62 ? '#1d1f25' : '#ffffff';
  return { bg, text };
}

// Returns { dot, text } for the visa dot+label style. Uses a saturated dot and
// dark text regardless of the (usually pale) configured shade, for legibility.
export function dotStyle(token) {
  const fam = familyOf(token);
  if (!fam || !FAMILY_BRIGHT[fam]) {
    return { dot: 'var(--border-strong)', text: 'var(--text-muted)' };
  }
  return { dot: FAMILY_BRIGHT[fam], text: FAMILY_DARK[fam] };
}
