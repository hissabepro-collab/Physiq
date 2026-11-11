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
      <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-white/[0.06]">
        <div className="h-full rounded-full" style={{ width: `${Math.min(100, pct)}%`, background: couleur }} />
      </div>
    </div>
  );
}

// Écart entre le mois précédent et le plus récent, mesure par mesure. Une
// flèche indique le sens, et la couleur dit si c'est dans le bon sens : plus
// de séances ou plus de sommeil est bon, moins de jours de diète ne l'est pas.
function Ecart({ avant, apres, unite, bonSensHaut = true, decimales = 0 }) {
  if (avant == null || apres == null) return <span className="text-foreground-muted">—</span>;
  const diff = apres - avant;
  const monte = diff > 0;
  const egal = Math.abs(diff) < 0.05;
  const bon = egal ? null : monte === bonSensHaut;
  const couleur = egal ? "text-foreground-muted" : bon ? "text-emerald-300" : "text-red-400";
  const fleche = egal ? "=" : monte ? "▲" : "▼";
  return (
    <span className={`font-semibold tabular-nums ${couleur}`}>
      {fleche} {Math.abs(diff).toLocaleString("fr-FR", { maximumFractionDigits: decimales })}
      {unite}
    </span>
  );
}

function Comparaison({ precedent, recent }) {
  const libelle = (m) => new Date(m.annee, m.mois, 1).toLocaleDateString("fr-FR", { month: "long" });
  return (
    <div className="mb-4 rounded-xl border border-border-soft bg-black/20 p-3">
      <div className="text-[10px] font-bold uppercase tracking-[0.15em] text-accent/80">
        {libelle(precedent)} → {libelle(recent)}
      </div>
      <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
        <div>
          <div className="text-[10px] text-foreground-muted">Séances</div>
          <Ecart avant={precedent.seances.fait} apres={recent.seances.fait} unite="" />
        </div>
        <div>
          <div className="text-[10px] text-foreground-muted">Diète</div>
          <Ecart avant={precedent.diete.fait} apres={recent.diete.fait} unite="" />
        </div>
        <div>
          <div className="text-[10px] text-foreground-muted">Sommeil</div>
          <Ecart avant={precedent.sommeil.moyenne} apres={recent.sommeil.moyenne} unite=" h" decimales={1} />
        </div>
      </div>
    </div>
  );
}

export default function HistoriqueMois({ mois }) {
  if (!mois || mois.length === 0) return null;
  // mois[0] est le plus récent : on compare les deux derniers mois terminés.
  const comparable = mois.length >= 2;

  return (
    <GlareCard className="p-5 sm:p-6" tiltIntensity={3}>
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="titre text-lg">Mois précédents</h2>
        <span className="text-xs text-foreground-muted">
          {mois.length} mois archivé{mois.length > 1 ? "s" : ""}
        </span>
      </div>

      {comparable && <div className="mt-3"><Comparaison precedent={mois[1]} recent={mois[0]} /></div>}

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
            <Colonne fait={m.seances.fait} cible={m.seances.cible} couleur="#8fe3ff" unite="" />
            <Colonne fait={m.diete.fait} cible={m.diete.cible} couleur="#9ff0c4" unite="" />
            <span className="w-16 shrink-0 text-right font-display text-sm font-bold tabular-nums" style={{ color: "#b9a4ff" }}>
              {m.sommeil.moyenne == null ? "—" : `${FORMAT.format(m.sommeil.moyenne)} h`}
            </span>
          </div>
        ))}
      </div>
    </GlareCard>
  );
}
