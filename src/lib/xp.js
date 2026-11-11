// Points d'expérience (XP) gagnés avec les habitudes, et niveau qui en découle.
//
// Le RANG (lettre D → S+) mesure le corps : il vient du score Visbody et ne
// bouge qu'à chaque scan. Le NIVEAU mesure l'effort : il monte chaque semaine
// avec les séances, la diète et le sommeil, pour progresser entre deux scans.
//
// Barème (une semaine bien tenue rapporte environ 250 XP) :
//   - séance faite            : 15 XP
//   - jour de diète tenu      : 10 XP
//   - nuit suivie à l'objectif : 10 XP ; à moins d'une heure de l'objectif : 5 XP
//     (les nuits de vendredi et samedi ne comptent pas, comme dans les bilans)
//   - bonus semaine : objectif de séances +40, de diète +30, de sommeil +30
//   - scan importé            : 100 XP

import { NUITS_SUIVIES, moyenneNuits } from "@/lib/semaines";

export const BAREME = {
  seance: 15,
  diete: 10,
  nuitPleine: 10,
  nuitProche: 5,
  bonusSeances: 40,
  bonusDiete: 30,
  bonusSommeil: 30,
  scan: 100,
};

function longueur(liste) {
  return Array.isArray(liste) ? liste.length : 0;
}

/** XP d'une semaine du journal, avec le détail par source. */
export function xpSemaine(entree, objectifs) {
  if (!entree) return { total: 0, seances: 0, diete: 0, sommeil: 0, bonus: 0 };

  const nbSeances = longueur(entree.joursEntraines);
  const nbDiete = longueur(entree.joursDiete);
  const cible = objectifs.sommeilHeures;

  let sommeil = 0;
  const nuits = Array.isArray(entree.heuresSommeil) ? entree.heuresSommeil : null;
  if (nuits) {
    for (const i of NUITS_SUIVIES) {
      const h = nuits[i];
      if (typeof h !== "number" || !Number.isFinite(h)) continue;
      if (h >= cible) sommeil += BAREME.nuitPleine;
      else if (h >= cible - 1) sommeil += BAREME.nuitProche;
    }
  } else if (entree.sommeilHeures != null) {
    // Semaines saisies avant la grille nuit par nuit : seule la moyenne existe.
    const n = NUITS_SUIVIES.length;
    if (entree.sommeilHeures >= cible) sommeil = n * BAREME.nuitPleine;
    else if (entree.sommeilHeures >= cible - 1) sommeil = n * BAREME.nuitProche;
  }

  const moyenne = moyenneNuits(entree);
  const bonus =
    (nbSeances >= objectifs.seancesParSemaine ? BAREME.bonusSeances : 0) +
    (nbDiete >= objectifs.dieteParSemaine ? BAREME.bonusDiete : 0) +
    (moyenne != null && moyenne >= cible ? BAREME.bonusSommeil : 0);

  const seances = nbSeances * BAREME.seance;
  const diete = nbDiete * BAREME.diete;
  return { total: seances + diete + sommeil + bonus, seances, diete, sommeil, bonus };
}

/** XP nécessaires pour passer du niveau n au niveau n + 1. */
export function xpPourNiveau(n) {
  return 200 + 50 * (n - 1);
}

/** Niveau atteint avec un total d'XP, et progression dans ce niveau. */
export function niveauDepuisXp(total) {
  let niveau = 1;
  let reste = total;
  while (reste >= xpPourNiveau(niveau)) {
    reste -= xpPourNiveau(niveau);
    niveau += 1;
  }
  const besoin = xpPourNiveau(niveau);
  return {
    niveau,
    xpDansNiveau: reste,
    xpPourSuivant: besoin,
    pourcent: Math.round((reste / besoin) * 100),
  };
}

/**
 * Bilan complet : total d'XP (habitudes + scans), niveau, et XP gagnés cette
 * semaine. `entrees` = entrées du journal ayant une semaine ISO.
 */
export function calculerXp(entrees, nombreScans, objectifs, cleSemaineActuelle) {
  let habitudes = 0;
  let semaine = null;
  for (const e of entrees) {
    const x = xpSemaine(e, objectifs);
    habitudes += x.total;
    if (e.semaineIso === cleSemaineActuelle) semaine = x;
  }
  const scans = nombreScans * BAREME.scan;
  const total = habitudes + scans;
  return {
    total,
    habitudes,
    scans,
    semaine: semaine ?? xpSemaine(null, objectifs),
    ...niveauDepuisXp(total),
  };
}
