"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

// Balayage horizontal pour passer d'un écran à l'autre sur téléphone.
// L'ordre suit celui de la barre de navigation, donc le sens du geste
// correspond au sens de l'animation de transition.
const PARCOURS = ["/", "/scan", "/historique", "/comparer", "/objectifs", "/journal", "/parametres"];

const DISTANCE_DECLENCHEMENT = 55; // px parcourus avant de basculer
const RATIO_HORIZONTAL = 1.4; // le geste doit rester franchement horizontal

/** Un geste qui démarre dans une zone défilable horizontalement lui appartient. */
function dansZoneDefilable(element) {
  let noeud = element;
  while (noeud && noeud !== document.body) {
    if (noeud.scrollWidth > noeud.clientWidth + 4) {
      const overflow = getComputedStyle(noeud).overflowX;
      if (overflow === "auto" || overflow === "scroll") return true;
    }
    noeud = noeud.parentElement;
  }
  return false;
}

export default function SwipeNavigation() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const index = PARCOURS.indexOf(pathname);
    if (index === -1) return;

    const precedent = PARCOURS[index - 1];
    const suivant = PARCOURS[index + 1];

    // Les écrans voisins sont préparés à l'avance : au moment du geste, la
    // page est déjà prête et n'a pas à être demandée au serveur.
    if (precedent) router.prefetch(precedent);
    if (suivant) router.prefetch(suivant);

    let depart = null;
    let declenche = false;

    function onTouchStart(e) {
      declenche = false;
      if (e.touches.length !== 1 || dansZoneDefilable(e.target)) {
        depart = null;
        return;
      }
      depart = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }

    // On bascule dès que le seuil est franchi, sans attendre que le doigt
    // soit levé : c'est ce qui supprime la demi-seconde d'attente.
    function onTouchMove(e) {
      if (!depart || declenche || e.touches.length !== 1) return;
      const dx = e.touches[0].clientX - depart.x;
      const dy = e.touches[0].clientY - depart.y;

      if (Math.abs(dx) < DISTANCE_DECLENCHEMENT) return;
      if (Math.abs(dx) < Math.abs(dy) * RATIO_HORIZONTAL) {
        depart = null; // geste vertical : c'est un défilement, on n'intervient pas
        return;
      }

      const cible = dx < 0 ? suivant : precedent;
      if (cible) {
        declenche = true;
        router.push(cible);
      }
      depart = null;
    }

    function onTouchEnd() {
      depart = null;
    }

    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("touchend", onTouchEnd, { passive: true });
    return () => {
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, [pathname, router]);

  return null;
}
