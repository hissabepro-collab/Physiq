import { GlareCard } from "@/components/ui/GlareCard";
import { lundiDeSemaine } from "@/lib/semaines";

// Score d'assiduité depuis le début du suivi : ce que tu as réellement fait
// rapporté à ce que tu étais censé faire sur toute la période. Le dénominateur
// grandit chaque semaine, donc le pourcentage récompense la régularité et non
// le volume.

const FORMAT = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1 });

function Score({ label, fait, cible, couleur, suffixe }) {
  const pct = cible > 0 ? Math.round((fait / cible) * 100) : 0;
  const largeur = Math.min(100, pct);

  return (
    <div className="flex-1">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-foreground-muted">{label}</div>

      <div className="mt-1 flex items-baseline gap-1.5">
        <span
          className="font-display text-2xl font-bold tabular-nums"
          style={{ color: couleur, textShadow: `0 0 16px ${couleur}55` }}
        >
          {FORMAT.format(fait)}
        </span>
        <span className="text-sm text-foreground-muted tabular-nums">
          / {FORMAT.format(cible)} {suffixe}
        </span>
      </div>

      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-black/35">
        <div
          className="h-full rounded-full"
          style={{ width: `${largeur}%`, background: couleur, boxShadow: `0 0 10px ${couleur}` }}
        />
      </div>

      <div className="mt-1 text-[11px] font-semibold tabular-nums" style={{ color: couleur }}>
        {pct} %
      </div>
    </div>
  );
}

function Sommeil({ moyenne, cible, semainesMesurees }) {
  const couleur = "#b69cff";
  const atteint = moyenne != null && moyenne >= cible;

  return (
    <div className="flex-1">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-foreground-muted">Sommeil</div>

      <div className="mt-1 flex items-baseline gap-1.5">
        <span
          className="font-display text-2xl font-bold tabular-nums"
          style={{ color: couleur, textShadow: `0 0 16px ${couleur}55` }}
        >
          {moyenne == null ? "—" : `${FORMAT.format(moyenne)} h`}
        </span>
        <span className="text-sm text-foreground-muted tabular-nums">/ {cible} h</span>
      </div>

      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-black/35">
        <div
          className="h-full rounded-full"
          style={{
            width: `${moyenne == null ? 0 : Math.min(100, (moyenne / cible) * 100)}%`,
            background: couleur,
            boxShadow: atteint ? `0 0 10px ${couleur}` : "none",
            opacity: atteint ? 1 : 0.6,
          }}
        />
      </div>

      <div className="mt-1 text-[11px] text-foreground-muted">
        {semainesMesurees === 0
          ? "aucune semaine renseignée"
          : `moyenne par nuit · ${semainesMesurees} sem.`}
      </div>
    </div>
  );
}

export default function AssiduiteCard({ cumul, objectifs }) {
  if (!cumul) return null;

  const debut = lundiDeSemaine(cumul.depuis).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });

  return (
    <GlareCard className="p-5 sm:p-6" tiltIntensity={4}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h2 className="font-display text-base font-semibold">Depuis le début</h2>
        <span className="text-xs text-foreground-muted">
          {cumul.semaines} semaine{cumul.semaines > 1 ? "s" : ""} · depuis le {debut}
        </span>
      </div>

      <div className="mt-4 flex flex-col gap-5 sm:flex-row sm:gap-6">
        <Score
          label="Séances"
          fait={cumul.seances.fait}
          cible={cumul.seances.cible}
          suffixe="séances"
          couleur="#4de8ff"
        />
        <Score
          label="Diète"
          fait={cumul.diete.fait}
          cible={cumul.diete.cible}
          suffixe="jours"
          couleur="#2fe6b8"
        />
        <Sommeil
          moyenne={cumul.sommeil.moyenne}
          cible={cumul.sommeil.cible}
          semainesMesurees={cumul.sommeil.semainesMesurees}
        />
      </div>

      <p className="mt-4 text-[11px] leading-relaxed text-foreground-muted">
        Référence : {objectifs.seancesParSemaine} séances et {objectifs.dieteParSemaine} jours de diète par semaine,
        {" "}{objectifs.sommeilHeures} h de sommeil par nuit. La semaine en cours compte au prorata des jours
        déjà passés.
      </p>
    </GlareCard>
  );
}
