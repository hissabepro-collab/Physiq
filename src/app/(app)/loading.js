"use client";

import EcranLogo from "@/components/EcranLogo";
import SqueletteChargement from "@/components/SqueletteChargement";
import { estDemarrageTermine } from "@/lib/etatDemarrage";

// Deux écrans d'attente pour deux situations différentes — voir le
// commentaire de lib/etatDemarrage.js.
//
// Au tout premier chargement : le logo, qui prolonge l'image de démarrage
// affichée par iOS et rend la transition invisible.
// Ensuite : un squelette discret, pour que passer d'un onglet à l'autre reste
// instantané à l'œil au lieu d'afficher une marque plein écran.
export default function Chargement() {
  return estDemarrageTermine() ? <SqueletteChargement /> : <EcranLogo />;
}
