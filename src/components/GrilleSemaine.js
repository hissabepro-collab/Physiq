"use client";

import { JOURS, JOURS_LONGS } from "@/lib/semaines";

function Case({ actif, onClick, couleur, titre, lectureSeule }) {
  const base = "flex h-9 w-full items-center justify-center rounded-lg border text-[11px] font-bold transition";
  const styleActif = {
    borderColor: couleur,
    background: `${couleur}22`,
    color: couleur,
    boxShadow: `0 0 14px -4px ${couleur}`,
  };

  if (lectureSeule) {
    return (
      <div
        className={`${base} ${actif ? "" : "border-border-soft text-foreground-muted/40"}`}
        style={actif ? styleActif : undefined}
        title={titre}
      >
        {actif ? "✓" : "·"}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      title={titre}
      className={`${base} ${actif ? "" : "border-border-soft text-foreground-muted/50 hover:border-accent/50"}`}
      style={actif ? styleActif : undefined}
    >
      {actif ? "✓" : "·"}
    </button>
  );
}

/**
 * Grille du bilan de la semaine : une ligne "séances", une ligne "diète",
 * alignées sous les mêmes jours. `valeur` = tableau d'indices (0=lundi).
 */
export default function GrilleSemaine({
  seances = [],
  diete = [],
  onChangeSeances,
  onChangeDiete,
  lectureSeule = false,
}) {
  function bascule(liste, index, onChange) {
    if (!onChange) return;
    onChange(liste.includes(index) ? liste.filter((i) => i !== index) : [...liste, index].sort((a, b) => a - b));
  }

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-[86px_repeat(7,1fr)] items-center gap-1.5">
        <span />
        {JOURS.map((j, i) => (
          <span key={i} className="text-center text-[10px] font-bold uppercase tracking-wide text-foreground-muted">
            {j}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-[86px_repeat(7,1fr)] items-center gap-1.5">
        <span className="text-[11px] font-semibold text-foreground-muted">Séances</span>
        {JOURS.map((_, i) => (
          <Case
            key={i}
            actif={seances.includes(i)}
            onClick={() => bascule(seances, i, onChangeSeances)}
            couleur="#4de8ff"
            titre={`Séance le ${JOURS_LONGS[i].toLowerCase()}`}
            lectureSeule={lectureSeule}
          />
        ))}
      </div>

      <div className="grid grid-cols-[86px_repeat(7,1fr)] items-center gap-1.5">
        <span className="text-[11px] font-semibold text-foreground-muted">Diète</span>
        {JOURS.map((_, i) => (
          <Case
            key={i}
            actif={diete.includes(i)}
            onClick={() => bascule(diete, i, onChangeDiete)}
            couleur="#2fe6b8"
            titre={`Alimentation tenue le ${JOURS_LONGS[i].toLowerCase()}`}
            lectureSeule={lectureSeule}
          />
        ))}
      </div>
    </div>
  );
}
