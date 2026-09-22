import { useMemo, useRef, useState } from 'react';

const PAD = { top: 16, right: 16, bottom: 28, left: 40 };
const W = 900;
const H = 260;

function niceMax(value) {
  if (value <= 0) return 10;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const steps = [1, 2, 2.5, 5, 10];
  for (const s of steps) {
    const candidate = s * magnitude;
    if (candidate >= value) return candidate;
  }
  return magnitude * 10;
}

function shortDate(date) {
  return date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
}

function fullDate(date) {
  return date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}

/** Single-series trend for one KPI status, over the full snapshot history. */
export default function StatusTrendChart({ snapshots, metric }) {
  const svgRef = useRef(null);
  const [hoverIndex, setHoverIndex] = useState(null);

  const chart = useMemo(() => {
    if (!snapshots || snapshots.length === 0) return null;

    const points = snapshots.map((s) => ({
      dateObj: new Date(s.date),
      value: s[metric.key] ?? 0,
    }));
    const minTime = points[0].dateObj.getTime();
    const maxTime = points[points.length - 1].dateObj.getTime();
    const span = Math.max(maxTime - minTime, 1);
    const maxValue = niceMax(Math.max(...points.map((p) => p.value)));

    const innerW = W - PAD.left - PAD.right;
    const innerH = H - PAD.top - PAD.bottom;
    const x = (t) => PAD.left + ((t - minTime) / span) * innerW;
    const y = (v) => PAD.top + innerH - (v / maxValue) * innerH;

    const d = points
      .map((p, i) => `${i === 0 ? 'M' : 'L'}${x(p.dateObj.getTime())},${y(p.value)}`)
      .join(' ');

    const yTicks = [0, 0.25, 0.5, 0.75, 1].map((f) => ({
      value: Math.round(maxValue * f),
      y: y(maxValue * f),
    }));

    // Show up to ~7 date labels across the axis, always including both ends.
    const tickEvery = Math.max(1, Math.ceil(points.length / 7));
    const xTicks = points
      .map((p, i) => ({ i, p }))
      .filter(({ i }) => i === 0 || i === points.length - 1 || i % tickEvery === 0);

    const last = points[points.length - 1];

    return { points, x, y, d, yTicks, xTicks, last };
  }, [snapshots, metric.key]);

  function handlePointerMove(e) {
    if (!chart || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * W;
    let nearest = 0;
    let best = Infinity;
    chart.points.forEach((p, i) => {
      const d = Math.abs(chart.x(p.dateObj.getTime()) - px);
      if (d < best) {
        best = d;
        nearest = i;
      }
    });
    setHoverIndex(nearest);
  }

  if (!chart) {
    return (
      <p className="flex h-[260px] items-center justify-center text-sm text-text-muted">
        Aucune donnée
      </p>
    );
  }

  const hovered = hoverIndex != null ? chart.points[hoverIndex] : null;
  const shown = hovered ?? chart.last;
  const hx = chart.x(shown.dateObj.getTime());

  return (
    <div className="relative" onPointerLeave={() => setHoverIndex(null)}>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full"
        onPointerMove={handlePointerMove}
        role="img"
        aria-label={`Évolution de ${metric.label} dans le temps`}
      >
        {chart.yTicks.map((t) => (
          <g key={t.value}>
            <line
              x1={PAD.left}
              x2={W - PAD.right}
              y1={t.y}
              y2={t.y}
              stroke="var(--border)"
              strokeWidth={1}
            />
            <text x={PAD.left - 8} y={t.y + 3} textAnchor="end" fontSize={10} fill="var(--text-muted)">
              {t.value}
            </text>
          </g>
        ))}

        <path
          d={chart.d}
          fill="none"
          stroke={metric.color}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* End marker with a surface ring + direct value label */}
        <circle
          cx={chart.x(chart.last.dateObj.getTime())}
          cy={chart.y(chart.last.value)}
          r={4}
          fill={metric.color}
          stroke="var(--surface)"
          strokeWidth={2}
        />
        <text
          x={chart.x(chart.last.dateObj.getTime()) + 6}
          y={chart.y(chart.last.value) - 6}
          fontSize={11}
          fontWeight={600}
          fill="var(--text-strong)"
        >
          {chart.last.value}
        </text>

        {hovered && (
          <g>
            <line
              x1={hx}
              x2={hx}
              y1={PAD.top}
              y2={H - PAD.bottom}
              stroke="var(--border-strong)"
              strokeWidth={1}
            />
            <circle
              cx={hx}
              cy={chart.y(hovered.value)}
              r={4}
              fill={metric.color}
              stroke="var(--surface)"
              strokeWidth={2}
            />
          </g>
        )}

        {chart.xTicks.map(({ i, p }) => (
          <text
            key={i}
            x={chart.x(p.dateObj.getTime())}
            y={H - 8}
            textAnchor={i === 0 ? 'start' : i === chart.points.length - 1 ? 'end' : 'middle'}
            fontSize={10}
            fill="var(--text-muted)"
          >
            {shortDate(p.dateObj)}
          </text>
        ))}
      </svg>

      {hovered && (
        <div
          className="pointer-events-none absolute top-2 rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs shadow-lg"
          style={{
            left: `${(hx / W) * 100}%`,
            transform: hx > W * 0.7 ? 'translateX(-105%)' : 'translateX(8%)',
          }}
        >
          <p className="mb-1 font-medium text-text-strong">{fullDate(hovered.dateObj)}</p>
          <div className="flex items-center gap-1.5">
            <span
              className="inline-block h-0.5 w-3 shrink-0"
              style={{ backgroundColor: metric.color }}
            />
            <span className="text-text-muted">{metric.label}</span>
            <span className="ml-auto font-semibold tabular-nums text-text-strong">
              {hovered.value}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
