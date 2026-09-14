"use client";

import { useEffect, useRef } from "react";

// Champ de particules en Canvas 2D : chaque point dérive à son propre rythme,
// se relie à ses voisins proches, et s'écarte autour du curseur / du doigt.
// Pas de WebGL ni de dépendance — assez léger pour tourner sur téléphone.

const COULEUR = "77, 232, 255";
const DISTANCE_LIEN = 150;
const RAYON_POINTEUR = 160;

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
      const cible = Math.round(Math.min(150, Math.max(45, largeur / 11)));
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

    // Double hélice d'ADN qui tourne lentement, en arrière-plan du champ de
    // points. Deux brins en opposition de phase, reliés par leurs barreaux.
    function dessinerHelice(temps, xCentre, amplitude, opacite) {
      const pas = 26;
      const longueurOnde = 210;
      const rotation = temps * 0.00022;

      for (let y = -40; y < hauteur + 40; y += pas) {
        const angle = (y / longueurOnde) * Math.PI * 2 + rotation;
        const x1 = xCentre + Math.sin(angle) * amplitude;
        const x2 = xCentre + Math.sin(angle + Math.PI) * amplitude;
        // La profondeur simulée : le brin qui passe devant est plus net.
        const avant = Math.cos(angle);

        ctx.beginPath();
        ctx.moveTo(x1, y);
        ctx.lineTo(x2, y);
        ctx.strokeStyle = `rgba(${COULEUR}, ${opacite * 0.35})`;
        ctx.lineWidth = 0.7;
        ctx.stroke();

        for (const [x, face] of [
          [x1, avant],
          [x2, -avant],
        ]) {
          const nettete = 0.45 + (face + 1) * 0.35;
          ctx.beginPath();
          ctx.arc(x, y, 1.6 + face * 0.7, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${COULEUR}, ${opacite * nettete})`;
          ctx.fill();
        }
      }
    }

    function dessiner(temps) {
      ctx.clearRect(0, 0, largeur, hauteur);

      // Sur petit écran une seule hélice, sinon l'image devient chargée.
      dessinerHelice(temps, largeur * 0.12, 34, 0.5);
      if (largeur > 900) dessinerHelice(temps + 4200, largeur * 0.88, 28, 0.38);

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
          ctx.strokeStyle = `rgba(${COULEUR}, ${(1 - distance / DISTANCE_LIEN) * 0.18})`;
          ctx.lineWidth = 0.65;
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
