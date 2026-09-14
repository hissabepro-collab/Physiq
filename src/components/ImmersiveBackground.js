// Décor immersif persistant : lueurs animées, sol en perspective, grain fin.
// Une seule instance montée dans le layout — reste fixe pendant la navigation,
// ne rejoue pas ses animations à chaque changement de page.

export default function ImmersiveBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-background">
      <div className="immersive-aurora immersive-aurora--a" />
      <div className="immersive-aurora immersive-aurora--b" />
      <div className="immersive-aurora immersive-aurora--c" />
      <div className="immersive-grain" />
      <div className="immersive-floor" />
      <div className="immersive-vignette" />

      <style>{`
        .immersive-aurora {
          position: absolute;
          border-radius: 9999px;
          filter: blur(90px);
          opacity: 0.30;
          mix-blend-mode: screen;
          will-change: transform;
          transform: translateZ(0);
        }
        .immersive-aurora--a {
          width: 620px; height: 620px; top: -220px; left: -140px;
          background: radial-gradient(circle, rgba(77,232,255,0.55) 0%, transparent 70%);
          animation: drift-a 22s ease-in-out infinite;
        }
        .immersive-aurora--b {
          width: 520px; height: 520px; top: 20%; right: -180px;
          background: radial-gradient(circle, rgba(124,111,224,0.4) 0%, transparent 70%);
          animation: drift-b 28s ease-in-out infinite;
        }
        .immersive-aurora--c {
          width: 480px; height: 480px; bottom: -200px; left: 30%;
          background: radial-gradient(circle, rgba(47,230,184,0.28) 0%, transparent 70%);
          animation: drift-a 26s ease-in-out infinite reverse;
        }
        @keyframes drift-a {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(50px, 30px) scale(1.08); }
        }
        @keyframes drift-b {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(-40px, -25px) scale(1.05); }
        }
        .immersive-grain {
          position: absolute; inset: 0;
          background-image: radial-gradient(rgba(255,255,255,0.7) 1px, transparent 1.4px);
          background-size: 4px 4px;
          opacity: 0.025;
        }
        .immersive-floor {
          position: absolute; left: -10%; right: -10%; bottom: 0; height: 280px;
          background-image:
            linear-gradient(rgba(77,232,255,0.10) 1px, transparent 1px),
            linear-gradient(90deg, rgba(77,232,255,0.10) 1px, transparent 1px);
          background-size: 56px 56px;
          transform: perspective(480px) rotateX(62deg);
          transform-origin: bottom;
          opacity: 0.5;
          mask-image: linear-gradient(to top, black, transparent);
          -webkit-mask-image: linear-gradient(to top, black, transparent);
        }
        .immersive-vignette {
          position: absolute; inset: 0;
          background: radial-gradient(ellipse at 50% 0%, transparent 40%, rgba(5,10,14,0.6) 100%);
        }
        @media (prefers-reduced-motion: reduce) {
          .immersive-aurora { animation: none; }
        }
        @media (max-width: 640px) {
          .immersive-aurora { filter: blur(60px); }
          .immersive-grain { display: none; }
        }
      `}</style>
    </div>
  );
}
