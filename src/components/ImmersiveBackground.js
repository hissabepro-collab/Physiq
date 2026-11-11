// Décor persistant « Holo » : une nuit calme, un halo irisé très doux en haut
// de l'écran et une vignette. Volontairement sobre : l'accent holographique
// est réservé à la carte de rang et aux données. Tout est en CSS, statique :
// rien ne tourne en tâche de fond pendant la navigation.

export default function ImmersiveBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-background">
      <div className="holo-halo" />
      <div className="holo-vignette" />

      <style>{`
        .holo-halo {
          position: absolute; left: 50%; top: -42vh;
          width: 160vw; height: 80vh; transform: translateX(-50%);
          background:
            radial-gradient(ellipse at 30% 60%, rgba(143,227,255,0.05), transparent 60%),
            radial-gradient(ellipse at 55% 70%, rgba(228,236,243,0.025), transparent 55%),
            radial-gradient(ellipse at 75% 55%, rgba(185,164,255,0.045), transparent 60%);
        }
        .holo-vignette {
          position: absolute; inset: 0;
          background: radial-gradient(ellipse at 50% 20%, transparent 50%, rgba(2,3,5,0.85) 100%);
        }
      `}</style>
    </div>
  );
}
