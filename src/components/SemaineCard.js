import Link from "next/link";
import { GlareCard } from "@/components/ui/GlareCard";

function Jauge({ label, valeur, cible, unite = "", atteint, couleur }) {
  const pct = cible ? Math.min(100, ((valeur ?? 0) / cible) * 100) : 0;
  const affichage = valeur == null ? "—" : valeur.toLocaleString("fr-FR", { maximumFractionDigits: 1 });

  return (
    <div>
      <div className="flex items-baseline justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-foreground-muted">{label}</span>
        <span className="font-display text-sm font-bold" style={atteint ? { color: couleur } : undefined}>
          {affichage}
          <span className="text-foreground-muted">/{cible}{unite}</span>
        </span>
      </div>
      <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-black/30">
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
          <h2 className="font-display text-base font-semibold">Cette semaine</h2>
          <p className="text-xs text-foreground-muted">{libelle}</p>
        </div>
        {serie > 0 && (
          <div className="text-right">
            <div className="font-display text-xl font-bold text-accent" style={{ textShadow: "0 0 14px rgba(77,232,255,0.6)" }}>
              {serie}
            </div>
            <div className="text-[10px] font-semibold uppercase tracking-wide text-foreground-muted">
              semaine{serie > 1 ? "s" : ""} d'affilée
            </div>
          </div>
        )}
      </div>

      <div className="mt-4 space-y-3">
        <Jauge label="Séances" valeur={bilan.seances.valeur} cible={bilan.seances.cible} atteint={bilan.seances.atteint} couleur="#4de8ff" />
        <Jauge label="Diète" valeur={bilan.diete.valeur} cible={bilan.diete.cible} atteint={bilan.diete.atteint} couleur="#2fe6b8" />
        <Jauge label="Sommeil" valeur={bilan.sommeil.valeur} cible={bilan.sommeil.cible} unite="h" atteint={bilan.sommeil.atteint} couleur="#b69cff" />
      </div>

      <Link
        href="/journal"
        className="mt-4 inline-flex w-full items-center justify-center rounded-lg border border-accent bg-accent-soft px-4 py-2 text-xs font-semibold"
      >
        {renseignee ? "Mettre à jour ma semaine" : "Remplir mon bilan de la semaine"}
      </Link>
    </GlareCard>
  );
}
