"use client";

import { useRef } from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

// Ordre des écrans : il définit le sens du glissement, pour que l'animation
// suive exactement le sens du doigt (balayage vers la gauche = la page part
// vers la gauche, la suivante arrive par la droite).
const PARCOURS = ["/", "/scan", "/historique", "/comparer", "/objectifs", "/journal", "/parametres"];

function position(pathname) {
  const index = PARCOURS.indexOf(pathname);
  return index === -1 ? PARCOURS.length : index;
}

export default function PageTransition({ children }) {
  const pathname = usePathname();
  const prefersReducedMotion = useReducedMotion();
  const precedent = useRef(pathname);

  // sens = +1 : on avance dans le parcours (glissement vers la gauche)
  // sens = -1 : on recule (glissement vers la droite)
  const sens = position(pathname) >= position(precedent.current) ? 1 : -1;
  precedent.current = pathname;

  if (prefersReducedMotion) return <>{children}</>;

  return (
    <div className="overflow-x-clip">
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={pathname}
          initial={{ x: `${sens * 55}%`, opacity: 0 }}
          animate={{ x: "0%", opacity: 1 }}
          exit={{ x: `${sens * -55}%`, opacity: 0 }}
          transition={{
            x: { duration: 0.34, ease: [0.32, 0.72, 0, 1] },
            opacity: { duration: 0.22 },
          }}
        >
          {children}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
