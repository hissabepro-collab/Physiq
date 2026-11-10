"use client";

import { useState } from "react";
import { GlareCard } from "@/components/ui/GlareCard";
import { useRafraichir } from "@/lib/useRafraichir";

// Objectifs d'habitudes du mois : séances, diète et sommeil moyen. Chaque
// objectif est fixé par l'utilisateur, et sa progression est calculée sur le
// mois en cours depuis le Journal.

const NATURES = [
  { key: "seances", label: "Séances", unite: "séances", couleur: "#4de8ff" },
  { key: "diete", label: "Jours de diète", unite: "jours", couleur: "#2fe6b8" },
  { key: "sommeil", label: "Sommeil moyen", unite: "h / nuit", couleur: "#b69cff" },
];

function Barre({ pct, couleur }) {
  return (
    <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-black/35">
      <div
        className="h-full rounded-full"
        style={{ width: `${Math.max(0, Math.min(100, pct))}%`, background: couleur, boxShadow: pct >= 100 ? `0 0 10px ${couleur}` : "none" }}
      />
    </div>
  );
}

function Ligne({ nature, valeur, progression }) {
  const rafraichir = useRafraichir();
  const [saisie, setSaisie] = useState(valeur != null ? String(valeur) : "");
  const [statut, setStatut] = useState(null);

  async function enregistrer() {
    setStatut("en cours");
    const res = await fetch("/api/objectifs-mensuels", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nature: nature.key, valeurCible: saisie }),
    });
    setStatut(res.ok ? "enregistré" : "erreur");
    if (res.ok) rafraichir();
  }

  let corps = null;
  if (progression) {
    if (nature.key === "sommeil") {
      const moy = progression.moyenne;
      const pct = moy == null ? 0 : (moy / progression.cible) * 100;
      corps = (
        <>
          <div className="font-display text-xl font-bold tabular-nums" style={{ color: nature.couleur }}>
            {moy == null ? "—" : moy.toLocaleString("fr-FR", { maximumFractionDigits: 1 })}
            <span className="text-sm text-foreground-muted"> / {progression.cible} h</span>
          </div>
          <Barre pct={pct} couleur={nature.couleur} />
          <div className="mt-1 text-[11px] text-foreground-muted">
            {progression.nuits === 0 ? "aucune nuit renseignée ce mois-ci" : `${progression.nuits} nuit(s) hors week-end`}
          </div>
        </>
      );
    } else {
      const pct = progression.duJour > 0 ? (progression.fait / progression.duJour) * 100 : 0;
      corps = (
        <>
          <div className="font-display text-xl font-bold tabular-nums" style={{ color: nature.couleur }}>
            {progression.fait}
            <span className="text-sm text-foreground-muted"> / {progression.duJour} dû(s) · objectif {progression.cible}</span>
          </div>
          <Barre pct={pct} couleur={nature.couleur} />
        </>
      );
    }
  }

  return (
    <div className="py-3">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-foreground-muted">{nature.label}</span>
        <div className="flex items-center gap-1.5">
          <input
            type="number"
            step="0.5"
            inputMode="decimal"
            value={saisie}
            placeholder="aucun"
            onChange={(e) => setSaisie(e.target.value)}
            aria-label={`Objectif mensuel : ${nature.label}`}
            className="min-h-11 w-24 rounded-lg border border-border-soft bg-black/20 px-2 py-2 text-right text-sm outline-none focus:border-accent"
          />
          <span className="text-[11px] text-foreground-muted">{nature.unite}</span>
          <button onClick={enregistrer} className="min-h-11 rounded-lg border border-accent px-3.5 py-2 text-[11px] font-semibold">
            OK
          </button>
        </div>
      </div>
      {corps ?? <div className="mt-2 text-xs text-foreground-muted">Pas d'objectif fixé pour ce mois.</div>}
      {statut === "erreur" && <div className="mt-1 text-[11px] text-red-400">Enregistrement impossible.</div>}
    </div>
  );
}

export default function ObjectifsMensuels({ progression, libelleMois }) {
  return (
    <div className="mx-auto max-w-2xl px-5 pt-8 sm:px-10 sm:pt-10">
      <GlareCard className="p-5 sm:p-6" tiltIntensity={3}>
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="font-display text-base font-semibold">Objectifs du mois</h2>
          <span className="text-xs capitalize text-foreground-muted">{libelleMois}</span>
        </div>
        <p className="mt-1 text-[11px] leading-relaxed text-foreground-muted">
          Fixe ton objectif pour le mois. La progression tient compte des jours déjà passés.
        </p>
        <div className="mt-2 divide-y divide-border-soft/40">
          {NATURES.map((n) => (
            <Ligne key={n.key} nature={n} valeur={progression[n.key]?.cible ?? null} progression={progression[n.key]} />
          ))}
        </div>
      </GlareCard>
    </div>
  );
}
