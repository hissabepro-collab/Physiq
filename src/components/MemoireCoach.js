"use client";

import { useCallback, useEffect, useState } from "react";

// « Ce que le coach retient » : la mémoire du coach, visible et modifiable.
// Le coach y ajoute lui-même ce qu'Issa lui dit de durable ; Issa peut
// ajouter une note à la main ou en supprimer une. `version` change après
// chaque réponse du coach, pour relire la liste (une note a pu être ajoutée).

function dateCourte(d) {
  return new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "short", timeZone: "Europe/Paris" });
}

export default function MemoireCoach({ version = 0 }) {
  const [notes, setNotes] = useState(null);
  const [ouvert, setOuvert] = useState(false);
  const [saisie, setSaisie] = useState("");
  const [occupe, setOccupe] = useState(false);
  const [erreur, setErreur] = useState(null);

  const charger = useCallback(async () => {
    try {
      const rep = await fetch("/api/coach/memoire", { cache: "no-store" });
      if (!rep.ok) throw new Error(String(rep.status));
      const { notes: liste } = await rep.json();
      setNotes(liste);
    } catch {
      setNotes((n) => n ?? []);
    }
  }, []);

  useEffect(() => {
    const id = setTimeout(charger, 0);
    return () => clearTimeout(id);
  }, [charger, version]);

  async function ajouter(e) {
    e.preventDefault();
    const texte = saisie.trim();
    if (!texte || occupe) return;
    setOccupe(true);
    setErreur(null);
    try {
      const rep = await fetch("/api/coach/memoire", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ texte }),
      });
      const corps = await rep.json().catch(() => ({}));
      if (!rep.ok) throw new Error(corps.erreur || "Échec");
      setSaisie("");
      await charger();
    } catch (err) {
      setErreur(err.message === "Échec" ? "La note n'a pas pu être enregistrée." : err.message);
    } finally {
      setOccupe(false);
    }
  }

  async function supprimer(id) {
    setOccupe(true);
    setErreur(null);
    try {
      const rep = await fetch(`/api/coach/memoire?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      if (!rep.ok) throw new Error();
      setNotes((n) => (n ?? []).filter((x) => x.id !== id));
    } catch {
      setErreur("La note n'a pas pu être supprimée.");
    } finally {
      setOccupe(false);
    }
  }

  const nombre = notes?.length ?? 0;

  return (
    <section className="verre mt-6 rounded-2xl">
      <button
        type="button"
        onClick={() => setOuvert((v) => !v)}
        aria-expanded={ouvert}
        className="flex min-h-12 w-full items-center justify-between gap-3 px-5 py-3 text-left"
      >
        <span>
          <span className="block text-sm font-semibold">Ce que le coach retient</span>
          <span className="block text-xs text-foreground-muted">
            {notes == null ? "…" : nombre === 0 ? "Rien pour l'instant" : `${nombre} note${nombre > 1 ? "s" : ""}`}
          </span>
        </span>
        <span className={`text-foreground-muted transition ${ouvert ? "rotate-180" : ""}`} aria-hidden="true">
          ▾
        </span>
      </button>

      {ouvert && (
        <div className="border-t border-white/5 px-5 pb-5 pt-3">
          <p className="text-xs text-foreground-muted">
            Dis-lui simplement « retiens que… » dans la discussion, ou ajoute une note ici. Il relit tout à chaque question.
          </p>

          {nombre > 0 && (
            <ul className="mt-3 space-y-2">
              {notes.map((n) => (
                <li key={n.id} className="flex items-start gap-2 rounded-xl bg-white/[0.03] px-3 py-2 text-sm">
                  <span className="flex-1">
                    {n.texte}
                    <span className="mt-0.5 block text-[11px] text-foreground-muted">
                      {n.source === "utilisateur" ? "Ajoutée par toi" : "Notée par le coach"} · {dateCourte(n.createdAt)}
                    </span>
                  </span>
                  <button
                    type="button"
                    onClick={() => supprimer(n.id)}
                    disabled={occupe}
                    aria-label={`Supprimer la note : ${n.texte}`}
                    className="-mr-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-foreground-muted transition hover:text-coral disabled:opacity-40"
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          )}

          <form onSubmit={ajouter} className="mt-3 flex items-end gap-2">
            <input
              value={saisie}
              onChange={(e) => setSaisie(e.target.value)}
              maxLength={300}
              placeholder="Ex. : je m'entraîne le soir, en salle"
              aria-label="Nouvelle note pour le coach"
              className="min-h-11 min-w-0 flex-1 rounded-xl border border-white/12 bg-[#0a0f15] px-3 text-base outline-none focus:border-accent/60"
            />
            <button
              type="submit"
              disabled={occupe || !saisie.trim()}
              className="h-11 shrink-0 rounded-full bg-white px-4 text-sm font-semibold text-[#06080c] disabled:opacity-40"
            >
              Ajouter
            </button>
          </form>
          {erreur && <p className="mt-2 text-xs text-coral">{erreur}</p>}
        </div>
      )}
    </section>
  );
}
