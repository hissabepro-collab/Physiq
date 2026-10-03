// Outils de gestion des semaines ISO, base du bilan hebdomadaire
// (séances d'entraînement + sommeil).

export const JOURS = ["L", "M", "M", "J", "V", "S", "D"];
export const JOURS_LONGS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];

export const OBJECTIFS_DEFAUT = { seancesParSemaine: 5, sommeilHeures: 8, dieteParSemaine: 6 };

/**
 * Nuits prises en compte pour le sommeil : lundi, mardi, mercredi, jeudi et
 * dimanche.
 *
 * Les nuits de vendredi et de samedi soir en sont écartées. Elles sont
 * systématiquement plus longues — rien n'oblige à se lever le lendemain — et
 * tirent la moyenne vers le haut sans rien dire de la semaine. Ne restent que
 * les cinq nuits qui précèdent une journée normale, celles sur lesquelles on
 * peut réellement agir.
 */
export const NUITS_SUIVIES = [0, 1, 2, 3, 6];

export function nuitSuivie(index) {
  return NUITS_SUIVIES.includes(index);
}

/**
 * Moyenne d'heures par nuit d'une semaine, sur les seules nuits suivies. Le
 * détail nuit par nuit (`heuresSommeil`, 7 cases dont certaines peuvent être
 * vides) fait foi ; on retombe sur `sommeilHeures` pour les semaines saisies
 * avant que la grille n'existe, où seule la moyenne avait été renseignée.
 */
export function moyenneNuits(entree) {
  const brut = Array.isArray(entree?.heuresSommeil) ? entree.heuresSommeil : null;
  const nuits = brut
    ? NUITS_SUIVIES.map((i) => brut[i]).filter((h) => typeof h === "number" && Number.isFinite(h))
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
 * Bilan d'un mois civil : séances faites, jours de diète tenus, sommeil moyen.
 *
 * Le calcul se fait JOUR PAR JOUR et non semaine par semaine. Une semaine ISO
 * chevauche souvent deux mois : lui attribuer un mois entier fausserait les
 * deux. On parcourt donc chaque date du mois, on retrouve la semaine à laquelle
 * elle appartient, et on regarde si ce jour-là était coché.
 *
 * L'objectif hebdomadaire est ramené au jour (5 séances sur 7 jours), puis
 * multiplié par le nombre de jours comptés. Le mois en cours ne compte que les
 * jours déjà écoulés : le 3 du mois, on n'attend pas encore le quota complet.
 */
export function bilanMois(entreesParSemaine, objectifs, annee, mois, aujourdHui = new Date()) {
  const dernierJour = new Date(annee, mois + 1, 0).getDate();
  const enCours = annee === aujourdHui.getFullYear() && mois === aujourdHui.getMonth();
  const jusqua = enCours ? Math.min(aujourdHui.getDate(), dernierJour) : dernierJour;

  let seances = 0;
  let diete = 0;
  const nuits = [];

  for (let jour = 1; jour <= jusqua; jour++) {
    const date = new Date(annee, mois, jour);
    const entree = entreesParSemaine[cleSemaine(date)];
    const index = (date.getDay() || 7) - 1; // 0 = lundi … 6 = dimanche

    if (Array.isArray(entree?.joursEntraines) && entree.joursEntraines.includes(index)) seances += 1;
    if (Array.isArray(entree?.joursDiete) && entree.joursDiete.includes(index)) diete += 1;

    if (nuitSuivie(index) && Array.isArray(entree?.heuresSommeil)) {
      const h = entree.heuresSommeil[index];
      if (typeof h === "number" && Number.isFinite(h)) nuits.push(h);
    }
  }

  return {
    annee,
    mois,
    enCours,
    jours: jusqua,
    joursDuMois: dernierJour,
    libelle: new Date(annee, mois, 1).toLocaleDateString("fr-FR", { month: "long", year: "numeric" }),
    seances: { fait: seances, cible: Math.round((objectifs.seancesParSemaine / 7) * jusqua) },
    diete: { fait: diete, cible: Math.round((objectifs.dieteParSemaine / 7) * jusqua) },
    sommeil: {
      moyenne: nuits.length ? nuits.reduce((a, b) => a + b, 0) / nuits.length : null,
      cible: objectifs.sommeilHeures,
      nuits: nuits.length,
    },
  };
}

/**
 * Tous les mois couverts par le journal, du plus récent au plus ancien, avec
 * leur bilan. Le mois en cours figure en premier ; les précédents constituent
 * l'historique, figé puisque leurs semaines ne bougent plus.
 */
export function bilansParMois(entreesParSemaine, objectifs, aujourdHui = new Date()) {
  const cles = Object.keys(entreesParSemaine).filter(Boolean).sort();
  if (cles.length === 0) return [];

  // Le mois de départ est celui du lundi de la première semaine renseignée.
  const premier = lundiDeSemaine(cles[0]);
  const debut = new Date(premier.getUTCFullYear(), premier.getUTCMonth(), 1);
  const fin = new Date(aujourdHui.getFullYear(), aujourdHui.getMonth(), 1);

  const bilans = [];
  for (let d = new Date(debut); d <= fin && bilans.length < 120; d.setMonth(d.getMonth() + 1)) {
    bilans.push(bilanMois(entreesParSemaine, objectifs, d.getFullYear(), d.getMonth(), aujourdHui));
  }
  return bilans.reverse();
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
