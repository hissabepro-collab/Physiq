// Anneau holographique en 3D CSS pur (transform-style/perspective réels du
// navigateur, pas de WebGL) — rotation continue, indépendante de la souris et
// du tactile, donc identique sur mobile et desktop.

export default function HoloRing({ size = 150, scanBeam = false, equator = false }) {
  return (
    <div style={{ width: size, height: size, perspective: size * 3.5 }} className="relative shrink-0">
      <div
        className="holo-globe"
        style={{ width: size, height: size, transformStyle: "preserve-3d" }}
      >
        {[0, 30, 60, 90, 120, 150].map((deg) => (
          <div
            key={deg}
            className="absolute inset-0 rounded-full border border-accent/40"
            style={{ transform: `rotateY(${deg}deg)` }}
          />
        ))}
        <div className="holo-core" />
      </div>

      {equator && (
        <div
          className="absolute rounded-full border border-accent/20"
          style={{
            left: "50%",
            top: "50%",
            width: size * 1.35,
            height: size * 0.34,
            marginLeft: -(size * 1.35) / 2,
            marginTop: -(size * 0.34) / 2,
            transform: "rotateX(78deg)",
          }}
        />
      )}

      {scanBeam && (
        <div className="holo-scanbeam" style={{ width: size * 0.9, marginLeft: -(size * 0.45) }} />
      )}

      <style>{`
        .holo-globe {
          position: relative;
          animation: holo-spin 16s linear infinite;
        }
        .holo-core {
          position: absolute; inset: 0; margin: auto;
          width: 22%; height: 22%; border-radius: 9999px;
          background: radial-gradient(circle, #bff6ff 0%, #4de8ff 55%, transparent 75%);
          box-shadow: 0 0 30px 8px rgba(77,232,255,0.35);
          animation: holo-pulse 3.6s ease-in-out infinite;
        }
        .holo-scanbeam {
          position: absolute; left: 50%; height: 2px;
          background: linear-gradient(90deg, transparent, rgba(180,245,255,0.95), transparent);
          filter: drop-shadow(0 0 6px rgba(77,232,255,0.8));
          animation: holo-sweep 4.2s ease-in-out infinite;
        }
        @keyframes holo-spin {
          from { transform: rotateY(0deg) rotateX(8deg); }
          to { transform: rotateY(360deg) rotateX(8deg); }
        }
        @keyframes holo-pulse {
          0%, 100% { opacity: 0.85; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.12); }
        }
        @keyframes holo-sweep {
          0% { top: 6%; opacity: 0; }
          10% { opacity: 1; }
          50% { top: 92%; opacity: 1; }
          60% { opacity: 0; }
          100% { top: 92%; opacity: 0; }
        }
        @media (prefers-reduced-motion: reduce) {
          .holo-globe, .holo-core, .holo-scanbeam { animation: none; }
        }
      `}</style>
    </div>
  );
}
