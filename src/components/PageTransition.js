"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";

// Ordre des écrans : il définit le sens du glissement, pour que l'animation
// suive le sens du doigt (balayage vers la gauche = la nouvelle page arrive
// par la droite).
const PARCOURS = ["/", "/scan", "/historique", "/comparer", "/objectifs", "/journal", "/parametres"];

function position(pathname) {
  const index = PARCOURS.indexOf(pathname);
  return index === -1 ? PARCOURS.length : index;
}

export default function PageTransition({ children }) {
  const pathname = usePathname();
  const prefersReducedMotion = useReducedMotion();
  const precedent = useRef(pathname);

  const sens = position(pathname) >= position(precedent.current) ? 1 : -1;
  precedent.current = pathname;

  // Au tout premier affichage (ouverture de l'app), il n'y a pas de page
  // précédente : faire glisser le contenu latéralement donne une impression
  // de saccade. On ne l'anime qu'à partir de la première vraie navigation.
  const [aNavigue, setANavigue] = useState(false);
  const premierRendu = useRef(true);
  const veille = useRef(pathname);
  useEffect(() => {
    const avant = veille.current;
    veille.current = pathname;

    if (premierRendu.current) {
      premierRendu.current = false;
      return;
    }
    // La bascule depuis la page d'entrée fait partie du lancement, pas d'une
    // navigation : l'animer ferait glisser le tableau de bord au démarrage,
    // exactement l'à-coup qu'on cherche à supprimer.
    if (avant === "/demarrage") return;

    setANavigue(true);
  }, [pathname]);

  if (prefersReducedMotion || !aNavigue) return <>{children}</>;

  // On n'anime QUE l'arrivée de la nouvelle page. Avec une animation de
  // sortie, Next.js remplace le contenu de l'ancienne page avant la fin de
  // l'animation : on voyait alors brièvement la page cible sortir puis
  // revenir. Animer uniquement l'entrée supprime ce chevauchement.
  return (
    <div className="overflow-x-clip">
      <motion.div
        key={pathname}
        // Course plus courte et durée plus brève : moins de pixels déplacés à
        // chaque image, donc un glissement franc plutôt que traînant.
        // `willChange` prévient le navigateur pour qu'il prépare la couche.
        style={{ willChange: "transform, opacity" }}
        initial={{ x: `${sens * 22}%`, opacity: 0 }}
        animate={{ x: "0%", opacity: 1 }}
        transition={{
          x: { duration: 0.26, ease: [0.32, 0.72, 0, 1] },
          opacity: { duration: 0.18 },
        }}
      >
        {children}
      </motion.div>
    </div>
  );
}
