import Link from "next/link";
import { GlareCard } from "@/components/ui/GlareCard";

function Jauge({ label, valeur, cible, unite = "", atteint, couleur }) {
  const pct = cible ? Math.min(100, ((valeur ?? 0) / cible) * 100) : 0;
  const affichage = valeur == null ? "—" : valeur.toLocaleString("fr-FR", { maximumFractionDigits: 1 });

  return (
    <div>
      <div className="flex items-baseline justify-between">
        <span className="etiquette">{label}</span>
        <span className="tabular font-display text-sm font-semibold" style={atteint ? { color: couleur } : undefined}>
          {affichage}
          <span className="text-foreground-muted">/{cible}{unite}</span>
        </span>
      </div>
      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
        <div
          className="h-full rounded-full transition-all"
          style={{
            width: `${pct}%`,
            background: couleur,
            boxShadow: atteint ? `0 0 10px ${couleur}` : "none",
            opacity: atteint ? 1 : 0.55,
          }}
        />
      </div>
    </div>
  );
}

export default function SemaineCard({ libelle, bilan, serie, renseignee }) {
  return (
    <GlareCard className="p-5 sm:p-6" tiltIntensity={4}>
      <div className="flex items-baseline justify-between gap-3">
        <div>
          <h3 className="titre text-lg">Cette semaine</h3>
          <p className="text-xs text-foreground-muted">{libelle}</p>
        </div>
        {serie > 0 && (
          <div className="text-right">
            <div className="tabular font-display text-2xl font-semibold text-accent" style={{ textShadow: "0 0 14px rgba(143,227,255,0.6)" }}>
              {serie}
            </div>
            <div className="text-[10px] font-semibold uppercase tracking-wide text-foreground-muted">
              semaine{serie > 1 ? "s" : ""} d&apos;affilée
            </div>
          </div>
        )}
      </div>

      <div className="mt-4 space-y-3">
        <Jauge label="Séances" valeur={bilan.seances.valeur} cible={bilan.seances.cible} atteint={bilan.seances.atteint} couleur="#8fe3ff" />
        <Jauge label="Diète" valeur={bilan.diete.valeur} cible={bilan.diete.cible} atteint={bilan.diete.atteint} couleur="#9ff0c4" />
        <Jauge label="Sommeil" valeur={bilan.sommeil.valeur} cible={bilan.sommeil.cible} unite="h" atteint={bilan.sommeil.atteint} couleur="#b9a4ff" />
      </div>

      <Link
        href="/journal"
        className="mt-5 inline-flex min-h-12 w-full items-center justify-center rounded-full border border-white/15 bg-white/[0.06] px-4 py-2 text-sm font-semibold transition hover:border-accent/60 hover:bg-accent-soft"
      >
        {renseignee ? "Mettre à jour ma semaine" : "Remplir mon bilan de la semaine"}
      </Link>
    </GlareCard>
  );
}
