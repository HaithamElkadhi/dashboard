import { useEffect, useId, useRef, useState } from 'react';
import { inputClass } from '../prospection/controls.jsx';

const fold = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

export default function StudentPicker({ students, value, onChange, disabled }) {
  const id = useId(), root = useRef(null), trigger = useRef(null), search = useRef(null);
  const [open, setOpen] = useState(false), [query, setQuery] = useState(''), [active, setActive] = useState(0);
  const selected = students.find(student => student.id === value);
  const matching = students.filter(student => fold(`${student.fullName} ${student.email} ${student.phone}`).includes(fold(query.trim())));
  useEffect(() => {
    if (!open) return;
    search.current?.focus();
    const outside = event => { if (!root.current?.contains(event.target)) setOpen(false); };
    document.addEventListener('pointerdown', outside);
    return () => document.removeEventListener('pointerdown', outside);
  }, [open]);
  useEffect(() => { if (disabled) setOpen(false); }, [disabled]);
  useEffect(() => { root.current?.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest' }); }, [active, query]);
  const close = () => { setOpen(false); trigger.current?.focus(); };
  const choose = student => { onChange(student.id); close(); };
  const keyboard = event => {
    if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); close(); }
    else if (event.key === 'Tab') setOpen(false);
    else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); setActive(index => Math.max(0, Math.min(matching.length - 1, index + (event.key === 'ArrowDown' ? 1 : -1)))); }
    else if (event.key === 'Enter') { event.preventDefault(); if (matching[active]) choose(matching[active]); }
  };
  return <div ref={root} className="relative space-y-1.5" onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false); }}>
    <span id={`${id}-label`} className="text-sm font-medium text-text-strong">Étudiant</span>
    <button ref={trigger} type="button" className={`${inputClass} flex items-center justify-between gap-3 text-left`} disabled={disabled} aria-labelledby={`${id}-label ${id}-value`} aria-haspopup="listbox" aria-expanded={open} aria-controls={`${id}-list`} onClick={() => { setOpen(!open); setQuery(''); setActive(0); }} onKeyDown={event => { if (event.key === 'ArrowDown') { event.preventDefault(); setOpen(true); setQuery(''); setActive(0); } }}>
      <span id={`${id}-value`} className="min-w-0 break-words">{selected ? `${selected.fullName}${selected.email ? ` · ${selected.email}` : ''}` : 'Choisir un étudiant'}</span><span aria-hidden="true">▾</span>
    </button>
    {open && <div className="absolute left-0 right-0 z-20 rounded-xl border border-border bg-surface p-2 shadow-lg">
      <input ref={search} type="text" role="combobox" aria-label="Rechercher dans les étudiants" aria-autocomplete="list" aria-expanded="true" aria-controls={`${id}-list`} aria-activedescendant={matching[active] ? `${id}-option-${active}` : undefined} className={inputClass} placeholder="Nom, email, téléphone…" value={query} onChange={event => { setQuery(event.target.value); setActive(0); }} onKeyDown={keyboard} />
      <ul role="listbox" id={`${id}-list`} aria-labelledby={`${id}-label`} className="mt-2 max-h-64 overflow-auto">{matching.map((student, index) => <li key={student.id}>
        <button type="button" role="option" id={`${id}-option-${index}`} aria-selected={index === active} tabIndex={-1} className={`min-h-11 w-full rounded-lg px-3 py-2 text-left text-sm ${index === active ? 'bg-brand/10 text-brand' : 'text-text-strong hover:bg-canvas'}`} onMouseDown={event => event.preventDefault()} onClick={() => choose(student)}>
          <span className="block break-words font-medium">{student.fullName}{student.id === value ? ' ✓' : ''}</span><span className="block break-words text-xs text-text-muted">{[student.email, student.phone].filter(Boolean).join(' · ')}</span>
        </button>
      </li>)}</ul>
      {!matching.length && <p role="status" className="p-3 text-sm text-text-muted">Aucun étudiant trouvé.</p>}
    </div>}
  </div>;
}
