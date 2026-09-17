// Génère les écrans de démarrage iOS. Sans eux, iOS affiche un écran blanc
// entre le moment où l'on touche l'icône et l'apparition de l'app.
// iOS n'accepte que des images aux dimensions EXACTES de l'appareil : il faut
// donc une image par modèle, sélectionnée par requête média.
import sharp from "sharp";
import fs from "fs/promises";
import path from "path";

const DOSSIER = path.join(process.cwd(), "public", "splash");
const FOND = "#050a0e";
// Conservé pour référence : la charte de l'app, si un visuel revient ici un jour.
const ACCENT = "#4de8ff";

// largeur/hauteur en points CSS + densité : c'est ce trio qui sert de clé
// dans la requête média, et le produit qui donne la taille en pixels.
export const APPAREILS = [
  { nom: "iphone-se", l: 375, h: 667, d: 2 },
  { nom: "iphone-8plus", l: 414, h: 736, d: 3 },
  { nom: "iphone-x", l: 375, h: 812, d: 3 },
  { nom: "iphone-xr", l: 414, h: 896, d: 2 },
  { nom: "iphone-xsmax", l: 414, h: 896, d: 3 },
  { nom: "iphone-12", l: 390, h: 844, d: 3 },
  { nom: "iphone-14pro", l: 393, h: 852, d: 3 },
  { nom: "iphone-16", l: 402, h: 874, d: 3 },
  { nom: "iphone-12promax", l: 428, h: 926, d: 3 },
  { nom: "iphone-15promax", l: 430, h: 932, d: 3 },
  { nom: "iphone-16promax", l: 440, h: 956, d: 3 },
  { nom: "iphone-air", l: 420, h: 912, d: 3 },
  { nom: "ipad", l: 768, h: 1024, d: 2 },
  { nom: "ipad-102", l: 810, h: 1080, d: 2 },
  { nom: "ipad-mini", l: 744, h: 1133, d: 2 },
  { nom: "ipad-air-11", l: 820, h: 1180, d: 2 },
  { nom: "ipad-pro-11", l: 834, h: 1194, d: 2 },
  { nom: "ipad-pro-11-m4", l: 834, h: 1210, d: 2 },
  { nom: "ipad-pro-129", l: 1024, h: 1366, d: 2 },
  { nom: "ipad-pro-13-m4", l: 1032, h: 1376, d: 2 },
];

// Uni, sans logo ni nom.
//
// Ces images servent uniquement à ce que l'instant entre le toucher de l'icône
// et l'apparition de l'app soit noir plutôt que blanc. Une marque dessinée ici
// se lit comme un écran d'accueil de plus à traverser : on veut que l'app
// paraisse s'ouvrir directement sur sa page.
function svgDemarrage(largeur, hauteur) {
  return `
  <svg width="${largeur}" height="${hauteur}" viewBox="0 0 ${largeur} ${hauteur}" xmlns="http://www.w3.org/2000/svg">
    <rect width="${largeur}" height="${hauteur}" fill="${FOND}"/>
  </svg>`;
}

await fs.mkdir(DOSSIER, { recursive: true });

for (const a of APPAREILS) {
  const largeur = a.l * a.d;
  const hauteur = a.h * a.d;
  // L'image est unie : une palette de deux couleurs suffit, et fait passer
  // chaque fichier de ~75 ko à ~2 ko. iOS doit la charger avant même
  // d'afficher quoi que ce soit, donc chaque kilo-octet compte.
  await sharp(Buffer.from(svgDemarrage(largeur, hauteur)))
    .png({ palette: true, colours: 2, compressionLevel: 9, effort: 10 })
    .toFile(path.join(DOSSIER, `${a.nom}.png`));
  console.log(`✓ ${a.nom}.png — ${largeur}×${hauteur}`);
}

// Les balises <link> correspondantes, à coller dans le layout.
console.log("\n--- balises média ---");
for (const a of APPAREILS) {
  console.log(
    `{ media: "(device-width: ${a.l}px) and (device-height: ${a.h}px) and (-webkit-device-pixel-ratio: ${a.d})", url: "/splash/${a.nom}.png" },`
  );
}
