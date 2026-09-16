"use client";

import EcranSombre from "@/components/EcranSombre";
import SqueletteChargement from "@/components/SqueletteChargement";
import { estDemarrageTermine } from "@/lib/etatDemarrage";

// Deux écrans d'attente pour deux situations différentes — voir le
// commentaire de lib/etatDemarrage.js.
//
// Au lancement de l'app : rien, juste le fond sombre, pour que l'ouverture
// donne l'impression d'arriver directement sur la page.
// Ensuite : un squelette discret, qui laisse deviner la page qui arrive quand
// on passe d'un onglet à l'autre.
export default function Chargement() {
  return estDemarrageTermine() ? <SqueletteChargement /> : <EcranSombre />;
}
