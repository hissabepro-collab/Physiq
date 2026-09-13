"use client";

// Radar / spider chart générique — jusqu'à 8 axes, un seul jeu de données.
// Conforme aux recommandations du skill ui-ux-pro-max pour ce type de graphique :
// 5-8 axes max, remplissage ~20%, bordure pleine opacité, labels directs.

const SIZE = 220;
const CENTER = SIZE / 2;
const MAX_R = 82;

function point(index, total, r) {
  const angle = (Math.PI * 2 * index) / total - Math.PI / 2;
  return { x: CENTER + r * Math.cos(angle), y: CENTER + r * Math.sin(angle) };
}

function polygonPoints(values, total) {
  return values
    .map((v, i) => {
      const p = point(i, total, (Math.max(0, Math.min(100, v)) / 100) * MAX_R);
      return `${p.x.toFixed(1)},${p.y.toFixed(1)}`;
    })
    .join(" ");
}

export default function RadarStats({ axes }) {
  const total = axes.length;
  const grilles = [1, 0.66, 0.33];

  return (
    <svg viewBox={`0 0 ${SIZE} ${SIZE}`} width="100%" height={SIZE} className="overflow-visible">
      {grilles.map((f) => (
        <polygon
          key={f}
          points={axes.map((_, i) => {
            const p = point(i, total, MAX_R * f);
            return `${p.x.toFixed(1)},${p.y.toFixed(1)}`;
          }).join(" ")}
          fill="none"
          stroke="currentColor"
          strokeOpacity={0.12}
        />
      ))}

      {axes.map((_, i) => {
        const p = point(i, total, MAX_R);
        return (
          <line
            key={i}
            x1={CENTER}
            y1={CENTER}
            x2={p.x}
            y2={p.y}
            stroke="currentColor"
            strokeOpacity={0.12}
          />
        );
      })}

      <polygon
        points={polygonPoints(axes.map((a) => a.valeur), total)}
        fill="#4de8ff"
        fillOpacity={0.22}
        stroke="#4de8ff"
        strokeWidth={2}
      />

      {axes.map((a, i) => {
        const p = point(i, total, (Math.max(0, Math.min(100, a.valeur)) / 100) * MAX_R);
        return <circle key={i} cx={p.x} cy={p.y} r={2.8} fill="#eafbff" />;
      })}

      {axes.map((a, i) => {
        const p = point(i, total, MAX_R + 16);
        const anchor = Math.abs(p.x - CENTER) < 8 ? "middle" : p.x > CENTER ? "start" : "end";
        return (
          <text
            key={i}
            x={p.x}
            y={p.y}
            textAnchor={anchor}
            dominantBaseline="middle"
            className="fill-foreground-muted"
            style={{ fontSize: 9, fontWeight: 600, letterSpacing: 0.5 }}
          >
            {a.label.toUpperCase()}
          </text>
        );
      })}
    </svg>
  );
}
