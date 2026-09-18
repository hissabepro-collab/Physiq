// Attente d'une page pendant la navigation.
//
// Volontairement transparente et sans contenu : elle réserve la hauteur pour
// que la mise en page ne saute pas, et laisse voir le décor du fond. Ni blocs
// gris, ni marque, ni rectangle noir — rien qui puisse se lire comme un défaut
// d'affichage.
//
// Son rôle n'est pas d'informer mais d'exister : c'est la présence d'un
// fichier loading.js qui autorise Next à préparer une page à l'avance. Sans
// elle, chaque changement d'onglet attendait le serveur ET le téléchargement
// du code de la page, ce qui rendait la navigation poussive.
//
// Il n'y en a délibérément PAS pour l'accueil : c'est la page sur laquelle
// l'app s'ouvre, et une frontière d'attente y ferait apparaître la barre de
// navigation avant le contenu — l'à-coup visible au lancement.
export default function AttentePage() {
  return <div className="min-h-screen" />;
}
