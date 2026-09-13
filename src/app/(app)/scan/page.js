"use client";

import { useState } from "react";
import { IconUpload } from "@/components/icons";
import MesureForm from "@/components/MesureForm";

export default function ScanPage() {
  const [fichiers, setFichiers] = useState([]);
  const [envoi, setEnvoi] = useState(false);
  const [resultats, setResultats] = useState([]);

  async function handleUpload() {
    if (fichiers.length === 0) return;
    setEnvoi(true);
    const formData = new FormData();
    for (const f of fichiers) formData.append("fichiers", f);

    try {
      const res = await fetch("/api/scan", { method: "POST", body: formData });
      const data = await res.json();
      setResultats(data.resultats || []);
      setFichiers([]);
    } finally {
      setEnvoi(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-5 py-8 sm:px-10 sm:py-10">
      <h1 className="font-display text-2xl font-bold">Nouveau scan</h1>
      <p className="mt-1 text-sm text-foreground-muted">
        Dépose un ou plusieurs rapports Visbody (PDF). Les valeurs sont enregistrées automatiquement — tu peux les corriger juste après si besoin.
      </p>

      <label className="mt-6 flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-border-soft bg-background-soft/30 px-6 py-10 text-center transition hover:border-accent/60">
        <IconUpload width={28} height={28} className="text-accent" />
        <div>
          <div className="text-sm font-semibold">
            {fichiers.length > 0 ? `${fichiers.length} fichier(s) sélectionné(s)` : "Clique pour choisir un ou plusieurs PDF"}
          </div>
          <div className="mt-1 text-xs text-foreground-muted">Format PDF uniquement</div>
        </div>
        <input
          type="file"
          accept="application/pdf"
          multiple
          className="hidden"
          onChange={(e) => setFichiers(Array.from(e.target.files || []))}
        />
      </label>

      <button
        onClick={handleUpload}
        disabled={fichiers.length === 0 || envoi}
        className="mt-4 w-full rounded-lg bg-accent-soft border border-accent px-4 py-3 text-sm font-semibold disabled:opacity-40"
      >
        {envoi ? "Import en cours..." : `Importer ${fichiers.length > 0 ? `(${fichiers.length})` : ""}`}
      </button>

      {resultats.length > 0 && (
        <div className="mt-8 space-y-3">
          <h2 className="font-display text-sm font-semibold">Résultat de l'import</h2>
          {resultats.map((r, i) =>
            r.ok ? (
              <div key={r.mesure.id} className="rounded-xl border border-border-soft bg-background-soft/40 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold">
                    {new Date(r.mesure.dateScan).toLocaleDateString("fr-FR", {
                      day: "2-digit",
                      month: "long",
                      year: "numeric",
                    })}
                  </span>
                  <span className="rounded-full bg-emerald-400/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-300">
                    importé
                  </span>
                </div>
                {r.warnings?.length > 0 && (
                  <ul className="mt-2 space-y-1 text-[12px] text-amber-300">
                    {r.warnings.map((w, wi) => (
                      <li key={wi}>⚠ {w}</li>
                    ))}
                  </ul>
                )}
                <div className="mt-3">
                  <MesureForm mesure={r.mesure} compact />
                </div>
              </div>
            ) : (
              <div key={i} className="rounded-xl border border-red-400/30 bg-red-400/5 p-3 text-sm">
                <span className="font-semibold">{r.nom}</span> — {r.erreur}
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
}
