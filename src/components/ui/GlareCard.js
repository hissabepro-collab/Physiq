"use client";

// Carte à effet 3D (inclinaison + reflet au curseur) — adaptée d'un composant
// 21st.dev (glare-cards) pour donner un vrai relief à l'interface sans WebGL.
import React, { useRef, useState } from "react";
import { motion, useMotionTemplate, useMotionValue, useSpring, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

export const GlareCard = React.forwardRef(
  ({ children, className, glareColor = "rgba(77,232,255,0.18)", tiltIntensity = 8, ...props }, ref) => {
    const internalRef = useRef(null);
    const prefersReducedMotion = useReducedMotion();
    const [isHovered, setIsHovered] = useState(false);

    const mouseX = useMotionValue(0);
    const mouseY = useMotionValue(0);

    const springConfig = { damping: 25, stiffness: 150, mass: 0.6 };
    const springX = useSpring(mouseX, springConfig);
    const springY = useSpring(mouseY, springConfig);

    function handleMouseMove(e) {
      if (!internalRef.current || prefersReducedMotion) return;
      const rect = internalRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      mouseX.set((e.clientX - centerX) / (rect.width / 2));
      mouseY.set((e.clientY - centerY) / (rect.height / 2));
    }

    function handleMouseLeave() {
      setIsHovered(false);
      mouseX.set(0);
      mouseY.set(0);
    }

    const rotateX = useMotionTemplate`${springY.get() * -tiltIntensity}deg`;
    const rotateY = useMotionTemplate`${springX.get() * tiltIntensity}deg`;
    const backgroundGlare = useMotionTemplate`radial-gradient(circle at calc(50% + ${springX.get() * 100}%) calc(50% + ${springY.get() * 100}%), ${glareColor} 0%, transparent 75%)`;

    return (
      <motion.div
        ref={(node) => {
          internalRef.current = node;
          if (typeof ref === "function") ref(node);
          else if (ref) ref.current = node;
        }}
        onMouseMove={handleMouseMove}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={handleMouseLeave}
        style={{
          rotateX: prefersReducedMotion ? 0 : rotateX,
          rotateY: prefersReducedMotion ? 0 : rotateY,
          transformStyle: "preserve-3d",
          perspective: 1000,
        }}
        className={cn(
          "relative group isolate overflow-hidden rounded-2xl border border-border-soft bg-background-soft/40 backdrop-blur-md transition-shadow duration-500",
          "hover:border-accent/40 hover:shadow-[0_0_40px_-15px_rgba(77,232,255,0.5)]",
          className
        )}
        {...props}
      >
        <motion.div
          className="pointer-events-none absolute inset-0 z-10 opacity-0 transition-opacity duration-500 group-hover:opacity-100 mix-blend-soft-light"
          style={{ background: backgroundGlare }}
        />
        <div
          className="relative z-20 h-full w-full"
          style={{ transform: prefersReducedMotion ? "none" : "translateZ(28px)" }}
        >
          {children}
        </div>
      </motion.div>
    );
  }
);
GlareCard.displayName = "GlareCard";
