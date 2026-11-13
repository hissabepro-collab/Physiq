"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import PageHeader from "@/components/PageHeader";
import { useRafraichir } from "@/lib/useRafraichir";
import { progressionParExercice, tendance, texteSerie } from "@/lib/carnet";

// Carnet d'entraînement. Saisie pensée pour le téléphone, entre deux séries :
// « + Série » recopie la série précédente, « Reprendre » préremplit avec la
// dernière séance du même type. Les champs gardent le texte tapé tel quel
// (« 82,5 ») : convertir à chaque frappe effaçait la virgule (piège du
// sommeil, 11/11/2026). Aucun composant n'est défini dans un autre.

const TITRES = ["Haut du corps", "Bas du corps", "Push", "Pull", "Jambes", "Full body"];
const EXERCICES_COURANTS = [
  "Développé couché", "Développé incliné haltères", "Développé militaire", "Dips", "Pompes",
  "Tractions", "Tirage vertical", "Rowing barre", "Rowing haltère", "Tirage horizontal",
  "Squat", "Presse à cuisses", "Soulevé de terre", "Soulevé de terre roumain", "Fentes bulgares",
  "Leg curl", "Leg extension", "Hip thrust", "Mollets debout",
  "Élévations latérales", "Curl biceps", "Curl marteau", "Extension triceps poulie", "Gainage",
];

const aujourdhui = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const versChamp = (n) => (n == null ? "" : String(n).replace(".", ","));
const dateLongue = (d) => new Date(d).toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short", timeZone: "Europe/Paris" });
const serieVide = () => ({ reps: "", charge: "" });
const exerciceVide = () => ({ nom: "", series: [serieVide()] });
const nouvelleSeance = () => ({ id: null, date: aujourdhui(), titre: "", note: "", exercices: [exerciceVide()] });

function depuisSeance(s, garderId) {
  return {
    id: garderId ? s.id : null,
    date: garderId ? String(s.date).slice(0, 10) : aujourdhui(),
    titre: s.titre ?? "",
    note: garderId ? s.note ?? "" : "",
    exercices: s.exercices.map((ex) => ({ nom: ex.nom, series: ex.series.map((x) => ({ reps: versChamp(x.reps), charge: versChamp(x.charge) })) })),
  };
}

function LigneSerie({ serie, index, onChange, onRetirer, peutRetirer }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-6 shrink-0 text-xs text-foreground-muted">{index + 1}</span>
      <input
        inputMode="numeric"
        value={serie.reps}
        onChange={(e) => onChange({ ...serie, reps: e.target.value })}
        placeholder="reps"
        aria-label={`Série ${index + 1} : répétitions`}
        className="h-11 w-20 min-w-0 rounded-xl border border-white/12 bg-[#0a0f15] px-3 text-base outline-none focus:border-accent/60"
      />
      <span className="text-foreground-muted">×</span>
      <input
        inputMode="decimal"
        value={serie.charge}
        onChange={(e) => onChange({ ...serie, charge: e.target.value })}
        placeholder="kg"
        aria-label={`Série ${index + 1} : charge en kg (vide = poids du corps)`}
        className="h-11 w-24 min-w-0 rounded-xl border border-white/12 bg-[#0a0f15] px-3 text-base outline-none focus:border-accent/60"
      />
      <span className="text-xs text-foreground-muted">kg</span>
      {peutRetirer && (
        <button type="button" onClick={onRetirer} aria-label={`Retirer la série ${index + 1}`} className="ml-auto flex h-11 w-11 items-center justify-center text-foreground-muted hover:text-coral">
          ✕
        </button>
      )}
    </div>
  );
}

function BlocExercice({ exercice, index, onChange, onRetirer, listeId }) {
  const majSerie = (k, s) => onChange({ ...exercice, series: exercice.series.map((x, j) => (j === k ? s : x)) });
  return (
    <div className="rounded-2xl bg-white/[0.03] p-3">
      <div className="flex items-center gap-2">
        <input
          list={listeId}
          value={exercice.nom}
          onChange={(e) => onChange({ ...exercice, nom: e.target.value })}
          placeholder="Exercice (ex. Développé couché)"
          aria-label={`Exercice ${index + 1}`}
          className="h-11 min-w-0 flex-1 rounded-xl border border-white/12 bg-[#0a0f15] px-3 text-base outline-none focus:border-accent/60"
        />
        <button type="button" onClick={onRetirer} aria-label={`Retirer l'exercice ${index + 1}`} className="flex h-11 w-11 shrink-0 items-center justify-center text-foreground-muted hover:text-coral">
          ✕
        </button>
      </div>
      <div className="mt-2 space-y-2">
        {exercice.series.map((s, k) => (
          <LigneSerie
            key={k}
            serie={s}
            index={k}
            onChange={(v) => majSerie(k, v)}
            onRetirer={() => onChange({ ...exercice, series: exercice.series.filter((_, j) => j !== k) })}
            peutRetirer={exercice.series.length > 1}
          />
        ))}
      </div>
      <button
        type="button"
        onClick={() => onChange({ ...exercice, series: [...exercice.series, { ...(exercice.series.at(-1) ?? serieVide()) }] })}
        className="mt-2 h-11 rounded-full border border-white/12 px-4 text-sm font-semibold"
      >
        + Série
      </button>
    </div>
  );
}

function CarteProgression({ p }) {
  const t = tendance(p.points);
  const dernier = p.points.at(-1);
  const couleur = t?.sens === "en hausse" ? "text-[#9ff0c4]" : t?.sens === "en baisse" ? "text-coral" : "text-foreground-muted";
  return (
    <li className="flex items-center justify-between gap-3 py-2.5">
      <div className="min-w-0">
        <div className="truncate text-sm font-semibold">{p.nom}</div>
        <div className="text-xs text-foreground-muted">
          {dernier.meilleureSerie ? `${texteSerie(dernier.meilleureSerie)} · 1RM estimé ${Math.round(dernier.unRm)} kg` : `jusqu'à ${dernier.repsMax} reps`}
        </div>
      </div>
      <div className={`shrink-0 text-right text-xs font-semibold ${couleur}`}>
        {t ? (t.ecartPct != null ? `${t.ecartPct > 0 ? "+" : ""}${String(t.ecartPct).replace(".", ",")} %` : `${t.ecartReps > 0 ? "+" : ""}${t.ecartReps} reps`) : "1re séance"}
        <div className="font-normal text-foreground-muted">{p.points.length} séance{p.points.length > 1 ? "s" : ""}</div>
      </div>
    </li>
  );
}

export default function CarnetClient({ seances }) {
  const rafraichir = useRafraichir();
  const [brouillon, setBrouillon] = useState(null);
  const [occupe, setOccupe] = useState(false);
  const [erreur, setErreur] = useState(null);
  const [ouverte, setOuverte] = useState(null);

  const progressions = useMemo(() => progressionParExercice(seances).sort((a, b) => b.points.length - a.points.length), [seances]);
  const nomsConnus = useMemo(() => [...new Set([...seances.flatMap((s) => s.exercices.map((e) => e.nom)), ...EXERCICES_COURANTS])], [seances]);

  // « Reprendre » : dernière séance du même titre, sinon la dernière tout court.
  function reprendre() {
    const titre = brouillon?.titre?.trim();
    const modele = (titre && seances.find((s) => s.titre === titre)) || seances[0];
    if (modele) setBrouillon({ ...depuisSeance(modele, false), titre: titre || modele.titre || "" });
  }

  async function enregistrer() {
    setOccupe(true);
    setErreur(null);
    try {
      const corps = {
        ...brouillon,
        date: `${brouillon.date}T12:00:00`,
        exercices: brouillon.exercices.map((ex) => ({ nom: ex.nom, series: ex.series.map((s) => ({ reps: s.reps, charge: s.charge })) })),
      };
      const rep = await fetch("/api/carnet", {
        method: brouillon.id ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(corps),
      });
      const res = await rep.json().catch(() => ({}));
      if (!rep.ok) throw new Error(res.erreur || "La séance n'a pas pu être enregistrée.");
      setBrouillon(null);
      rafraichir();
    } catch (e) {
      setErreur(e.message);
    } finally {
      setOccupe(false);
    }
  }

  async function supprimer(id) {
    if (!window.confirm("Supprimer cette séance ? C'est définitif.")) return;
    setOccupe(true);
    try {
      const rep = await fetch(`/api/carnet?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      if (!rep.ok) throw new Error();
      setOuverte(null);
      rafraichir();
    } catch {
      setErreur("La séance n'a pas pu être supprimée.");
    } finally {
      setOccupe(false);
    }
  }

  const majExercice = (i, ex) => setBrouillon((b) => ({ ...b, exercices: b.exercices.map((x, j) => (j === i ? ex : x)) }));

  return (
    <div className="mx-auto max-w-3xl px-5 py-8 sm:px-10 sm:py-10">
      <PageHeader kicker="Entraînement" title="Carnet" subtitle="Tes séances, exercice par exercice. Le coach s'en sert pour suivre ta progression." />

      <datalist id="exercices-connus">
        {nomsConnus.map((n) => (
          <option key={n} value={n} />
        ))}
      </datalist>

      {!brouillon && (
        <div className="mt-6 flex flex-wrap gap-2">
          <button type="button" onClick={() => setBrouillon(nouvelleSeance())} className="h-12 rounded-full bg-white px-5 text-sm font-semibold text-[#06080c]">
            + Nouvelle séance
          </button>
          {seances.length > 0 && (
            <Link href={`/coach?q=${encodeURIComponent("Analyse mes dernières séances du carnet : progression, stagnations, et charges à viser à la prochaine séance.")}`} className="flex h-12 items-center rounded-full border border-white/15 px-5 text-sm font-semibold">
              Analyse du coach →
            </Link>
          )}
        </div>
      )}

      {brouillon && (
        <section className="verre mt-6 rounded-2xl p-4">
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="date"
              value={brouillon.date}
              onChange={(e) => setBrouillon({ ...brouillon, date: e.target.value })}
              aria-label="Date de la séance"
              className="h-11 rounded-xl border border-white/12 bg-[#0a0f15] px-3 text-base outline-none"
            />
            <input
              value={brouillon.titre}
              onChange={(e) => setBrouillon({ ...brouillon, titre: e.target.value })}
              placeholder="Type (ex. Push)"
              aria-label="Type de séance"
              className="h-11 min-w-0 flex-1 rounded-xl border border-white/12 bg-[#0a0f15] px-3 text-base outline-none focus:border-accent/60"
            />
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {TITRES.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setBrouillon({ ...brouillon, titre: t })}
                className={`min-h-9 rounded-full border px-3 text-xs ${brouillon.titre === t ? "border-accent/70 bg-accent/10" : "border-white/12"}`}
              >
                {t}
              </button>
            ))}
          </div>
          {seances.length > 0 && !brouillon.id && (
            <button type="button" onClick={reprendre} className="mt-3 h-11 text-sm font-semibold text-accent">
              ↻ Reprendre ma dernière séance{brouillon.titre ? ` « ${brouillon.titre} »` : ""}
            </button>
          )}

          <div className="mt-3 space-y-3">
            {brouillon.exercices.map((ex, i) => (
              <BlocExercice
                key={i}
                exercice={ex}
                index={i}
                listeId="exercices-connus"
                onChange={(v) => majExercice(i, v)}
                onRetirer={() => setBrouillon((b) => ({ ...b, exercices: b.exercices.length > 1 ? b.exercices.filter((_, j) => j !== i) : [exerciceVide()] }))}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={() => setBrouillon((b) => ({ ...b, exercices: [...b.exercices, exerciceVide()] }))}
            className="mt-3 h-11 w-full rounded-full border border-dashed border-white/20 text-sm font-semibold"
          >
            + Exercice
          </button>
          <textarea
            value={brouillon.note}
            onChange={(e) => setBrouillon({ ...brouillon, note: e.target.value })}
            rows={2}
            maxLength={400}
            placeholder="Note (sensations, douleur, fatigue…)"
            aria-label="Note sur la séance"
            className="mt-3 w-full resize-none rounded-xl border border-white/12 bg-[#0a0f15] px-3 py-2 text-base outline-none focus:border-accent/60"
          />
          {erreur && <p className="mt-2 text-sm text-coral">{erreur}</p>}
          <div className="mt-3 flex gap-2">
            <button type="button" onClick={enregistrer} disabled={occupe} className="h-12 flex-1 rounded-full bg-white text-sm font-semibold text-[#06080c] disabled:opacity-40">
              {brouillon.id ? "Enregistrer les modifications" : "Enregistrer la séance"}
            </button>
            <button type="button" onClick={() => { setBrouillon(null); setErreur(null); }} className="h-12 rounded-full border border-white/15 px-5 text-sm">
              Annuler
            </button>
          </div>
        </section>
      )}

      {progressions.length > 0 && (
        <section className="verre mt-6 rounded-2xl px-4 py-3">
          <h2 className="titre text-base">Progression</h2>
          <p className="text-xs text-foreground-muted">1RM estimé : la charge que tu soulèverais une fois, calculée à partir de ta meilleure série.</p>
          <ul className="mt-1 divide-y divide-white/5">
            {progressions.slice(0, 12).map((p) => (
              <CarteProgression key={p.nom} p={p} />
            ))}
          </ul>
        </section>
      )}

      <section className="mt-6">
        <h2 className="titre text-base">Séances</h2>
        {seances.length === 0 ? (
          <p className="mt-2 text-sm text-foreground-muted">Aucune séance pour l&apos;instant. Note la prochaine : le coach pourra ensuite suivre tes charges et ajuster ton programme.</p>
        ) : (
          <ul className="mt-2 space-y-2">
            {seances.map((s) => (
              <li key={s.id} className="verre rounded-2xl">
                <button type="button" onClick={() => setOuverte(ouverte === s.id ? null : s.id)} className="flex min-h-12 w-full items-center justify-between gap-3 px-4 py-3 text-left">
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold">{s.titre || "Séance"} · {dateLongue(s.date)}</span>
                    <span className="block truncate text-xs text-foreground-muted">{s.exercices.map((e) => e.nom).join(", ")}</span>
                  </span>
                  <span className="text-foreground-muted" aria-hidden="true">{ouverte === s.id ? "▴" : "▾"}</span>
                </button>
                {ouverte === s.id && (
                  <div className="border-t border-white/5 px-4 pb-4 pt-2 text-sm">
                    {s.exercices.map((e, i) => (
                      <p key={i} className="py-1">
                        <span className="font-semibold">{e.nom}</span> : {e.series.map(texteSerie).join(", ")}
                      </p>
                    ))}
                    {s.note && <p className="mt-1 text-foreground-muted">« {s.note} »</p>}
                    <div className="mt-3 flex gap-2">
                      <button type="button" onClick={() => { setBrouillon(depuisSeance(s, true)); window.scrollTo({ top: 0, behavior: "smooth" }); }} className="h-11 rounded-full border border-white/15 px-4 text-sm font-semibold">
                        Modifier
                      </button>
                      <button type="button" onClick={() => supprimer(s.id)} disabled={occupe} className="h-11 rounded-full border border-coral/40 px-4 text-sm font-semibold text-coral">
                        Supprimer
                      </button>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
