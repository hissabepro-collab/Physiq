import EcranLogo from "@/components/EcranLogo";
import RedirectionAccueil from "@/components/RedirectionAccueil";

// Page d'entrée de l'application installée.
//
// Elle est entièrement statique : aucune donnée, aucune requête serveur,
// aucune base. Elle est donc servie depuis le réseau de diffusion en quelques
// dizaines de millisecondes, là où le tableau de bord doit réveiller une
// fonction serveur puis interroger une base distante — c'est cette attente
// qui laissait un écran blanc au lancement.
//
// Elle peint immédiatement le fond sombre et le logo, puis bascule vers le
// tableau de bord (ou l'écran de connexion, via le pare-feu) une fois le
// navigateur prêt.
export const dynamic = "force-static";

export const metadata = {
  title: "Physiq",
};

export default function Demarrage() {
  return (
    <>
      <EcranLogo />
      <RedirectionAccueil />
    </>
  );
}
