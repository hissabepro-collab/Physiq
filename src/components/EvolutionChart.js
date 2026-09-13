"use client";

import { useState } from "react";

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
  const [survol, setSurvol] = useState(null); // { x, y, label, color, value, date }

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

  const tooltipW = 96;
  const tooltipX = survol ? Math.min(Math.max(survol.x - tooltipW / 2, 2), W - tooltipW - 2) : 0;
  const tooltipAbove = survol ? survol.y > 46 : true;
  const tooltipY = survol ? (tooltipAbove ? survol.y - 46 : survol.y + 14) : 0;

  return (
    <div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        height={H - 20}
        className="overflow-visible"
        onMouseLeave={() => setSurvol(null)}
      >
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
            style={{ filter: `drop-shadow(0 0 4px ${s.color}66)` }}
          />
        ))}

        {survol && (
          <line
            x1={survol.x}
            y1={PAD_TOP}
            x2={survol.x}
            y2={H - PAD_BOTTOM}
            stroke={survol.color}
            strokeOpacity={0.35}
            strokeDasharray="3 4"
          />
        )}

        {series.map((s) =>
          s.points.map((p, i) => {
            const x = xScale(p.date);
            const y = yScale(p.value);
            const estSurvole = survol && survol.label === s.label && survol.i === i;
            return (
              <g key={`${s.label}-${i}`}>
                {/* zone de détection plus large, invisible, pour un survol confortable au doigt/souris */}
                <circle
                  cx={x}
                  cy={y}
                  r={14}
                  fill="transparent"
                  onMouseEnter={() => setSurvol({ x, y, label: s.label, color: s.color, value: p.value, date: p.date, i })}
                  onTouchStart={() => setSurvol({ x, y, label: s.label, color: s.color, value: p.value, date: p.date, i })}
                  style={{ cursor: "pointer" }}
                />
                <circle
                  cx={x}
                  cy={y}
                  r={estSurvole ? 6.5 : i === s.points.length - 1 ? 5 : 3}
                  fill={s.color}
                  style={estSurvole ? { filter: `drop-shadow(0 0 6px ${s.color})` } : undefined}
                  pointerEvents="none"
                />
              </g>
            );
          })
        )}

        {survol && (
          <g pointerEvents="none">
            <rect
              x={tooltipX}
              y={tooltipY}
              width={tooltipW}
              height={38}
              rx={8}
              fill="rgba(6,20,26,0.92)"
              stroke={survol.color}
              strokeOpacity={0.6}
            />
            <text x={tooltipX + tooltipW / 2} y={tooltipY + 15} textAnchor="middle" style={{ fontSize: 9.5, fontWeight: 600, fill: "var(--foreground-muted)" }}>
              {survol.date.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })}
            </text>
            <text x={tooltipX + tooltipW / 2} y={tooltipY + 29} textAnchor="middle" style={{ fontSize: 13, fontWeight: 700, fill: survol.color }}>
              {formatValeur(survol.value)}
            </text>
          </g>
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
            <button
              type="button"
              key={`${s.label}-chip-${i}`}
              onMouseEnter={() => setSurvol({ x: xScale(p.date), y: yScale(p.value), label: s.label, color: s.color, value: p.value, date: p.date, i })}
              onMouseLeave={() => setSurvol(null)}
              className="flex shrink-0 flex-col items-center rounded-lg border border-border-soft bg-black/15 px-2.5 py-1.5 transition hover:border-current"
              style={{ color: s.color }}
            >
              <span className="text-[9.5px] font-semibold uppercase tracking-wide">
                {p.date.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })}
              </span>
              <span className="text-[12.5px] font-bold text-foreground">{formatValeur(p.value)}</span>
            </button>
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
