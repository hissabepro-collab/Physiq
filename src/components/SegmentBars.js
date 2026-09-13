// Visualisation simple de la répartition masse grasse/maigre par segment
// (bras gauche/droit, tronc, jambe gauche/droite) — donnée déjà extraite des
// rapports mais jusqu'ici jamais affichée.

function Barre({ label, valeur, max, couleur }) {
  const pct = max ? Math.min(100, (valeur / max) * 100) : 0;
  return (
    <div>
      <div className="flex items-center justify-between text-[11px] text-foreground-muted">
        <span>{label}</span>
        <span className="font-semibold text-foreground">{valeur?.toFixed(2) ?? "—"} kg</span>
      </div>
      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-black/25">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: couleur }} />
      </div>
    </div>
  );
}

export default function SegmentBars({ segments }) {
  if (!segments?.maigreKg) return null;
  const lean = segments.maigreKg;
  const fat = segments.grasseKg;
  const maxLean = Math.max(lean.brasGauche ?? 0, lean.brasDroit ?? 0, lean.jambeGauche ?? 0, lean.jambeDroite ?? 0, lean.tronc ?? 0);

  return (
    <div className="grid grid-cols-2 gap-x-6 gap-y-2.5">
      <Barre label="Bras gauche" valeur={lean.brasGauche} max={maxLean} couleur="#4de8ff" />
      <Barre label="Bras droit" valeur={lean.brasDroit} max={maxLean} couleur="#4de8ff" />
      <Barre label="Jambe gauche" valeur={lean.jambeGauche} max={maxLean} couleur="#4de8ff" />
      <Barre label="Jambe droite" valeur={lean.jambeDroite} max={maxLean} couleur="#4de8ff" />
      <div className="col-span-2">
        <Barre label="Tronc" valeur={lean.tronc} max={maxLean} couleur="#4de8ff" />
      </div>
      {fat && (
        <p className="col-span-2 mt-1 text-[10.5px] text-foreground-muted">
          Masse grasse — tronc {fat.tronc?.toFixed(2) ?? "—"} kg
        </p>
      )}
    </div>
  );
}
