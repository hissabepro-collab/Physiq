"use client";

import { useState } from "react";
import Link from "next/link";
import { IconUpload } from "@/components/icons";
import MesureForm from "@/components/MesureForm";
import PageHeader from "@/components/PageHeader";

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
      // Une réponse qui n'est pas du JSON (erreur serveur, session expirée,
      // dépassement de taille) ne doit plus disparaître en silence : on le dit.
      const texte = await res.text();
      let data = null;
      try {
        data = JSON.parse(texte);
      } catch {}

      if (!res.ok || !data) {
        const raison = data?.error || (res.status === 413 ? "fichier trop volumineux" : `erreur ${res.status}`);
        setResultats([{ nom: "Import", ok: false, erreur: `Échec de l'envoi : ${raison}` }]);
        return;
      }
      setResultats(data.resultats || []);
      setFichiers([]);
    } catch (e) {
      setResultats([{ nom: "Import", ok: false, erreur: `Connexion impossible : ${e.message}` }]);
    } finally {
      setEnvoi(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-5 py-8 sm:px-10 sm:py-10">
      <PageHeader
        kicker="Importer un rapport"
        title="Nouveau scan"
        subtitle="Dépose un ou plusieurs rapports Visbody (PDF). Les valeurs sont enregistrées automatiquement — tu peux les corriger juste après si besoin."
      />

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
        className="mt-4 w-full rounded-full bg-accent text-[#04121a] border border-accent px-4 py-3 text-sm font-semibold disabled:opacity-40"
      >
        {envoi ? "Import en cours..." : `Importer ${fichiers.length > 0 ? `(${fichiers.length})` : ""}`}
      </button>

      {resultats.length > 0 && (
        <div className="mt-8 space-y-3">
          <h2 className="titre text-lg">Résultat de l&apos;import</h2>
          {resultats.some((r) => r.ok) && (
            // Analyse du coach juste après l'import (13/11/2026). Un lien et
            // non un lancement automatique : on peut d'abord corriger une
            // valeur mal lue dans le PDF ci-dessous.
            <Link
              href={`/coach?mode=scan&q=${encodeURIComponent("Analyse mon dernier scan.")}`}
              className="flex min-h-12 items-center justify-between gap-3 rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-[#06080c]"
            >
              <span>
                Voir l&apos;analyse du coach
                <span className="block text-xs font-normal opacity-70">Ce qui a bougé, ce qui est fiable, et le cap des 2 prochaines semaines</span>
              </span>
              <span aria-hidden="true">→</span>
            </Link>
          )}
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
