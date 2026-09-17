// Correspondance appareil → écran de démarrage iOS.
// Les images sont générées par scripts/generate-splash.mjs ; si tu ajoutes un
// appareil là-bas, relance le script et reporte la ligne ici.
export const ECRANS_DEMARRAGE = [
  { media: "(device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2)", url: "/splash/iphone-se.png" },
  { media: "(device-width: 414px) and (device-height: 736px) and (-webkit-device-pixel-ratio: 3)", url: "/splash/iphone-8plus.png" },
  { media: "(device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3)", url: "/splash/iphone-x.png" },
  { media: "(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 2)", url: "/splash/iphone-xr.png" },
  { media: "(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 3)", url: "/splash/iphone-xsmax.png" },
  { media: "(device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3)", url: "/splash/iphone-12.png" },
  { media: "(device-width: 393px) and (device-height: 852px) and (-webkit-device-pixel-ratio: 3)", url: "/splash/iphone-14pro.png" },
  { media: "(device-width: 402px) and (device-height: 874px) and (-webkit-device-pixel-ratio: 3)", url: "/splash/iphone-16.png" },
  { media: "(device-width: 428px) and (device-height: 926px) and (-webkit-device-pixel-ratio: 3)", url: "/splash/iphone-12promax.png" },
  { media: "(device-width: 430px) and (device-height: 932px) and (-webkit-device-pixel-ratio: 3)", url: "/splash/iphone-15promax.png" },
  { media: "(device-width: 440px) and (device-height: 956px) and (-webkit-device-pixel-ratio: 3)", url: "/splash/iphone-16promax.png" },
  { media: "(device-width: 420px) and (device-height: 912px) and (-webkit-device-pixel-ratio: 3)", url: "/splash/iphone-air.png" },
  { media: "(device-width: 768px) and (device-height: 1024px) and (-webkit-device-pixel-ratio: 2)", url: "/splash/ipad.png" },
  { media: "(device-width: 810px) and (device-height: 1080px) and (-webkit-device-pixel-ratio: 2)", url: "/splash/ipad-102.png" },
  { media: "(device-width: 744px) and (device-height: 1133px) and (-webkit-device-pixel-ratio: 2)", url: "/splash/ipad-mini.png" },
  { media: "(device-width: 820px) and (device-height: 1180px) and (-webkit-device-pixel-ratio: 2)", url: "/splash/ipad-air-11.png" },
  { media: "(device-width: 834px) and (device-height: 1194px) and (-webkit-device-pixel-ratio: 2)", url: "/splash/ipad-pro-11.png" },
  { media: "(device-width: 834px) and (device-height: 1210px) and (-webkit-device-pixel-ratio: 2)", url: "/splash/ipad-pro-11-m4.png" },
  { media: "(device-width: 1024px) and (device-height: 1366px) and (-webkit-device-pixel-ratio: 2)", url: "/splash/ipad-pro-129.png" },
  { media: "(device-width: 1032px) and (device-height: 1376px) and (-webkit-device-pixel-ratio: 2)", url: "/splash/ipad-pro-13-m4.png" },
  // À ajouter, le cas échéant, sous la forme :
  // { media: "(device-width: Xpx) and (device-height: Ypx) and (-webkit-device-pixel-ratio: Z)", url: "/splash/nom.png" },
  //
  // Pas d'image de secours générique ici, volontairement.
  //
  // iOS n'affiche une image de démarrage que si elle fait exactement la taille
  // de l'écran : une image « passe-partout » est ignorée de toute façon, et une
  // règle large du type `(orientation: portrait)` correspond à tous les
  // appareils, au risque de l'emporter sur l'image exacte déclarée plus haut.
  // Elle ne peut donc que nuire.
  //
  // Si un appareil manque à cette liste, il affichera du blanc au lancement :
  // le bloc « Écran de démarrage » des Paramètres donne les trois valeurs à
  // ajouter (largeur, hauteur, densité), à reporter dans
  // scripts/generate-splash.mjs puis ici.
];

/**
 * Reproduit la règle de sélection d'iOS : l'image doit correspondre EXACTEMENT
 * aux dimensions de l'écran et à sa densité. Une seule valeur qui diffère et
 * iOS ignore l'image, sans rien signaler, en affichant du blanc.
 *
 * Les deux orientations sont acceptées : iOS compare les dimensions physiques
 * de l'écran, indépendamment de la façon dont l'appareil est tenu.
 *
 * Renvoie le nom du fichier, ou null si aucune image ne convient — auquel cas
 * il faut en générer une pour cet appareil.
 */
export function trouverEcranDemarrage(largeur, hauteur, densite) {
  for (const ecran of ECRANS_DEMARRAGE) {
    const m = ecran.media.match(
      /device-width:\s*(\d+)px.*?device-height:\s*(\d+)px.*?pixel-ratio:\s*(\d+)/
    );
    if (!m) continue;
    const [, l, h, d] = m.map(Number);
    const memeTaille = (l === largeur && h === hauteur) || (l === hauteur && h === largeur);
    if (memeTaille && d === densite) return ecran.url.replace("/splash/", "");
  }
  return null;
}
