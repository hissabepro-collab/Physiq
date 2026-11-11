"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";

// Carte de rang holographique, pièce maîtresse du tableau de bord.
//
// La carte s'incline en 3D comme une carte à collectionner : un film irisé
// (argent, cyan, lavande) glisse selon l'inclinaison, un reflet suit
// le doigt ou la souris, et la lettre du rang flotte au-dessus du fond.
//
// Tout passe par deux variables CSS, --mx et --my (de -1 à 1), écrites
// directement sur l'élément à chaque image : aucun re-rendu React. Une seule
// boucle d'animation, qui s'arrête quand la carte sort de l'écran.
//   - au repos : léger balancement automatique ;
//   - souris ou doigt sur la carte : la carte suit le pointeur ;
//   - après un toucher sur iPhone : le gyroscope prend le relais, la carte
//     bouge quand on incline le téléphone (iOS demande l'autorisation).

const borne = (v) => Math.max(-1, Math.min(1, v));

export default function CarteRang({ rang, jours }) {
  const carteRef = useRef(null);
  const cible = useRef({ x: 0, y: 0, actif: false, gyro: false });

  useEffect(() => {
    const carte = carteRef.current;
    if (!carte) return undefined;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return undefined;

    let raf = 0;
    let visible = true;
    let x = 0;
    let y = 0;
    const debut = performance.now();

    function image(t) {
      raf = 0;
      const c = cible.current;
      let tx = c.x;
      let ty = c.y;
      if (!c.actif && !c.gyro) {
        const s = (t - debut) / 1000;
        tx = Math.sin(s * 0.55) * 0.45;
        ty = Math.cos(s * 0.4) * 0.3;
      }
      x += (tx - x) * 0.08;
      y += (ty - y) * 0.08;
      carte.style.setProperty("--mx", x.toFixed(3));
      carte.style.setProperty("--my", y.toFixed(3));
      if (visible) raf = requestAnimationFrame(image);
    }

    const observateur = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      if (visible && !raf) raf = requestAnimationFrame(image);
    });
    observateur.observe(carte);
    raf = requestAnimationFrame(image);

    return () => {
      cancelAnimationFrame(raf);
      observateur.disconnect();
    };
  }, []);

  useEffect(() => {
    function orientation(e) {
      if (e.gamma == null || e.beta == null) return;
      const c = cible.current;
      c.gyro = true;
      if (c.actif) return;
      c.x = borne(e.gamma / 22);
      c.y = borne((e.beta - 50) / 22);
    }
    window.addEventListener("deviceorientation", orientation);
    return () => window.removeEventListener("deviceorientation", orientation);
  }, []);

  function suivre(clientX, clientY) {
    const r = carteRef.current?.getBoundingClientRect();
    if (!r) return;
    cible.current.actif = true;
    cible.current.x = borne(((clientX - r.left) / r.width) * 2 - 1);
    cible.current.y = borne(((clientY - r.top) / r.height) * 2 - 1);
  }

  function relacher() {
    cible.current.actif = false;
    if (!cible.current.gyro) {
      cible.current.x = 0;
      cible.current.y = 0;
    }
  }

  // iOS n'envoie le gyroscope qu'après une autorisation demandée à la suite
  // d'un geste de l'utilisateur : le premier toucher sur la carte la demande.
  async function activerGyroscope() {
    const D = typeof window !== "undefined" ? window.DeviceOrientationEvent : null;
    if (D && typeof D.requestPermission === "function") {
      try {
        await D.requestPermission();
      } catch {
        // Refus ou contexte non sécurisé : la carte reste au toucher.
      }
    }
  }

  const scan =
    jours == null ? null : jours === 0 ? "Scan d'aujourd'hui" : jours === 1 ? "Scan d'hier" : `Scan il y a ${jours} j`;

  return (
    <div className="carte-rang-scene h-full">
      <div
        ref={carteRef}
        className="carte-rang relative flex h-full min-h-[260px] flex-col rounded-[28px] p-px"
        onPointerMove={(e) => e.pointerType === "mouse" && suivre(e.clientX, e.clientY)}
        onPointerLeave={(e) => e.pointerType === "mouse" && relacher()}
        onTouchMove={(e) => suivre(e.touches[0].clientX, e.touches[0].clientY)}
        onTouchEnd={relacher}
        onClick={activerGyroscope}
        style={{ "--mx": 0, "--my": 0 }}
      >
        <div className="relative flex flex-1 flex-col overflow-hidden rounded-[27px] bg-[#06080c] p-5 sm:p-6">
          <div className="carte-rang-film pointer-events-none absolute inset-0" />
          <div className="carte-rang-reflet pointer-events-none absolute inset-0" />

          <div className="relative flex items-center justify-between">
            <span className="etiquette">Rang Physiq</span>
            {scan && <span className="text-[11px] font-medium text-foreground-muted">{scan}</span>}
          </div>

          <div className="relative mt-2 flex flex-1 items-center justify-between gap-4">
            <span className="carte-rang-lettre holo-texte tabular select-none text-[104px] font-semibold leading-none tracking-[-0.06em] sm:text-[128px]">
              {rang ? rang.label : "?"}
            </span>
            {rang ? (
              <div className="text-right">
                <div className="tabular text-[40px] font-semibold leading-none tracking-tight">
                  {rang.score}
                  <span className="text-base font-medium text-foreground-muted">/100</span>
                </div>
                <div className="mt-1 text-xs text-foreground-muted">score Visbody</div>
              </div>
            ) : (
              <p className="max-w-[16ch] text-right text-sm leading-snug text-foreground-muted">
                Ton rang se révèle au premier scan.
              </p>
            )}
          </div>

          <div className="relative mt-4">
            <div className="flex items-baseline justify-between text-[11px] font-medium">
              <span className="text-foreground-muted">
                XP <span className="tabular text-foreground">{rang ? rang.xpPercent : 0}</span>/100
              </span>
              <span className="text-foreground-muted">
                {!rang
                  ? "Palier de départ"
                  : rang.palierSuivant
                  ? `${rang.pointsAvantPalierSuivant} pt${rang.pointsAvantPalierSuivant > 1 ? "s" : ""} avant ${rang.palierSuivant}`
                  : "Rang maximum"}
              </span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/[0.07]">
              <div className="h-full rounded-full bg-accent" style={{ width: `${rang ? Math.max(4, rang.xpPercent) : 0}%` }} />
            </div>
            {rang && (
              <Link
                href="/historique"
                className="-mb-2 mt-2 inline-flex h-11 items-center text-xs font-medium text-foreground-muted transition hover:text-accent"
              >
                Voir mon évolution →
              </Link>
            )}
            {!rang && (
              <Link
                href="/scan"
                className="mt-4 inline-flex h-11 items-center rounded-full bg-white px-5 text-sm font-semibold text-[#06080c]"
              >
                Importer mon rapport →
              </Link>
            )}
          </div>
        </div>
      </div>

      <style>{`
        .carte-rang-scene { perspective: 900px; }
        .carte-rang {
          transform-style: preserve-3d;
          transform: rotateY(calc(var(--mx) * 9deg)) rotateX(calc(var(--my) * -9deg));
          background: linear-gradient(calc(120deg + var(--mx) * 40deg), rgba(228,236,243,0.7), #8fe3ff, #b9a4ff, rgba(228,236,243,0.7));
          box-shadow: 0 30px 60px -30px rgba(0,0,0,0.9), 0 0 50px -30px rgba(143,227,255,0.3);
          touch-action: pan-y;
          -webkit-tap-highlight-color: transparent;
        }
        .carte-rang-film {
          background: repeating-linear-gradient(115deg,
            rgba(143,227,255,0.0) 0%, rgba(143,227,255,0.5) 8%,
            rgba(228,236,243,0.45) 15%, rgba(185,164,255,0.5) 22%,
            rgba(143,227,255,0.0) 30%);
          background-size: 260% 260%;
          background-position: calc(50% + var(--mx) * 45%) calc(50% + var(--my) * 45%);
          mix-blend-mode: color-dodge;
          opacity: 0.13;
        }
        .carte-rang-reflet {
          background: radial-gradient(circle at calc(50% + var(--mx) * 45%) calc(50% + var(--my) * 45%),
            rgba(255,255,255,0.09), transparent 55%);
        }
        .carte-rang-lettre {
          transform: translate3d(calc(var(--mx) * 6px), calc(var(--my) * 6px), 0);
          background-position: calc(50% + var(--mx) * 50%) 50%;
          filter: drop-shadow(0 10px 30px rgba(143,227,255,0.25));
        }
      `}</style>
    </div>
  );
}
