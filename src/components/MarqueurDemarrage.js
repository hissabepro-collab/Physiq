"use client";

import { useEffect } from "react";
import { marquerDemarrageTermine } from "@/lib/etatDemarrage";

// Signale que l'app est ouverte : à partir de là, les attentes de navigation
// affichent le squelette discret et non plus le logo plein écran.
//
// Placé dans la mise en page de l'app, il se monte en même temps que le tout
// premier écran d'attente. Le drapeau bascule donc pendant que le logo est
// encore affiché — c'est voulu : il ne provoque aucun rendu, l'écran en cours
// reste intact jusqu'à l'arrivée du contenu, et seule la navigation suivante
// en tient compte.
export default function MarqueurDemarrage() {
  useEffect(() => {
    marquerDemarrageTermine();
  }, []);

  return null;
}
