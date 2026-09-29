import { useEffect, useMemo, useRef, useState } from 'react';
import Modal from '../Modal.jsx';
import Avatar from '../Avatar.jsx';
import {
  fetchClientFiche,
  fetchClientFicheChoices,
  updateClientFiche,
  uploadProspectPhoto,
} from '../../lib/airtable.js';
import { MailIcon, PencilIcon, SaveIcon, UserIcon, WhatsAppIcon, XIcon } from '../icons.jsx';

// "Fiche client" — a prospect's personal & contact details, loaded from
// Airtable. Opens on an organised view; "Modify" edits in place and saves.

const inputClass =
  'h-10 w-full rounded-xl border border-border bg-surface px-3 text-sm text-text-strong outline-none transition focus:border-border-strong';
const secondaryBtn =
  'inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3.5 py-2 text-sm font-medium text-text-strong transition hover:border-border-strong disabled:opacity-60';
const primaryBtn =
  'inline-flex items-center gap-1.5 rounded-lg bg-brand px-3.5 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-60';

function formatDate(v) {
  if (!v) return '';
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? v : d.toLocaleDateString('fr-FR');
}

function waLink(number) {
  const digits = String(number || '').replace(/[^\d]/g, '');
  return digits ? `https://wa.me/${digits}` : '';
}

function Section({ icon: Icon, tone, title, children }) {
  return (
    <section className="rounded-2xl border border-border bg-surface">
      <header className="flex items-center gap-2.5 border-b border-border px-4 py-3">
        <span className={`flex h-7 w-7 items-center justify-center rounded-lg ${tone}`}>
          <Icon size={14} />
        </span>
        <h3 className="text-sm font-semibold text-text-strong">{title}</h3>
      </header>
      <div className="p-4">{children}</div>
    </section>
  );
}

function Fields({ items }) {
  return (
    <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
      {items.map(([label, value, { wide, href } = {}]) => (
        <div key={label} className={wide ? 'sm:col-span-2' : ''}>
          <dt className="text-[11px] font-medium uppercase tracking-wide text-text-muted">{label}</dt>
          <dd className="mt-0.5 break-words text-sm">
            {!value ? (
              <span className="text-text-muted">—</span>
            ) : href ? (
              <a
                href={href}
                target={href.startsWith('http') ? '_blank' : undefined}
                rel="noopener noreferrer"
                className="text-brand hover:underline"
              >
                {value}
              </a>
            ) : (
              <span className="text-text-strong">{value}</span>
            )}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function Input({ label, wide, ...props }) {
  return (
    <label className={`block space-y-1.5 ${wide ? 'sm:col-span-2' : ''}`}>
      <span className="text-xs font-medium text-text-muted">{label}</span>
      <input {...props} className={inputClass} />
    </label>
  );
}

function SelectField({ label, value, onChange, options, placeholder = 'Select…' }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-medium text-text-muted">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className={inputClass}>
        <option value="">{placeholder}</option>
        {/* Keep a value Airtable has even if it's not in the option list. */}
        {value && !options.includes(value) && <option value={value}>{value}</option>}
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </label>
  );
}

// Multi-select for the 195 nationalities: chips + a type-to-search input.
function NationalityPicker({ value, onChange, options }) {
  const [query, setQuery] = useState('');
  const listId = 'fiche-nationality-options';
  const add = (raw) => {
    const match = options.find((o) => o.toLowerCase() === raw.trim().toLowerCase());
    if (match && !value.includes(match)) onChange([...value, match]);
    setQuery('');
  };
  return (
    <div className="space-y-1.5 sm:col-span-2">
      <span className="text-xs font-medium text-text-muted">Nationality</span>
      <div className="flex min-h-10 flex-wrap items-center gap-1.5 rounded-xl border border-border bg-surface px-2 py-1.5">
        {value.map((n) => (
          <span
            key={n}
            className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-700"
          >
            {n}
            <button
              type="button"
              aria-label={`Remove ${n}`}
              onClick={() => onChange(value.filter((x) => x !== n))}
              className="rounded-full p-0.5 hover:bg-indigo-100"
            >
              <XIcon size={10} />
            </button>
          </span>
        ))}
        <input
          list={listId}
          value={query}
          placeholder={value.length ? 'Add…' : 'Type a country…'}
          onChange={(e) => {
            setQuery(e.target.value);
            if (options.some((o) => o === e.target.value)) add(e.target.value);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              add(query);
            }
          }}
          className="min-w-[8rem] flex-1 bg-transparent px-1 text-sm text-text-strong outline-none"
        />
        <datalist id={listId}>
          {options.filter((o) => !value.includes(o)).map((o) => (
            <option key={o} value={o} />
          ))}
        </datalist>
      </div>
    </div>
  );
}

export default function ClientFicheModal({ prospect, onClose, onSaved }) {
  const [fiche, setFiche] = useState(null);
  const [choices, setChoices] = useState({ gender: [], nationality: [], countryOfResidence: [] });
  const [error, setError] = useState('');
  const [mode, setMode] = useState('view'); // 'view' | 'edit'
  const [draft, setDraft] = useState(null);
  const [photoFile, setPhotoFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const fileRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    fetchClientFiche(prospect.id)
      .then((f) => !cancelled && setFiche(f))
      .catch((err) => !cancelled && setError(err.message || 'Failed to load the client from Airtable.'));
    fetchClientFicheChoices()
      .then((c) => !cancelled && setChoices(c))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [prospect.id]);

  const photoPreview = useMemo(() => (photoFile ? URL.createObjectURL(photoFile) : ''), [photoFile]);
  useEffect(() => () => photoPreview && URL.revokeObjectURL(photoPreview), [photoPreview]);

  const set = (key) => (e) => setDraft((prev) => ({ ...prev, [key]: e.target.value }));

  const startEdit = () => {
    setDraft({ ...fiche });
    setPhotoFile(null);
    setSaveError('');
    setMode('edit');
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveError('');
    try {
      let saved = await updateClientFiche(fiche.id, draft);
      if (photoFile) saved = await uploadProspectPhoto(fiche.id, photoFile);
      setFiche(saved);
      setMode('view');
      setPhotoFile(null);
      onSaved?.(saved);
    } catch (err) {
      setSaveError(err.message || 'Failed to save to Airtable.');
    } finally {
      setSaving(false);
    }
  };

  const f = mode === 'edit' ? draft : fiche;
  const displayName = fiche?.fullName || prospect.fullName || 'Client';

  const footer =
    fiche &&
    (mode === 'view' ? (
      <div className="flex justify-end">
        <button type="button" onClick={startEdit} className={primaryBtn}>
          <PencilIcon size={14} />
          Modify
        </button>
      </div>
    ) : (
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-red-600">{saveError}</p>
        <div className="flex gap-2">
          <button type="button" onClick={() => setMode('view')} disabled={saving} className={secondaryBtn}>
            Cancel
          </button>
          <button type="button" onClick={handleSave} disabled={saving} className={primaryBtn}>
            <SaveIcon size={14} />
            {saving ? 'Saving…' : 'Save to Airtable'}
          </button>
        </div>
      </div>
    ));

  return (
    <Modal
      title={`Fiche client — ${displayName}`}
      subtitle={mode === 'edit' ? 'Edit, then save to Airtable.' : 'Personal and contact information.'}
      onClose={onClose}
      size="lg"
      footer={footer}
    >
      {error && <p className="text-sm text-red-600">{error}</p>}
      {!error && !fiche && <p className="py-10 text-center text-sm text-text-muted">Loading…</p>}

      {f && (
        <div className="space-y-4">
          {/* Identity header */}
          <div className="flex items-center gap-4 rounded-2xl border border-border bg-gradient-to-br from-indigo-50 to-surface p-4">
            <div className="relative">
              <Avatar
                first={f.name}
                last={f.surname}
                fullName={displayName}
                seed={fiche.prospectId || fiche.id}
                src={photoPreview || fiche.photoUrl}
                size={64}
              />
              {mode === 'edit' && (
                <>
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    title="Change photo"
                    className="absolute -bottom-1 -right-1 rounded-full border border-border bg-surface p-1.5 text-text-muted shadow-sm transition hover:text-text-strong"
                  >
                    <PencilIcon size={12} />
                  </button>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => setPhotoFile(e.target.files?.[0] || null)}
                  />
                </>
              )}
            </div>
            <div className="min-w-0">
              <p className="truncate text-lg font-semibold tracking-tight text-text-strong">{displayName}</p>
              <p className="text-sm text-text-muted">
                {[fiche.prospectId, fiche.age != null && fiche.age !== '' ? `${fiche.age} ans` : '']
                  .filter(Boolean)
                  .join(' · ') || '—'}
              </p>
              {photoFile && <p className="mt-1 text-xs text-indigo-700">New photo: {photoFile.name}</p>}
            </div>
          </div>

          {mode === 'view' ? (
            <>
              <Section icon={UserIcon} tone="bg-indigo-50 text-indigo-600" title="Personal information">
                <Fields
                  items={[
                    ['Name', f.name],
                    ['Surname', f.surname],
                    ['Gender', f.gender],
                    ['Birthday', formatDate(f.birthday)],
                    ['City of birth', f.cityOfBirth],
                    ['Country of residence', f.countryOfResidence],
                    ['Nationality', f.nationality.join(', '), { wide: true }],
                    ['Full address', f.fullAddress, { wide: true }],
                  ]}
                />
              </Section>
              <Section icon={MailIcon} tone="bg-emerald-50 text-emerald-600" title="Contact information">
                <Fields
                  items={[
                    ['Email', f.email, { href: f.email && `mailto:${f.email}` }],
                    ['Secondary email', f.secondaryEmail, { href: f.secondaryEmail && `mailto:${f.secondaryEmail}` }],
                    ['Email for application', f.applicationEmail, { href: f.applicationEmail && `mailto:${f.applicationEmail}` }],
                    ['Phone', f.phone, { href: f.phone && `tel:${f.phone.replace(/\s+/g, '')}` }],
                    ['WhatsApp number', f.whatsappNumber, { href: waLink(f.whatsappNumber) }],
                  ]}
                />
                {waLink(f.whatsappNumber || f.phone) && (
                  <a
                    href={waLink(f.whatsappNumber || f.phone)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-[#25D366]/40 px-3 py-1.5 text-sm font-medium text-[#128C7E] transition hover:bg-[#25D366]/10"
                  >
                    <WhatsAppIcon size={14} />
                    Open WhatsApp
                  </a>
                )}
              </Section>
            </>
          ) : (
            <>
              <Section icon={UserIcon} tone="bg-indigo-50 text-indigo-600" title="Personal information">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Input label="Name" value={f.name} onChange={set('name')} />
                  <Input label="Surname" value={f.surname} onChange={set('surname')} />
                  <SelectField
                    label="Gender"
                    value={f.gender}
                    options={choices.gender}
                    onChange={(gender) => setDraft((prev) => ({ ...prev, gender }))}
                  />
                  <Input label="Birthday" type="date" value={f.birthday} onChange={set('birthday')} />
                  <Input label="City of birth" value={f.cityOfBirth} onChange={set('cityOfBirth')} />
                  <SelectField
                    label="Country of residence"
                    value={f.countryOfResidence}
                    options={choices.countryOfResidence}
                    onChange={(countryOfResidence) => setDraft((prev) => ({ ...prev, countryOfResidence }))}
                  />
                  <NationalityPicker
                    value={f.nationality}
                    options={choices.nationality}
                    onChange={(nationality) => setDraft((prev) => ({ ...prev, nationality }))}
                  />
                  <Input label="Full address" wide value={f.fullAddress} onChange={set('fullAddress')} />
                </div>
              </Section>
              <Section icon={MailIcon} tone="bg-emerald-50 text-emerald-600" title="Contact information">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Input label="Email" type="email" value={f.email} onChange={set('email')} />
                  <Input label="Secondary email" type="email" value={f.secondaryEmail} onChange={set('secondaryEmail')} />
                  <Input
                    label="Email for application"
                    type="email"
                    wide
                    value={f.applicationEmail}
                    onChange={set('applicationEmail')}
                  />
                  <Input label="Phone" type="tel" value={f.phone} onChange={set('phone')} />
                  <Input label="WhatsApp number" type="tel" value={f.whatsappNumber} onChange={set('whatsappNumber')} />
                </div>
              </Section>
            </>
          )}
        </div>
      )}
    </Modal>
  );
}
