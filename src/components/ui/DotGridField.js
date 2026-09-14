"use client";

import { useEffect, useRef } from "react";

// Champ de traits à physique de ressort, adapté du composant "Dot Grid Hero"
// de 21st.dev (nexus-ui) : les particules sont repoussées par le curseur ou
// le doigt, s'étirent dans le sens de leur vitesse, puis reviennent
// élastiquement à leur position de repos.
// Adapté ici à la palette holographique et sans dépendance d'icônes.

const PALETTE = ["#4de8ff", "#7fe9ff", "#2fe6b8", "#b69cff"];

export default function DotGridField({
  ecart = 64,
  rayonInteraction = 130,
  forceRepulsion = 7,
  raideur = 0.065,
  amortissement = 0.8,
}) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const mouvementReduit = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let largeur = 0;
    let hauteur = 0;
    let particules = [];
    let animation = 0;
    const pointeur = { x: -9999, y: -9999, actif: false };

    function construire() {
      // Maille plus lâche sur mobile : chaque trait est un tracé séparé avec
      // rotation, donc leur nombre pèse directement sur la fluidité.
      const maille = largeur < 640 ? ecart * 1.45 : ecart;
      const dispersion = maille * 0.55;
      const colonnes = Math.ceil(largeur / maille) + 1;
      const lignes = Math.ceil(hauteur / maille) + 1;
      const liste = [];
      for (let l = 0; l < lignes; l++) {
        for (let c = 0; c < colonnes; c++) {
          const ox = c * maille + (Math.random() - 0.5) * dispersion * 2;
          const oy = l * maille + (Math.random() - 0.5) * dispersion * 2;
          liste.push({
            ox,
            oy,
            x: ox,
            y: oy,
            vx: 0,
            vy: 0,
            largeur: 1.6 + Math.random() * 1.4,
            hauteur: 6 + Math.random() * 8,
            rotation: Math.random() * Math.PI * 2,
            couleur: PALETTE[Math.floor(Math.random() * PALETTE.length)],
            opacite: 0.28 + Math.random() * 0.34,
          });
        }
      }
      return liste;
    }

    function dimensionner() {
      largeur = canvas.offsetWidth;
      hauteur = canvas.offsetHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, largeur < 640 ? 1.5 : 2);
      canvas.width = largeur * dpr;
      canvas.height = hauteur * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      particules = construire();
    }

    function dessiner() {
      if (document.hidden) {
        animation = 0;
        return;
      }
      ctx.clearRect(0, 0, largeur, hauteur);

      const actif = pointeur.actif && !mouvementReduit;
      const rayon2 = rayonInteraction * rayonInteraction;

      for (const p of particules) {
        if (actif) {
          const dx = p.x - pointeur.x;
          const dy = p.y - pointeur.y;
          const distance2 = dx * dx + dy * dy;
          if (distance2 < rayon2 && distance2 > 0.01) {
            const distance = Math.sqrt(distance2);
            const force = ((rayonInteraction - distance) / rayonInteraction) ** 2 * forceRepulsion;
            p.vx += (dx / distance) * force;
            p.vy += (dy / distance) * force;
          }
        }

        // Rappel élastique vers la position de repos, puis amortissement.
        p.vx += (p.ox - p.x) * raideur;
        p.vy += (p.oy - p.y) * raideur;
        p.vx *= amortissement;
        p.vy *= amortissement;
        p.x += p.vx;
        p.y += p.vy;

        // Le trait s'allonge et s'oriente selon sa vitesse : c'est ce qui
        // donne la sensation de matière projetée puis rappelée.
        const vitesse = Math.hypot(p.vx, p.vy);
        const etirement = Math.min(vitesse * 0.6, 6);
        const h = p.hauteur + etirement;

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(vitesse > 0.5 ? Math.atan2(p.vy, p.vx) + Math.PI / 2 : p.rotation);
        ctx.globalAlpha = p.opacite;
        ctx.fillStyle = p.couleur;
        const dl = p.largeur / 2;
        const dh = h / 2;
        ctx.beginPath();
        ctx.roundRect(-dl, -dh, p.largeur, h, dl);
        ctx.fill();
        ctx.restore();
      }

      ctx.globalAlpha = 1;
      if (!mouvementReduit) animation = requestAnimationFrame(dessiner);
    }

    function majPointeur(cx, cy) {
      const rect = canvas.getBoundingClientRect();
      pointeur.x = cx - rect.left;
      pointeur.y = cy - rect.top;
      pointeur.actif = true;
    }
    const surSouris = (e) => majPointeur(e.clientX, e.clientY);
    const surDoigt = (e) => e.touches[0] && majPointeur(e.touches[0].clientX, e.touches[0].clientY);
    const surSortie = () => {
      pointeur.actif = false;
    };
    const surVisibilite = () => {
      if (!document.hidden && !animation && !mouvementReduit) {
        animation = requestAnimationFrame(dessiner);
      }
    };

    const observateur = new ResizeObserver(dimensionner);
    observateur.observe(canvas);
    dimensionner();
    animation = requestAnimationFrame(dessiner);

    window.addEventListener("mousemove", surSouris, { passive: true });
    window.addEventListener("touchmove", surDoigt, { passive: true });
    window.addEventListener("mouseleave", surSortie);
    window.addEventListener("touchend", surSortie);
    document.addEventListener("visibilitychange", surVisibilite);

    return () => {
      cancelAnimationFrame(animation);
      observateur.disconnect();
      window.removeEventListener("mousemove", surSouris);
      window.removeEventListener("touchmove", surDoigt);
      window.removeEventListener("mouseleave", surSortie);
      window.removeEventListener("touchend", surSortie);
      document.removeEventListener("visibilitychange", surVisibilite);
    };
  }, [ecart, rayonInteraction, forceRepulsion, raideur, amortissement]);

  return <canvas ref={canvasRef} aria-hidden className="absolute inset-0 h-full w-full" style={{ pointerEvents: "none" }} />;
}
