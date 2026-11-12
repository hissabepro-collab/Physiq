"use client";

import { useEffect } from "react";

// Mesure du lancement depuis l'icône. Monté dans la mise en page racine, ce
// composant ne s'exécute qu'une fois par chargement de document : dans l'app
// installée, c'est le lancement. On garde la durée entre le toucher de
// l'icône (début de la navigation) et la page affichée, et le temps de
// réponse du serveur, sur l'appareil seulement, pour le diagnostic des
// Paramètres. Rien n'est envoyé nulle part.
//
// Depuis le 12/11/2026, il n'y a plus de page d'entrée intermédiaire : le
// début se lit directement dans la mesure de navigation du navigateur.
export default function MesureLancement() {
  useEffect(() => {
    try {
      const installee =
        window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
      if (!installee) return;
      const nav = performance.getEntriesByType("navigation")[0];
      if (nav && nav.type === "reload") return;
      window.localStorage.setItem(
        "physiq-dernier-lancement",
        JSON.stringify({
          quand: Date.now(),
          total: Math.round(performance.now()),
          serveur: nav ? Math.round(nav.responseStart - nav.requestStart) : null,
          redirection: nav ? Math.round(nav.redirectEnd - nav.redirectStart) : null,
          page: window.location.pathname,
        })
      );
    } catch {
      // Stockage indisponible : pas de mesure.
    }
  }, []);
  return null;
}
