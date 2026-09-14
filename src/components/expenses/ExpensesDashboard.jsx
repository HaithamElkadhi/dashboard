import { useMemo, useState } from 'react';
import MetricCard from '../finance/MetricCard.jsx';
import { formatMoney } from '../../lib/format.js';
import { EXPENSE_CATEGORIES } from '../../lib/config.js';
import {
  BarChart,
  ChartCard,
  MultiCurrencyLineChart,
} from './ExpenseCharts.jsx';

function monthKey(isoDate) {
  if (!isoDate) return null;
  return String(isoDate).slice(0, 7); // YYYY-MM
}

function currentMonthKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function sumByCurrency(rows) {
  const totals = {};
  for (const r of rows) {
    const cur = r.currency || 'EUR';
    totals[cur] = (totals[cur] || 0) + (r.amount || 0);
  }
  return totals;
}

function currencyTotalsLabel(totals) {
  const entries = Object.entries(totals);
  if (entries.length === 0) return '—';
  entries.sort(([a], [b]) => {
    if (a === 'EUR') return -1;
    if (b === 'EUR') return 1;
    return a.localeCompare(b);
  });
  return entries.map(([cur, val]) => formatMoney(val, cur)).join(' · ');
}

const pillClass = (active) =>
  `rounded-lg px-2.5 py-1.5 text-xs font-medium transition ${
    active
      ? 'bg-brand text-white'
      : 'border border-border bg-surface text-text-muted hover:border-border-strong hover:text-text-strong'
  }`;

export default function ExpensesDashboard({ expenses }) {
  const [categoryFilter, setCategoryFilter] = useState('All');

  const filtered = useMemo(() => {
    if (categoryFilter === 'All') return expenses;
    return expenses.filter((e) => e.categories?.includes(categoryFilter));
  }, [expenses, categoryFilter]);

  const stats = useMemo(() => {
    const pending = filtered.filter((e) => e.status === 'Pending');
    const thisMonth = filtered.filter(
      (e) => monthKey(e.date) === currentMonthKey()
    );
    return {
      totalByCurrency: sumByCurrency(filtered),
      count: filtered.length,
      pendingCount: pending.length,
      pendingByCurrency: sumByCurrency(pending),
      thisMonthByCurrency: sumByCurrency(thisMonth),
      thisMonthCount: thisMonth.length,
    };
  }, [filtered]);

  const monthly = useMemo(() => {
    const monthSet = new Set();
    const currencySet = new Set();
    const byMonthCurrency = {};

    for (const e of filtered) {
      const key = monthKey(e.date);
      if (!key) continue;
      const cur = e.currency || 'EUR';
      const amt = e.amount || 0;
      monthSet.add(key);
      currencySet.add(cur);
      if (!byMonthCurrency[key]) byMonthCurrency[key] = {};
      byMonthCurrency[key][cur] = (byMonthCurrency[key][cur] || 0) + amt;
    }

    const months = [...monthSet].sort();
    const currencies = [...currencySet].sort((a, b) => {
      if (a === 'EUR') return -1;
      if (b === 'EUR') return 1;
      return a.localeCompare(b);
    });

    const series = currencies.map((currency) => ({
      currency,
      points: months.map((label) => ({
        label,
        value: byMonthCurrency[label]?.[currency] || 0,
      })),
    }));

    return { months, series };
  }, [filtered]);

  const byMethod = useMemo(() => {
    const map = {};
    for (const e of filtered) {
      const m = e.paymentMethod || 'Unspecified';
      map[m] = (map[m] || 0) + (e.amount || 0);
    }
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .map(([label, value]) => ({ label, value }));
  }, [filtered]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="mr-1 w-16 shrink-0 text-[11px] font-medium uppercase tracking-wide text-text-muted">
          Category
        </span>
        {['All', ...EXPENSE_CATEGORIES].map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setCategoryFilter(c)}
            className={pillClass(categoryFilter === c)}
          >
            {c}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-4">
        <MetricCard
          label="Total spent"
          value={currencyTotalsLabel(stats.totalByCurrency)}
        />
        <MetricCard label="Total transactions" value={stats.count} />
        <MetricCard
          label="Pending"
          value={stats.pendingCount}
          hint={
            stats.pendingCount
              ? currencyTotalsLabel(stats.pendingByCurrency)
              : undefined
          }
        />
        <MetricCard
          label="This month"
          value={currencyTotalsLabel(stats.thisMonthByCurrency)}
          hint={
            stats.thisMonthCount
              ? `${stats.thisMonthCount} expense${stats.thisMonthCount === 1 ? '' : 's'}`
              : undefined
          }
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="Monthly spending">
          <MultiCurrencyLineChart data={monthly} />
        </ChartCard>
        <ChartCard title="By payment method">
          <BarChart data={byMethod} />
        </ChartCard>
      </div>
    </div>
  );
}
