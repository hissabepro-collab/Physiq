"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

// Balayage horizontal pour passer d'un écran à l'autre sur téléphone.
// L'ordre suit celui de la barre de navigation, donc le sens du geste
// correspond au sens de l'animation de transition.
const PARCOURS = ["/", "/scan", "/historique", "/comparer", "/objectifs", "/journal", "/parametres"];

const DISTANCE_MIN = 65; // px : en dessous, c'est un tap ou une hésitation
const RATIO_HORIZONTAL = 1.6; // le geste doit être franchement horizontal

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

    let depart = null;

    function onTouchStart(e) {
      if (e.touches.length !== 1 || dansZoneDefilable(e.target)) {
        depart = null;
        return;
      }
      depart = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }

    function onTouchEnd(e) {
      if (!depart) return;
      const fin = e.changedTouches[0];
      const dx = fin.clientX - depart.x;
      const dy = fin.clientY - depart.y;
      depart = null;

      if (Math.abs(dx) < DISTANCE_MIN) return;
      if (Math.abs(dx) < Math.abs(dy) * RATIO_HORIZONTAL) return;

      // Balayer vers la gauche fait avancer dans le parcours.
      const cible = dx < 0 ? PARCOURS[index + 1] : PARCOURS[index - 1];
      if (cible) router.push(cible);
    }

    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchend", onTouchEnd, { passive: true });
    return () => {
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, [pathname, router]);

  return null;
}
