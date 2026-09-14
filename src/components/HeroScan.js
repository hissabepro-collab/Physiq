import HoloRing from "@/components/HoloRing";

// Bandeau holographique "vitrine" de l'accueil — entièrement animé en CSS,
// donc identique au toucher (mobile) et à la souris (desktop), contrairement
// à un effet qui ne se déclencherait qu'au survol.
export default function HeroScan({ rang }) {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-border-soft bg-background-soft/40 backdrop-blur-md">
      <div className="hero-scanlines" />
      <div className="relative z-10 flex flex-col items-center gap-6 px-6 py-8 sm:flex-row sm:justify-center sm:gap-10 sm:py-10">
        <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.25em] text-accent sm:hidden">
          <span className="hero-dot" /> Scan actif
        </div>

        <HoloRing size={190} scanBeam equator />

        {rang && (
          <div className="flex flex-col items-center gap-3 sm:items-start">
            <div className="hidden items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.25em] text-accent sm:flex">
              <span className="hero-dot" /> Scan actif
            </div>
            <div
              className="flex h-20 w-[72px] shrink-0 items-center justify-center border border-accent/60"
              style={{
                clipPath: "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)",
                background: "linear-gradient(160deg, rgba(77,232,255,0.24), rgba(77,232,255,0.05))",
                boxShadow: "0 0 30px rgba(77,232,255,0.3)",
              }}
            >
              <span
                className="font-display text-3xl font-bold text-accent"
                style={{ textShadow: "0 0 16px rgba(77,232,255,0.9)" }}
              >
                {rang.label}
              </span>
            </div>
            <div className="text-center sm:text-left">
              <div className="font-display text-lg font-bold">{rang.score}/100</div>
              <div className="mt-1 h-1.5 w-40 overflow-hidden rounded-full bg-black/30">
                <div className="h-full rounded-full bg-accent shadow-[0_0_8px_var(--accent)]" style={{ width: `${rang.xpPercent}%` }} />
              </div>
              {rang.palierSuivant && (
                <div className="mt-1.5 text-[11px] text-foreground-muted">
                  {rang.pointsAvantPalierSuivant} pt{rang.pointsAvantPalierSuivant > 1 ? "s" : ""} avant {rang.palierSuivant}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <style>{`
        .hero-scanlines {
          position: absolute; inset: 0;
          background: repeating-linear-gradient(
            to bottom,
            rgba(77,232,255,0.035) 0px,
            rgba(77,232,255,0.035) 1px,
            transparent 1px,
            transparent 3px
          );
        }
        .hero-dot {
          width: 6px; height: 6px; border-radius: 9999px; background: #4de8ff;
          box-shadow: 0 0 8px #4de8ff;
          animation: hero-blink 1.8s ease-in-out infinite;
        }
        @keyframes hero-blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.25; }
        }
        @media (prefers-reduced-motion: reduce) {
          .hero-dot { animation: none; }
        }
      `}</style>
    </div>
  );
}
