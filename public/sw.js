// Service worker : accélère l'ouverture de l'app en servant les fichiers
// statiques depuis le cache local, pour ne plus attendre le réseau à chaque
// lancement.
//
// Règle stricte : SEULS les fichiers immuables sont mis en cache (les bundles
// Next.js portent une empreinte dans leur nom, les icônes et écrans de
// démarrage ne changent pas). Les pages, les données et l'API ne sont JAMAIS
// mises en cache — tes mesures doivent toujours venir du serveur, et une page
// protégée ne doit pas rester sur l'appareil.

const CACHE = "physiq-statique-v3";

const PREFIXES_CACHABLES = ["/_next/static/", "/icons/", "/splash/"];

// Page d'entrée de l'app installée. Elle n'affiche que le fond sombre — aucune
// donnée personnelle — donc on peut la garder hors ligne, et c'est justement
// ce qui permet d'afficher quelque chose avant même d'avoir joint le réseau.
const ENTREE = "/demarrage";

/**
 * Met en cache tout ce dont la page d'entrée a besoin pour s'afficher.
 *
 * C'est le point décisif : une feuille de style externe bloque le rendu. Tant
 * qu'elle n'est pas arrivée, le navigateur ne peint rien du tout — donc du
 * blanc — quelle que soit la couleur de fond écrite dans le HTML. Sur mobile,
 * ces 47 ko à aller chercher, c'est le flash blanc au lancement.
 *
 * Plutôt que de tenir à jour une liste de fichiers dont les noms changent à
 * chaque build, on lit le HTML déjà en cache et on en extrait ses dépendances,
 * puis les polices référencées par la feuille de style.
 */
async function precacherChemin(cache) {
  const reponse = await cache.match(ENTREE);
  if (!reponse) return;

  const html = await reponse.clone().text();
  const liens = [...html.matchAll(/(?:href|src)="(\/_next\/static\/[^"]+)"/g)].map((m) => m[1]);

  // Chaque fichier est traité séparément : un échec isolé ne doit pas annuler
  // la mise en cache de tous les autres.
  await Promise.all(liens.map((url) => cache.add(url).catch(() => {})));

  const feuilles = liens.filter((url) => url.endsWith(".css"));
  for (const feuille of feuilles) {
    const css = await cache.match(feuille);
    if (!css) continue;
    const texte = await css.clone().text();
    const polices = [...texte.matchAll(/url\((\/_next\/static\/media\/[^)]+)\)/g)].map((m) => m[1]);
    await Promise.all(polices.map((url) => cache.add(url).catch(() => {})));
  }
}

function estCachable(url) {
  if (url.origin !== self.location.origin) return false;
  if (url.pathname === "/manifest.json") return true;
  return PREFIXES_CACHABLES.some((p) => url.pathname.startsWith(p));
}

self.addEventListener("install", (event) => {
  self.skipWaiting();
  // Tout le chemin de lancement est mis en cache dès l'installation : au
  // prochain démarrage, la page d'entrée s'affiche sans toucher au réseau.
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      await cache.addAll([ENTREE, "/manifest.json", "/icons/icon-192.png"]).catch(() => {});
      await precacherChemin(cache);
    })()
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cles) => Promise.all(cles.filter((c) => c !== CACHE).map((c) => caches.delete(c))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const requete = event.request;
  if (requete.method !== "GET") return;

  const url = new URL(requete.url);

  // L'écran de démarrage est servi depuis le cache immédiatement, puis
  // rafraîchi en arrière-plan : le lancement n'attend jamais le réseau, et la
  // version suivante sera à jour.
  if (url.origin === self.location.origin && url.pathname === ENTREE) {
    event.respondWith(
      caches.open(CACHE).then(async (cache) => {
        const enCache = await cache.match(ENTREE);
        const reseau = fetch(requete)
          .then(async (reponse) => {
            if (reponse.ok && reponse.type === "basic") {
              await cache.put(ENTREE, reponse.clone());
              // Un nouveau déploiement renomme les fichiers : sans cette
              // reprise, le HTML fraîchement mis en cache pointerait vers des
              // fichiers absents du cache et le blanc reviendrait.
              await precacherChemin(cache);
            }
            return reponse;
          })
          .catch(() => enCache);
        return enCache || reseau;
      })
    );
    return;
  }

  if (!estCachable(url)) return; // page, données, API : toujours le réseau

  event.respondWith(
    caches.match(requete).then((enCache) => {
      if (enCache) return enCache;
      return fetch(requete).then((reponse) => {
        // On ne garde que les réponses complètes et valides.
        if (reponse.ok && reponse.status === 200 && reponse.type === "basic") {
          const copie = reponse.clone();
          caches.open(CACHE).then((cache) => cache.put(requete, copie));
        }
        return reponse;
      });
    })
  );
});
