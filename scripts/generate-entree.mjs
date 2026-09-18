// Génère public/demarrage.html — la page d'entrée de l'app installée.
//
// POURQUOI UN FICHIER HTML À LA MAIN, ET PAS UNE PAGE NEXT
//
// Une feuille de style externe bloque le rendu : tant qu'elle n'est pas
// arrivée, le navigateur ne peint RIEN, donc du blanc, quelle que soit la
// couleur de fond écrite dans le document. Toute page Next porte la feuille de
// style de l'app entière (~50 ko), et on ne peut pas l'en détacher.
//
// Au premier lancement après avoir remis l'app sur l'écran d'accueil, les
// caches sont vides par définition : ces 50 ko partent sur le réseau et l'écran
// est blanc le temps qu'ils arrivent. C'est le seul cas qui résistait à tout.
//
// Ce fichier n'a aucune ressource externe : ni feuille de style, ni script, ni
// police, ni image. Le fond sombre est donc peint dès le premier octet reçu,
// même cache vide, même réseau lent.
//
// Il navigue ensuite vers l'app par un changement de document classique. Le
// navigateur garde la page courante affichée jusqu'à ce que la suivante soit
// prête à peindre — c'est le comportement standard, dit « paint holding ». Le
// fond sombre reste donc à l'écran pendant tout le chargement, et le tableau
// de bord apparaît complet, d'un seul coup. C'est aussi ce qui supprime
// l'à-coup de la barre de navigation : en navigation interne, Next affiche la
// mise en page avant le contenu, alors qu'un changement de document peint la
// page entière en une fois.
//
// iOS lit les écrans de démarrage dans l'en-tête de la page ouverte au moment
// de l'ajout à l'écran d'accueil, et aussi de la page de départ : ils sont donc
// déclarés ici comme dans la mise en page de l'app.
import fs from "fs/promises";
import path from "path";
import { ECRANS_DEMARRAGE } from "../src/lib/ecransDemarrage.js";

const FOND = "#050a0e";
const SORTIE = path.join(process.cwd(), "public", "demarrage.html");

const ecrans = ECRANS_DEMARRAGE.map(
  ({ media, url }) => `<link rel="apple-touch-startup-image" media="${media}" href="${url}">`
).join("\n");

const html = `<!DOCTYPE html>
<!-- Fichier généré par scripts/generate-entree.mjs — ne pas modifier à la main. -->
<html lang="fr" style="background-color:${FOND};color-scheme:dark">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="color-scheme" content="dark">
<meta name="theme-color" content="${FOND}">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black">
<meta name="apple-mobile-web-app-title" content="Physiq">
<title>Physiq</title>
<link rel="manifest" href="/manifest.json">
<link rel="apple-touch-icon" sizes="180x180" href="/icons/apple-touch-icon.png">
${ecrans}
<style>html,body{margin:0;padding:0;height:100%;background-color:${FOND}}</style>
</head>
<body>
<script>
// Deux images d'attente avant de naviguer : la première laisse le navigateur
// peindre le fond sombre, la seconde garantit qu'il est bien à l'écran. Sans
// cela, la navigation peut partir avant la première peinture et l'on retombe
// sur l'écran blanc qu'on cherche à éviter.
requestAnimationFrame(function () {
  requestAnimationFrame(function () {
    location.replace("/");
  });
});
</script>
<noscript><meta http-equiv="refresh" content="0;url=/"></noscript>
</body>
</html>
`;

await fs.writeFile(SORTIE, html, "utf8");
console.log(`✓ public/demarrage.html — ${Buffer.byteLength(html)} octets, ${ECRANS_DEMARRAGE.length} écrans de démarrage, 0 ressource externe`);
