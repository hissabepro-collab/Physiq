"use client";

import { useEffect, useRef } from "react";

// Champ de particules en Canvas 2D : chaque point dérive à son propre rythme,
// se relie à ses voisins proches, et s'écarte autour du curseur / du doigt.
// Pas de WebGL ni de dépendance — assez léger pour tourner sur téléphone.

const COULEUR = "77, 232, 255";
const DISTANCE_LIEN = 120;
const RAYON_POINTEUR = 150;

export default function ParticleField() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const reduit = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduit) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    let largeur = 0;
    let hauteur = 0;
    let particules = [];
    let animation = null;
    const pointeur = { x: -9999, y: -9999 };

    function dimensionner() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      largeur = window.innerWidth;
      hauteur = window.innerHeight;
      canvas.width = largeur * dpr;
      canvas.height = hauteur * dpr;
      canvas.style.width = `${largeur}px`;
      canvas.style.height = `${hauteur}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // Moins de particules sur petit écran : fluidité avant densité.
      const cible = Math.round(Math.min(90, Math.max(28, largeur / 16)));
      particules = Array.from({ length: cible }, () => creerParticule());
    }

    function creerParticule() {
      return {
        x: Math.random() * largeur,
        y: Math.random() * hauteur,
        vx: (Math.random() - 0.5) * 0.22,
        vy: (Math.random() - 0.5) * 0.22,
        rayon: Math.random() * 1.6 + 0.6,
        // Phase propre à chaque point : la scintillation ne se synchronise pas.
        phase: Math.random() * Math.PI * 2,
        vitessePhase: 0.004 + Math.random() * 0.008,
      };
    }

    function dessiner() {
      ctx.clearRect(0, 0, largeur, hauteur);

      for (const p of particules) {
        p.x += p.vx;
        p.y += p.vy;
        p.phase += p.vitessePhase;

        // Le pointeur repousse doucement les points autour de lui.
        const dx = p.x - pointeur.x;
        const dy = p.y - pointeur.y;
        const distance = Math.hypot(dx, dy);
        if (distance < RAYON_POINTEUR && distance > 0.1) {
          const force = (1 - distance / RAYON_POINTEUR) * 0.6;
          p.x += (dx / distance) * force;
          p.y += (dy / distance) * force;
        }

        // Rebouclage sur les bords : le champ n'a ni début ni fin.
        if (p.x < -20) p.x = largeur + 20;
        if (p.x > largeur + 20) p.x = -20;
        if (p.y < -20) p.y = hauteur + 20;
        if (p.y > hauteur + 20) p.y = -20;

        const scintillement = 0.35 + Math.sin(p.phase) * 0.25;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.rayon, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${COULEUR}, ${scintillement})`;
        ctx.fill();
      }

      // Liens entre points proches : c'est ce qui donne l'impression de réseau vivant.
      for (let i = 0; i < particules.length; i++) {
        for (let j = i + 1; j < particules.length; j++) {
          const a = particules[i];
          const b = particules[j];
          const distance = Math.hypot(a.x - b.x, a.y - b.y);
          if (distance > DISTANCE_LIEN) continue;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.strokeStyle = `rgba(${COULEUR}, ${(1 - distance / DISTANCE_LIEN) * 0.13})`;
          ctx.lineWidth = 0.6;
          ctx.stroke();
        }
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

    // On met l'animation en pause hors de l'écran : inutile de consommer
    // de la batterie quand l'onglet n'est pas visible.
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
