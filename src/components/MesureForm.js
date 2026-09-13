"use client";

import { useState } from "react";

export const CHAMPS_MESURE = [
  { key: "scoreVisbody", label: "Score Visbody", unite: "/100" },
  { key: "poidsKg", label: "Poids", unite: "kg" },
  { key: "bfpPct", label: "Masse grasse", unite: "%" },
  { key: "masseMusculaireKg", label: "Masse musculaire", unite: "kg" },
  { key: "smmKg", label: "SMM", unite: "kg" },
  { key: "masseMaigreKg", label: "Masse maigre", unite: "kg" },
  { key: "imc", label: "IMC", unite: "" },
  { key: "rth", label: "RTH", unite: "" },
  { key: "metabolismeBaseKcal", label: "Métabolisme de base", unite: "kcal/j" },
  { key: "niveauGraisseViscerale", label: "Graisse viscérale", unite: "" },
  { key: "eauTotaleKg", label: "Eau totale", unite: "kg" },
  { key: "ageMetabolique", label: "Âge métabolique", unite: "ans" },
];

export default function MesureForm({ mesure, onSaved, onDeleted, compact = false }) {
  const [valeurs, setValeurs] = useState(mesure);
  const [statut, setStatut] = useState(null);

  function set(key, value) {
    setValeurs((v) => ({ ...v, [key]: value }));
  }

  async function enregistrer() {
    setStatut("en cours");
    const payload = {};
    for (const c of CHAMPS_MESURE) payload[c.key] = valeurs[c.key];
    const res = await fetch(`/api/mesures/${mesure.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      setStatut("enregistré");
      onSaved?.((await res.json()).mesure);
    } else {
      setStatut("erreur");
    }
  }

  async function supprimer() {
    if (!confirm("Supprimer définitivement ce scan ?")) return;
    const res = await fetch(`/api/mesures/${mesure.id}`, { method: "DELETE" });
    if (res.ok) onDeleted?.(mesure.id);
  }

  const champs = compact
    ? CHAMPS_MESURE.filter((c) => ["poidsKg", "bfpPct", "masseMusculaireKg", "imc"].includes(c.key))
    : CHAMPS_MESURE;

  return (
    <div>
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        {champs.map((c) => (
          <label key={c.key} className="block">
            <span className="text-[11px] font-medium text-foreground-muted">{c.label}</span>
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
