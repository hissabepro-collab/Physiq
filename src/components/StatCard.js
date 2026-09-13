import { IconTrendDown } from "@/components/icons";
import { GlareCard } from "@/components/ui/GlareCard";

function formatNombre(n) {
  if (n == null) return "—";
  return n.toLocaleString("fr-FR", { maximumFractionDigits: 1 });
}

function Sparkline({ valeurs, color }) {
  const propres = valeurs.filter((v) => v != null);
  if (propres.length < 2) return null;
  const min = Math.min(...propres);
  const max = Math.max(...propres);
  const span = max - min || 1;
  const w = 100;
  const h = 26;
  const pts = propres.map((v, i) => {
    const x = (i / (propres.length - 1)) * w;
    const y = h - ((v - min) / span) * h;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h} className="mt-2.5" preserveAspectRatio="none">
      <polyline points={pts.join(" ")} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function StatCard({ label, value, unite, precedente, senseInverse = false, historique = [] }) {
  const delta = value != null && precedente != null ? value - precedente : null;
  const positif = delta != null && (senseInverse ? delta < 0 : delta > 0);
  const negatif = delta != null && (senseInverse ? delta > 0 : delta < 0);
  const couleurSpark = historique.length > 1 && !senseInverse ? "#4de8ff" : "#f0a38f";

  return (
    <GlareCard className="p-4 sm:p-5" tiltIntensity={6}>
      <div className="text-[11px] font-semibold uppercase tracking-wide text-foreground-muted">
        {label}
      </div>
      <div className="mt-2 font-display text-2xl font-bold sm:text-[28px]">
        {formatNombre(value)}
        <span className="ml-1 text-sm font-medium text-foreground-muted">{unite}</span>
      </div>
      {delta != null && Math.abs(delta) > 0.05 && (
        <div
          className={`mt-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
            positif
              ? "bg-emerald-400/10 text-emerald-300"
              : negatif
              ? "bg-red-400/10 text-red-300"
              : "text-foreground-muted"
          }`}
        >
          <IconTrendDown width={11} height={11} className={delta > 0 ? "rotate-180" : ""} />
          {delta > 0 ? "+" : ""}
          {formatNombre(delta)}
        </div>
      )}
      <Sparkline valeurs={historique} color={couleurSpark} />
    </GlareCard>
  );
}
