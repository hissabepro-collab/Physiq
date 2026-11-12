// Bilan corporel du dernier scan (voir lib/profilStats) : pour chaque
// indicateur, la valeur placée sur une jauge où la plage normale de Visbody
// est surlignée, un verdict en couleur et une phrase qui dit ce que ça veut
// dire. En tête, le résumé : points forts et points à surveiller.

const STATUTS = {
  fort: { label: "Point fort", classe: "text-mint bg-mint/10", point: "#9ff0c4" },
  ok: { label: "Dans la norme", classe: "text-foreground-muted bg-white/[0.06]", point: "#e4ecf3" },
  surveiller: { label: "À surveiller", classe: "text-amber-200 bg-amber-300/10", point: "#fcd38a" },
  attention: { label: "Attention", classe: "text-coral bg-coral/10", point: "#ff8f7a" },
};

function nombre(n, d = 1) {
  return n.toLocaleString("fr-FR", { minimumFractionDigits: d, maximumFractionDigits: d });
}

function Jauge({ valeur, plage, couleur }) {
  const largeur = plage.max - plage.min || 1;
  const bas = Math.max(plage.min === 0 ? 0 : -Infinity, plage.min - largeur * 0.7);
  const haut = plage.max + largeur * 0.7;
  const pos = (v) => Math.max(0, Math.min(100, ((v - bas) / (haut - bas)) * 100));
  return (
    <div className="relative mt-2 h-1.5 rounded-full bg-white/[0.06]">
      <div
        className="absolute inset-y-0 rounded-full bg-white/[0.16]"
        style={{ left: `${pos(plage.min)}%`, width: `${pos(plage.max) - pos(plage.min)}%` }}
      />
      <div
        className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-[#06080c]"
        style={{ left: `${pos(valeur)}%`, background: couleur }}
      />
    </div>
  );
}

export default function ProfilCard({ bilan }) {
  const forts = bilan.filter((b) => b.statut === "fort").length;
  const aSurveiller = bilan.filter((b) => b.statut === "surveiller" || b.statut === "attention").length;

  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="titre text-lg">Bilan corporel</h2>
        <span className="text-[11px] text-foreground-muted">dernier scan</span>
      </div>
      <p className="mt-1 text-xs text-foreground-muted">
        <span className="font-semibold text-mint">{forts} point{forts > 1 ? "s" : ""} fort{forts > 1 ? "s" : ""}</span>
        {" · "}
        <span className={`font-semibold ${aSurveiller ? "text-amber-200" : "text-foreground-muted"}`}>
          {aSurveiller} à surveiller
        </span>
        <span className="block">Comparé à la plage normale calculée par Visbody pour ton profil.</span>
      </p>

      <ul className="mt-4 space-y-4 lg:grid lg:grid-cols-2 lg:gap-x-10 lg:gap-y-5 lg:space-y-0">
        {bilan.map((b) => {
          const s = STATUTS[b.statut];
          const d = b.decimales ?? 1;
          return (
            <li key={b.cle}>
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-[12.5px] font-semibold lg:text-[14px]">{b.label}</span>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10.5px] font-semibold ${s.classe}`}>{s.label}</span>
              </div>
              <div className="mt-0.5 flex items-baseline justify-between gap-2 text-[11.5px] lg:text-[13px]">
                <span>
                  <span className="tabular font-semibold">
                    {nombre(b.valeur, d)}
                    {b.unite ? ` ${b.unite}` : ""}
                  </span>
                  {b.delta != null && b.delta !== 0 && (
                    <span className="ml-1.5 text-foreground-muted">
                      ({b.delta > 0 ? "+" : ""}
                      {nombre(b.delta, d)})
                    </span>
                  )}
                </span>
                <span className="text-foreground-faint">
                  norme {nombre(b.plage.min, d)}–{nombre(b.plage.max, d)}
                </span>
              </div>
              <Jauge valeur={b.valeur} plage={b.plage} couleur={s.point} />
              <p className="mt-1.5 text-[11.5px] leading-snug text-foreground-muted lg:text-[13px]">{b.texte}</p>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
