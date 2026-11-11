"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import CorpsParticules from "@/components/CorpsParticules";

// Scène d'ouverture de l'accueil : une section haute (2,2 écrans) dont le
// contenu reste collé à l'écran pendant qu'on fait défiler. L'avancement du
// défilement (0 → 1) pilote la dissolution du corps en anneau de score.
// Les textes suivent le même avancement via la variable CSS --p, sans
// re-rendu React à chaque image.

export default function HeroCorps({ prenom, rang, jours }) {
  const sectionRef = useRef(null);
  const progressRef = useRef(0);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return undefined;
    let raf = 0;
    function mesurer() {
      raf = 0;
      const rect = section.getBoundingClientRect();
      const course = rect.height - window.innerHeight;
      const p = course > 0 ? Math.min(1, Math.max(0, -rect.top / course)) : 0;
      progressRef.current = p;
      section.style.setProperty("--p", p.toFixed(4));
      // Le bouton de l'acte 2 n'est cliquable qu'une fois visible.
      section.dataset.acte = p > 0.66 ? "2" : "1";
    }
    function surDefilement() {
      if (!raf) raf = requestAnimationFrame(mesurer);
    }
    mesurer();
    window.addEventListener("scroll", surDefilement, { passive: true });
    window.addEventListener("resize", surDefilement);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", surDefilement);
      window.removeEventListener("resize", surDefilement);
    };
  }, []);

  const scan =
    jours == null
      ? "Aucun scan pour l'instant"
      : jours === 0
      ? "Scan d'aujourd'hui"
      : jours === 1
      ? "Scan d'hier"
      : `Dernier scan il y a ${jours} jours`;

  return (
    <section ref={sectionRef} data-acte="1" className="relative h-[220svh]" style={{ "--p": 0 }}>
      <div className="sticky top-0 h-[100svh] overflow-hidden">
        <CorpsParticules progressRef={progressRef} score={rang?.score ?? null} className="absolute inset-0" />

        {/* Acte 1 : le corps. Le texte s'efface dès qu'on commence à défiler. */}
        <div
          className="pointer-events-none absolute inset-x-0 top-0 px-6 pt-[max(env(safe-area-inset-top),28px)] sm:px-12 sm:pt-12"
          style={{ opacity: "clamp(0, calc(1 - var(--p) * 5), 1)", transform: "translateY(calc(var(--p) * -60px))" }}
        >
          <div className="etiquette flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-accent shadow-[0_0_8px_var(--accent)]" />
            Physiq · {scan}
          </div>
          <h1 className="titre-serif mt-4 text-[52px] sm:text-[84px]">
            Salut {prenom},
            <br />
            <span className="italic text-accent [text-shadow:0_0_30px_rgba(77,232,255,0.45)]">ton corps</span>{" "}
            <span className="italic">en lumière.</span>
          </h1>
        </div>

        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-col items-center gap-2 pb-32 sm:pb-12"
          style={{ opacity: "clamp(0, calc(1 - var(--p) * 6), 1)" }}
        >
          <span className="etiquette">Fais défiler</span>
          <span className="relative h-9 w-px overflow-hidden bg-white/10">
            <span className="absolute inset-x-0 top-0 h-3 animate-[defile_1.8s_ease-in-out_infinite] bg-accent" />
          </span>
        </div>

        {/* Acte 2 : l'anneau. Le score apparaît quand les particules arrivent. */}
        <div
          className="absolute inset-0 flex flex-col items-center justify-center text-center"
          style={{
            opacity: "clamp(0, calc((var(--p) - 0.62) * 5), 1)",
            transform: "scale(calc(0.92 + clamp(0, calc((var(--p) - 0.62) * 5), 1) * 0.08))",
            pointerEvents: "none",
          }}
        >
          {rang ? (
            <>
              <span className="etiquette">Rang</span>
              <span className="titre-serif mt-1 text-[88px] italic leading-none text-accent [text-shadow:0_0_40px_rgba(77,232,255,0.55)] sm:text-[120px]">
                {rang.label}
              </span>
              <span className="tabular mt-2 font-display text-lg font-semibold">
                {rang.score}
                <span className="text-foreground-muted">/100</span>
              </span>
              {rang.palierSuivant && (
                <span className="mt-1 text-xs text-foreground-muted">
                  {rang.pointsAvantPalierSuivant} pt{rang.pointsAvantPalierSuivant > 1 ? "s" : ""} avant {rang.palierSuivant}
                </span>
              )}
            </>
          ) : (
            <>
              <span className="etiquette">Ton anneau</span>
              <span className="titre-serif mt-2 max-w-[15ch] text-[40px] italic leading-tight sm:text-[56px]">
                attend son premier scan.
              </span>
              <Link
                href="/scan"
                className="cta-anneau mt-6 inline-flex h-12 items-center gap-2 rounded-full bg-accent px-6 text-sm font-semibold text-[#04121a] shadow-[0_0_30px_-4px_rgba(77,232,255,0.7)]"
              >
                Importer mon rapport Visbody →
              </Link>
            </>
          )}
        </div>
      </div>

      <style>{`
        [data-acte="2"] .cta-anneau { pointer-events: auto; }
        @keyframes defile {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(300%); }
        }
      `}</style>
    </section>
  );
}
