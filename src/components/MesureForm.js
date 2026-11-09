"use client";

import { useState } from "react";
import { useRafraichir } from "@/lib/useRafraichir";

// Tous les indicateurs que le parseur extrait d'un rapport, groupés comme ils
// apparaissent dans la mise en page du rapport. Chaque ligne ici doit exister
// dans le schéma Prisma et dans la liste blanche de l'API de modification.
export const GROUPES_MESURE = [
  {
    titre: "Score et composition",
    champs: [
      { key: "scoreVisbody", label: "Score Visbody", unite: "/100" },
      { key: "deltaScoreVisbody", label: "Variation du score", unite: "pts" },
      { key: "poidsKg", label: "Poids", unite: "kg" },
      { key: "masseGrasseKg", label: "Masse grasse", unite: "kg" },
      { key: "bfpPct", label: "Taux de graisse", unite: "%" },
      { key: "masseMusculaireKg", label: "Masse musculaire", unite: "kg" },
      { key: "smmKg", label: "Masse musculaire squelettique", unite: "kg" },
      { key: "masseMaigreKg", label: "Masse maigre", unite: "kg" },
    ],
  },
  {
    titre: "Eau corporelle",
    champs: [
      { key: "eauTotaleKg", label: "Eau totale", unite: "kg" },
      { key: "eauIntracellulaireKg", label: "Eau intracellulaire", unite: "kg" },
      { key: "eauExtracellulaireKg", label: "Eau extracellulaire", unite: "kg" },
      { key: "ratioEcwTbw", label: "Ratio ECW / TBW", unite: "" },
    ],
  },
  {
    titre: "Métabolisme et santé",
    champs: [
      { key: "imc", label: "IMC", unite: "" },
      { key: "rth", label: "Tour de taille / hanches", unite: "" },
      { key: "metabolismeBaseKcal", label: "Métabolisme de base", unite: "kcal/j" },
      { key: "ageMetabolique", label: "Âge métabolique", unite: "ans" },
      { key: "niveauGraisseViscerale", label: "Graisse viscérale", unite: "" },
      { key: "selsInorganiquesKg", label: "Sels minéraux", unite: "kg" },
      { key: "proteineKg", label: "Protéines", unite: "kg" },
    ],
  },
  {
    titre: "Valeurs idéales du rapport",
    champs: [
      { key: "poidsIdealKg", label: "Poids idéal", unite: "kg" },
      { key: "masseGrasseIdealeKg", label: "Masse grasse idéale", unite: "kg" },
    ],
  },
];

// Liste à plat, utilisée par le mode compact et par la sauvegarde.
export const CHAMPS_MESURE = GROUPES_MESURE.flatMap((g) => g.champs);

/** Date stockée → "AAAA-MM-JJ" dans le fuseau local, pour le champ date. */
function versDateLocale(valeur) {
  if (!valeur) return "";
  const d = new Date(valeur);
  const mois = String(d.getMonth() + 1).padStart(2, "0");
  const jour = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mois}-${jour}`;
}

export default function MesureForm({ mesure, onSaved, onDeleted, compact = false }) {
  const rafraichir = useRafraichir();
  const [valeurs, setValeurs] = useState(mesure);
  const [statut, setStatut] = useState(null);
  const [dateSaisie, setDateSaisie] = useState(() => versDateLocale(mesure.dateScan));

  function set(key, value) {
    setValeurs((v) => ({ ...v, [key]: value }));
  }

  async function enregistrer() {
    setStatut("en cours");
    const payload = {};
    for (const c of CHAMPS_MESURE) payload[c.key] = valeurs[c.key];
    if (!compact && dateSaisie) payload.dateScan = dateSaisie;
    const res = await fetch(`/api/mesures/${mesure.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      setStatut("enregistré");
      onSaved?.((await res.json()).mesure);
      rafraichir();
    } else {
      setStatut("erreur");
    }
  }

  async function supprimer() {
    if (!confirm("Supprimer définitivement ce scan ?")) return;
    const res = await fetch(`/api/mesures/${mesure.id}`, { method: "DELETE" });
    if (res.ok) {
      onDeleted?.(mesure.id);
      rafraichir();
    }
  }

  const groupes = compact
    ? [{ titre: null, champs: CHAMPS_MESURE.filter((c) => ["poidsKg", "bfpPct", "masseMusculaireKg", "imc"].includes(c.key)) }]
    : GROUPES_MESURE;

  return (
    <div>
      {!compact && (
        <label className="mb-4 block max-w-xs">
          <span className="text-[11px] font-medium text-foreground-muted">Date du scan</span>
          <input
            type="date"
            value={dateSaisie}
            onChange={(e) => setDateSaisie(e.target.value)}
            className="mt-1 w-full rounded-lg border border-border-soft bg-black/20 px-2.5 py-1.5 text-sm outline-none focus:border-accent"
          />
        </label>
      )}

      {groupes.map((g) => (
        <div key={g.titre ?? "compact"} className="mb-4">
          {g.titre && (
            <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.15em] text-accent/80">{g.titre}</div>
          )}
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            {g.champs.map((c) => (
              <label key={c.key} className="block">
                <span className="text-[11px] font-medium text-foreground-muted">
                  {c.label}
                  {c.unite && <span className="ml-1 opacity-60">({c.unite})</span>}
                </span>
                <input
                  type="number"
                  step="0.1"
                  value={valeurs[c.key] ?? ""}
                  onChange={(e) => set(c.key, e.target.value === "" ? null : Number(e.target.value))}
                  className="mt-1 w-full rounded-lg border border-border-soft bg-black/20 px-2.5 py-1.5 text-sm outline-none focus:border-accent"
                />
              </label>
            ))}
          </div>
        </div>
      ))}
      <div className="mt-3 flex items-center gap-3">
        <button
          onClick={enregistrer}
          className="rounded-lg border border-accent bg-accent-soft px-3.5 py-1.5 text-xs font-semibold"
        >
          Enregistrer
        </button>
        {onDeleted && (
          <button onClick={supprimer} className="rounded-lg px-3.5 py-1.5 text-xs font-semibold text-red-400">
            Supprimer ce scan
          </button>
        )}
        {statut === "enregistré" && <span className="text-xs text-emerald-300">Enregistré ✓</span>}
        {statut === "erreur" && <span className="text-xs text-red-400">Erreur</span>}
      </div>
    </div>
  );
}
