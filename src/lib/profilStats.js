// Traduit les mesures réelles en 6 axes de profil (0-100), pour le radar
// de l'accueil. Bornes volontairement génériques (pas cliniques) : elles
// servent à donner une intuition visuelle de la progression, pas un diagnostic.

function clamp(n, min = 0, max = 100) {
  return Math.max(min, Math.min(max, n));
}

export function calculerAxesProfil(mesures) {
  const derniere = mesures.at(-1);
  if (!derniere) return null;

  const muscle = derniere.masseMusculaireKg != null ? clamp(((derniere.masseMusculaireKg - 50) / (85 - 50)) * 100) : 50;

  const seche = derniere.bfpPct != null ? clamp(((28 - derniere.bfpPct) / (28 - 10)) * 100) : 50;

  const metabolisme =
    derniere.metabolismeBaseKcal != null ? clamp(((derniere.metabolismeBaseKcal - 1500) / (2200 - 1500)) * 100) : 50;

  const ratioEau = derniere.eauTotaleKg != null && derniere.poidsKg ? (derniere.eauTotaleKg / derniere.poidsKg) * 100 : null;
  const hydratation = ratioEau != null ? clamp(((ratioEau - 45) / (65 - 45)) * 100) : 50;

  let equilibre = 70;
  const seg = derniere.segments;
  if (seg?.maigreKg) {
    const diffBras = Math.abs((seg.maigreKg.brasGauche ?? 0) - (seg.maigreKg.brasDroit ?? 0));
    const diffJambe = Math.abs((seg.maigreKg.jambeGauche ?? 0) - (seg.maigreKg.jambeDroite ?? 0));
    const diffMoyenne = (diffBras + diffJambe) / 2;
    equilibre = clamp(100 - diffMoyenne * 80);
  }

  const joursDepuis = Math.round((Date.now() - new Date(derniere.dateScan).getTime()) / (1000 * 60 * 60 * 24));
  const suivi = clamp(100 - joursDepuis * 6);

  return [
    { label: "Muscle", valeur: muscle },
    { label: "Sèche", valeur: seche },
    { label: "Métabolisme", valeur: metabolisme },
    { label: "Hydratation", valeur: hydratation },
    { label: "Équilibre", valeur: equilibre },
    { label: "Suivi", valeur: suivi },
  ];
}
