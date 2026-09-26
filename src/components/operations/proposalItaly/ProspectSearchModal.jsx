import { useEffect, useMemo, useState } from 'react';
import { fetchProspectsForSearch } from '../../../lib/airtable.js';
import Modal from '../../Modal.jsx';
import { TextInput } from './shared.jsx';

// Pick a Prospect from Airtable; the page then loads its full record into the
// proposal form.
export default function ProspectSearchModal({ onSelect, onClose }) {
  const [prospects, setProspects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [query, setQuery] = useState('');

  useEffect(() => {
    fetchProspectsForSearch()
      .then(setProspects)
      .catch((err) => setError(err.message || 'Failed to load prospects'))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return prospects;
    return prospects.filter(
      (p) => p.fullName.toLowerCase().includes(q) || p.email.toLowerCase().includes(q)
    );
  }, [prospects, query]);

  return (
    <Modal
      title="Search student in Prospects"
      subtitle="Select a prospect to load all of their information into the proposal."
      onClose={onClose}
    >
      <TextInput
        placeholder="Search by name or email…"
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
            {prospects.length === 0 ? 'No prospects found.' : 'No match.'}
          </p>
        )}
        {!loading && !error && filtered.length > 0 && (
          <ul className="divide-y divide-border">
            {filtered.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => onSelect(p)}
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
  );
}
