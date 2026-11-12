"use client";

import { useEffect } from "react";

// Mesure du lancement depuis l'icône. /demarrage.html note l'heure de départ
// (« physiq-lancement ») ; à la première page affichée ensuite, on calcule
// la durée totale et le temps de réponse du serveur, gardés sur l'appareil
// pour le diagnostic des Paramètres. Rien n'est envoyé nulle part.
export default function MesureLancement() {
  useEffect(() => {
    try {
      const debut = Number(window.localStorage.getItem("physiq-lancement"));
      if (!debut || Date.now() - debut > 60000) return;
      window.localStorage.removeItem("physiq-lancement");
      const nav = performance.getEntriesByType("navigation")[0];
      window.localStorage.setItem(
        "physiq-dernier-lancement",
        JSON.stringify({
          quand: Date.now(),
          total: Date.now() - debut,
          serveur: nav ? Math.round(nav.responseStart - nav.requestStart) : null,
          page: window.location.pathname,
        })
      );
    } catch {
      // Stockage indisponible : pas de mesure.
    }
  }, []);
  return null;
}
