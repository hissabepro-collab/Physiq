// Profil corporel calculé à partir des PLAGES NORMALES fournies par le rapport
// Visbody lui-même (elles dépendent de ta taille, ton âge et ton sexe).
// Chaque axe est donc vérifiable : on affiche la valeur réelle et ses bornes.
//
// Convention : 0 = bord "défavorable" de la plage, 100 = bord "favorable".
// Pour la masse grasse ou la graisse viscérale, l'échelle est inversée
// (moins il y en a, meilleur c'est).

function clamp(n, min = 0, max = 100) {
  return Math.max(min, Math.min(max, n));
}

function positionDansPlage(valeur, plage, { inverse = false } = {}) {
  if (valeur == null || !plage || plage.max === plage.min) return null;
  const brut = ((valeur - plage.min) / (plage.max - plage.min)) * 100;
  return clamp(inverse ? 100 - brut : brut);
}

const AXES = [
  { cle: "masseMusculaireKg", label: "Muscle", unite: "kg", inverse: false },
  { cle: "bfpPct", label: "Sèche", unite: "%", inverse: true },
  { cle: "metabolismeBaseKcal", label: "Métabolisme", unite: "kcal", inverse: false },
  { cle: "eauTotaleKg", label: "Hydratation", unite: "kg", inverse: false },
  { cle: "niveauGraisseViscerale", label: "Viscéral", unite: "", inverse: true },
];

export function calculerAxesProfil(mesures) {
  const derniere = mesures.at(-1);
  if (!derniere?.plages) return null;

  const axes = [];

  for (const axe of AXES) {
    const plage = derniere.plages[axe.cle];
    const valeur = derniere[axe.cle];
    const score = positionDansPlage(valeur, plage, { inverse: axe.inverse });
    if (score == null) continue;
    axes.push({
      label: axe.label,
      valeur: score,
      valeurReelle: valeur,
      unite: axe.unite,
      plage,
      inverse: axe.inverse,
    });
  }

  // Symétrie gauche/droite, calculée depuis les masses maigres par segment.
  const seg = derniere.segments?.maigreKg;
  if (seg) {
    const diffBras = Math.abs((seg.brasGauche ?? 0) - (seg.brasDroit ?? 0));
    const diffJambe = Math.abs((seg.jambeGauche ?? 0) - (seg.jambeDroite ?? 0));
    const ecartMoyen = (diffBras + diffJambe) / 2;
    axes.push({
      label: "Symétrie",
      valeur: clamp(100 - ecartMoyen * 80),
      valeurReelle: ecartMoyen,
      unite: "kg d'écart G/D",
      plage: null,
      inverse: true,
    });
  }

  return axes.length >= 3 ? axes : null;
}
