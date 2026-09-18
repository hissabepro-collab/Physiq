import EcranSombre from "@/components/EcranSombre";
import RedirectionAccueil from "@/components/RedirectionAccueil";

// Page d'entrée de l'application installée.
//
// Elle est entièrement statique : aucune donnée, aucune requête serveur,
// aucune base. Elle est donc servie depuis le réseau de diffusion en quelques
// dizaines de millisecondes, là où le tableau de bord doit réveiller une
// fonction serveur puis interroger une base distante — c'est cette attente
// qui laissait un écran blanc au lancement.
//
// Elle vit DANS le groupe (app), et c'est essentiel : elle partage donc la
// même mise en page, barre de navigation comprise. Placée en dehors, elle
// n'avait pas cette barre, qui surgissait ensuite d'un coup sur le fond noir —
// un à-coup visible au lancement. Ici, la barre est là dès la première image
// et ne bouge plus ; la mise en page reste montée pendant la bascule vers le
// tableau de bord, seul le contenu change.
export const dynamic = "force-static";

export const metadata = {
  title: "Physiq",
};

export default function Demarrage() {
  return (
    <>
      <EcranSombre />
      <RedirectionAccueil />
    </>
  );
}
