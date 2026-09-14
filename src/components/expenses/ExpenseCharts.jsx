import { useState } from 'react';
import { formatMoney } from '../../lib/format.js';

const CHART_COLORS = [
  '#246BCE',
  '#18A999',
  '#B4530A',
  '#6B1CB0',
  '#A32D2D',
  '#185FA5',
  '#3B6D11',
  '#854F0B',
  '#5F5E5A',
];

function ChartCard({ title, children }) {
  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-surface">
      <div className="border-b border-border px-4 py-3">
        <h3 className="text-sm font-semibold text-text-strong">{title}</h3>
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}

function sortCurrencyEntries(byCurrency = {}) {
  return Object.entries(byCurrency).sort(([a], [b]) => {
    if (a === 'EUR') return -1;
    if (b === 'EUR') return 1;
    return a.localeCompare(b);
  });
}

/** One curve per currency — each series keeps its own Y scale so amounts are never mixed. */
export function MultiCurrencyLineChart({ data }) {
  const [hover, setHover] = useState(null); // { monthIndex, currency }

  const series = data?.series || [];
  const months = data?.months || [];

  if (!series.length || !months.length) {
    return <p className="py-8 text-center text-sm text-text-muted">No data</p>;
  }

  const w = 480;
  const h = Math.max(160, 56 + series.length * 72);
  const pad = { t: 12, r: 16, b: 28, l: 52 };
  const laneGap = 10;
  const usableH = h - pad.t - pad.b;
  const laneH =
    (usableH - laneGap * Math.max(series.length - 1, 0)) / series.length;
  const innerW = w - pad.l - pad.r;

  const xAt = (i) =>
    pad.l + (months.length === 1 ? innerW / 2 : (i / (months.length - 1)) * innerW);

  const hoverMonth = hover?.monthIndex;
  const tooltipRows =
    hoverMonth != null
      ? series
          .map((s, si) => ({
            currency: s.currency,
            value: s.points[hoverMonth]?.value || 0,
            color: CHART_COLORS[si % CHART_COLORS.length],
          }))
          .filter((r) => r.value > 0)
      : [];

  const tooltipX = hoverMonth != null ? xAt(hoverMonth) : 0;

  return (
    <div className="relative" onMouseLeave={() => setHover(null)}>
      <svg viewBox={`0 0 ${w} ${h}`} className="h-auto w-full" role="img">
        {series.map((s, si) => {
          const color = CHART_COLORS[si % CHART_COLORS.length];
          const top = pad.t + si * (laneH + laneGap);
          const max = Math.max(...s.points.map((p) => p.value), 1);
          const yAt = (v) => top + laneH - (v / max) * laneH;

          const path = s.points
            .map((p, i) => {
              const x = xAt(i);
              const y = yAt(p.value);
              return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
            })
            .join(' ');

          const ticks = [0, 0.5, 1].map((t) => t * max);

          return (
            <g key={s.currency}>
              <text
                x={4}
                y={top + 10}
                className="fill-text-strong"
                fontSize={10}
                fontWeight={600}
              >
                {s.currency}
              </text>
              {ticks.map((t) => {
                const y = yAt(t);
                return (
                  <g key={`${s.currency}-${t}`}>
                    <line
                      x1={pad.l}
                      x2={w - pad.r}
                      y1={y}
                      y2={y}
                      stroke="currentColor"
                      className="text-border"
                      strokeWidth={1}
                    />
                    <text
                      x={pad.l - 6}
                      y={y + 3}
                      textAnchor="end"
                      className="fill-text-muted"
                      fontSize={9}
                    >
                      {Math.round(t)}
                    </text>
                  </g>
                );
              })}
              <path
                d={path}
                fill="none"
                stroke={color}
                strokeWidth={2.25}
                strokeLinejoin="round"
                strokeLinecap="round"
              />
              {s.points.map((p, i) => {
                const x = xAt(i);
                const y = yAt(p.value);
                const active = hover?.monthIndex === i;
                return (
                  <g key={`${s.currency}-${p.label}`}>
                    <circle
                      cx={x}
                      cy={y}
                      r={active ? 4.5 : 3}
                      fill={color}
                      opacity={p.value === 0 ? 0.35 : 1}
                    />
                    <circle
                      cx={x}
                      cy={y}
                      r={12}
                      fill="transparent"
                      className="cursor-pointer"
                      onMouseEnter={() =>
                        setHover({ monthIndex: i, currency: s.currency })
                      }
                    />
                  </g>
                );
              })}
            </g>
          );
        })}

        {hoverMonth != null && (
          <line
            x1={tooltipX}
            x2={tooltipX}
            y1={pad.t}
            y2={h - pad.b}
            stroke="currentColor"
            className="text-text-muted"
            strokeWidth={1}
            strokeDasharray="3 3"
            opacity={0.5}
          />
        )}

        {months.map((label, i) => {
          const show =
            months.length <= 6 || i === 0 || i === months.length - 1 || i % 2 === 0;
          if (!show) return null;
          return (
            <text
              key={label}
              x={xAt(i)}
              y={h - 8}
              textAnchor="middle"
              className="fill-text-muted"
              fontSize={10}
            >
              {label}
            </text>
          );
        })}
      </svg>

      {hoverMonth != null && (
        <div
          className="pointer-events-none absolute z-10 min-w-[9.5rem] rounded-xl border border-border bg-surface px-3 py-2 shadow-lg"
          style={{
            left: `${(tooltipX / w) * 100}%`,
            top: '8%',
            transform:
              tooltipX / w > 0.7
                ? 'translate(-100%, 0)'
                : tooltipX / w < 0.3
                  ? 'translate(0, 0)'
                  : 'translate(-50%, 0)',
          }}
        >
          <p className="text-xs font-semibold text-text-strong">
            {months[hoverMonth]}
          </p>
          {tooltipRows.length === 0 ? (
            <p className="mt-1 text-xs text-text-muted">No spending</p>
          ) : (
            <ul className="mt-1.5 space-y-1">
              {tooltipRows.map((r) => (
                <li
                  key={r.currency}
                  className="flex items-center justify-between gap-4 text-xs"
                >
                  <span className="flex items-center gap-1.5 text-text-muted">
                    <span
                      className="inline-block h-2 w-2 rounded-full"
                      style={{ backgroundColor: r.color }}
                    />
                    {r.currency}
                  </span>
                  <span className="font-medium tabular-nums text-text-strong">
                    {formatMoney(r.value, r.currency)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

export function LineChart({ data, valueKey = 'value', labelKey = 'label' }) {
  const [hover, setHover] = useState(null);

  if (!data.length) {
    return <p className="py-8 text-center text-sm text-text-muted">No data</p>;
  }

  const w = 480;
  const h = 180;
  const pad = { t: 16, r: 16, b: 36, l: 44 };
  const innerW = w - pad.l - pad.r;
  const innerH = h - pad.t - pad.b;
  const max = Math.max(...data.map((d) => d[valueKey]), 1);

  const points = data.map((d, i) => {
    const x =
      pad.l + (data.length === 1 ? innerW / 2 : (i / (data.length - 1)) * innerW);
    const y = pad.t + innerH - (d[valueKey] / max) * innerH;
    return { x, y, ...d };
  });

  const path = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(' ');

  const ticks = 4;
  const yTicks = Array.from({ length: ticks + 1 }, (_, i) => (max / ticks) * i);

  const hoverPoint = hover != null ? points[hover] : null;
  const currencyLines = hoverPoint
    ? sortCurrencyEntries(hoverPoint.byCurrency)
    : [];

  return (
    <div
      className="relative"
      onMouseLeave={() => setHover(null)}
    >
      <svg viewBox={`0 0 ${w} ${h}`} className="h-auto w-full" role="img">
        {yTicks.map((t) => {
          const y = pad.t + innerH - (t / max) * innerH;
          return (
            <g key={t}>
              <line
                x1={pad.l}
                x2={w - pad.r}
                y1={y}
                y2={y}
                stroke="currentColor"
                className="text-border"
                strokeWidth={1}
              />
              <text
                x={pad.l - 6}
                y={y + 3}
                textAnchor="end"
                className="fill-text-muted"
                fontSize={10}
              >
                {Math.round(t)}
              </text>
            </g>
          );
        })}
        <path
          d={path}
          fill="none"
          stroke="#246BCE"
          strokeWidth={2.5}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {points.map((p, i) => (
          <g key={p[labelKey]}>
            {hover === i && (
              <line
                x1={p.x}
                x2={p.x}
                y1={pad.t}
                y2={pad.t + innerH}
                stroke="#246BCE"
                strokeWidth={1}
                strokeDasharray="3 3"
                opacity={0.45}
              />
            )}
            <circle
              cx={p.x}
              cy={p.y}
              r={hover === i ? 5.5 : 3.5}
              fill="#246BCE"
              className="transition-all"
            />
            <circle
              cx={p.x}
              cy={p.y}
              r={14}
              fill="transparent"
              className="cursor-pointer"
              onMouseEnter={() => setHover(i)}
            />
          </g>
        ))}
        {points.map((p, i) => {
          const show =
            data.length <= 6 || i === 0 || i === data.length - 1 || i % 2 === 0;
          if (!show) return null;
          return (
            <text
              key={`l-${p[labelKey]}`}
              x={p.x}
              y={h - 10}
              textAnchor="middle"
              className="fill-text-muted"
              fontSize={10}
            >
              {p[labelKey]}
            </text>
          );
        })}
      </svg>

      {hoverPoint && (
        <div
          className="pointer-events-none absolute z-10 min-w-[9rem] rounded-xl border border-border bg-surface px-3 py-2 shadow-lg"
          style={{
            left: `${(hoverPoint.x / w) * 100}%`,
            top: `${Math.max((hoverPoint.y / h) * 100 - 8, 4)}%`,
            transform:
              hoverPoint.x / w > 0.7
                ? 'translate(-100%, -100%)'
                : hoverPoint.x / w < 0.3
                  ? 'translate(0, -100%)'
                  : 'translate(-50%, -100%)',
          }}
        >
          <p className="text-xs font-semibold text-text-strong">
            {hoverPoint[labelKey]}
          </p>
          {currencyLines.length === 0 ? (
            <p className="mt-1 text-xs text-text-muted">No spending</p>
          ) : (
            <ul className="mt-1.5 space-y-1">
              {currencyLines.map(([cur, val]) => (
                <li
                  key={cur}
                  className="flex items-center justify-between gap-4 text-xs"
                >
                  <span className="text-text-muted">{cur}</span>
                  <span className="font-medium tabular-nums text-text-strong">
                    {formatMoney(val, cur)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

export function HorizontalBarChart({ data, valueKey = 'value', labelKey = 'label' }) {
  if (!data.length) {
    return <p className="py-8 text-center text-sm text-text-muted">No data</p>;
  }

  const max = Math.max(...data.map((d) => d[valueKey]), 1);

  return (
    <div className="space-y-2.5">
      {data.map((d, i) => {
        const pct = Math.max((d[valueKey] / max) * 100, 2);
        return (
          <div key={d[labelKey]} className="grid grid-cols-[7rem_1fr_auto] items-center gap-2">
            <span className="truncate text-xs text-text-muted" title={d[labelKey]}>
              {d[labelKey]}
            </span>
            <div className="h-2.5 overflow-hidden rounded-full bg-canvas">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${pct}%`,
                  backgroundColor: CHART_COLORS[i % CHART_COLORS.length],
                }}
              />
            </div>
            <span className="min-w-[3.5rem] text-right text-xs font-medium tabular-nums text-text-strong">
              {Math.round(d[valueKey])}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export function BarChart({ data, valueKey = 'value', labelKey = 'label' }) {
  if (!data.length) {
    return <p className="py-8 text-center text-sm text-text-muted">No data</p>;
  }

  const max = Math.max(...data.map((d) => d[valueKey]), 1);
  const h = 140;

  return (
    <div className="flex items-end gap-2 overflow-x-auto scroll-thin pb-1" style={{ height: h + 36 }}>
      {data.map((d, i) => {
        const barH = Math.max((d[valueKey] / max) * h, 4);
        return (
          <div
            key={d[labelKey]}
            className="flex min-w-[3.25rem] flex-1 flex-col items-center gap-1.5"
          >
            <span className="text-[10px] font-medium tabular-nums text-text-muted">
              {Math.round(d[valueKey])}
            </span>
            <div
              className="w-full max-w-[2.5rem] rounded-t-md"
              style={{
                height: barH,
                backgroundColor: CHART_COLORS[i % CHART_COLORS.length],
              }}
              title={`${d[labelKey]}: ${d[valueKey]}`}
            />
            <span
              className="w-full truncate text-center text-[10px] text-text-muted"
              title={d[labelKey]}
            >
              {d[labelKey]}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export function DoughnutChart({ data, valueKey = 'value', labelKey = 'label' }) {
  if (!data.length) {
    return <p className="py-8 text-center text-sm text-text-muted">No data</p>;
  }

  const total = data.reduce((s, d) => s + d[valueKey], 0) || 1;
  const size = 160;
  const stroke = 28;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  let offset = 0;

  const segments = data.map((d, i) => {
    const len = (d[valueKey] / total) * c;
    const seg = {
      ...d,
      color: CHART_COLORS[i % CHART_COLORS.length],
      dash: `${len} ${c - len}`,
      offset,
    };
    offset -= len;
    return seg;
  });

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0">
        <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
          {segments.map((s) => (
            <circle
              key={s[labelKey]}
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke={s.color}
              strokeWidth={stroke}
              strokeDasharray={s.dash}
              strokeDashoffset={s.offset}
            />
          ))}
        </g>
        <text
          x="50%"
          y="50%"
          textAnchor="middle"
          dominantBaseline="middle"
          className="fill-text-strong"
          fontSize={18}
          fontWeight={600}
        >
          {total}
        </text>
      </svg>
      <ul className="w-full space-y-1.5">
        {segments.map((s) => (
          <li key={s[labelKey]} className="flex items-center justify-between gap-3 text-sm">
            <span className="flex items-center gap-2 text-text-muted">
              <span
                className="inline-block h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: s.color }}
              />
              {s[labelKey]}
            </span>
            <span className="font-medium tabular-nums text-text-strong">{s[valueKey]}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export { ChartCard };
