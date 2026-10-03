import { GlareCard } from "@/components/ui/GlareCard";

// Les mois déjà terminés, du plus récent au plus ancien.
//
// Une ligne par mois, avec les trois mêmes mesures que la carte du mois en
// cours : on doit pouvoir comparer d'un coup d'œil sans réapprendre à lire.
// Ces mois ne bougent plus — leurs semaines sont closes — donc une ligne
// compacte suffit, là où le mois en cours mérite sa carte.

const FORMAT = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1 });

function Colonne({ fait, cible, couleur, unite }) {
  const pct = cible > 0 ? Math.round((fait / cible) * 100) : 0;

  return (
    <div className="min-w-0 flex-1">
      <div className="flex items-baseline gap-1">
        <span className="font-display text-sm font-bold tabular-nums" style={{ color: couleur }}>
          {FORMAT.format(fait)}
        </span>
        <span className="text-[11px] text-foreground-muted tabular-nums">
          /{FORMAT.format(cible)}
          {unite}
        </span>
      </div>
      <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-black/35">
        <div className="h-full rounded-full" style={{ width: `${Math.min(100, pct)}%`, background: couleur }} />
      </div>
    </div>
  );
}

export default function HistoriqueMois({ mois }) {
  if (!mois || mois.length === 0) return null;

  return (
    <GlareCard className="p-5 sm:p-6" tiltIntensity={3}>
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="font-display text-base font-semibold">Mois précédents</h2>
        <span className="text-xs text-foreground-muted">
          {mois.length} mois archivé{mois.length > 1 ? "s" : ""}
        </span>
      </div>

      <div className="mt-3 flex items-center gap-3 text-[10px] font-semibold uppercase tracking-wide text-foreground-muted">
        <span className="w-24 shrink-0" />
        <span className="flex-1">Séances</span>
        <span className="flex-1">Diète</span>
        <span className="w-16 shrink-0 text-right">Sommeil</span>
      </div>

      <div className="mt-1 divide-y divide-border-soft/40">
        {mois.map((m) => (
          <div key={`${m.annee}-${m.mois}`} className="flex items-center gap-3 py-2.5">
            <span className="w-24 shrink-0 text-xs font-semibold capitalize">
              {new Date(m.annee, m.mois, 1)
                .toLocaleDateString("fr-FR", { month: "short", year: "2-digit" })
                .replace(".", "")}
            </span>
            <Colonne fait={m.seances.fait} cible={m.seances.cible} couleur="#4de8ff" unite="" />
            <Colonne fait={m.diete.fait} cible={m.diete.cible} couleur="#2fe6b8" unite="" />
            <span className="w-16 shrink-0 text-right font-display text-sm font-bold tabular-nums" style={{ color: "#b69cff" }}>
              {m.sommeil.moyenne == null ? "—" : `${FORMAT.format(m.sommeil.moyenne)} h`}
            </span>
          </div>
        ))}
      </div>
    </GlareCard>
  );
}
