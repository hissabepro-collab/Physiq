"use client";

import { useState } from "react";
import StarRating from "@/components/StarRating";

function formatDate(date) {
  return new Date(date).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
}

export default function JournalClient({ entreesInitiales, mesures }) {
  const [entrees, setEntrees] = useState(entreesInitiales);
  const [texte, setTexte] = useState("");
  const [sommeilHeures, setSommeilHeures] = useState("");
  const [noteEtoiles, setNoteEtoiles] = useState(null);
  const [mesureId, setMesureId] = useState("");
  const [photo, setPhoto] = useState(null);
  const [envoi, setEnvoi] = useState(false);

  async function ajouter(e) {
    e.preventDefault();
    if (!texte && !sommeilHeures && !photo && !noteEtoiles) return;
    setEnvoi(true);
    const formData = new FormData();
    if (texte) formData.append("texte", texte);
    if (sommeilHeures) formData.append("sommeilHeures", sommeilHeures);
    if (noteEtoiles) formData.append("noteEtoiles", noteEtoiles);
    if (mesureId) formData.append("mesureId", mesureId);
    if (photo) formData.append("photo", photo);

    try {
      const res = await fetch("/api/journal", { method: "POST", body: formData });
      if (res.ok) {
        const { entree } = await res.json();
        setEntrees((e) => [entree, ...e]);
        setTexte("");
        setSommeilHeures("");
        setNoteEtoiles(null);
        setMesureId("");
        setPhoto(null);
      }
    } finally {
      setEnvoi(false);
    }
  }

  async function supprimer(id) {
    if (!confirm("Supprimer cette entrée ?")) return;
    const res = await fetch(`/api/journal/${id}`, { method: "DELETE" });
    if (res.ok) setEntrees((es) => es.filter((e) => e.id !== id));
  }

  return (
    <div className="mx-auto max-w-2xl px-5 py-8 sm:px-10 sm:py-10">
      <h1 className="font-display text-2xl font-bold">Journal</h1>
      <p className="mt-1 text-sm text-foreground-muted">
        Un bilan de semaine, ton sommeil, une photo de progression — pas besoin d'attendre un scan.
      </p>

      <form onSubmit={ajouter} className="mt-6 rounded-2xl border border-border-soft bg-background-soft/30 p-4">
        <div className="flex items-center justify-between gap-3">
          <span className="text-[11px] font-medium text-foreground-muted">Ressenti de la semaine</span>
          <StarRating value={noteEtoiles} onChange={setNoteEtoiles} />
        </div>

        <textarea
          value={texte}
          onChange={(e) => setTexte(e.target.value)}
          placeholder="Comment se sont passées tes séances cette semaine ?"
          rows={3}
          className="mt-3 w-full resize-none rounded-lg border border-border-soft bg-black/20 px-3 py-2 text-sm outline-none focus:border-accent"
        />
        <div className="mt-3 flex flex-wrap items-end gap-3">
          <label className="block">
            <span className="text-[11px] font-medium text-foreground-muted">Sommeil moyen (h/semaine)</span>
            <input
              type="number"
              step="0.5"
              value={sommeilHeures}
              onChange={(e) => setSommeilHeures(e.target.value)}
              className="mt-1 w-32 rounded-lg border border-border-soft bg-black/20 px-2.5 py-1.5 text-sm outline-none focus:border-accent"
            />
          </label>
          <label className="block">
            <span className="text-[11px] font-medium text-foreground-muted">Lier à un scan (optionnel)</span>
            <select
              value={mesureId}
              onChange={(e) => setMesureId(e.target.value)}
              className="mt-1 rounded-lg border border-border-soft bg-black/20 px-2.5 py-1.5 text-sm outline-none focus:border-accent"
            >
              <option value="">Aucun</option>
              {mesures.map((m) => (
                <option key={m.id} value={m.id}>{formatDate(m.dateScan)}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-[11px] font-medium text-foreground-muted">Photo (optionnel)</span>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setPhoto(e.target.files?.[0] ?? null)}
              className="mt-1 block text-xs text-foreground-muted"
            />
          </label>
        </div>
        <button
          type="submit"
          disabled={envoi}
          className="mt-4 rounded-lg border border-accent bg-accent-soft px-4 py-2 text-sm font-semibold disabled:opacity-40"
        >
          {envoi ? "Ajout..." : "Ajouter l'entrée"}
        </button>
      </form>

      <div className="mt-6 space-y-3">
        {entrees.map((e) => (
          <div key={e.id} className="rounded-2xl border border-border-soft bg-background-soft/40 p-4">
            <div className="flex items-start justify-between">
              <span className="text-xs font-semibold text-foreground-muted">{formatDate(e.date)}</span>
              <button onClick={() => supprimer(e.id)} className="text-xs text-foreground-muted hover:text-red-400">
                Supprimer
              </button>
            </div>
            {e.noteEtoiles != null && (
              <div className="mt-2">
                <StarRating value={e.noteEtoiles} readOnly />
              </div>
            )}
            {e.texte && <p className="mt-2 text-sm">{e.texte}</p>}
            {e.sommeilHeures != null && (
              <p className="mt-1 text-xs text-foreground-muted">Sommeil : {e.sommeilHeures} h/semaine</p>
            )}
            {e.photoUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={e.photoUrl} alt="Photo de progression" className="mt-3 max-h-64 rounded-xl border border-border-soft object-cover" />
            )}
          </div>
        ))}
        {entrees.length === 0 && <p className="text-sm text-foreground-muted">Aucune entrée pour l'instant.</p>}
      </div>
    </div>
  );
}
