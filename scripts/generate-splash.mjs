// Génère les écrans de démarrage iOS. Sans eux, iOS affiche un écran blanc
// entre le moment où l'on touche l'icône et l'apparition de l'app.
// iOS n'accepte que des images aux dimensions EXACTES de l'appareil : il faut
// donc une image par modèle, sélectionnée par requête média.
import sharp from "sharp";
import fs from "fs/promises";
import path from "path";

const DOSSIER = path.join(process.cwd(), "public", "splash");
const FOND = "#050a0e";
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
  // Images de secours, utilisées quand aucune dimension exacte ne correspond
  // (modèle trop récent pour cette liste, ou orientation paysage).
  { nom: "secours", l: 440, h: 956, d: 3 },
  { nom: "secours-paysage", l: 956, h: 440, d: 3 },
];

function svgDemarrage(largeur, hauteur) {
  const cx = largeur / 2;
  const cy = hauteur / 2;
  const r = Math.min(largeur, hauteur) * 0.1;
  return `
  <svg width="${largeur}" height="${hauteur}" viewBox="0 0 ${largeur} ${hauteur}" xmlns="http://www.w3.org/2000/svg">
    <rect width="${largeur}" height="${hauteur}" fill="${FOND}"/>
    <circle cx="${cx}" cy="${cy}" r="${r * 2.2}" fill="${ACCENT}" opacity="0.06"/>
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${ACCENT}" stroke-width="${r * 0.09}"/>
    <circle cx="${cx}" cy="${cy}" r="${r * 0.42}" fill="${ACCENT}"/>
    <text x="${cx}" y="${cy + r * 2.6}" font-family="system-ui, sans-serif"
          font-size="${r * 0.42}" font-weight="700" letter-spacing="${r * 0.08}"
          fill="${ACCENT}" text-anchor="middle" opacity="0.85">PHYSIQ</text>
  </svg>`;
}

await fs.mkdir(DOSSIER, { recursive: true });

for (const a of APPAREILS) {
  const largeur = a.l * a.d;
  const hauteur = a.h * a.d;
  await sharp(Buffer.from(svgDemarrage(largeur, hauteur)))
    .png()
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
