// Bilan corporel : chaque indicateur du dernier scan comparé à la plage normale
// que le rapport Visbody calcule lui-même (selon la taille, l'âge et le sexe).
//
// Refait le 12/11/2026. L'ancienne version plaçait la valeur ENTRE les deux
// bornes et en faisait une note : 7 de graisse viscérale (sain) valait 33/100,
// 20,5 % de graisse (un demi-point au-dessus de la norme) valait 0, et tout ce
// qui dépassait la plage était plafonné à 100. Ça ne voulait rien dire.
//
// Désormais chaque indicateur a un SENS de lecture :
//   - « plus » : plus c'est haut, mieux c'est (muscle, métabolisme) ;
//   - « moins » : plus c'est bas, mieux c'est (graisse, viscéral, taille/hanches),
//     sans descendre sous la plage (trop sec n'est pas un objectif) ;
//   - « milieu » : l'idéal est dans la plage (équilibre de l'eau).
// Il en sort un verdict lisible (point fort, dans la norme, à surveiller,
// attention), une phrase, et une note de qualité 0-100, calculée sur l'écart à la plage mesuré en largeurs de plage.

const INDICATEURS = [
  {
    cle: "smmKg",
    label: "Muscle squelettique",
    unite: "kg",
    sens: "plus",
    decimales: 1,
    textes: {
      fort: "Au-dessus de la norme : une vraie base musculaire.",
      ok: "Dans la norme.",
      bas: "Sous la norme : la priorité est de construire du muscle.",
    },
  },
  {
    cle: "bfpPct",
    label: "Taux de graisse",
    unite: "%",
    sens: "moins",
    decimales: 1,
    textes: {
      ok: "Dans la norme.",
      haut: "Au-dessus de la norme",
      bas: "Sous la norme : très sec, à surveiller sur la durée.",
    },
  },
  {
    cle: "niveauGraisseViscerale",
    label: "Graisse viscérale",
    unite: "",
    sens: "moins",
    decimales: 0,
    textes: {
      ok: "Niveau sain (la graisse autour des organes).",
      haut: "Au-dessus de la norme : c'est la graisse la plus à risque.",
      bas: "Niveau sain.",
    },
  },
  {
    cle: "rth",
    label: "Taille / hanches",
    unite: "",
    sens: "moins",
    decimales: 2,
    textes: {
      ok: "Dans la norme.",
      haut: "Au-dessus de la norme : graisse logée au ventre.",
      bas: "Dans la norme.",
    },
  },
  {
    cle: "metabolismeBaseKcal",
    label: "Métabolisme de base",
    unite: "kcal",
    sens: "plus",
    decimales: 0,
    textes: {
      fort: "Au-dessus de la norme : ton muscle brûle plus au repos.",
      ok: "Dans la norme.",
      bas: "Sous la norme.",
    },
  },
  {
    cle: "ratioEcwTbw",
    label: "Équilibre de l'eau",
    unite: "",
    sens: "milieu",
    decimales: 3,
    // Le rapport ne fournit pas cette plage : 0,36 à 0,39 est la norme
    // d'usage en bio-impédance (eau extracellulaire / eau totale).
    plageDefaut: { min: 0.36, max: 0.39 },
    textes: {
      ok: "Équilibré : pas de rétention d'eau.",
      haut: "Élevé : possible rétention d'eau ou inflammation (fatigue, sel, blessure).",
      bas: "Bas : très peu d'eau extracellulaire.",
    },
  },
];

function arrondi(n, d) {
  return n == null ? null : Math.round(n * 10 ** d) / 10 ** d;
}

/** Écart à la plage, en largeurs de plage (0 = dans la plage). */
function ecart(valeur, plage) {
  const largeur = plage.max - plage.min || 1;
  if (valeur > plage.max) return (valeur - plage.max) / largeur;
  if (valeur < plage.min) return -(plage.min - valeur) / largeur;
  return 0;
}

function borner(n) {
  return Math.max(0, Math.min(100, Math.round(n)));
}

function evaluer(ind, valeur, plage) {
  const e = ecart(valeur, plage);
  const largeur = plage.max - plage.min || 1;
  const position = (valeur - plage.min) / largeur; // 0 = bas de plage, 1 = haut
  if (ind.sens === "plus") {
    if (e > 0) return { statut: "fort", texte: ind.textes.fort, qualite: borner(85 + e * 30) };
    if (e < 0) return { statut: e < -0.5 ? "attention" : "surveiller", texte: ind.textes.bas, qualite: borner(50 + e * 60) };
    return { statut: "ok", texte: ind.textes.ok, qualite: borner(55 + position * 30) };
  }
  if (ind.sens === "moins") {
    if (e > 0) {
      const depasse = valeur - plage.max;
      const texte = ind.cle === "bfpPct" ? `${ind.textes.haut} de ${arrondi(depasse, 1).toLocaleString("fr-FR")} point${depasse >= 2 ? "s" : ""}.` : ind.textes.haut;
      return { statut: e > 0.3 ? "attention" : "surveiller", texte, qualite: borner(55 - e * 90) };
    }
    if (e < 0) return { statut: ind.cle === "bfpPct" ? "surveiller" : "fort", texte: ind.textes.bas, qualite: ind.cle === "bfpPct" ? 70 : 95 };
    // Dans la plage : plus on est bas, mieux c'est.
    return { statut: position < 0.5 ? "fort" : "ok", texte: ind.textes.ok, qualite: borner(95 - position * 30) };
  }
  // milieu
  if (e === 0) return { statut: "ok", texte: ind.textes.ok, qualite: borner(100 - Math.abs(position - 0.5) * 40) };
  return { statut: Math.abs(e) > 0.5 ? "attention" : "surveiller", texte: e > 0 ? ind.textes.haut : ind.textes.bas, qualite: borner(60 - Math.abs(e) * 80) };
}

function symetrie(derniere) {
  const seg = derniere.segments?.maigreKg;
  if (!seg) return null;
  const pct = (a, b) => (a && b ? (Math.abs(a - b) / ((a + b) / 2)) * 100 : null);
  const bras = pct(seg.brasGauche, seg.brasDroit);
  const jambes = pct(seg.jambeGauche, seg.jambeDroite);
  const valeurs = [bras, jambes].filter((v) => v != null);
  if (valeurs.length === 0) return null;
  const pire = Math.max(...valeurs);
  const statut = pire < 3 ? "fort" : pire < 6 ? "ok" : pire < 10 ? "surveiller" : "attention";
  const texte =
    pire < 3
      ? "Gauche et droite équilibrés (bras et jambes)."
      : `Écart gauche/droite de ${arrondi(pire, 1).toLocaleString("fr-FR")} % sur ${pire === bras ? "les bras" : "les jambes"}.`;
  return {
    cle: "symetrie",
    label: "Symétrie gauche / droite",
    valeur: arrondi(pire, 1),
    unite: "% d'écart",
    plage: { min: 0, max: 3 },
    sens: "moins",
    statut,
    texte,
    qualite: borner(100 - pire * 8),
    delta: null,
  };
}

/**
 * Bilan du dernier scan. Renvoie null s'il n'y a pas de scan exploitable.
 * Chaque élément : { cle, label, valeur, unite, plage, sens, statut, texte,
 * qualite (0-100), delta (écart avec le scan précédent, ou null) }.
 */
export function calculerBilan(mesures) {
  const derniere = mesures.at(-1);
  if (!derniere) return null;
  const precedente = mesures.at(-2) ?? null;
  const items = [];
  for (const ind of INDICATEURS) {
    const valeur = derniere[ind.cle];
    const plage = derniere.plages?.[ind.cle] ?? ind.plageDefaut ?? null;
    if (valeur == null || !plage) continue;
    const ancien = precedente?.[ind.cle];
    items.push({
      cle: ind.cle,
      label: ind.label,
      valeur: arrondi(valeur, ind.decimales),
      unite: ind.unite,
      plage,
      sens: ind.sens,
      decimales: ind.decimales,
      ...evaluer(ind, valeur, plage),
      delta: ancien != null ? arrondi(valeur - ancien, ind.decimales) : null,
    });
  }
  const sym = symetrie(derniere);
  if (sym) items.push(sym);
  return items.length >= 3 ? items : null;
}
