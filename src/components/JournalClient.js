"use client";

import { useState } from "react";
import StarRating from "@/components/StarRating";
import PageHeader from "@/components/PageHeader";
import GrilleSemaine from "@/components/GrilleSemaine";
import { cleSemaine, libelleSemaine, semainePrecedente } from "@/lib/semaines";

function formatDate(date) {
  return new Date(date).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
}

export default function JournalClient({ entreesInitiales, mesures }) {
  const [entrees, setEntrees] = useState(entreesInitiales);
  const [semaine, setSemaine] = useState(() => cleSemaine(new Date()));
  const [texte, setTexte] = useState("");
  const [sommeilHeures, setSommeilHeures] = useState("");
  const [noteEtoiles, setNoteEtoiles] = useState(null);
  const [seances, setSeances] = useState([]);
  const [diete, setDiete] = useState([]);
  const [mesureId, setMesureId] = useState("");
  const [photo, setPhoto] = useState(null);
  const [envoi, setEnvoi] = useState(false);

  // Si un bilan existe déjà pour la semaine choisie, on le reprend pour le
  // compléter au lieu d'en créer un deuxième.
  function chargerSemaine(cle) {
    setSemaine(cle);
    const existante = entrees.find((e) => e.semaineIso === cle);
    setSeances(existante?.joursEntraines ?? []);
    setDiete(existante?.joursDiete ?? []);
    setSommeilHeures(existante?.sommeilHeures != null ? String(existante.sommeilHeures) : "");
    setNoteEtoiles(existante?.noteEtoiles ?? null);
    setTexte(existante?.texte ?? "");
  }

  async function ajouter(e) {
    e.preventDefault();
    if (!texte && !sommeilHeures && !photo && !noteEtoiles && seances.length === 0 && diete.length === 0) return;
    setEnvoi(true);
    const formData = new FormData();
    formData.append("semaineIso", semaine);
    formData.append("joursEntraines", JSON.stringify(seances));
    formData.append("joursDiete", JSON.stringify(diete));
    if (texte) formData.append("texte", texte);
    if (sommeilHeures) formData.append("sommeilHeures", sommeilHeures);
    if (noteEtoiles) formData.append("noteEtoiles", noteEtoiles);
    if (mesureId) formData.append("mesureId", mesureId);
    if (photo) formData.append("photo", photo);

    try {
      const res = await fetch("/api/journal", { method: "POST", body: formData });
      if (res.ok) {
        const { entree } = await res.json();
        setEntrees((liste) => [entree, ...liste.filter((x) => x.id !== entree.id)]);
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
      <PageHeader
        kicker="Ton ressenti"
        title="Journal"
        subtitle="Ce que les chiffres ne disent pas : ta forme, ton sommeil, ce qui a changé dans ta semaine. C'est ce qui expliquera tes courbes dans six mois."
      />

      <form onSubmit={ajouter} className="mt-6 rounded-2xl border border-border-soft bg-background-soft/30 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => chargerSemaine(semainePrecedente(semaine))}
              className="rounded-lg border border-border-soft px-2 py-1 text-xs text-foreground-muted hover:border-accent/60 hover:text-foreground"
            >
              ←
            </button>
            <span className="font-display text-sm font-bold">{libelleSemaine(semaine)}</span>
            {semaine !== cleSemaine(new Date()) && (
              <button
                type="button"
                onClick={() => chargerSemaine(cleSemaine(new Date()))}
                className="text-[11px] font-semibold text-accent"
              >
                revenir à cette semaine
              </button>
            )}
          </div>
          <StarRating value={noteEtoiles} onChange={setNoteEtoiles} />
        </div>

        <div className="mt-4">
          <GrilleSemaine seances={seances} diete={diete} onChangeSeances={setSeances} onChangeDiete={setDiete} />
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
            <span className="text-[11px] font-medium text-foreground-muted">Sommeil moyen (h/nuit)</span>
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
          {envoi ? "Enregistrement..." : "Enregistrer le bilan de la semaine"}
        </button>
      </form>

      <div className="mt-6 space-y-3">
        {entrees.map((e) => (
          <div key={e.id} className="rounded-2xl border border-border-soft bg-background-soft/40 p-4">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-xs font-semibold text-foreground-muted">
                  {e.semaineIso ? `Semaine ${libelleSemaine(e.semaineIso)}` : formatDate(e.date)}
                </span>
                {e.semaineIso && (
                  <button
                    type="button"
                    onClick={() => chargerSemaine(e.semaineIso)}
                    className="ml-2 text-[11px] font-semibold text-accent"
                  >
                    modifier
                  </button>
                )}
              </div>
              <button onClick={() => supprimer(e.id)} className="text-xs text-foreground-muted hover:text-red-400">
                Supprimer
              </button>
            </div>
            {e.noteEtoiles != null && (
              <div className="mt-2">
                <StarRating value={e.noteEtoiles} readOnly />
              </div>
            )}
            {(e.joursEntraines?.length > 0 || e.joursDiete?.length > 0) && (
              <div className="mt-3">
                <GrilleSemaine seances={e.joursEntraines ?? []} diete={e.joursDiete ?? []} lectureSeule />
              </div>
            )}
            {e.texte && <p className="mt-3 text-sm">{e.texte}</p>}
            {e.sommeilHeures != null && (
              <p className="mt-1 text-xs text-foreground-muted">Sommeil : {e.sommeilHeures} h/nuit en moyenne</p>
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
