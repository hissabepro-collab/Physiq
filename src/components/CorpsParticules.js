"use client";

import { useEffect, useRef } from "react";

// ─────────────────────────────────────────────────────────────────────────────
// Le corps en particules (accueil, direction « Lumen »).
//
// Une silhouette humaine faite de points lumineux respire doucement, balayée
// par une ligne de scan. Au défilement, elle se dissout — la tête d'abord,
// comme dans un scanner — et ses particules tourbillonnent pour se reformer
// en anneau : l'anneau du score, allumé jusqu'au pourcentage atteint.
//
// Rendu en canvas 2D (pas de WebGL) : quelques milliers de petits carrés
// dessinés en mode additif, regroupés par couleur pour limiter les changements
// d'état. L'animation s'arrête quand le canvas sort de l'écran ou que l'app
// passe en arrière-plan. Avec « réduire les animations », plus de respiration
// ni de balayage : l'image ne se redessine qu'au défilement.
//
// `progressRef` (0 → 1) est fourni par le parent : c'est l'avancement du
// défilement dans la section.
// ─────────────────────────────────────────────────────────────────────────────

const COULEURS = [
  [77, 232, 255], // cyan : la matière du scan
  [182, 156, 255], // violet
  [47, 230, 184], // menthe
  [230, 248, 255], // blanc chaud : contours et partie allumée de l'anneau
  [90, 105, 125], // gris : partie éteinte de l'anneau
];
const NIVEAUX_ALPHA = [0.12, 0.36, 0.6, 0.95];

function clamp(v, a = 0, b = 1) {
  return v < a ? a : v > b ? b : v;
}
function easeInOut(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

// Dessine une silhouette de face sur un petit canvas hors écran (200 × 400),
// puis renvoie les pixels pleins, et lesquels sont en bordure.
function echantillonnerSilhouette() {
  const W = 200;
  const H = 400;
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const g = c.getContext("2d", { willReadFrequently: true });
  g.fillStyle = "#fff";
  g.strokeStyle = "#fff";
  g.lineCap = "round";
  g.lineJoin = "round";

  // Tête et cou
  g.beginPath();
  g.ellipse(100, 36, 18, 22, 0, 0, Math.PI * 2);
  g.fill();
  g.fillRect(92, 54, 16, 22);

  // Torse : épaules, taille, bassin
  g.beginPath();
  g.moveTo(100, 70);
  g.bezierCurveTo(128, 70, 150, 74, 152, 92);
  g.bezierCurveTo(152, 120, 140, 150, 134, 186);
  g.bezierCurveTo(132, 200, 138, 214, 136, 226);
  g.lineTo(64, 226);
  g.bezierCurveTo(62, 214, 68, 200, 66, 186);
  g.bezierCurveTo(60, 150, 48, 120, 48, 92);
  g.bezierCurveTo(50, 74, 72, 70, 100, 70);
  g.fill();

  // Bras (épaule → coude → poignet), légèrement écartés
  for (const s of [-1, 1]) {
    const x = (v) => 100 + s * v;
    g.lineWidth = 20;
    g.beginPath();
    g.moveTo(x(44), 92);
    g.lineTo(x(58), 168);
    g.stroke();
    g.lineWidth = 15;
    g.beginPath();
    g.moveTo(x(58), 168);
    g.lineTo(x(66), 238);
    g.stroke();
    g.beginPath();
    g.ellipse(x(67), 250, 7, 12, 0, 0, Math.PI * 2);
    g.fill();
  }

  // Jambes (hanche → genou → cheville)
  for (const s of [-1, 1]) {
    const x = (v) => 100 + s * v;
    g.lineWidth = 32;
    g.beginPath();
    g.moveTo(x(18), 222);
    g.lineTo(x(22), 302);
    g.stroke();
    g.lineWidth = 22;
    g.beginPath();
    g.moveTo(x(22), 302);
    g.lineTo(x(24), 378);
    g.stroke();
    g.beginPath();
    g.ellipse(x(28), 388, 12, 6, 0, 0, Math.PI * 2);
    g.fill();
  }

  const data = g.getImageData(0, 0, W, H).data;
  const plein = (px, py) => px >= 0 && py >= 0 && px < W && py < H && data[(py * W + px) * 4 + 3] > 128;
  const pleins = [];
  const bords = [];
  for (let py = 0; py < H; py += 1) {
    for (let px = 0; px < W; px += 1) {
      if (!plein(px, py)) continue;
      const bord = !plein(px - 3, py) || !plein(px + 3, py) || !plein(px, py - 3) || !plein(px, py + 3);
      (bord ? bords : pleins).push(px, py);
    }
  }
  return { W, H, pleins, bords };
}

function creerParticules(nombre, forme) {
  const { pleins, bords } = forme;
  const particules = [];
  const nbBords = Math.floor(nombre * 0.3);
  for (let i = 0; i < nombre; i += 1) {
    const surBord = i < nbBords;
    const source = surBord ? bords : pleins;
    const k = Math.floor(Math.random() * (source.length / 2)) * 2;
    const tirage = Math.random();
    particules.push({
      // Position dans la silhouette, normalisée (0..1)
      sx: (source[k] + Math.random()) / forme.W,
      sy: (source[k + 1] + Math.random()) / forme.H,
      bord: surBord,
      couleur: surBord ? (tirage < 0.5 ? 3 : 0) : tirage < 0.12 ? 1 : tirage < 0.2 ? 2 : 0,
      // Place sur l'anneau
      angle: (i / nombre) * Math.PI * 2 + (Math.random() - 0.5) * 0.02,
      rayon: Math.random() < 0.1 ? 1.18 + Math.random() * 0.25 : 1 + (Math.random() + Math.random() - 1) * 0.06,
      // Désordre propre à chaque particule
      phase: Math.random() * Math.PI * 2,
      vitesse: 0.6 + Math.random() * 1.4,
      tourbillon: (Math.random() - 0.5) * 2,
      retard: Math.random(),
      taille: Math.random() < 0.08 ? 2.2 : Math.random() < 0.5 ? 1.5 : 1.1,
    });
  }
  return particules;
}

export default function CorpsParticules({ progressRef, score = null, className = "" }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const ctx = canvas.getContext("2d");
    const reduit = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const mobile = window.matchMedia("(max-width: 640px)").matches;
    const forme = echantillonnerSilhouette();
    const particules = creerParticules(mobile ? 1500 : 2800, forme);
    const fraction = score == null ? 0 : clamp(score / 100);

    // Seaux de dessin : une couleur × un niveau d'opacité par seau.
    const seaux = Array.from({ length: COULEURS.length * NIVEAUX_ALPHA.length }, () => []);
    const styles = [];
    COULEURS.forEach(([r, g, b]) =>
      NIVEAUX_ALPHA.forEach((a) => styles.push(`rgba(${r},${g},${b},${a})`))
    );

    let largeur = 0;
    let hauteur = 0;
    let dpr = 1;
    function redimensionner() {
      const rect = canvas.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      largeur = rect.width;
      hauteur = rect.height;
      canvas.width = Math.round(largeur * dpr);
      canvas.height = Math.round(hauteur * dpr);
    }
    redimensionner();

    let visible = true;
    let raf = 0;
    let dernierProgres = -1;
    const t0 = performance.now();

    function dessiner(maintenant) {
      const temps = reduit ? 0 : (maintenant - t0) / 1000;
      const p = clamp(progressRef?.current ?? 0);

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.globalCompositeOperation = "source-over";
      ctx.clearRect(0, 0, largeur, hauteur);

      // Gabarit de la silhouette à l'écran
      const hFig = Math.min(hauteur * 0.66, largeur * 1.35);
      const wFig = hFig * (forme.W / forme.H);
      // Sur grand écran, le titre occupe la gauche : la silhouette se décale
      // vers la droite (l'anneau, lui, se reforme au centre).
      const xFig = largeur > 900 ? largeur * 0.62 : largeur / 2;
      const x0 = xFig - wFig / 2;
      const y0 = hauteur * 0.5 - hFig / 2 + hauteur * 0.03;
      const cx = largeur / 2;
      const cy = hauteur * 0.5;
      const R = Math.min(largeur, hauteur) * (mobile ? 0.34 : 0.27);
      const respiration = reduit ? 1 : 1 + Math.sin(temps * 1.3) * 0.006;
      const rotation = temps * 0.06;
      const balayage = reduit ? -1 : (temps * 0.22) % 1.25;

      // Lueur au sol puis halo, qui suivent la transformation
      const halo = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * 1.6);
      halo.addColorStop(0, `rgba(77,232,255,${0.08 + 0.06 * p})`);
      halo.addColorStop(1, "rgba(77,232,255,0)");
      ctx.fillStyle = halo;
      ctx.fillRect(0, 0, largeur, hauteur);

      for (const s of seaux) s.length = 0;

      for (let i = 0; i < particules.length; i += 1) {
        const q = particules[i];

        // Départ : point de la silhouette, qui respire et frémit
        let sx = xFig + (x0 + q.sx * wFig - xFig) * respiration;
        let sy = y0 + q.sy * hFig;
        sy = cy + (sy - cy) * respiration;
        if (!reduit) {
          sx += Math.sin(temps * q.vitesse + q.phase) * 0.5;
          sy += Math.cos(temps * q.vitesse * 0.8 + q.phase) * 0.5;
        }

        // Arrivée : point de l'anneau, qui tourne lentement
        // L'anneau reste fixe (sa partie allumée se lit comme une jauge qui
        // part de midi) ; seule la poussière autour tourne lentement.
        const a = q.angle + (q.rayon > 1.15 ? rotation : 0);
        const tx = cx + Math.cos(a - Math.PI / 2) * R * q.rayon;
        const ty = cy + Math.sin(a - Math.PI / 2) * R * q.rayon;

        // Dissolution : la tête part d'abord, avec un peu de hasard
        const debut = 0.12 + q.sy * 0.28 + q.retard * 0.12;
        const t = easeInOut(clamp((p - debut) / 0.32));

        // Tourbillon : décalage perpendiculaire maximal à mi-chemin
        const dx = tx - sx;
        const dy = ty - sy;
        const courbe = Math.sin(t * Math.PI) * q.tourbillon * 70;
        const nx = -dy;
        const ny = dx;
        const norme = Math.hypot(nx, ny) || 1;
        const x = sx + dx * t + (nx / norme) * courbe;
        const y = sy + dy * t + (ny / norme) * courbe;

        // Couleur et éclat
        let couleur = q.couleur;
        let niveau = q.bord ? 2 : 1;
        let taille = q.taille;
        if (t > 0.6) {
          const allumee = fraction > 0 && q.angle / (Math.PI * 2) <= fraction && q.rayon < 1.15;
          if (allumee) {
            couleur = q.retard < 0.4 ? 3 : 0;
            niveau = 3;
            taille = q.taille * 1.35;
          } else {
            couleur = 4;
            niveau = 0;
          }
        } else if (t > 0.02) {
          niveau = Math.min(3, niveau + 1); // les particules en vol brillent
        }
        // Ligne de scan sur la silhouette encore entière
        if (balayage >= 0 && t < 0.05 && Math.abs(q.sy - balayage) < 0.025) {
          couleur = 3;
          niveau = 3;
        }
        if (!reduit && niveau < 3 && Math.sin(temps * 2 * q.vitesse + q.phase * 3) > 0.985) niveau += 1;

        seaux[couleur * NIVEAUX_ALPHA.length + niveau].push(x, y, taille);
      }

      ctx.globalCompositeOperation = "lighter";
      for (let k = 0; k < seaux.length; k += 1) {
        const s = seaux[k];
        if (s.length === 0) continue;
        ctx.fillStyle = styles[k];
        for (let j = 0; j < s.length; j += 3) {
          const taille = s[j + 2];
          ctx.fillRect(s[j] - taille / 2, s[j + 1] - taille / 2, taille, taille);
        }
      }
      dernierProgres = p;
    }

    function boucle(maintenant) {
      raf = 0;
      if (!visible || document.hidden) return;
      // En mouvement réduit, on ne redessine que si le défilement a changé.
      if (!reduit || Math.abs((progressRef?.current ?? 0) - dernierProgres) > 0.001) dessiner(maintenant);
      raf = requestAnimationFrame(boucle);
    }
    function relancer() {
      if (!raf && visible && !document.hidden) raf = requestAnimationFrame(boucle);
    }

    dessiner(performance.now());
    relancer();

    const observateur = new IntersectionObserver(([entree]) => {
      visible = entree.isIntersecting;
      relancer();
    });
    observateur.observe(canvas);
    const surVisibilite = () => relancer();
    document.addEventListener("visibilitychange", surVisibilite);
    const surTaille = () => {
      redimensionner();
      dessiner(performance.now());
    };
    window.addEventListener("resize", surTaille);

    return () => {
      cancelAnimationFrame(raf);
      observateur.disconnect();
      document.removeEventListener("visibilitychange", surVisibilite);
      window.removeEventListener("resize", surTaille);
    };
  }, [progressRef, score]);

  return <canvas ref={canvasRef} aria-hidden="true" className={`block h-full w-full ${className}`} />;
}
