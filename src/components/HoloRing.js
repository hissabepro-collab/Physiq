// Anneau holographique en 3D CSS pur (transform-style/perspective réels du
// navigateur, pas de WebGL) — rotation continue, aucune dépendance externe.

export default function HoloRing({ size = 150 }) {
  return (
    <div style={{ width: size, height: size, perspective: size * 3.5 }} className="shrink-0">
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
        }
        @keyframes holo-spin {
          from { transform: rotateY(0deg) rotateX(8deg); }
          to { transform: rotateY(360deg) rotateX(8deg); }
        }
        @media (prefers-reduced-motion: reduce) {
          .holo-globe { animation: none; }
        }
      `}</style>
    </div>
  );
}
