"use client";

// Carte à effet 3D (inclinaison + reflet au curseur) — adaptée d'un composant
// 21st.dev (glare-cards).
//
// L'effet ne peut se déclencher qu'au survol : sur un appareil tactile il ne
// servirait jamais. On n'active donc toute la machinerie (ressorts, écouteurs
// de souris, couches 3D) que sur les appareils équipés d'un vrai pointeur.
// Au premier rendu on affiche la version simple, identique côté serveur :
// pas de décalage d'hydratation, et le mobile ne paie jamais ce coût.
import React, { useEffect, useRef, useState } from "react";
import { motion, useMotionTemplate, useMotionValue, useSpring, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

const CLASSES_BASE =
  "relative group isolate overflow-hidden rounded-2xl border border-border-soft bg-background-soft/40 sm:backdrop-blur-md transition-shadow duration-500";

function CarteInclinable({ children, className, glareColor, tiltIntensity, ...props }) {
  const internalRef = useRef(null);
  const prefersReducedMotion = useReducedMotion();

  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const springConfig = { damping: 25, stiffness: 150, mass: 0.6 };
  const springX = useSpring(mouseX, springConfig);
  const springY = useSpring(mouseY, springConfig);

  function handleMouseMove(e) {
    if (!internalRef.current || prefersReducedMotion) return;
    const rect = internalRef.current.getBoundingClientRect();
    mouseX.set((e.clientX - (rect.left + rect.width / 2)) / (rect.width / 2));
    mouseY.set((e.clientY - (rect.top + rect.height / 2)) / (rect.height / 2));
  }
  function handleMouseLeave() {
    mouseX.set(0);
    mouseY.set(0);
  }

  const rotateX = useMotionTemplate`${springY.get() * -tiltIntensity}deg`;
  const rotateY = useMotionTemplate`${springX.get() * tiltIntensity}deg`;
  const reflet = useMotionTemplate`radial-gradient(circle at calc(50% + ${springX.get() * 100}%) calc(50% + ${springY.get() * 100}%), ${glareColor} 0%, transparent 75%)`;

  return (
    <motion.div
      ref={internalRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        rotateX: prefersReducedMotion ? 0 : rotateX,
        rotateY: prefersReducedMotion ? 0 : rotateY,
        transformStyle: "preserve-3d",
        perspective: 1000,
      }}
      className={cn(CLASSES_BASE, "hover:border-accent/40 hover:shadow-[0_0_40px_-15px_rgba(77,232,255,0.5)]", className)}
      {...props}
    >
      <motion.div
        className="pointer-events-none absolute inset-0 z-10 opacity-0 transition-opacity duration-500 group-hover:opacity-100 mix-blend-soft-light"
        style={{ background: reflet }}
      />
      <div className="relative z-20 h-full w-full" style={{ transform: prefersReducedMotion ? "none" : "translateZ(28px)" }}>
        {children}
      </div>
    </motion.div>
  );
}

export const GlareCard = React.forwardRef(
  ({ children, className, glareColor = "rgba(77,232,255,0.18)", tiltIntensity = 8, ...props }, ref) => {
    const [pointeurPrecis, setPointeurPrecis] = useState(false);

    useEffect(() => {
      setPointeurPrecis(window.matchMedia("(hover: hover) and (pointer: fine)").matches);
    }, []);

    if (!pointeurPrecis) {
      return (
        <div ref={ref} className={cn(CLASSES_BASE, className)} {...props}>
          {children}
        </div>
      );
    }

    return (
      <CarteInclinable className={className} glareColor={glareColor} tiltIntensity={tiltIntensity} {...props}>
        {children}
      </CarteInclinable>
    );
  }
);
GlareCard.displayName = "GlareCard";
