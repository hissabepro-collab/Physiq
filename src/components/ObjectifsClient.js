"use client";

import { useState } from "react";

const METRIQUES = [
  { key: "poidsKg", label: "Poids", unite: "kg" },
  { key: "bfpPct", label: "Masse grasse", unite: "%" },
  { key: "masseMusculaireKg", label: "Masse musculaire", unite: "kg" },
];

function formatNombre(n) {
  if (n == null) return "—";
  return n.toLocaleString("fr-FR", { maximumFractionDigits: 1 });
}

function ProgressRing({ percent }) {
  const r = 30;
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(100, percent));
  return (
    <svg width="72" height="72" viewBox="0 0 72 72">
      <circle cx="36" cy="36" r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="7" />
      <circle
        cx="36"
        cy="36"
        r={r}
        fill="none"
        stroke="#4de8ff"
        strokeWidth="7"
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={c - (clamped / 100) * c}
        transform="rotate(-90 36 36)"
      />
    </svg>
  );
}

function CarteObjectif({ objectif, mesures, onDeleted }) {
  const meta = METRIQUES.find((m) => m.key === objectif.metrique) ?? { label: objectif.metrique, unite: "" };
  const valeurs = mesures.filter((m) => m[objectif.metrique] != null);
  const baseline = valeurs[0]?.[objectif.metrique];
  const courant = valeurs.at(-1)?.[objectif.metrique];
  const cible = objectif.valeurCible;

  let percent = 0;
  if (baseline != null && courant != null) {
    percent = cible === baseline ? (courant === cible ? 100 : 0) : ((courant - baseline) / (cible - baseline)) * 100;
  }

  async function supprimer() {
    if (!confirm("Supprimer cet objectif ?")) return;
    const res = await fetch(`/api/objectifs/${objectif.id}`, { method: "DELETE" });
    if (res.ok) onDeleted(objectif.id);
  }

  return (
    <div className="flex items-center gap-4 rounded-2xl border border-border-soft bg-background-soft/40 p-4">
      <ProgressRing percent={percent} />
      <div className="flex-1">
        <div className="text-sm font-semibold">{meta.label}</div>
        <div className="mt-0.5 text-xs text-foreground-muted">
          {formatNombre(courant)} {meta.unite} → objectif {formatNombre(cible)} {meta.unite}
        </div>
        <div className="mt-1 text-[11px] font-semibold text-accent">{Math.round(Math.max(0, Math.min(100, percent)))}%</div>
      </div>
      <button onClick={supprimer} className="self-start text-xs text-foreground-muted hover:text-red-400">
        Supprimer
      </button>
    </div>
  );
}

export default function ObjectifsClient({ objectifsInitiaux, mesures }) {
  const [objectifs, setObjectifs] = useState(objectifsInitiaux);
  const [metrique, setMetrique] = useState(METRIQUES[0].key);
  const [valeurCible, setValeurCible] = useState("");

  async function ajouter(e) {
    e.preventDefault();
    if (!valeurCible) return;
    const res = await fetch("/api/objectifs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ metrique, valeurCible }),
    });
    if (res.ok) {
      const { objectif } = await res.json();
      setObjectifs((o) => [objectif, ...o]);
      setValeurCible("");
    }
  }

  function handleDeleted(id) {
    setObjectifs((o) => o.filter((obj) => obj.id !== id));
  }

  return (
    <div className="mx-auto max-w-2xl px-5 py-8 sm:px-10 sm:py-10">
      <h1 className="font-display text-2xl font-bold">Objectifs</h1>
      <p className="mt-1 text-sm text-foreground-muted">
        Fixe une valeur cible par métrique. La progression est calculée depuis ton tout premier scan.
      </p>

      <form onSubmit={ajouter} className="mt-6 flex flex-wrap items-end gap-3 rounded-2xl border border-border-soft bg-background-soft/30 p-4">
        <label className="block">
          <span className="text-[11px] font-medium text-foreground-muted">Métrique</span>
          <select
            value={metrique}
            onChange={(e) => setMetrique(e.target.value)}
            className="mt-1 rounded-lg border border-border-soft bg-black/20 px-2.5 py-2 text-sm outline-none focus:border-accent"
          >
            {METRIQUES.map((m) => (
              <option key={m.key} value={m.key}>{m.label}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-[11px] font-medium text-foreground-muted">Valeur cible</span>
          <input
            type="number"
            step="0.1"
            value={valeurCible}
            onChange={(e) => setValeurCible(e.target.value)}
            className="mt-1 w-28 rounded-lg border border-border-soft bg-black/20 px-2.5 py-2 text-sm outline-none focus:border-accent"
          />
        </label>
        <button type="submit" className="rounded-lg border border-accent bg-accent-soft px-4 py-2 text-sm font-semibold">
          Ajouter l'objectif
        </button>
      </form>

      <div className="mt-6 space-y-3">
        {objectifs.map((o) => (
          <CarteObjectif key={o.id} objectif={o} mesures={mesures} onDeleted={handleDeleted} />
        ))}
        {objectifs.length === 0 && (
          <p className="text-sm text-foreground-muted">Aucun objectif défini pour l'instant.</p>
        )}
      </div>
    </div>
  );
}
