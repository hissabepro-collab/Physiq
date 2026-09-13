"use client";

import { useState } from "react";
import EvolutionChart from "@/components/EvolutionChart";
import MesureForm from "@/components/MesureForm";
import SegmentBars from "@/components/SegmentBars";
import { IconChart, IconJournal } from "@/components/icons";

const METRIQUES = [
  { key: "poidsKg", label: "Poids", unite: "kg", color: "#4de8ff" },
  { key: "bfpPct", label: "Masse grasse", unite: "%", color: "#f0a38f" },
  { key: "masseMusculaireKg", label: "Masse musculaire", unite: "kg", color: "#4de8ff" },
  { key: "imc", label: "IMC", unite: "", color: "#b69cff" },
  { key: "scoreVisbody", label: "Score", unite: "/100", color: "#2fe6b8" },
];

function formatDate(date) {
  return new Date(date).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
}

export default function HistoriqueClient({ mesuresInitiales }) {
  const [mesures, setMesures] = useState(mesuresInitiales);
  const [vue, setVue] = useState("courbe");
  const [metrique, setMetrique] = useState(METRIQUES[0]);
  const [editionId, setEditionId] = useState(null);

  function handleSaved(updated) {
    setMesures((ms) => ms.map((m) => (m.id === updated.id ? updated : m)));
    setEditionId(null);
  }
  function handleDeleted(id) {
    setMesures((ms) => ms.filter((m) => m.id !== id));
  }

  const points = mesures
    .filter((m) => m[metrique.key] != null)
    .map((m) => ({ date: new Date(m.dateScan), value: m[metrique.key] }));

  return (
    <div className="mx-auto max-w-4xl px-5 py-8 sm:px-10 sm:py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-bold">Historique</h1>
        <div className="flex rounded-lg border border-border-soft p-1">
          <button
            onClick={() => setVue("courbe")}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold ${
              vue === "courbe" ? "bg-accent-soft text-accent" : "text-foreground-muted"
            }`}
          >
            <IconChart width={14} height={14} /> Courbe
          </button>
          <button
            onClick={() => setVue("liste")}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold ${
              vue === "liste" ? "bg-accent-soft text-accent" : "text-foreground-muted"
            }`}
          >
            <IconJournal width={14} height={14} /> Liste
          </button>
        </div>
      </div>

      {vue === "courbe" ? (
        <div className="mt-6 rounded-2xl border border-border-soft bg-background-soft/40 p-5 sm:p-7">
          <div className="flex flex-wrap gap-2">
            {METRIQUES.map((m) => (
              <button
                key={m.key}
                onClick={() => setMetrique(m)}
                className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                  metrique.key === m.key
                    ? "border-accent bg-accent-soft text-accent"
                    : "border-border-soft text-foreground-muted"
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
          <div className="mt-5">
            <EvolutionChart series={[{ label: metrique.label, color: metrique.color, points }]} />
          </div>
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          {[...mesures].reverse().map((m) => (
            <div key={m.id} className="rounded-2xl border border-border-soft bg-background-soft/40 p-4">
              <button
                onClick={() => setEditionId(editionId === m.id ? null : m.id)}
                className="flex w-full items-center justify-between text-left"
              >
                <span className="text-sm font-semibold">{formatDate(m.dateScan)}</span>
                <span className="flex gap-4 text-xs text-foreground-muted">
                  <span>{m.poidsKg ?? "—"} kg</span>
                  <span>{m.bfpPct ?? "—"} %</span>
                  <span>Score {m.scoreVisbody ?? "—"}</span>
                </span>
              </button>
              {editionId === m.id && (
                <div className="mt-4 border-t border-border-soft pt-4">
                  <MesureForm mesure={m} onSaved={handleSaved} onDeleted={handleDeleted} />
                  {m.segments && (
                    <div className="mt-5 border-t border-border-soft pt-4">
                      <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-foreground-muted">
                        Répartition par segment
                      </div>
                      <SegmentBars segments={m.segments} />
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
          {mesures.length === 0 && (
            <p className="text-sm text-foreground-muted">Aucun scan enregistré pour l'instant.</p>
          )}
        </div>
      )}
    </div>
  );
}
