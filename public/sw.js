// Service worker : accélère l'ouverture de l'app en servant les fichiers
// statiques depuis le cache local, pour ne plus attendre le réseau à chaque
// lancement.
//
// Règle stricte : SEULS les fichiers immuables sont mis en cache (les bundles
// Next.js portent une empreinte dans leur nom, les icônes et écrans de
// démarrage ne changent pas). Les pages, les données et l'API ne sont JAMAIS
// mises en cache — tes mesures doivent toujours venir du serveur, et une page
// protégée ne doit pas rester sur l'appareil.

const CACHE = "physiq-statique-v4";

const PREFIXES_CACHABLES = ["/_next/static/", "/icons/", "/splash/"];

// Page d'entrée de l'app installée (voir scripts/generate-entree.mjs). Elle
// n'affiche qu'un fond sombre et n'a aucune ressource externe : la mettre en
// cache suffit à garantir un lancement sans réseau, là où une page Next
// aurait aussi exigé sa feuille de style et ses scripts.
const ENTREE = "/demarrage.html";

function estCachable(url) {
  if (url.origin !== self.location.origin) return false;
  if (url.pathname === "/manifest.json") return true;
  return PREFIXES_CACHABLES.some((p) => url.pathname.startsWith(p));
}

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll([ENTREE, "/manifest.json", "/icons/icon-192.png"]))
      .catch(() => {})
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

  // La page d'entrée est servie depuis le cache immédiatement, puis rafraîchie
  // en arrière-plan : le lancement n'attend jamais le réseau, et la version
  // suivante sera à jour.
  if (url.origin === self.location.origin && url.pathname === ENTREE) {
    event.respondWith(
      caches.open(CACHE).then(async (cache) => {
        const enCache = await cache.match(ENTREE);
        const reseau = fetch(requete)
          .then((reponse) => {
            if (reponse.ok && reponse.type === "basic") cache.put(ENTREE, reponse.clone());
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
