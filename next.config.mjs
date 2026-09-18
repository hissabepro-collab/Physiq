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

  async rewrites() {
    return [
      {
        // L'ancienne page d'entrée était une page Next à cette adresse, et les
        // raccourcis déjà posés sur un écran d'accueil pointent encore dessus :
        // iOS garde le manifeste en mémoire longtemps, même après avoir retiré
        // et remis l'app.
        //
        // C'est une réécriture et non une redirection : une redirection
        // imposerait un aller-retour réseau supplémentaire AVANT la moindre
        // peinture, donc un écran blanc à chaque lancement pour ces
        // raccourcis. Ici, les deux adresses servent le même fichier en une
        // seule requête.
        source: "/demarrage",
        destination: "/demarrage.html",
      },
    ];
  },

  async headers() {
    return [
      {
        // Le service worker sert déjà la page d'entrée depuis son cache, mais
        // rien ne garantit qu'iOS le consulte pour la toute première requête
        // d'un lancement : le worker doit d'abord démarrer. En attendant, le
        // navigateur va chercher la page sur le réseau et n'a rien à afficher
        // — c'est l'image blanche fugace qui reste.
        //
        // Avec ces en-têtes, iOS la sert depuis son propre cache HTTP, sans
        // dépendre du service worker ni du réseau. `stale-while-revalidate`
        // laisse la mise à jour se faire en arrière-plan, donc un
        // déploiement n'attend pas l'expiration pour être pris en compte.
        //
        // `max-age` est volontairement long. Safari n'implémente pas
        // `stale-while-revalidate` : avec dix minutes, il repartait
        // revalider sur le réseau passé ce délai, et l'écran redevenait blanc
        // une fois sur deux selon le moment du lancement. Un jour de validité
        // supprime cette loterie, et le service worker continue de rafraîchir
        // la page en arrière-plan à chaque ouverture.
        source: "/demarrage:suffixe(\\.html)?",
        headers: [
          { key: "Cache-Control", value: "public, max-age=86400, stale-while-revalidate=604800" },
        ],
      },
      {
        // Les écrans de démarrage ne changent jamais à contenu égal, et iOS
        // les demande avant d'afficher quoi que ce soit.
        source: "/splash/:fichier*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=604800, stale-while-revalidate=2592000" },
        ],
      },
    ];
  },
};

export default nextConfig;
