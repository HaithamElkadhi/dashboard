// The built-in PDF font supports French and Latin characters. Reject unsupported
// note characters explicitly instead of silently losing the user's text.
export function visaNoteError(note = '') {
  return /[^\x09\x0a\x0d\x20-\xff\u2018\u2019\u201c\u201d\u2013\u2014\u2011\u2026\u20acœŒᵉ≥≤]/u.test(String(note).normalize('NFC'))
    ? 'Pour le PDF, utilisez une note en caractères latins (français, sans emojis).'
    : '';
}
