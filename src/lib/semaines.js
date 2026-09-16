// Outils de gestion des semaines ISO, base du bilan hebdomadaire
// (séances d'entraînement + sommeil).

export const JOURS = ["L", "M", "M", "J", "V", "S", "D"];
export const JOURS_LONGS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];

export const OBJECTIFS_DEFAUT = { seancesParSemaine: 5, sommeilHeures: 8, dieteParSemaine: 6 };

/**
 * Moyenne d'heures par nuit d'une semaine. Le détail nuit par nuit
 * (`heuresSommeil`, 7 cases dont certaines peuvent être vides) fait foi ; on
 * retombe sur `sommeilHeures` pour les semaines saisies avant que la grille
 * n'existe, où seule la moyenne avait été renseignée.
 */
export function moyenneNuits(entree) {
  const nuits = Array.isArray(entree?.heuresSommeil)
    ? entree.heuresSommeil.filter((h) => typeof h === "number" && Number.isFinite(h))
    : [];
  if (nuits.length > 0) return nuits.reduce((a, b) => a + b, 0) / nuits.length;
  return entree?.sommeilHeures ?? null;
}

/** "2026-W37" pour une date donnée (norme ISO 8601, semaine commençant lundi). */
export function cleSemaine(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const numeroJour = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - numeroJour);
  const debutAnnee = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const numeroSemaine = Math.ceil(((d - debutAnnee) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(numeroSemaine).padStart(2, "0")}`;
}

/** Date du lundi correspondant à une clé "2026-W37". */
export function lundiDeSemaine(cle) {
  const [annee, semaine] = cle.split("-W").map(Number);
  const quatreJanvier = new Date(Date.UTC(annee, 0, 4));
  const jourSemaine = quatreJanvier.getUTCDay() || 7;
  const lundiSemaine1 = new Date(quatreJanvier);
  lundiSemaine1.setUTCDate(quatreJanvier.getUTCDate() - jourSemaine + 1);
  const lundi = new Date(lundiSemaine1);
  lundi.setUTCDate(lundiSemaine1.getUTCDate() + (semaine - 1) * 7);
  return lundi;
}

/** "8 – 14 sept." */
export function libelleSemaine(cle) {
  const lundi = lundiDeSemaine(cle);
  const dimanche = new Date(lundi);
  dimanche.setUTCDate(lundi.getUTCDate() + 6);
  const jour = (d) => d.getUTCDate();
  const mois = (d) => d.toLocaleDateString("fr-FR", { month: "short", timeZone: "UTC" }).replace(".", "");
  return lundi.getUTCMonth() === dimanche.getUTCMonth()
    ? `${jour(lundi)} – ${jour(dimanche)} ${mois(dimanche)}`
    : `${jour(lundi)} ${mois(lundi)} – ${jour(dimanche)} ${mois(dimanche)}`;
}

/** Clé de la semaine précédant une clé donnée. */
export function semainePrecedente(cle) {
  const lundi = lundiDeSemaine(cle);
  lundi.setUTCDate(lundi.getUTCDate() - 7);
  return cleSemaine(new Date(lundi.getUTCFullYear(), lundi.getUTCMonth(), lundi.getUTCDate()));
}

/** Clé de la semaine suivant une clé donnée. */
export function semaineSuivante(cle) {
  const lundi = lundiDeSemaine(cle);
  lundi.setUTCDate(lundi.getUTCDate() + 7);
  return cleSemaine(new Date(lundi.getUTCFullYear(), lundi.getUTCMonth(), lundi.getUTCDate()));
}

function nombreSeances(entree) {
  return Array.isArray(entree?.joursEntraines) ? entree.joursEntraines.length : 0;
}

function nombreJoursDiete(entree) {
  return Array.isArray(entree?.joursDiete) ? entree.joursDiete.length : 0;
}

/** Détail objectif par objectif, pour afficher les jauges. */
export function bilanSemaine(entree, objectifs) {
  const seances = nombreSeances(entree);
  const diete = nombreJoursDiete(entree);
  const sommeil = moyenneNuits(entree);
  return {
    seances: { valeur: seances, cible: objectifs.seancesParSemaine, atteint: seances >= objectifs.seancesParSemaine },
    diete: { valeur: diete, cible: objectifs.dieteParSemaine, atteint: diete >= objectifs.dieteParSemaine },
    sommeil: {
      valeur: sommeil,
      cible: objectifs.sommeilHeures,
      atteint: sommeil != null && sommeil >= objectifs.sommeilHeures,
    },
  };
}

/** Une semaine est réussie si les TROIS objectifs sont atteints. */
export function semaineReussie(entree, objectifs) {
  if (!entree) return false;
  const b = bilanSemaine(entree, objectifs);
  return b.seances.atteint && b.diete.atteint && b.sommeil.atteint;
}

/**
 * Série de semaines réussies consécutives, en remontant depuis la dernière
 * semaine complète (la semaine en cours ne casse pas la série tant qu'elle
 * n'est pas terminée).
 */
export function calculerSerie(entreesParSemaine, objectifs, cleActuelle) {
  let serie = 0;
  let cle = semainePrecedente(cleActuelle);

  // La semaine en cours compte si elle est déjà réussie.
  if (semaineReussie(entreesParSemaine[cleActuelle], objectifs)) serie += 1;

  while (semaineReussie(entreesParSemaine[cle], objectifs)) {
    serie += 1;
    cle = semainePrecedente(cle);
  }
  return serie;
}

/** Les n dernières clés de semaine (plus récente en dernier). */
function clesDesDernieresSemaines(cleActuelle, n) {
  const cles = [];
  let cle = cleActuelle;
  for (let i = 0; i < n; i++) {
    cles.unshift(cle);
    cle = semainePrecedente(cle);
  }
  return cles;
}

/**
 * Bilan d'assiduité depuis la toute première semaine renseignée : "56 séances
 * sur 67 attendues". Le dénominateur grandit donc chaque semaine, même les
 * semaines non remplies — c'est ce qui en fait une mesure de régularité et
 * non une simple somme.
 *
 * La semaine en cours est comptée au prorata des jours déjà écoulés : un
 * mardi, on n'attend pas encore les 5 séances de la semaine.
 *
 * Le sommeil n'est pas cumulable (c'est une moyenne par nuit) : on en donne
 * la moyenne des quatre dernières semaines, soit le dernier mois.
 */
export function bilanCumule(entreesParSemaine, objectifs, cleActuelle, aujourdHui = new Date()) {
  const clesRenseignees = Object.keys(entreesParSemaine)
    .filter((c) => c && c <= cleActuelle)
    .sort();
  if (clesRenseignees.length === 0) return null;

  const joursEcoules = aujourdHui.getDay() || 7; // lundi = 1 … dimanche = 7

  let seancesFaites = 0;
  let seancesAttendues = 0;
  let dieteTenue = 0;
  let dieteAttendue = 0;
  let semaines = 0;

  for (let cle = clesRenseignees[0]; cle <= cleActuelle && semaines < 520; cle = semaineSuivante(cle)) {
    const entree = entreesParSemaine[cle];
    const prorata = cle === cleActuelle ? joursEcoules / 7 : 1;
    seancesFaites += nombreSeances(entree);
    seancesAttendues += Math.round(objectifs.seancesParSemaine * prorata);
    dieteTenue += nombreJoursDiete(entree);
    dieteAttendue += Math.round(objectifs.dieteParSemaine * prorata);
    semaines += 1;
  }

  const heuresDuMois = clesDesDernieresSemaines(cleActuelle, 4)
    .map((c) => moyenneNuits(entreesParSemaine[c]))
    .filter((h) => h != null);
  const moyenneSommeil = heuresDuMois.length
    ? heuresDuMois.reduce((a, b) => a + b, 0) / heuresDuMois.length
    : null;

  return {
    semaines,
    depuis: clesRenseignees[0],
    seances: { fait: seancesFaites, cible: seancesAttendues },
    diete: { fait: dieteTenue, cible: dieteAttendue },
    sommeil: {
      moyenne: moyenneSommeil,
      cible: objectifs.sommeilHeures,
      semainesMesurees: heuresDuMois.length,
    },
  };
}

/** Les n dernières semaines (plus récente en dernier), avec leur bilan. */
export function dernieresSemaines(entreesParSemaine, objectifs, cleActuelle, n = 12) {
  return clesDesDernieresSemaines(cleActuelle, n).map((c) => {
    const entree = entreesParSemaine[c];
    const bilan = bilanSemaine(entree, objectifs);
    const objectifsAtteints = [bilan.seances.atteint, bilan.diete.atteint, bilan.sommeil.atteint].filter(Boolean).length;
    return {
      cle: c,
      libelle: libelleSemaine(c),
      seances: bilan.seances.valeur,
      diete: bilan.diete.valeur,
      sommeil: bilan.sommeil.valeur,
      objectifsAtteints,
      reussie: semaineReussie(entree, objectifs),
      renseignee: Boolean(entree),
    };
  });
}

export { nombreSeances, nombreJoursDiete };
