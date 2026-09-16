import EcranLogo from "@/components/EcranLogo";

// Affiché pendant que l'écran interroge la base.
//
// C'est exactement l'image de démarrage de l'app, et non un squelette gris :
// au lancement, le PNG affiché par iOS, la page /demarrage et cet écran se
// succèdent sans qu'aucun pixel ne change. L'ancien squelette, même très peu
// contrasté, produisait un passage gris d'une fraction de seconde — le
// « grésillement » visible à l'ouverture.
export default function Chargement() {
  return <EcranLogo />;
}
