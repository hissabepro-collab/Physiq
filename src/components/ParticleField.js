"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

// Fond vivant : des doubles hélices d'ADN aux brins courbes continus, qui
// tournent lentement, et une fine poussière de particules qui dérive et
// s'écarte au passage du curseur ou du doigt.
// Canvas 2D, sans dépendance ni WebGL.

const COULEUR = "77, 232, 255";
const RAYON_POINTEUR = 160;

export default function ParticleField() {
  const canvasRef = useRef(null);
  const pathname = usePathname();

  // L'écran de connexion a déjà son propre champ animé : deux canvas plein
  // écran en même temps, c'est le double de travail pour rien.
  // /demarrage est l'écran d'entrée de l'app installée : il doit peindre en
  // quelques millisecondes, donc on n'y lance aucun canvas.
  const desactive = pathname === "/login" || pathname === "/demarrage";

  useEffect(() => {
    if (desactive) return;
    // Si le système demande de limiter les animations, on dessine quand même
    // le décor — mais figé, sans boucle d'animation.
    const mouvementReduit = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

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
      largeur = window.innerWidth;
      hauteur = window.innerHeight;
      // Sur mobile on plafonne la résolution du canvas : un écran à 3x
      // demande 9 fois plus de pixels à remplir à chaque image, pour un gain
      // visuel nul sur un décor flou.
      const dpr = Math.min(window.devicePixelRatio || 1, largeur < 640 ? 1.5 : 2);
      canvas.width = largeur * dpr;
      canvas.height = hauteur * dpr;
      canvas.style.width = `${largeur}px`;
      canvas.style.height = `${hauteur}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // Poussière discrète : elle accompagne les hélices sans les concurrencer.
      const cible = Math.round(Math.min(70, Math.max(16, largeur / 34)));
      particules = Array.from({ length: cible }, () => creerParticule());

      // Hélices courtes, épaisses et posées en diagonale.
      const diagonale = Math.hypot(largeur, hauteur);
      helices =
        largeur > 900
          ? [
              {
                cx: largeur * 0.17,
                cy: hauteur * 0.3,
                longueur: Math.min(380, diagonale * 0.3),
                inclinaison: -0.55,
                amplitude: 30,
                longueurOnde: 96,
                vitesse: 0.00045,
                opacite: 0.62,
                decalage: 0,
              },
              {
                cx: largeur * 0.84,
                cy: hauteur * 0.7,
                longueur: Math.min(320, diagonale * 0.26),
                inclinaison: 0.62,
                amplitude: 26,
                longueurOnde: 88,
                vitesse: -0.00038,
                opacite: 0.45,
                decalage: 2.1,
              },
            ]
          : [
              {
                cx: largeur * 0.76,
                cy: hauteur * 0.24,
                longueur: Math.min(300, hauteur * 0.3),
                inclinaison: 0.6,
                amplitude: 26,
                longueurOnde: 86,
                vitesse: 0.00042,
                opacite: 0.55,
                decalage: 0,
              },
            ];
    }

    /**
     * Une particule est-elle dans l'emprise d'une hélice ? On repasse ses
     * coordonnées dans le repère incliné de l'hélice : si elle tombe dans le
     * rectangle qu'occupe la double spirale, on ne la dessine pas — les deux
     * motifs ne se chevauchent jamais.
     */
    function dansEmpriseHelice(x, y) {
      for (const h of helices) {
        const dx = x - h.cx;
        const dy = y - h.cy;
        const cos = Math.cos(-h.inclinaison);
        const sin = Math.sin(-h.inclinaison);
        const local = { x: dx * cos - dy * sin, y: dx * sin + dy * cos };
        if (Math.abs(local.y) <= h.longueur / 2 + 24 && Math.abs(local.x) <= h.amplitude + 30) {
          return true;
        }
      }
      return false;
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
      // Chaque segment est un tracé séparé (pour faire varier l'opacité le
      // long de la courbe) : on échantillonne plus grossièrement sur mobile.
      const pas = largeur < 640 ? 7 : 4;
      const debut = -h.longueur / 2;
      const fin = h.longueur / 2;

      // On dessine l'hélice verticalement dans un repère incliné : le reste
      // du calcul reste simple, et l'inclinaison se règle en un seul endroit.
      ctx.save();
      ctx.translate(h.cx, h.cy);
      ctx.rotate(h.inclinaison);

      // Fondu aux deux extrémités pour que le brin ne s'arrête pas net.
      const attenuation = (y) => {
        const bord = h.longueur * 0.18;
        const distanceBord = h.longueur / 2 - Math.abs(y);
        return Math.max(0, Math.min(1, distanceBord / bord));
      };

      // Barreaux d'abord : ils passent derrière les brins.
      for (let y = debut; y <= fin; y += 16) {
        const angle = angleDe(y);
        const ecart = Math.abs(Math.sin(angle) - Math.sin(angle + Math.PI));
        if (ecart < 0.3) continue;
        const x1 = Math.sin(angle) * h.amplitude;
        const x2 = Math.sin(angle + Math.PI) * h.amplitude;
        ctx.beginPath();
        ctx.moveTo(x1, y);
        ctx.lineTo(x2, y);
        ctx.strokeStyle = `rgba(${COULEUR}, ${h.opacite * 0.22 * ecart * attenuation(y)})`;
        ctx.lineWidth = 1.4;
        ctx.stroke();
      }

      for (const dephasage of [0, Math.PI]) {
        let precedent = null;
        for (let y = debut; y <= fin; y += pas) {
          const angle = angleDe(y) + dephasage;
          const x = Math.sin(angle) * h.amplitude;
          const profondeur = Math.cos(angle); // -1 derrière … +1 devant

          if (precedent) {
            const nettete = (profondeur + precedent.profondeur) / 2;
            ctx.beginPath();
            ctx.moveTo(precedent.x, precedent.y);
            ctx.lineTo(x, y);
            ctx.strokeStyle = `rgba(${COULEUR}, ${h.opacite * (0.22 + (nettete + 1) * 0.34) * attenuation(y)})`;
            ctx.lineWidth = 2 + (nettete + 1) * 1.1;
            ctx.lineCap = "round";
            ctx.stroke();
          }
          precedent = { x, y, profondeur };
        }
      }

      ctx.restore();
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

        // Les points laissent la place aux hélices au lieu de passer dessus.
        if (dansEmpriseHelice(p.x, p.y)) continue;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.rayon, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${COULEUR}, ${0.3 + Math.sin(p.phase) * 0.2})`;
        ctx.fill();
      }

      if (!mouvementReduit) animation = requestAnimationFrame(dessiner);
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
      if (mouvementReduit) return;
      if (document.hidden) {
        if (animation) cancelAnimationFrame(animation);
        animation = null;
      } else if (!animation) {
        animation = requestAnimationFrame(dessiner);
      }
    }

    function redessinerFige() {
      dimensionner();
      dessiner(0);
    }

    if (mouvementReduit) {
      redessinerFige();
      window.addEventListener("resize", redessinerFige);
      return () => window.removeEventListener("resize", redessinerFige);
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
  }, [desactive]);

  if (desactive) return null;

  // Le canvas apparaît en fondu : sans cela il surgit à pleine intensité dès
  // la première image dessinée, ce qui se voit comme un à-coup au lancement.
  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 h-full w-full motion-safe:animate-[apparition_900ms_ease-out_both]"
      aria-hidden="true"
    />
  );
}
