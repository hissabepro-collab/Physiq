"use client";

import { useRef } from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

// Ordre des écrans dans la navigation : il définit le "sens" du déplacement.
// Aller vers un onglet plus à droite donne l'impression d'avancer dans le
// parcours, revenir en arrière donne l'impression de reculer.
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

  return (
    <div style={{ perspective: 1400, perspectiveOrigin: "50% 40%" }}>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={pathname}
          style={{ transformStyle: "preserve-3d", transformOrigin: "50% 50%" }}
          initial={{ opacity: 0, rotateY: sens * 14, z: -320, x: sens * 70 }}
          animate={{ opacity: 1, rotateY: 0, z: 0, x: 0 }}
          exit={{ opacity: 0, rotateY: sens * -10, z: -220, x: sens * -50 }}
          transition={{
            duration: 0.42,
            ease: [0.22, 1, 0.36, 1],
            opacity: { duration: 0.26 },
          }}
        >
          {/* Balayage lumineux au moment du passage, dans le sens du déplacement. */}
          <motion.div
            className="pointer-events-none fixed inset-y-0 z-50 w-[35vw]"
            style={{
              background:
                "linear-gradient(90deg, transparent, rgba(77,232,255,0.16), transparent)",
              filter: "blur(6px)",
            }}
            initial={{ left: sens > 0 ? "-40vw" : "105vw", opacity: 1 }}
            animate={{ left: sens > 0 ? "105vw" : "-40vw", opacity: 0 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
          />
          {children}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
