import { GlareCard } from "@/components/ui/GlareCard";
import HoloRing from "@/components/HoloRing";

export default function RangBadge({ rang }) {
  return (
    <GlareCard className="relative flex items-center gap-4 overflow-visible px-4 py-3" tiltIntensity={5}>
      <div className="pointer-events-none absolute -left-6 -top-8 opacity-70">
        <HoloRing size={90} />
      </div>
      <div
        className="relative z-10 flex h-14 w-12 shrink-0 items-center justify-center border border-accent/60 text-xl font-bold shadow-[0_0_20px_rgba(77,232,255,0.25)]"
        style={{
          clipPath: "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)",
          background: "linear-gradient(160deg, rgba(77,232,255,0.22), rgba(77,232,255,0.05))",
        }}
      >
        <span className="font-display text-accent" style={{ textShadow: "0 0 12px rgba(77,232,255,0.8)" }}>
          {rang.label}
        </span>
      </div>
      <div className="relative z-10 w-36">
        <div className="text-[11px] font-semibold text-foreground-muted">Score composition</div>
        <div className="font-display text-sm font-bold">{rang.score}/100</div>
        <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-black/30">
          <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${rang.xpPercent}%` }} />
        </div>
        {rang.palierSuivant && (
          <div className="mt-1 text-[10.5px] text-foreground-muted">
            {rang.pointsAvantPalierSuivant} pt{rang.pointsAvantPalierSuivant > 1 ? "s" : ""} avant {rang.palierSuivant}
          </div>
        )}
      </div>
    </GlareCard>
  );
}
