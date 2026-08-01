import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useFinanceData } from '../hooks/useFinanceData.js';
import { ErrorState } from '../components/states.jsx';
import Badge from '../components/Badge.jsx';
import MetricCard from '../components/finance/MetricCard.jsx';
import PaiementsTable from '../components/finance/PaiementsTable.jsx';
import PaiementModal from '../components/finance/PaiementModal.jsx';
import CommissionsView from '../components/finance/CommissionsView.jsx';
import { formatMoney } from '../lib/format.js';
import { PAYMENT_STATUS_COLORS } from '../lib/config.js';

const TABS = [
  { id: 'overview', label: 'Vue générale' },
  { id: 'paiements', label: 'Paiements' },
  { id: 'commissions', label: 'Commissions' },
];

function Toast({ message, onClose }) {
  if (!message) return null;
  return (
    <div className="fixed bottom-5 right-5 z-50 flex max-w-sm items-start gap-3 rounded-xl border border-border bg-surface px-4 py-3 shadow-lg">
      <span className="text-emerald-600">✓</span>
      <p className="flex-1 text-sm text-text-strong">{message}</p>
      <button
        type="button"
        onClick={onClose}
        className="text-text-muted hover:text-text-strong"
        aria-label="Fermer"
      >
        ×
      </button>
    </div>
  );
}

function sumByCurrency(rows, pick) {
  const totals = {};
  for (const r of rows) totals[r.currency] = (totals[r.currency] || 0) + pick(r);
  return totals;
}

function currencyTotalsLabel(rows, pick) {
  const totals = sumByCurrency(rows, pick);
  const entries = Object.entries(totals);
  if (entries.length === 0) return '—';
  return entries.map(([cur, val]) => formatMoney(val, cur)).join(' · ');
}

function OverviewTab({ paiements }) {
  const stats = useMemo(() => {
    const pending = paiements.filter((p) => p.status === 'À payer');
    const confirmed = paiements.filter((p) => p.soldeConfirme);
    const moezActive = paiements.filter(
      (p) => p.soldeConfirme && p.moezType && p.moezType !== 'Aucune'
    );
    return { pending, confirmed, moezActive };
  }, [paiements]);

  const recent = useMemo(
    () =>
      [...paiements]
        .sort((a, b) => (a.dueDate < b.dueDate ? 1 : -1))
        .slice(0, 8),
    [paiements]
  );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-3">
        <MetricCard label="Total brut" value={currencyTotalsLabel(paiements, (r) => r.amount)} />
        <MetricCard label="Net total" value={currencyTotalsLabel(paiements, (r) => r.netARecevoir)} />
        <MetricCard label="Paiements en attente" value={stats.pending.length} />
        <MetricCard
          label="Commission Moez active"
          value={currencyTotalsLabel(stats.moezActive, (r) => r.commissionMoez)}
        />
        <MetricCard
          label="Commission Commercial"
          value={currencyTotalsLabel(paiements, (r) => r.commCommercial)}
        />
        <MetricCard
          label="Soldes confirmés"
          value={`${stats.confirmed.length} / ${paiements.length}`}
        />
      </div>

      <section className="overflow-hidden rounded-2xl border border-border bg-surface">
        <div className="border-b border-border px-4 py-3">
          <h3 className="text-sm font-semibold text-text-strong">Derniers paiements</h3>
        </div>
        <div className="overflow-x-auto scroll-thin">
          <table className="min-w-full text-sm">
            <thead className="bg-canvas text-left text-xs uppercase tracking-wide text-text-muted">
              <tr>
                <th className="px-4 py-2.5 font-medium">Référence</th>
                <th className="px-4 py-2.5 font-medium">Étudiant</th>
                <th className="px-4 py-2.5 font-medium">Montant</th>
                <th className="px-4 py-2.5 font-medium">Taxe</th>
                <th className="px-4 py-2.5 font-medium">Net</th>
                <th className="px-4 py-2.5 font-medium">Statut</th>
                <th className="px-4 py-2.5 font-medium">Confirmé</th>
              </tr>
            </thead>
            <tbody>
              {recent.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-sm text-text-muted">
                    Aucun paiement
                  </td>
                </tr>
              ) : (
                recent.map((p) => {
                  const color = PAYMENT_STATUS_COLORS[p.status] || {
                    bg: '#F1EFE8',
                    text: '#5F5E5A',
                  };
                  return (
                    <tr key={p.id} className="border-t border-border">
                      <td className="px-4 py-3 text-xs font-medium text-text-muted">
                        {p.reference || '—'}
                      </td>
                      <td className="px-4 py-3 font-medium text-text-strong">
                        {p.fullName || '—'}
                      </td>
                      <td className="px-4 py-3 tabular-nums">
                        {formatMoney(p.amount, p.currency)}
                      </td>
                      <td className="px-4 py-3 tabular-nums">{p.taxe || 0}%</td>
                      <td className="px-4 py-3 font-semibold tabular-nums">
                        {formatMoney(p.netARecevoir, p.currency)}
                      </td>
                      <td className="px-4 py-3">
                        <Badge label={p.status || '—'} bg={color.bg} text={color.text} />
                      </td>
                      <td className="px-4 py-3">{p.soldeConfirme ? '✓' : '—'}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

export default function FinancePage() {
  const {
    paiements,
    people,
    purposeChoices,
    status,
    error,
    lastUpdated,
    refresh,
    create,
    update,
  } = useFinanceData();

  const [tab, setTab] = useState('overview');
  const [toast, setToast] = useState('');
  const [modal, setModal] = useState(null); // { mode: 'create' | 'edit', paiement? }

  const loading = status === 'loading';

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 4500);
  };

  const handleToggleConfirmed = async (paiement, checked) => {
    try {
      await update(paiement.id, { soldeConfirme: checked });
    } catch (err) {
      showToast(err.message || 'Mise à jour impossible');
    }
  };

  const handleUpdateMoez = async (id, payload) => {
    await update(id, payload);
    showToast('Commission Moez mise à jour');
  };

  const handleDuplicate = async (paiement) => {
    try {
      const created = await create({
        prospectRecordIds: paiement.prospectRecordIds,
        amount: paiement.amount,
        currency: paiement.currency,
        status: paiement.status,
        purpose: paiement.purpose,
        dueDate: paiement.dueDate,
        paymentDate: paiement.paymentDate,
        paymentMethod: paiement.paymentMethod,
        comment: paiement.comment,
        exemptionReason: paiement.exemptionReason,
        billingAddress: paiement.billingAddress,
        taxe: paiement.taxe,
        commCommercial: paiement.commCommercial,
        moezType: paiement.moezType,
        moezValeur: paiement.moezValeur,
        // A duplicate starts unconfirmed regardless of the source — confirming
        // a payment means money was actually received, which isn't true yet
        // for the copy.
        soldeConfirme: false,
      });
      showToast(`Paiement dupliqué — ${created.reference || 'nouvelle ligne'}`);
      setModal({ mode: 'edit', paiement: created });
    } catch (err) {
      showToast(err.message || 'Duplication impossible');
    }
  };

  return (
    <div className="min-h-full">
      <header className="sticky top-0 z-10 border-b border-border bg-surface/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-2 px-4 py-3 sm:gap-4 sm:px-6 sm:py-3.5">
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <Link
              to="/"
              className="flex shrink-0 items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-sm font-medium text-text-strong transition hover:border-border-strong"
            >
              ←<span className="hidden sm:inline"> Back</span>
            </Link>
            <h1 className="truncate text-sm font-semibold text-text-strong sm:text-base">
              <span className="sm:hidden">Finance</span>
              <span className="hidden sm:inline">JEExpert — Finance</span>
            </h1>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            {lastUpdated && (
              <span className="hidden text-xs text-text-muted sm:inline">
                Mis à jour{' '}
                {lastUpdated.toDateString() === new Date().toDateString()
                  ? lastUpdated.toLocaleTimeString('fr-FR', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : lastUpdated.toLocaleString('fr-FR', {
                      day: '2-digit',
                      month: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
              </span>
            )}
            <button
              onClick={refresh}
              disabled={loading}
              className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-3 py-1.5 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-60"
            >
              <span className={loading ? 'inline-block animate-spin' : ''}>↻</span>
              Refresh
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-5 sm:px-6 sm:py-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex gap-1 rounded-xl border border-border bg-surface p-1">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                  tab === t.id
                    ? 'bg-brand text-white shadow-sm'
                    : 'text-text-muted hover:text-text-strong'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
          {tab === 'paiements' && (
            <button
              type="button"
              onClick={() => setModal({ mode: 'create' })}
              className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-3 py-2 text-sm font-medium text-white transition hover:opacity-90"
            >
              + Nouveau paiement
            </button>
          )}
        </div>

        {status === 'error' && (
          <div className="mt-4">
            <ErrorState message={error} onRetry={refresh} />
          </div>
        )}

        <div className="mt-5">
          {tab === 'overview' && <OverviewTab paiements={paiements} />}
          {tab === 'paiements' && (
            <PaiementsTable
              paiements={paiements}
              loading={loading && paiements.length === 0}
              onEdit={(p) => setModal({ mode: 'edit', paiement: p })}
              onDuplicate={handleDuplicate}
              onToggleConfirmed={handleToggleConfirmed}
            />
          )}
          {tab === 'commissions' && (
            <CommissionsView paiements={paiements} onUpdateMoez={handleUpdateMoez} />
          )}
        </div>
      </main>

      {modal && (
        <PaiementModal
          open
          mode={modal.mode}
          paiement={modal.paiement}
          people={people}
          purposeChoices={purposeChoices}
          onClose={() => setModal(null)}
          onSubmit={async (payload) => {
            if (modal.mode === 'create') {
              await create(payload);
              showToast('Paiement créé');
            } else {
              await update(modal.paiement.id, payload);
              showToast('Paiement mis à jour');
            }
          }}
        />
      )}

      <Toast message={toast} onClose={() => setToast('')} />
    </div>
  );
}
