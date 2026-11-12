/** @type {import('next').NextConfig} */
const nextConfig = {
  // @napi-rs/canvas fournit DOMMatrix à pdf-parse côté serveur. pdf-parse le
  // charge par require() dynamique, que le traçage de Vercel ne détecte pas :
  // sans l'inscrire ici et en dépendance directe, DOMMatrix reste indéfini et
  // l'import PDF échoue en production (absent en local, où le paquet traîne).
  //
  // pdf-parse (via pdfjs-dist) utilise des chemins de worker dynamiques que
  // le bundler de Next.js ne résout pas correctement — on le laisse tourner
  // en require() Node natif à la place.
  serverExternalPackages: ["pdf-parse", "pdfjs-dist", "@napi-rs/canvas"],

  // Le worker de pdfjs est chargé par chemin depuis le disque : Vercel ne le
  // suit pas tout seul dans la fonction d'import. On l'inscrit explicitement.
  outputFileTracingIncludes: {
    "/api/scan": ["./node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs"],
  },

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

    // Styles écrits dans la page elle-même (balise <style>) au lieu d'un
    // fichier séparé : une feuille externe bloque la première peinture tant
    // qu'elle n'est pas arrivée. C'est ce qui permet d'ouvrir l'accueil
    // directement, sans page d'entrée intermédiaire (12/11/2026).
    inlineCss: true,
  },

  async redirects() {
    return [
      {
        // Ancienne page d'entrée de l'app installée. Le passage de cette page
        // à l'accueil faisait apparaître une demi-seconde le fond blanc par
        // défaut d'iOS entre les deux documents (constaté sur iPhone le
        // 12/11/2026). Les icônes déjà posées visent encore cette adresse :
        // on les envoie droit sur l'accueil. Une redirection n'affiche rien,
        // l'écran de démarrage reste donc jusqu'à l'accueil complet.
        // Le service worker fait la même redirection sans réseau.
        source: "/demarrage:suffixe(\\.html)?",
        destination: "/",
        permanent: false,
      },
    ];
  },

  async headers() {
    return [
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
