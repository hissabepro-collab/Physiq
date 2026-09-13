import { IconTrendDown } from "@/components/icons";

function formatNombre(n) {
  if (n == null) return "—";
  return n.toLocaleString("fr-FR", { maximumFractionDigits: 1 });
}

export default function StatCard({ label, value, unite, precedente, senseInverse = false }) {
  const delta = value != null && precedente != null ? value - precedente : null;
  const positif = delta != null && (senseInverse ? delta < 0 : delta > 0);
  const negatif = delta != null && (senseInverse ? delta > 0 : delta < 0);

  return (
    <div className="rounded-2xl border border-border-soft bg-background-soft/40 p-4 sm:p-5">
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
    </div>
  );
}
