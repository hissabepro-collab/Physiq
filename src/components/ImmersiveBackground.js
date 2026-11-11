// Décor persistant « Lumen » : une nuit profonde éclairée par une lumière
// zénithale, deux nébuleuses très lentes (cyan et violet) et un grain fin.
// Volontairement calme : la vedette, c'est le corps en particules de
// l'accueil. Tout est en CSS (aucun JavaScript, aucun canvas) : rien ne
// tourne en tâche de fond pendant la navigation.

export default function ImmersiveBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-background">
      <div className="lumen-zenith" />
      <div className="lumen-nebuleuse lumen-nebuleuse--a" />
      <div className="lumen-nebuleuse lumen-nebuleuse--b" />
      <div className="lumen-grain" />
      <div className="lumen-vignette" />

      <style>{`
        .lumen-zenith {
          position: absolute; left: 50%; top: -30vh;
          width: 140vw; height: 90vh; transform: translateX(-50%);
          background: radial-gradient(ellipse at 50% 0%, rgba(120,220,255,0.16) 0%, rgba(77,232,255,0.05) 35%, transparent 70%);
        }
        .lumen-nebuleuse {
          position: absolute; border-radius: 9999px;
          filter: blur(80px); opacity: 0.5;
          will-change: transform; transform: translateZ(0);
        }
        .lumen-nebuleuse--a {
          width: 560px; height: 560px; top: 35%; left: -260px;
          background: radial-gradient(circle, rgba(77,232,255,0.22) 0%, transparent 70%);
          animation: lumen-derive 34s ease-in-out infinite;
        }
        .lumen-nebuleuse--b {
          width: 620px; height: 620px; bottom: -280px; right: -240px;
          background: radial-gradient(circle, rgba(182,156,255,0.2) 0%, transparent 70%);
          animation: lumen-derive 40s ease-in-out infinite reverse;
        }
        @keyframes lumen-derive {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(60px, -40px) scale(1.1); }
        }
        .lumen-grain {
          position: absolute; inset: -50%;
          background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(%23n)' opacity='0.55'/></svg>");
          opacity: 0.06;
          mix-blend-mode: overlay;
        }
        .lumen-vignette {
          position: absolute; inset: 0;
          background: radial-gradient(ellipse at 50% 30%, transparent 45%, rgba(3,6,9,0.75) 100%);
        }
        @media (prefers-reduced-motion: reduce) {
          .lumen-nebuleuse { animation: none; }
        }
        @media (max-width: 640px) {
          .lumen-nebuleuse { filter: blur(50px); }
          .lumen-nebuleuse--a { width: 380px; height: 380px; left: -200px; }
          .lumen-nebuleuse--b { width: 420px; height: 420px; }
        }
      `}</style>
    </div>
  );
}
