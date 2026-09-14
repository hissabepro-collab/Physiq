"use client";

import { usePathname } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

export default function PageTransition({ children }) {
  const pathname = usePathname();
  const prefersReducedMotion = useReducedMotion();

  if (prefersReducedMotion) return <>{children}</>;

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={pathname}
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
        className="relative"
      >
        <motion.div
          className="pointer-events-none fixed inset-x-0 top-0 z-50 h-[2px]"
          style={{ background: "linear-gradient(90deg, transparent, #4de8ff, transparent)" }}
          initial={{ scaleX: 0, opacity: 1 }}
          animate={{ scaleX: 1, opacity: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        />
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
