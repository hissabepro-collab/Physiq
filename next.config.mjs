/** @type {import('next').NextConfig} */
const nextConfig = {
  // pdf-parse (via pdfjs-dist) utilise des chemins de worker dynamiques que
  // le bundler de Next.js ne résout pas correctement — on le laisse tourner
  // en require() Node natif à la place.
  serverExternalPackages: ["pdf-parse", "pdfjs-dist"],

  experimental: {
    // Toutes les pages interrogent la base et sont donc rendues à la demande.
    // Par défaut, Next ne garde aucune de ces pages en mémoire côté client :
    // revenir sur un onglet quitté deux secondes plus tôt refait un
    // aller-retour jusqu'aux États-Unis, avec son écran d'attente.
    //
    // Trente secondes de mise en cache rendent ces allers-retours entre
    // onglets instantanés. Sur un suivi de composition corporelle où les
    // données changent au mieux une fois par semaine, l'écart est sans
    // conséquence.
    staleTimes: { dynamic: 30 },
  },
};

export default nextConfig;
