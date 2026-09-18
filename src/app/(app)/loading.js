import EcranSombre from "@/components/EcranSombre";

// Écran d'attente unique : le fond de l'app, rien d'autre.
//
// Il y avait ici un squelette gris — la silhouette de la page à venir — et un
// drapeau censé le réserver à la navigation, en gardant le noir pour le
// lancement. Ça ne pouvait pas marcher : le drapeau était lu pendant le
// rendu, et React réaffiche librement un écran d'attente. Le drapeau basculant
// entre deux rendus, l'écran noir se transformait en squelette gris au milieu
// du lancement.
//
// Plutôt que de rendre ce drapeau plus subtil, on retire ce qu'il protégeait.
// Un écran d'attente n'a rien à raconter ici : la plupart des navigations sont
// déjà instantanées grâce au cache client, et pour les autres, un fond sombre
// suivi de la page qui glisse se lit comme une transition, là où des blocs
// gris fugaces se lisent comme un défaut d'affichage.
export default function Chargement() {
  return <EcranSombre />;
}
