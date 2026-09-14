"use client";

import { useRef } from "react";
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

  if (prefersReducedMotion) return <>{children}</>;

  // On n'anime QUE l'arrivée de la nouvelle page. Avec une animation de
  // sortie, Next.js remplace le contenu de l'ancienne page avant la fin de
  // l'animation : on voyait alors brièvement la page cible sortir puis
  // revenir. Animer uniquement l'entrée supprime ce chevauchement.
  return (
    <div className="overflow-x-clip">
      <motion.div
        key={pathname}
        initial={{ x: `${sens * 45}%`, opacity: 0 }}
        animate={{ x: "0%", opacity: 1 }}
        transition={{
          x: { duration: 0.36, ease: [0.32, 0.72, 0, 1] },
          opacity: { duration: 0.25 },
        }}
      >
        {children}
      </motion.div>
    </div>
  );
}
