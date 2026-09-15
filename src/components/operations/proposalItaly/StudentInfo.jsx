import { useEffect, useMemo, useState } from 'react';
import { fetchProspectsForSearch } from '../../../lib/airtable.js';
import { SearchIcon, UserIcon } from '../../icons.jsx';
import Modal from '../../Modal.jsx';
import { Card, CardHeader, FieldLabel, TextInput } from './shared.jsx';

export default function StudentInfo({ data, onChange }) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [prospects, setProspects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [query, setQuery] = useState('');
  const [autoFilled, setAutoFilled] = useState(false);

  useEffect(() => {
    if (!searchOpen) return;
    setLoading(true);
    setError(null);
    fetchProspectsForSearch()
      .then(setProspects)
      .catch((err) => setError(err.message || 'Failed to load prospects'))
      .finally(() => setLoading(false));
  }, [searchOpen]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return prospects;
    return prospects.filter((p) => p.fullName.toLowerCase().includes(q));
  }, [prospects, query]);

  const selectProspect = (p) => {
    onChange({ studentName: p.fullName, email: p.email, phone: p.phone });
    setAutoFilled(true);
    setSearchOpen(false);
    setQuery('');
  };

  return (
    <Card accent="from-indigo-600 to-indigo-400">
      <div className="flex items-center gap-4 border-b border-border px-6 py-5 sm:px-8 sm:py-6">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50">
          <UserIcon size={18} className="text-indigo-600" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-600">Section 2</p>
          <h2 className="text-base font-bold text-text-strong">Student Information</h2>
        </div>
        <button
          type="button"
          onClick={() => setSearchOpen(true)}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-text-strong transition hover:border-indigo-300 hover:text-indigo-600"
        >
          <SearchIcon size={14} />
          <span className="hidden sm:inline">Search Prospects</span>
          <span className="sm:hidden">Search</span>
        </button>
      </div>

      {autoFilled && (
        <div className="mx-6 mt-4 flex items-center gap-2 rounded-xl border border-indigo-100 bg-indigo-50 px-4 py-3 sm:mx-8">
          <div className="h-1.5 w-1.5 rounded-full bg-indigo-400" />
          <p className="text-xs text-indigo-700">Auto-filled from Prospects.</p>
        </div>
      )}

      <div className="grid gap-6 p-6 sm:grid-cols-2 sm:p-8">
        <div className="space-y-1.5">
          <FieldLabel>
            Full Name <span className="text-red-500">*</span>
          </FieldLabel>
          <TextInput
            placeholder="Student full name"
            value={data.studentName}
            onChange={(e) => onChange({ studentName: e.target.value })}
            required
          />
        </div>
        <div className="space-y-1.5">
          <FieldLabel>
            Email <span className="text-red-500">*</span>
          </FieldLabel>
          <TextInput
            type="email"
            placeholder="student@email.com"
            value={data.email}
            onChange={(e) => onChange({ email: e.target.value })}
            required
          />
        </div>
        <div className="space-y-1.5">
          <FieldLabel>Phone</FieldLabel>
          <TextInput
            type="tel"
            placeholder="+216 XX XXX XXX"
            value={data.phone}
            onChange={(e) => onChange({ phone: e.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <FieldLabel>Nationality</FieldLabel>
          <TextInput
            placeholder="e.g. Tunisian"
            value={data.nationality}
            onChange={(e) => onChange({ nationality: e.target.value })}
          />
        </div>
      </div>

      {searchOpen && (
        <Modal
          title="Search student in Prospects"
          subtitle="Select a prospect to auto-fill name, email and phone."
          onClose={() => setSearchOpen(false)}
        >
          <TextInput
            placeholder="Search by full name…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
            className="mb-3"
          />
          <div className="max-h-80 overflow-y-auto rounded-xl border border-border scroll-thin">
            {loading && <p className="p-4 text-center text-sm text-text-muted">Loading…</p>}
            {!loading && error && <p className="p-4 text-center text-sm text-red-600">{error}</p>}
            {!loading && !error && filtered.length === 0 && (
              <p className="p-4 text-center text-sm text-text-muted">
                {prospects.length === 0 ? 'No prospects found.' : 'No match for that name.'}
              </p>
            )}
            {!loading && !error && filtered.length > 0 && (
              <ul className="divide-y divide-border">
                {filtered.map((p) => (
                  <li key={p.id}>
                    <button
                      type="button"
                      onClick={() => selectProspect(p)}
                      className="block w-full px-4 py-3 text-left transition hover:bg-canvas"
                    >
                      <span className="block text-sm font-semibold text-text-strong">{p.fullName}</span>
                      {p.email && <span className="block text-xs text-text-muted">{p.email}</span>}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Modal>
      )}
    </Card>
  );
}
