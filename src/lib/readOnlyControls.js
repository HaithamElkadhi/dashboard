// Forms are editing surfaces. Inline writes use data-write; view controls
// outside these surfaces (filters, links, previews) remain interactive.
export function installReadOnlyControls(document, Observer = MutationObserver) {
  const originals = new Map();
  const selector = 'form input, form select, textarea, input[type="file"], form button[type="submit"], form button:not([type]), [data-write], [data-write] input, [data-write] select, [data-write] textarea, [data-write] button, [contenteditable="true"]';
  const apply = () => {
    for (const node of document.querySelectorAll(selector)) {
      if (!originals.has(node)) originals.set(node, { disabled: node.disabled, editable: node.getAttribute('contenteditable'), aria: node.getAttribute('aria-disabled') });
      if ('disabled' in node && !node.disabled) node.disabled = true;
      if (node.getAttribute('aria-disabled') !== 'true') node.setAttribute('aria-disabled', 'true');
      if (node.getAttribute('contenteditable') === 'true') node.setAttribute('contenteditable', 'false');
    }
  };
  const block = (event) => {
    if (event.type === 'submit' || event.target.closest?.('[data-write]')) {
      event.preventDefault(); event.stopImmediatePropagation();
    }
  };
  apply();
  const observer = new Observer(apply);
  observer.observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['disabled', 'data-write', 'contenteditable'] });
  const events = ['click', 'change', 'submit', 'pointerdown', 'keydown'];
  for (const name of events) document.addEventListener(name, block, true);
  return () => {
    observer.disconnect();
    for (const name of events) document.removeEventListener(name, block, true);
    for (const [node, value] of originals) {
      if ('disabled' in node) node.disabled = value.disabled;
      if (value.editable !== null) node.setAttribute('contenteditable', value.editable);
      if (value.aria === null) node.removeAttribute('aria-disabled'); else node.setAttribute('aria-disabled', value.aria);
    }
  };
}
