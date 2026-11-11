"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ORDRE_RANGS } from "@/lib/rang";
import { MATERIAUX, apparenceRang, variablesMateriau } from "@/lib/materiaux";

// Carte de rang, pièce maîtresse du tableau de bord.
//
// MATIÈRE. La lettre fixe le matériau (graphite, acier, bronze, or, prisme),
// le signe fixe la finition (brossé, poli, étincelant) : voir lib/materiaux.
// Les couleurs passent par des variables CSS (--c1… cadre, --l1… lettre,
// --f1/--f2 film, --lueur), si bien que changer de matériau = changer six
// variables, sans toucher au reste.
//
// INCLINAISON. La carte s'incline en 3D : le film glisse, un reflet suit le
// doigt ou la souris. Deux variables CSS, --mx et --my (de -1 à 1), écrites
// directement sur l'élément à chaque image : aucun re-rendu React. Une seule
// boucle, arrêtée quand la carte sort de l'écran.
//   - au repos : léger balancement automatique ;
//   - souris ou doigt sur la carte : la carte suit le pointeur ;
//   - après un toucher sur iPhone : le gyroscope prend le relais (iOS demande
//     l'autorisation).
//
// CÉLÉBRATIONS. Une animation différente selon ce qui vient de monter :
//   - premier rang        : un faisceau de scan révèle la carte ;
//   - nouvelle finition   : la carte fait un tour, la lumière la polit ;
//   - nouveau matériau    : la carte se retourne et revient dans sa nouvelle
//                           matière, avec une pluie d'éclats ;
//   - arrivée en S        : la carte se fissure en lumière et révèle le prisme ;
//   - niveau (habitudes)  : pas de tour ; la barre d'XP se remplit, déborde,
//                           et le badge du niveau rebondit.

const borne = (v) => Math.max(-1, Math.min(1, v));
const nombre = (n) => n.toLocaleString("fr-FR");

// Ce que l'appareil a déjà montré : on ne célèbre qu'une montée nouvelle.
// Stocké sur l'appareil (pas en base) : une célébration manquée sur un autre
// appareil n'a aucune importance.
const CLE_RANG = "physiq-dernier-rang";
const CLE_NIVEAU = "physiq-dernier-niveau";

function lire(cle) {
  try {
    return window.localStorage.getItem(cle);
  } catch {
    return null;
  }
}
function ecrire(cle, valeur) {
  try {
    window.localStorage.setItem(cle, String(valeur));
  } catch {
    // Navigation privée ou stockage bloqué : pas de mémoire, pas grave.
  }
}

// La comparaison se fait UNE fois par chargement de page, et son résultat est
// gardé ici, hors du composant. La carte peut en effet être montée deux fois
// de suite (transition de page, mode strict de React en développement) : le
// premier montage enregistre le nouveau rang, et un second qui refaisait la
// comparaison ne trouvait plus rien de nouveau — l'animation ne partait jamais.
const verdicts = new Map();
const verdictsMontres = new Set();

// Pour tester une animation sans changer de rang : ajouter ?fete=debloque
// (ou finition, materiau, prisme, niveau) à l'adresse de l'accueil.
function verdictForce(type, lettre, niveau) {
  const precedente = { C: "D", B: "C+", A: "B+", S: "A+" }[lettre[0]] ?? "D";
  const avant = { finition: `${lettre[0]}-`, materiau: precedente, prisme: "A+" }[type];
  const titres = {
    debloque: "Rang débloqué",
    finition: "Nouveau rang",
    materiau: titreMateriau(apparenceRang(lettre).materiau),
    prisme: "Rang S · Prisme",
    niveau: "Niveau atteint",
  };
  if (!titres[type]) return null;
  return {
    type,
    titre: titres[type],
    valeur: type === "niveau" ? `Niv. ${niveau}` : lettre,
    avant: avant ? apparenceRang(avant) : null,
  };
}

function titreMateriau(materiau) {
  const nom = MATERIAUX[materiau].nom.toLowerCase();
  return nom === "or" ? "Passage à l'or" : `Passage au ${nom}`;
}

function verdictCelebration(lettre, niveau) {
  const cle = `${lettre}|${niveau}`;
  if (verdictsMontres.has(cle)) return null;
  if (verdicts.has(cle)) return verdicts.get(cle);

  let message = null;
  const force = new URLSearchParams(window.location.search).get("fete");
  if (force && lettre) {
    message = verdictForce(force, lettre, niveau);
  } else {
    if (lettre) {
      const avant = lire(CLE_RANG);
      const iAvant = avant ? ORDRE_RANGS.indexOf(avant) : -1;
      if (ORDRE_RANGS.indexOf(lettre) > iAvant) {
        const apres = apparenceRang(lettre);
        if (!avant) {
          message = { type: "debloque", titre: "Rang débloqué", valeur: lettre, avant: null };
        } else if (avant[0] === lettre[0]) {
          message = { type: "finition", titre: "Nouveau rang", valeur: lettre, avant: apparenceRang(avant) };
        } else if (lettre[0] === "S") {
          message = { type: "prisme", titre: "Rang S · Prisme", valeur: lettre, avant: apparenceRang(avant) };
        } else {
          message = { type: "materiau", titre: titreMateriau(apres.materiau), valeur: lettre, avant: apparenceRang(avant) };
        }
      }
      ecrire(CLE_RANG, lettre);
    }
    if (niveau) {
      const avant = Number(lire(CLE_NIVEAU));
      if (!message && avant && niveau > avant) {
        message = { type: "niveau", titre: "Niveau atteint", valeur: `Niv. ${niveau}`, avant: null };
      }
      ecrire(CLE_NIVEAU, niveau);
    }
  }
  verdicts.set(cle, message);
  return message;
}

// Éclats projetés depuis le centre (angles et distances fixes : rendu stable).
const ECLATS = Array.from({ length: 28 }, (_, i) => ({
  angle: i * (360 / 28) + (i % 2 ? 6 : -4),
  distance: 120 + ((i * 37) % 90),
  largeur: 3 + (i % 3) * 2,
  hauteur: 6 + (i % 4) * 3,
  tour: (i % 2 ? 1 : -1) * (180 + (i % 5) * 90),
  delai: (i % 5) * 35,
  clair: i % 3 === 0,
}));

// Étincelles de la finition « + », posées sur la lettre.
const ETINCELLES = [
  { x: "14%", y: "30%", d: "0s" },
  { x: "34%", y: "64%", d: "0.6s" },
  { x: "26%", y: "16%", d: "1.1s" },
  { x: "42%", y: "38%", d: "1.6s" },
  { x: "9%", y: "58%", d: "2.2s" },
];

export default function CarteRang({ rang, jours, xp }) {
  const carteRef = useRef(null);
  const cible = useRef({ x: 0, y: 0, actif: false, gyro: false });
  // Pendant une célébration, le balancement s'arrête : une seule animation à
  // la fois, sinon l'iPhone calcule deux mouvements 3D en même temps.
  const enFete = useRef(false);
  const [fete, setFete] = useState(null);
  // Pendant un changement de matériau, la carte garde l'ancienne matière
  // jusqu'au milieu du retournement.
  const [apparenceTransitoire, setApparenceTransitoire] = useState(null);
  const lettre = rang?.label ?? null;
  const niveau = xp?.niveau ?? null;

  useEffect(() => {
    const message = verdictCelebration(lettre, niveau);
    if (!message) return undefined;
    const minuteurs = [];
    const plus = (ms, f) => minuteurs.push(setTimeout(f, ms));

    const changeMatiere = message.type === "materiau" || message.type === "prisme" || message.type === "finition";
    if (changeMatiere && message.avant) plus(0, () => setApparenceTransitoire(message.avant));
    plus(message.type === "debloque" ? 0 : 300, () => setFete(message));
    // Instant où la nouvelle matière apparaît : au milieu du tour, ou à
    // l'éclair pour le prisme.
    if (changeMatiere) plus(message.type === "prisme" ? 300 + 1250 : 300 + 600, () => setApparenceTransitoire(null));
    // Les effets s'arrêtent, mais le badge reste affiché jusqu'à ce qu'on le
    // touche : l'annonce ne doit pas filer avant qu'on ait eu le temps de la lire.
    plus(message.type === "prisme" ? 4200 : 3200, () => {
      setFete((f) => (f ? { ...f, calme: true } : f));
      verdictsMontres.add(`${lettre}|${niveau}`);
    });
    return () => minuteurs.forEach(clearTimeout);
  }, [lettre, niveau]);

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
      if (enFete.current) {
        tx = 0;
        ty = 0;
      } else if (!c.actif && !c.gyro) {
        const s = (t - debut) / 1000;
        tx = Math.sin(s * 0.55) * 0.45;
        ty = Math.cos(s * 0.4) * 0.3;
      }
      const nx = x + (tx - x) * (enFete.current ? 0.2 : 0.08);
      const ny = y + (ty - y) * (enFete.current ? 0.2 : 0.08);
      // On n'écrit que si la valeur bouge vraiment : une fois la carte posée,
      // plus aucun recalcul de style.
      if (Math.abs(nx - x) > 0.0005 || Math.abs(ny - y) > 0.0005) {
        carte.style.setProperty("--mx", nx.toFixed(3));
        carte.style.setProperty("--my", ny.toFixed(3));
      }
      x = nx;
      y = ny;
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

  const apparence = apparenceTransitoire ?? apparenceRang(lettre);
  const { materiau, finition } = apparence;
  // Pendant les effets seulement ; une fois « calme », il ne reste que le badge.
  const type = fete && !fete.calme ? fete.type : null;

  useEffect(() => {
    enFete.current = Boolean(type);
  }, [type]);

  function fermerBadge() {
    setFete((f) => (f ? { ...f, sortie: true } : f));
    setTimeout(() => setFete(null), 380);
  }

  const scan =
    jours == null ? null : jours === 0 ? "Scan d'aujourd'hui" : jours === 1 ? "Scan d'hier" : `Scan il y a ${jours} j`;

  const classeAnimation =
    type === "debloque"
      ? "fete-apparition"
      : type === "finition" || type === "materiau"
      ? "fete-tour"
      : type === "prisme"
      ? "fete-prisme"
      : "";

  return (
    <div className="carte-rang-scene relative h-full" data-finition={finition}>
      {fete && (
        <button
          type="button"
          onClick={fermerBadge}
          aria-label={`${fete.titre} ${fete.valeur}, toucher pour fermer`}
          className={`carte-rang-badge absolute left-1/2 top-0 z-30 flex h-11 items-center gap-2 whitespace-nowrap rounded-full border border-white/20 bg-[#0b0f16] px-4 text-xs font-semibold ${
            fete.type === "niveau" ? "badge-rebond" : ""
          } ${fete.sortie ? "badge-sortie" : ""}`}
          style={variablesMateriau(apparenceRang(lettre).materiau)}
        >
          <span className="text-foreground-muted">{fete.titre}</span>
          <span className={fete.type === "niveau" ? "text-sm text-accent" : "carte-rang-texte-matiere badge-brillance text-sm"}>
            {fete.valeur}
          </span>
          <span className="ml-0.5 text-foreground-muted/60" aria-hidden="true">×</span>
        </button>
      )}

      {type && type !== "niveau" && <div className="carte-rang-aura pointer-events-none absolute inset-0 rounded-[28px]" />}
      {type === "prisme" && <div className="carte-rang-onde pointer-events-none absolute inset-0 z-0 rounded-[28px]" />}

      <div className={`h-full ${classeAnimation}`} style={{ transformStyle: "preserve-3d" }}>
        <div
          ref={carteRef}
          className="carte-rang relative flex h-full min-h-[260px] flex-col rounded-[28px]"
          onPointerMove={(e) => e.pointerType === "mouse" && suivre(e.clientX, e.clientY)}
          onPointerLeave={(e) => e.pointerType === "mouse" && relacher()}
          onTouchMove={(e) => suivre(e.touches[0].clientX, e.touches[0].clientY)}
          onTouchEnd={relacher}
          onClick={activerGyroscope}
          style={{ "--mx": 0, "--my": 0, ...variablesMateriau(materiau) }}
        >
          <div className="carte-rang-face relative flex flex-1 flex-col overflow-hidden rounded-[27px] bg-[#06080c] p-5 sm:p-6">
            {finition === "brosse" && <div className="carte-rang-brosse pointer-events-none absolute inset-0" />}
            <div className="carte-rang-film pointer-events-none absolute inset-0" />
            <div className="carte-rang-reflet pointer-events-none absolute inset-0" />

            {(type === "finition" || type === "materiau") && (
              <div className="carte-rang-eclat pointer-events-none absolute inset-0 z-10" />
            )}
            {type === "debloque" && (
              <>
                <div className="carte-rang-voile pointer-events-none absolute inset-0 z-10" />
                <div className="carte-rang-faisceau pointer-events-none absolute inset-0 z-10" />
              </>
            )}
            {type === "prisme" && (
              <>
                <svg
                  className="carte-rang-fissures pointer-events-none absolute inset-0 z-10 h-full w-full"
                  viewBox="0 0 100 100"
                  preserveAspectRatio="none"
                  aria-hidden="true"
                >
                  <polyline points="50,48 38,30 41,18 30,0" />
                  <polyline points="50,48 64,36 70,40 86,22 100,18" />
                  <polyline points="50,48 58,66 54,80 62,100" />
                  <polyline points="50,48 34,58 22,55 0,70" />
                  <polyline points="50,48 70,60 82,74 100,78" />
                </svg>
                <div className="carte-rang-eclair pointer-events-none absolute inset-0 z-10" />
              </>
            )}

            <div className="carte-rang-info relative flex items-center justify-between">
              <span className="etiquette">
                Rang Physiq{rang ? ` · ${MATERIAUX[materiau].nom}` : ""}
              </span>
              {scan && <span className="text-[11px] font-medium text-foreground-muted">{scan}</span>}
            </div>

            <div className="carte-rang-info relative mt-2 flex flex-1 items-center justify-between gap-4">
              <span className="relative">
                <span className="carte-rang-lettre carte-rang-texte-matiere tabular select-none text-[104px] font-semibold leading-none tracking-[-0.06em] sm:text-[128px]">
                  {rang ? rang.label : "?"}
                </span>
                {rang &&
                  finition === "etincelant" &&
                  ETINCELLES.map((e, i) => (
                    <span
                      key={i}
                      className="carte-rang-etincelle pointer-events-none absolute"
                      style={{ left: e.x, top: e.y, animationDelay: e.d }}
                    />
                  ))}
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

            <div className="carte-rang-info relative mt-4 space-y-3">
              <div>
                <div className="flex items-baseline justify-between text-[11px] font-medium text-foreground-muted">
                  <span>Corps</span>
                  <span>
                    {!rang
                      ? "Palier de départ"
                      : rang.palierSuivant
                      ? `${rang.pointsAvantPalierSuivant} pt${rang.pointsAvantPalierSuivant > 1 ? "s" : ""} avant ${rang.palierSuivant}`
                      : "Rang maximum"}
                  </span>
                </div>
                <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-white/[0.07]">
                  <div
                    className="carte-rang-barre-corps h-full rounded-full"
                    style={{ width: `${rang ? Math.max(4, rang.xpPercent) : 0}%` }}
                  />
                </div>
              </div>

              {xp && (
                <div>
                  <div className="flex items-baseline justify-between gap-2 text-[11px] font-medium">
                    <span className="text-foreground-muted">
                      <span
                        className={`mr-1.5 inline-block rounded-full border border-accent/40 px-1.5 py-px text-[10px] font-semibold text-accent ${
                          type === "niveau" ? "puce-rebond" : ""
                        }`}
                      >
                        Niv. {xp.niveau}
                      </span>
                      <span className="tabular text-foreground">{nombre(xp.total)}</span> XP
                    </span>
                    <span className="text-right text-foreground-muted">
                      {xp.semaine.total > 0 ? (
                        <>
                          <span className="tabular text-accent">+{nombre(xp.semaine.total)}</span> cette semaine
                        </>
                      ) : (
                        `${nombre(xp.xpPourSuivant - xp.xpDansNiveau)} avant niv. ${xp.niveau + 1}`
                      )}
                    </span>
                  </div>
                  <div className="relative mt-1.5 h-2 overflow-hidden rounded-full bg-white/[0.07]">
                    <div className="h-full rounded-full bg-accent" style={{ width: `${Math.max(3, xp.pourcent)}%` }} />
                    {type === "niveau" && <div className="barre-debordement absolute inset-y-0 left-0 rounded-full" />}
                  </div>
                </div>
              )}

              {rang ? (
                <Link
                  href="/journal"
                  className="-mb-2 inline-flex h-11 items-center text-xs font-medium text-foreground-muted transition hover:text-accent"
                >
                  Gagner des XP : remplir mon bilan →
                </Link>
              ) : (
                <Link
                  href="/scan"
                  className="mt-1 inline-flex h-11 items-center rounded-full bg-white px-5 text-sm font-semibold text-[#06080c]"
                >
                  Importer mon rapport →
                </Link>
              )}
            </div>
          </div>

          {(type === "materiau" || type === "prisme") && (
            <div className="pointer-events-none absolute left-1/2 top-1/2 z-20" aria-hidden="true">
              {ECLATS.map((e, i) => (
                <span
                  key={i}
                  className={`carte-rang-eclat-piece absolute ${e.clair ? "eclat-clair" : ""}`}
                  style={{
                    "--angle": `${e.angle}deg`,
                    "--distance": `${e.distance}px`,
                    "--tour": `${e.tour}deg`,
                    width: e.largeur,
                    height: e.hauteur,
                    animationDelay: `${(type === "prisme" ? 1250 : 1450) + e.delai}ms`,
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <style>{`
        .carte-rang-scene { perspective: 1000px; }
        .carte-rang {
          padding: 1px;
          transform-style: preserve-3d;
          transform: rotateY(calc(var(--mx) * 9deg)) rotateX(calc(var(--my) * -9deg));
          background: linear-gradient(125deg, var(--c1), var(--c2), var(--c3), var(--c2));
          box-shadow: 0 30px 60px -30px rgba(0,0,0,0.9), 0 0 50px -28px var(--lueur);
          transition: background 0.5s, box-shadow 0.5s;
          will-change: transform;
          touch-action: pan-y;
          -webkit-tap-highlight-color: transparent;
        }
        /* Le contenu est décollé d'un pixel du fond de la carte. Sur le même
           plan, Safari ne savait plus lequel des deux afficher devant quand
           la carte s'inclinait (« z-fighting ») : les informations
           disparaissaient au bout de quelques secondes. Le dos caché permet,
           pendant un retournement, de voir le métal plein et non le texte à
           l'envers. */
        .carte-rang-face {
          transform: translateZ(1px);
          backface-visibility: hidden;
          -webkit-backface-visibility: hidden;
        }
        [data-finition="etincelant"] .carte-rang {
          padding: 1.5px;
          box-shadow: 0 30px 60px -30px rgba(0,0,0,0.9), 0 0 60px -20px var(--lueur);
        }
        .carte-rang-texte-matiere {
          display: inline-block;
          background-image: linear-gradient(100deg, var(--l1), var(--l2), var(--l3));
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
        }
        .carte-rang-barre-corps { background: linear-gradient(90deg, var(--c3), var(--c2)); opacity: 0.8; }

        /* Film et reflet : de grandes couches qui GLISSENT (transform), au lieu
           de dégradés redessinés à chaque image. Le balancement ne coûte plus
           qu'un déplacement de calque, ce qui garde l'iPhone fluide. */
        .carte-rang-film {
          inset: -60%;
          background: repeating-linear-gradient(115deg,
            transparent 0%, var(--f1) 4%, rgba(255,255,255,0.35) 7.5%, var(--f2) 11%, transparent 15%);
          transform: translate3d(calc(var(--mx) * 14%), calc(var(--my) * 14%), 0);
          mix-blend-mode: color-dodge;
          opacity: 0.13;
          will-change: transform;
        }
        [data-finition="brosse"] .carte-rang-film { opacity: 0.05; }
        [data-finition="etincelant"] .carte-rang-film { opacity: 0.2; }
        .carte-rang-brosse {
          background: repeating-linear-gradient(90deg, rgba(255,255,255,0.022) 0 1px, transparent 1px 3px);
        }
        .carte-rang-reflet {
          inset: -50%;
          background: radial-gradient(circle at 50% 50%, rgba(255,255,255,0.09), transparent 30%);
          transform: translate3d(calc(var(--mx) * 22%), calc(var(--my) * 22%), 0);
          will-change: transform;
        }
        [data-finition="brosse"] .carte-rang-reflet { opacity: 0.4; }
        /* Pas de filtre (drop-shadow, saturate) sur la lettre : un filtre est
           recalculé à chaque image d'un mouvement 3D, c'était la principale
           cause de saccades. Le brossé s'obtient par l'opacité. */
        .carte-rang-lettre {
          transform: translate3d(calc(var(--mx) * 6px), calc(var(--my) * 6px), 0);
        }
        [data-finition="brosse"] .carte-rang-lettre { opacity: 0.82; }
        .carte-rang-etincelle {
          width: 9px; height: 9px; background: #fff;
          clip-path: polygon(50% 0,60% 40%,100% 50%,60% 60%,50% 100%,40% 60%,0 50%,40% 40%);
          animation: etincelle 2.6s ease-in-out infinite;
          opacity: 0;
        }
        @keyframes etincelle {
          0%, 100% { opacity: 0; transform: scale(0.3) rotate(0deg); }
          45% { opacity: 1; transform: scale(1) rotate(45deg); }
          60% { opacity: 0; transform: scale(0.4) rotate(70deg); }
        }

        /* Badge : arrive avec un ressort, brille, reste jusqu'au toucher. */
        .carte-rang-badge {
          transform: translate(-50%, -50%);
          box-shadow: 0 0 40px -6px var(--lueur);
          animation: badge-entree 0.7s 1.3s cubic-bezier(0.34, 1.56, 0.64, 1) both;
        }
        .carte-rang-badge.badge-rebond { animation: badge-entree 0.6s 1s cubic-bezier(0.34, 1.9, 0.64, 1) both; }
        .carte-rang-badge.badge-sortie { animation: badge-sortie 0.38s cubic-bezier(0.4, 0, 1, 1) both; }
        @keyframes badge-entree {
          from { opacity: 0; transform: translate(-50%, -10%) scale(0.8); }
          to { opacity: 1; transform: translate(-50%, -50%) scale(1); }
        }
        @keyframes badge-sortie {
          from { opacity: 1; transform: translate(-50%, -50%) scale(1); }
          to { opacity: 0; transform: translate(-50%, -80%) scale(0.92); }
        }
        .badge-brillance {
          background-size: 250% 100%;
          animation: brillance 2.4s 1.4s ease-in-out infinite;
        }
        @keyframes brillance { 0%, 100% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } }

        /* Halo de lumière qui gonfle derrière la carte. */
        .carte-rang-aura {
          box-shadow: 0 0 60px 8px var(--lueur);
          opacity: 0;
          animation: aura 2.2s 0.35s cubic-bezier(0.22, 1, 0.36, 1) both;
        }
        @keyframes aura {
          0% { opacity: 0; transform: scale(0.92); }
          35% { opacity: 1; transform: scale(1.03); }
          100% { opacity: 0; transform: scale(1.08); }
        }

        /* Pendant un mouvement : calque d'animation dédié, et on retire ce qui
           coûte cher à recomposer en 3D (film en mode de fusion, reflet,
           étincelles). Les infos s'effacent dès que la carte tourne et ne
           reviennent qu'une fois la carte de face. */
        .fete-tour, .fete-prisme, .fete-apparition { will-change: transform; }
        .fete-tour .carte-rang-film, .fete-tour .carte-rang-reflet, .fete-tour .carte-rang-etincelle,
        .fete-prisme .carte-rang-film, .fete-prisme .carte-rang-reflet, .fete-prisme .carte-rang-etincelle,
        .fete-apparition .carte-rang-film { display: none; }
        .fete-tour .carte-rang-info { animation: info-tour 2s both; }
        @keyframes info-tour {
          0% { opacity: 1; }
          7% { opacity: 0; }
          86% { opacity: 0; }
          100% { opacity: 1; }
        }
        .fete-prisme .carte-rang-info { animation: info-prisme 2.9s both; }
        @keyframes info-prisme {
          0%, 41% { opacity: 1; }
          45% { opacity: 0; }
          88% { opacity: 0; }
          100% { opacity: 1; }
        }
        .fete-apparition .carte-rang-info { animation: info-apparition 1.6s both; }
        @keyframes info-apparition {
          0%, 45% { opacity: 0; }
          80%, 100% { opacity: 1; }
        }

        /* Premier rang : la carte arrive couchée, se redresse en 3D, et un voile
           se retire sous un faisceau de scan. */
        .fete-apparition { animation: apparition 1.6s both; }
        @keyframes apparition {
          0% { opacity: 0; transform: translateY(40px) translateZ(-160px) rotateX(68deg); animation-timing-function: cubic-bezier(0.2, 0.7, 0.3, 1); }
          70% { opacity: 1; transform: translateY(-4px) translateZ(20px) rotateX(-7deg); animation-timing-function: ease-in-out; }
          100% { opacity: 1; transform: none; }
        }
        /* Premier rang : un voile se retire sous un faisceau de scan. */
        .carte-rang-voile {
          background: #06080c;
          transform-origin: 50% 100%;
          animation: voile 1.5s cubic-bezier(0.65, 0, 0.35, 1) both;
        }
        @keyframes voile { from { transform: scaleY(1); } to { transform: scaleY(0); } }
        .carte-rang-faisceau {
          background:
            linear-gradient(180deg, transparent 0, var(--lueur) 10px, #fff 13px, var(--l1) 15px, transparent 40px);
          transform: translateY(-40px);
          animation: faisceau 1.5s cubic-bezier(0.65, 0, 0.35, 1) both;
        }
        @keyframes faisceau {
          0% { transform: translateY(-40px); opacity: 1; }
          90% { opacity: 1; }
          100% { transform: translateY(100%); opacity: 0; }
        }

        /* Nouvelle finition ou matériau : élan, retournement, atterrissage. */
        /* Double tour en 3D : élan en arrière, la carte s'élève vers soi en
           tournant et en basculant, puis atterrit avec un léger rebond. */
        .fete-tour { animation: carte-retourne 2s both; }
        @keyframes carte-retourne {
          0% { transform: translateZ(0) rotateX(0deg) rotateY(0deg) scale(1); animation-timing-function: cubic-bezier(0.3, 0, 0.5, 1); }
          12% { transform: translateZ(-30px) rotateX(8deg) rotateY(-22deg) scale(0.97); animation-timing-function: cubic-bezier(0.55, 0, 0.35, 1); }
          45% { transform: translateZ(90px) rotateX(-16deg) rotateY(380deg) scale(1.08); animation-timing-function: cubic-bezier(0.25, 0, 0.25, 1); }
          76% { transform: translateZ(30px) rotateX(7deg) rotateY(700deg) scale(1.03); animation-timing-function: cubic-bezier(0.2, 0, 0.3, 1); }
          90% { transform: translateZ(0) rotateX(-2deg) rotateY(727deg) scale(1); animation-timing-function: ease-out; }
          100% { transform: translateZ(0) rotateX(0deg) rotateY(720deg) scale(1); }
        }
        .carte-rang-eclat {
          background: linear-gradient(105deg, transparent 32%, rgba(255,255,255,0.4) 48%, var(--f1) 52%, transparent 68%);
          transform: translateX(-130%);
          animation: carte-eclat 1.2s 1.55s cubic-bezier(0.4, 0, 0.2, 1) both;
        }
        @keyframes carte-eclat { to { transform: translateX(130%); } }
        .carte-rang-eclat-piece {
          left: 0; top: 0; border-radius: 1px;
          background: linear-gradient(135deg, var(--l1), var(--l2));
          opacity: 0;
          animation: eclat-vol 1.4s cubic-bezier(0.12, 0.8, 0.3, 1) both;
        }
        .carte-rang-eclat-piece.eclat-clair { background: #fff; }
        @keyframes eclat-vol {
          0% { opacity: 1; transform: rotate(var(--angle)) translateX(8px) rotate(0deg) scale(1); }
          70% { opacity: 1; }
          100% { opacity: 0; transform: rotate(var(--angle)) translateX(var(--distance)) rotate(var(--tour)) scale(0.4); }
        }

        /* Arrivée en S : la carte tremble, se fissure, éclate en lumière. */
        .fete-prisme { animation: prisme 2.9s both; }
        @keyframes prisme {
          0% { transform: none; animation-timing-function: linear; }
          9% { transform: translateX(-1px) rotate(-0.3deg) scale(1.005); }
          18% { transform: translateX(2px) rotate(0.4deg) scale(1.01); }
          27% { transform: translateX(-2px) rotate(-0.5deg) scale(1.015); }
          36% { transform: translateX(2px) rotate(0.3deg) scale(1.02); }
          43% { transform: translateZ(0) rotateX(0deg) rotateY(0deg) scale(1.02); animation-timing-function: cubic-bezier(0.3, 0, 0.2, 1); }
          72% { transform: translateZ(110px) rotateX(-18deg) rotateY(300deg) scale(1.1); animation-timing-function: cubic-bezier(0.2, 0, 0.3, 1); }
          90% { transform: translateZ(0) rotateX(3deg) rotateY(366deg) scale(1); animation-timing-function: ease-out; }
          100% { transform: rotateY(360deg) scale(1); }
        }
        .carte-rang-fissures polyline {
          fill: none; stroke: #fff; stroke-width: 0.6; vector-effect: non-scaling-stroke;
          stroke-dasharray: 160; stroke-dashoffset: 160;
          animation: fissure 1.1s cubic-bezier(0.5, 0, 0.9, 0.5) both, fissure-fin 0.4s 1.3s ease-out both;
        }
        @keyframes fissure { to { stroke-dashoffset: 0; } }
        @keyframes fissure-fin { to { opacity: 0; } }
        .carte-rang-eclair {
          background: radial-gradient(circle at 50% 48%, #fff, rgba(143,227,255,0.6) 40%, transparent 75%);
          opacity: 0;
          animation: eclair 1s 1.15s ease-out both;
        }
        @keyframes eclair { 0% { opacity: 0; } 15% { opacity: 1; } 100% { opacity: 0; } }
        .carte-rang-onde {
          border: 2px solid rgba(143,227,255,0.7);
          animation: onde 1.5s 1.25s cubic-bezier(0.16, 1, 0.3, 1) both;
        }
        @keyframes onde {
          from { opacity: 1; transform: scale(1); }
          to { opacity: 0; transform: scale(1.5); }
        }

        /* Niveau : la barre se remplit, déborde, puis revient. */
        .barre-debordement {
          width: 100%;
          transform-origin: 0 50%;
          background: linear-gradient(90deg, var(--accent), #fff);
          animation: debordement 1.7s 0.4s cubic-bezier(0.65, 0, 0.35, 1) both;
        }
        @keyframes debordement {
          0% { transform: scaleX(0); opacity: 1; }
          55% { transform: scaleX(1); opacity: 1; }
          100% { transform: scaleX(1); opacity: 0; }
        }
        .puce-rebond { animation: puce-rebond 0.7s 1.35s cubic-bezier(0.34, 1.9, 0.64, 1) both; }
        @keyframes puce-rebond {
          0% { transform: scale(1); }
          40% { transform: scale(1.45); }
          100% { transform: scale(1); }
        }

        @media (prefers-reduced-motion: reduce) {
          .fete-apparition, .carte-rang-voile, .carte-rang-faisceau, .fete-tour, .carte-rang-info, .carte-rang-eclat, .carte-rang-aura,
          .carte-rang-eclat-piece, .fete-prisme, .carte-rang-fissures polyline, .carte-rang-eclair,
          .carte-rang-onde, .barre-debordement, .puce-rebond, .carte-rang-badge, .carte-rang-etincelle,
          .badge-brillance {
            animation: none;
          }
          .carte-rang-voile, .carte-rang-faisceau, .carte-rang-eclat, .carte-rang-eclat-piece, .carte-rang-aura,
          .carte-rang-fissures, .carte-rang-eclair, .carte-rang-onde, .barre-debordement { display: none; }
          .carte-rang-etincelle { opacity: 0.8; }
        }
      `}</style>
    </div>
  );
}
