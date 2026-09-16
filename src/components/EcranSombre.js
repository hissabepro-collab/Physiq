// Écran d'attente du lancement : rien d'autre que le fond de l'app.
//
// Volontairement vide. Il occupe l'espace entre le moment où l'on touche
// l'icône et l'apparition du tableau de bord, et son seul rôle est que cet
// instant soit noir plutôt que blanc. Toute marque affichée ici — logo, nom —
// se voit comme une étape supplémentaire avant d'arriver sur l'app.
//
// La couleur est écrite en dur plutôt que reprise du thème : cet écran doit
// peindre avant même que la feuille de style ne soit chargée.
export default function EcranSombre() {
  return <div className="min-h-screen w-full" style={{ backgroundColor: "#050a0e" }} />;
}
