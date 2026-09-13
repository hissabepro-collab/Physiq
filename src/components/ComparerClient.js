"use client";

import { useMemo, useState } from "react";
import { IconTrendDown } from "@/components/icons";

const METRIQUES = [
  { key: "poidsKg", label: "Poids", unite: "kg", senseInverse: true },
  { key: "bfpPct", label: "Masse grasse", unite: "%", senseInverse: true },
  { key: "masseMusculaireKg", label: "Masse musculaire", unite: "kg", senseInverse: false },
  { key: "smmKg", label: "SMM", unite: "kg", senseInverse: false },
  { key: "imc", label: "IMC", unite: "", senseInverse: true },
  { key: "niveauGraisseViscerale", label: "Graisse viscérale", unite: "", senseInverse: true },
  { key: "scoreVisbody", label: "Score", unite: "/100", senseInverse: false },
];

function formatDate(date) {
  return new Date(date).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
}

function plusProche(mesures, dateCible) {
  return mesures.reduce((meilleur, m) => {
    const diff = Math.abs(new Date(m.dateScan) - dateCible);
    const diffMeilleur = meilleur ? Math.abs(new Date(meilleur.dateScan) - dateCible) : Infinity;
    return diff < diffMeilleur ? m : meilleur;
  }, null);
}

function formatNombre(n) {
  if (n == null) return "—";
  return n.toLocaleString("fr-FR", { maximumFractionDigits: 1 });
}

export default function ComparerClient({ mesures, photosParMesure }) {
  const derniere = mesures.at(-1);
  const avantDerniere = mesures.at(-2);

  const [idA, setIdA] = useState(avantDerniere?.id ?? derniere?.id);
  const [idB, setIdB] = useState(derniere?.id);

  function appliquerPreset(joursAvant) {
    if (!derniere) return;
    const cible = new Date(derniere.dateScan);
    cible.setDate(cible.getDate() - joursAvant);
    const candidats = mesures.filter((m) => m.id !== derniere.id);
    const proche = plusProche(candidats, cible) ?? candidats.at(-1);
    if (proche) setIdA(proche.id);
    setIdB(derniere.id);
  }

  const mesureA = mesures.find((m) => m.id === idA);
  const mesureB = mesures.find((m) => m.id === idB);

  if (!derniere || mesures.length < 2) {
    return (
      <div className="mx-auto max-w-3xl px-5 py-10 text-sm text-foreground-muted">
        Il faut au moins deux scans enregistrés pour pouvoir comparer.
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-5 py-8 sm:px-10 sm:py-10">
      <h1 className="font-display text-2xl font-bold">Comparer</h1>
      <p className="mt-1 text-sm text-foreground-muted">Choisis deux dates, ou utilise un raccourci rapide.</p>

      <div className="mt-4 flex flex-wrap gap-2">
        <button onClick={() => appliquerPreset(7)} className="rounded-full border border-border-soft px-3 py-1.5 text-xs font-semibold text-foreground-muted hover:border-accent/60 hover:text-foreground">
          Cette semaine vs semaine dernière
        </button>
        <button onClick={() => appliquerPreset(30)} className="rounded-full border border-border-soft px-3 py-1.5 text-xs font-semibold text-foreground-muted hover:border-accent/60 hover:text-foreground">
          Ce mois vs mois dernier
        </button>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <label className="block">
          <span className="text-[11px] font-medium text-foreground-muted">Avant</span>
          <select
            value={idA}
            onChange={(e) => setIdA(e.target.value)}
            className="mt-1 w-full rounded-lg border border-border-soft bg-black/20 px-2.5 py-2 text-sm outline-none focus:border-accent"
          >
            {mesures.map((m) => (
              <option key={m.id} value={m.id}>{formatDate(m.dateScan)}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-[11px] font-medium text-foreground-muted">Après</span>
          <select
            value={idB}
            onChange={(e) => setIdB(e.target.value)}
            className="mt-1 w-full rounded-lg border border-border-soft bg-black/20 px-2.5 py-2 text-sm outline-none focus:border-accent"
          >
            {mesures.map((m) => (
              <option key={m.id} value={m.id}>{formatDate(m.dateScan)}</option>
            ))}
          </select>
        </label>
      </div>

      {(photosParMesure[idA] || photosParMesure[idB]) && (
        <div className="mt-5 grid grid-cols-2 gap-3">
          {[idA, idB].map((id) => (
            <div key={id} className="aspect-[3/4] overflow-hidden rounded-xl border border-border-soft bg-background-soft/40">
              {photosParMesure[id] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={photosParMesure[id]} alt="Photo de progression" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center text-xs text-foreground-muted">Pas de photo</div>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="mt-6 space-y-2">
        {METRIQUES.map((met) => {
          const a = mesureA?.[met.key];
          const b = mesureB?.[met.key];
          const delta = a != null && b != null ? b - a : null;
          const positif = delta != null && (met.senseInverse ? delta < 0 : delta > 0);
          const negatif = delta != null && (met.senseInverse ? delta > 0 : delta < 0);
          return (
            <div key={met.key} className="flex items-center justify-between rounded-xl border border-border-soft bg-background-soft/30 px-4 py-3">
              <span className="text-sm font-medium text-foreground-muted">{met.label}</span>
              <div className="flex items-center gap-3 text-sm">
                <span>{formatNombre(a)} {met.unite}</span>
                <span className="text-foreground-muted">→</span>
                <span className="font-semibold">{formatNombre(b)} {met.unite}</span>
                {delta != null && Math.abs(delta) > 0.05 && (
                  <span
                    className={`ml-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                      positif ? "bg-emerald-400/10 text-emerald-300" : negatif ? "bg-red-400/10 text-red-300" : ""
                    }`}
                  >
                    <IconTrendDown width={10} height={10} className={delta > 0 ? "rotate-180" : ""} />
                    {delta > 0 ? "+" : ""}{formatNombre(delta)}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
