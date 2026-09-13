"use client";

// Graphique d'évolution générique (SVG), piloté par de vraies données.
// `series` : [{ label, color, dashed?, points: [{ date: Date, value: number }] }]

const W = 640;
const H = 220;
const PAD_X = 12;
const PAD_TOP = 16;
const PAD_BOTTOM = 28;

function buildPath(points, xScale, yScale) {
  if (points.length === 0) return "";
  if (points.length === 1) {
    const x = xScale(points[0].date);
    const y = yScale(points[0].value);
    return `M${x},${y} L${x},${y}`;
  }
  return points
    .map((p, i) => `${i === 0 ? "M" : "L"}${xScale(p.date)},${yScale(p.value)}`)
    .join(" ");
}

export default function EvolutionChart({ series, formatMonth = defaultFormatMonth }) {
  const allPoints = series.flatMap((s) => s.points);
  if (allPoints.length === 0) {
    return (
      <div className="flex h-[220px] items-center justify-center text-sm text-foreground-muted">
        Pas encore assez de données pour afficher une courbe.
      </div>
    );
  }

  const dates = allPoints.map((p) => p.date.getTime());
  const values = allPoints.map((p) => p.value);
  const minDate = Math.min(...dates);
  const maxDate = Math.max(...dates);
  const rawMinValue = Math.min(...values);
  const rawMaxValue = Math.max(...values);
  const span = rawMaxValue - rawMinValue || 1;
  const minValue = rawMinValue - span * 0.15;
  const maxValue = rawMaxValue + span * 0.15;

  const xScale = (date) => {
    if (maxDate === minDate) return W / 2;
    return PAD_X + ((date.getTime() - minDate) / (maxDate - minDate)) * (W - PAD_X * 2);
  };
  const yScale = (value) => {
    const usableH = H - PAD_TOP - PAD_BOTTOM;
    return PAD_TOP + usableH - ((value - minValue) / (maxValue - minValue)) * usableH;
  };

  const monthTicks = buildMonthTicks(new Date(minDate), new Date(maxDate));

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H - 20} className="overflow-visible">
        <line x1={0} y1={PAD_TOP} x2={W} y2={PAD_TOP} stroke="currentColor" strokeOpacity={0.06} />
        <line
          x1={0}
          y1={(H - PAD_BOTTOM + PAD_TOP) / 2}
          x2={W}
          y2={(H - PAD_BOTTOM + PAD_TOP) / 2}
          stroke="currentColor"
          strokeOpacity={0.06}
        />
        <line x1={0} y1={H - PAD_BOTTOM} x2={W} y2={H - PAD_BOTTOM} stroke="currentColor" strokeOpacity={0.06} />

        {series.map((s) => (
          <path
            key={s.label}
            d={buildPath(s.points, xScale, yScale)}
            fill="none"
            stroke={s.color}
            strokeWidth={s.dashed ? 2.5 : 3.5}
            strokeDasharray={s.dashed ? "1 7" : undefined}
            strokeLinecap="round"
          />
        ))}

        {series.map((s) =>
          s.points.map((p, i) => (
            <circle
              key={`${s.label}-${i}`}
              cx={xScale(p.date)}
              cy={yScale(p.value)}
              r={i === s.points.length - 1 ? 5 : 3}
              fill={s.color}
            />
          ))
        )}
      </svg>
      <div className="mt-1 flex justify-between text-[11px] font-medium text-foreground-muted">
        {monthTicks.map((d, i) => (
          <span key={i}>{formatMonth(d)}</span>
        ))}
      </div>

      <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
        {series.map((s) =>
          s.points.map((p, i) => (
            <div
              key={`${s.label}-chip-${i}`}
              className="flex shrink-0 flex-col items-center rounded-lg border border-border-soft bg-black/15 px-2.5 py-1.5"
            >
              <span className="text-[9.5px] font-semibold uppercase tracking-wide" style={{ color: s.color }}>
                {p.date.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })}
              </span>
              <span className="text-[12.5px] font-bold">{formatValeur(p.value)}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function formatValeur(v) {
  return v.toLocaleString("fr-FR", { maximumFractionDigits: 1 });
}

function buildMonthTicks(min, max) {
  const ticks = [];
  const cur = new Date(min.getFullYear(), min.getMonth(), 1);
  const end = new Date(max.getFullYear(), max.getMonth(), 1);
  while (cur <= end && ticks.length < 8) {
    ticks.push(new Date(cur));
    cur.setMonth(cur.getMonth() + 1);
  }
  if (ticks.length === 0) ticks.push(min);
  return ticks;
}

function defaultFormatMonth(date) {
  return date.toLocaleDateString("fr-FR", { month: "short" }).replace(".", "");
}
