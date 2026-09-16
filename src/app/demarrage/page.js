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
// Elle ne montre rien : juste le fond sombre, immédiatement, puis elle bascule
// vers le tableau de bord (ou l'écran de connexion, via le pare-feu). Vue de
// l'utilisateur, l'app s'ouvre directement sur sa page.
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
