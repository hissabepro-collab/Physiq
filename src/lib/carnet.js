// Carnet d'entraînement : validation, lecture et calculs de progression.
// Partagé par la page /carnet, la route /api/carnet et le dossier du coach.
//
// Une séance : { date, titre?, note?, exercices: [{ nom, series: [{ reps, charge }] }] }
// charge en kg (null = poids du corps).

export const MAX_EXERCICES = 15;
export const MAX_SERIES = 12;

const nombre = (v, min, max) => {
  const n = typeof v === "string" ? Number(v.replace(",", ".")) : v;
  return Number.isFinite(n) && n >= min && n <= max ? n : null;
};

/** Nettoie une séance reçue du formulaire. Renvoie { seance } ou { erreur }. */
export function validerSeance(brut) {
  const date = new Date(brut?.date);
  if (Number.isNaN(date.getTime())) return { erreur: "Date invalide." };
  const exercices = [];
  for (const ex of Array.isArray(brut?.exercices) ? brut.exercices.slice(0, MAX_EXERCICES) : []) {
    const nom = String(ex?.nom ?? "").replace(/\s+/g, " ").trim().slice(0, 60);
    if (!nom) continue;
    const series = [];
    for (const s of Array.isArray(ex?.series) ? ex.series.slice(0, MAX_SERIES) : []) {
      const reps = nombre(s?.reps, 1, 100);
      if (reps == null) continue;
      const charge = s?.charge === "" || s?.charge == null ? null : nombre(s.charge, 0, 500);
      series.push({ reps: Math.round(reps), charge: charge == null ? null : Math.round(charge * 4) / 4 });
    }
    if (series.length) exercices.push({ nom, series });
  }
  if (!exercices.length) return { erreur: "Ajoute au moins un exercice avec une série (répétitions)." };
  return {
    seance: {
      date,
      titre: String(brut?.titre ?? "").trim().slice(0, 60) || null,
      note: String(brut?.note ?? "").trim().slice(0, 400) || null,
      exercices,
    },
  };
}

/** Charge maximale estimée sur une répétition (formule d'Epley). */
export function unRmEstime(reps, charge) {
  if (!charge || !reps) return null;
  return reps === 1 ? charge : charge * (1 + reps / 30);
}

const cleExercice = (nom) => nom.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, " ").trim();

/**
 * Progression par exercice, du plus ancien au plus récent : pour chaque
 * exercice, la liste des séances avec la meilleure série (1RM estimé) et le
 * volume (séries × reps × charge).
 */
export function progressionParExercice(seances) {
  const parNom = new Map();
  // Même jour : départagé par l'heure d'enregistrement (sinon la « dernière »
  // séance pouvait être la plus ancienne, constaté le 13/11/2026).
  const ordre = (s) => [new Date(s.date).getTime(), new Date(s.createdAt ?? 0).getTime()];
  for (const s of [...seances].sort((a, b) => ordre(a)[0] - ordre(b)[0] || ordre(a)[1] - ordre(b)[1])) {
    for (const ex of s.exercices ?? []) {
      const cle = cleExercice(ex.nom);
      if (!parNom.has(cle)) parNom.set(cle, { nom: ex.nom, points: [] });
      let meilleur = null;
      let meilleureSerie = null;
      let volume = 0;
      for (const serie of ex.series ?? []) {
        const rm = unRmEstime(serie.reps, serie.charge);
        if (rm != null && (meilleur == null || rm > meilleur)) {
          meilleur = rm;
          meilleureSerie = serie;
        }
        volume += serie.reps * (serie.charge ?? 0);
      }
      const repsMax = Math.max(...(ex.series ?? []).map((x) => x.reps));
      parNom.get(cle).points.push({ date: s.date, unRm: meilleur, meilleureSerie, volume, series: ex.series.length, repsMax });
    }
  }
  return [...parNom.values()];
}

/** Lecture simple d'une progression : « en hausse », « stable », « en baisse ». */
export function tendance(points) {
  const avecRm = points.filter((p) => p.unRm != null);
  if (avecRm.length >= 2) {
    const premier = avecRm[0].unRm;
    const dernier = avecRm.at(-1).unRm;
    const ecart = ((dernier - premier) / premier) * 100;
    return { ecartPct: Math.round(ecart * 10) / 10, sens: ecart > 2 ? "en hausse" : ecart < -2 ? "en baisse" : "stable" };
  }
  if (points.length >= 2) {
    const ecart = points.at(-1).repsMax - points[0].repsMax;
    return { ecartReps: ecart, sens: ecart > 0 ? "en hausse" : ecart < 0 ? "en baisse" : "stable" };
  }
  return null;
}

export function texteSerie(s) {
  return `${s.reps}${s.charge != null ? ` × ${String(s.charge).replace(".", ",")} kg` : " (poids du corps)"}`;
}
