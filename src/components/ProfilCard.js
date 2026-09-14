import RadarStats from "@/components/RadarStats";

function format(n, unite) {
  if (n == null) return "—";
  return `${n.toLocaleString("fr-FR", { maximumFractionDigits: unite === "kcal" ? 0 : 2 })}${unite ? ` ${unite}` : ""}`;
}

export default function ProfilCard({ axes }) {
  return (
    <div>
      <h2 className="font-display text-base font-semibold">Profil</h2>
      <p className="text-xs text-foreground-muted">
        Position de chaque valeur dans la plage normale calculée par Visbody pour ton profil.
      </p>

      <div className="mt-2">
        <RadarStats axes={axes} />
      </div>

      <ul className="mt-3 space-y-1.5 border-t border-border-soft pt-3">
        {axes.map((a) => (
          <li key={a.label} className="flex items-baseline justify-between gap-2 text-[11.5px]">
            <span className="font-semibold text-foreground-muted">{a.label}</span>
            <span className="text-right">
              <span className="font-semibold">{format(a.valeurReelle, a.unite)}</span>
              {a.plage && (
                <span className="ml-1.5 text-foreground-muted">
                  (normale {a.plage.min}–{a.plage.max})
                </span>
              )}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
