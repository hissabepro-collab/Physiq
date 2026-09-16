"use client";

// L'écran d'attente ne doit pas être le même au lancement de l'app et pendant
// la navigation.
//
// Au lancement, il prolonge l'image de démarrage : logo sur fond noir, pour
// que rien ne change à l'écran entre le moment où l'on touche l'icône et
// l'apparition du tableau de bord.
//
// Une fois l'app ouverte, ce même logo devient une gêne : passer d'un onglet
// à l'autre affichait une grande marque pendant une seconde. On repasse alors
// sur un squelette discret, qui laisse deviner la page qui arrive.
//
// Un simple drapeau de module suffit : il vit aussi longtemps que l'onglet, et
// sa modification ne déclenche volontairement aucun rendu — on veut que
// l'écran en cours reste tel quel jusqu'à l'arrivée du contenu.
let demarrageTermine = false;

export function estDemarrageTermine() {
  return demarrageTermine;
}

export function marquerDemarrageTermine() {
  demarrageTermine = true;
}
