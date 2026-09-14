"use client";

import { useEffect, useRef } from "react";

// Fond vivant : des doubles hélices d'ADN aux brins courbes continus, qui
// tournent lentement, et une fine poussière de particules qui dérive et
// s'écarte au passage du curseur ou du doigt.
// Canvas 2D, sans dépendance ni WebGL.

const COULEUR = "77, 232, 255";
const RAYON_POINTEUR = 160;

export default function ParticleField() {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    let largeur = 0;
    let hauteur = 0;
    let particules = [];
    let helices = [];
    let animation = null;
    const pointeur = { x: -9999, y: -9999 };

    function creerParticule() {
      return {
        x: Math.random() * largeur,
        y: Math.random() * hauteur,
        vx: (Math.random() - 0.5) * 0.16,
        vy: (Math.random() - 0.5) * 0.16,
        rayon: Math.random() * 1.3 + 0.5,
        phase: Math.random() * Math.PI * 2,
        vitessePhase: 0.004 + Math.random() * 0.007,
      };
    }

    function dimensionner() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      largeur = window.innerWidth;
      hauteur = window.innerHeight;
      canvas.width = largeur * dpr;
      canvas.height = hauteur * dpr;
      canvas.style.width = `${largeur}px`;
      canvas.style.height = `${hauteur}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // Poussière discrète : elle accompagne les hélices sans les concurrencer.
      const cible = Math.round(Math.min(70, Math.max(24, largeur / 26)));
      particules = Array.from({ length: cible }, () => creerParticule());

      // Une hélice sur téléphone, deux dès qu'il y a de la place.
      helices =
        largeur > 900
          ? [
              { x: largeur * 0.13, amplitude: 46, longueurOnde: 260, vitesse: 0.00022, opacite: 0.5, decalage: 0 },
              { x: largeur * 0.87, amplitude: 38, longueurOnde: 300, vitesse: -0.00016, opacite: 0.36, decalage: 2.1 },
            ]
          : [{ x: largeur * 0.82, amplitude: 34, longueurOnde: 250, vitesse: 0.0002, opacite: 0.42, decalage: 0 }];
    }

    /**
     * Une hélice = deux brins sinusoïdaux continus en opposition de phase,
     * reliés par des barreaux. Chaque brin est tracé par segments successifs
     * dont l'opacité suit la profondeur : le brin qui passe devant est net,
     * celui qui passe derrière s'efface. C'est ce dégradé le long de la
     * courbe qui donne le relief.
     */
    function dessinerHelice(h, temps) {
      const angleDe = (y) => (y / h.longueurOnde) * Math.PI * 2 + temps * h.vitesse + h.decalage;
      const pas = 5; // finesse d'échantillonnage de la courbe
      const debut = -60;
      const fin = hauteur + 60;

      for (const dephasage of [0, Math.PI]) {
        let precedent = null;
        for (let y = debut; y <= fin; y += pas) {
          const angle = angleDe(y) + dephasage;
          const x = h.x + Math.sin(angle) * h.amplitude;
          const profondeur = Math.cos(angle); // -1 derrière … +1 devant

          if (precedent) {
            const netteteMoyenne = (profondeur + precedent.profondeur) / 2;
            ctx.beginPath();
            ctx.moveTo(precedent.x, precedent.y);
            ctx.lineTo(x, y);
            ctx.strokeStyle = `rgba(${COULEUR}, ${h.opacite * (0.18 + (netteteMoyenne + 1) * 0.3)})`;
            ctx.lineWidth = 1.1 + (netteteMoyenne + 1) * 0.5;
            ctx.lineCap = "round";
            ctx.stroke();
          }
          precedent = { x, y, profondeur };
        }
      }

      // Barreaux : seulement quand les deux brins sont suffisamment écartés,
      // sinon ils s'empilent au moment du croisement.
      for (let y = debut; y <= fin; y += 22) {
        const angle = angleDe(y);
        const ecart = Math.abs(Math.sin(angle) - Math.sin(angle + Math.PI));
        if (ecart < 0.25) continue;
        const x1 = h.x + Math.sin(angle) * h.amplitude;
        const x2 = h.x + Math.sin(angle + Math.PI) * h.amplitude;
        ctx.beginPath();
        ctx.moveTo(x1, y);
        ctx.lineTo(x2, y);
        ctx.strokeStyle = `rgba(${COULEUR}, ${h.opacite * 0.16 * ecart})`;
        ctx.lineWidth = 0.8;
        ctx.stroke();
      }
    }

    function dessiner(temps) {
      ctx.clearRect(0, 0, largeur, hauteur);

      for (const h of helices) dessinerHelice(h, temps);

      for (const p of particules) {
        p.x += p.vx;
        p.y += p.vy;
        p.phase += p.vitessePhase;

        const dx = p.x - pointeur.x;
        const dy = p.y - pointeur.y;
        const distance = Math.hypot(dx, dy);
        if (distance < RAYON_POINTEUR && distance > 0.1) {
          const force = (1 - distance / RAYON_POINTEUR) * 0.7;
          p.x += (dx / distance) * force;
          p.y += (dy / distance) * force;
        }

        if (p.x < -20) p.x = largeur + 20;
        if (p.x > largeur + 20) p.x = -20;
        if (p.y < -20) p.y = hauteur + 20;
        if (p.y > hauteur + 20) p.y = -20;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.rayon, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${COULEUR}, ${0.3 + Math.sin(p.phase) * 0.2})`;
        ctx.fill();
      }

      animation = requestAnimationFrame(dessiner);
    }

    function deplacerPointeur(e) {
      const point = e.touches?.[0] ?? e;
      pointeur.x = point.clientX;
      pointeur.y = point.clientY;
    }
    function quitterPointeur() {
      pointeur.x = -9999;
      pointeur.y = -9999;
    }

    // Inutile de consommer de la batterie quand l'onglet n'est pas visible.
    function gererVisibilite() {
      if (document.hidden) {
        if (animation) cancelAnimationFrame(animation);
        animation = null;
      } else if (!animation) {
        animation = requestAnimationFrame(dessiner);
      }
    }

    dimensionner();
    animation = requestAnimationFrame(dessiner);

    window.addEventListener("resize", dimensionner);
    window.addEventListener("mousemove", deplacerPointeur, { passive: true });
    window.addEventListener("mouseout", quitterPointeur);
    window.addEventListener("touchmove", deplacerPointeur, { passive: true });
    window.addEventListener("touchend", quitterPointeur);
    document.addEventListener("visibilitychange", gererVisibilite);

    return () => {
      if (animation) cancelAnimationFrame(animation);
      window.removeEventListener("resize", dimensionner);
      window.removeEventListener("mousemove", deplacerPointeur);
      window.removeEventListener("mouseout", quitterPointeur);
      window.removeEventListener("touchmove", deplacerPointeur);
      window.removeEventListener("touchend", quitterPointeur);
      document.removeEventListener("visibilitychange", gererVisibilite);
    };
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" aria-hidden="true" />;
}
