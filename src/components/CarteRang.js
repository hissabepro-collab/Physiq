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
// --f1/--f2 film, --lueur) : changer de matériau = changer ces variables.
//
// INCLINAISON. Au repos la carte se balance doucement ; elle suit la souris,
// le doigt, ou le gyroscope (iOS, après un toucher). Deux variables CSS, --mx
// et --my (de -1 à 1), écrites seulement quand elles changent : aucun re-rendu
// React, aucun recalcul une fois la carte posée.
//
// CÉLÉBRATION D'UNE MONTÉE DE RANG. Toujours la même base — un tour en 3D
// modérée qui bouge (élan, rotation, balancement, atterrissage) pendant lequel
// la carte devient une plaque de métal pleine, sans les infos — et chaque
// palier AJOUTE un effet par-dessus. Plus le rang est haut, plus la fête est
// riche (voir EFFETS). La nouvelle matière apparaît pendant le tour.
// Le passage de niveau (habitudes) a sa propre animation, sans tour : la
// barre d'XP se remplit, déborde, et le badge rebondit.
//
// ANIMATIONS RÉDUITES. Volontairement ignoré (choix de l'utilisateur) : la
// carte tourne même si le système demande moins d'animations.
//
// FLUIDITÉ. Toutes les animations ne touchent que transform et opacity, les
// deux propriétés que le navigateur anime sans redessiner. Pendant une
// célébration, le balancement est suspendu et les couches coûteuses (film en
// mode de fusion, reflet, étincelles) sont retirées.

const borne = (v) => Math.max(-1, Math.min(1, v));
const nombre = (n) => n.toLocaleString("fr-FR");

// Effets ajoutés palier par palier (index dans ORDRE_RANGS : 0 = D … 12 = S+).
// Chaque palier garde tous les effets des paliers inférieurs.
const EFFETS = {
  eclat: 1, //        C-  : un trait de lumière traverse la carte à l'atterrissage
  aura: 2, //         C   : un halo s'allume derrière la carte
  etoiles: 3, //      C+  : des étoiles éclosent autour de la carte
  eclats: 4, //       B-  : des éclats de métal jaillissent (plus nombreux à chaque palier)
  onde: 5, //         B   : une onde part de la carte
  doubleTour: 6, //   B+  : deux tours au lieu d'un
  elan: 7, //         A-  : la carte s'avance vers soi en tournant
  rayons: 8, //       A   : des rayons tournent derrière la carte
  ondeDouble: 9, //   A+  : seconde onde, halo plus intense
  fissures: 10, //    S-  : avant le tour, la carte se fissure et éclate en lumière
  spectre: 11, //     S   : la plaque prend tout le spectre pendant le tour
  pluie: 12, //       S+  : une pluie de lumière tombe autour de la carte
};

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

function titreMontee(avant, lettre) {
  if (!avant) return "Rang débloqué";
  if (avant[0] === lettre[0]) return "Nouveau rang";
  const nom = MATERIAUX[apparenceRang(lettre).materiau].nom.toLowerCase();
  return nom === "or" ? "Passage à l'or" : `Passage au ${nom}`;
}

// La comparaison se fait UNE fois par chargement de page, et son résultat est
// gardé ici, hors du composant. La carte peut en effet être montée deux fois
// de suite (transition de page, mode strict de React en développement) : le
// premier montage enregistre le nouveau rang, et un second qui refaisait la
// comparaison ne trouvait plus rien de nouveau — l'animation ne partait jamais.
const verdicts = new Map();
const verdictsMontres = new Set();

function verdictCelebration(lettre, niveau) {
  const cle = `${lettre}|${niveau}`;
  if (verdictsMontres.has(cle)) return null;
  if (verdicts.has(cle)) return verdicts.get(cle);

  let message = null;
  // Pour revoir une animation sans changer de rang : ?fete=rang (montée vers
  // le rang actuel), ?fete=niveau, ou ?fete=B+ (montée vers un rang donné,
  // pour voir ce que chaque palier ajoute).
  const force = new URLSearchParams(window.location.search).get("fete");
  if (force && lettre) {
    if (force === "niveau") {
      message = { type: "niveau", titre: "Niveau atteint", valeur: `Niv. ${niveau}` };
    } else {
      const cible = ORDRE_RANGS.includes(force) ? force : lettre;
      const i = ORDRE_RANGS.indexOf(cible);
      const avant = i > 0 ? ORDRE_RANGS[i - 1] : null;
      message = { type: "rang", titre: titreMontee(avant, cible), valeur: cible, cible, avant };
    }
  } else {
    if (lettre) {
      const avant = lire(CLE_RANG);
      const iAvant = avant ? ORDRE_RANGS.indexOf(avant) : -1;
      if (ORDRE_RANGS.indexOf(lettre) > iAvant) {
        message = { type: "rang", titre: titreMontee(avant, lettre), valeur: lettre, cible: lettre, avant };
      }
      ecrire(CLE_RANG, lettre);
    }
    if (niveau) {
      const avant = Number(lire(CLE_NIVEAU));
      if (!message && avant && niveau > avant) {
        message = { type: "niveau", titre: "Niveau atteint", valeur: `Niv. ${niveau}` };
      }
      ecrire(CLE_NIVEAU, niveau);
    }
  }
  verdicts.set(cle, message);
  return message;
}

/** Minutage et réglages de la célébration d'un rang (index 0 → 12). */
function reglagesFete(index) {
  const a = (cle) => index >= EFFETS[cle];
  const prelude = a("fissures") ? 1150 : 0; // fissures avant le tour
  const duree = Math.round((a("doubleTour") ? 1900 : 1500) + index * 25);
  return {
    a,
    prelude,
    duree,
    tours: a("doubleTour") ? 720 : 360,
    avance: a("elan") ? 1.07 : 1.03,
    // La nouvelle matière s'installe quand la carte est de dos.
    bascule: prelude + Math.round(duree * 0.3),
    atterrissage: prelude + Math.round(duree * 0.86),
    fin: prelude + duree + 1300,
    nbEclats: a("eclats") ? Math.min(30, 8 + (index - EFFETS.eclats) * 3) : 0,
  };
}

// Éclats, étoiles, gouttes : positions fixes (rendu stable, pas de hasard).
const ECLATS = Array.from({ length: 30 }, (_, i) => ({
  angle: i * 12 + (i % 2 ? 5 : -3),
  distance: 120 + ((i * 37) % 100),
  largeur: 3 + (i % 3) * 2,
  hauteur: 6 + (i % 4) * 3,
  tour: (i % 2 ? 1 : -1) * (180 + (i % 5) * 90),
  delai: (i % 6) * 30,
  clair: i % 3 === 0,
}));
const ETOILES = [
  { x: "-3%", y: "12%" }, { x: "18%", y: "-6%" }, { x: "52%", y: "-7%" }, { x: "86%", y: "-5%" },
  { x: "102%", y: "30%" }, { x: "101%", y: "74%" }, { x: "78%", y: "104%" }, { x: "40%", y: "105%" },
  { x: "6%", y: "102%" }, { x: "-4%", y: "60%" },
];
const GOUTTES = Array.from({ length: 18 }, (_, i) => ({
  x: `${(i * 53) % 100}%`,
  delai: (i * 97) % 900,
  duree: 1100 + ((i * 131) % 700),
  taille: 2 + (i % 3),
}));
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
  // Pendant une célébration, le balancement s'arrête : une seule animation 3D
  // à la fois.
  const enFete = useRef(false);
  const [fete, setFete] = useState(null);
  // Pendant une montée, la carte garde l'ancien rang (lettre et matière)
  // jusqu'au milieu du tour.
  const [rangTransitoire, setRangTransitoire] = useState(null);
  const lettre = rang?.label ?? null;
  const niveau = xp?.niveau ?? null;

  useEffect(() => {
    const message = verdictCelebration(lettre, niveau);
    if (!message) return undefined;
    const minuteurs = [];
    const plus = (ms, f) => minuteurs.push(setTimeout(f, ms));
    const DEPART = 300;

    if (message.type === "rang") {
      const r = reglagesFete(ORDRE_RANGS.indexOf(message.cible));
      if (message.avant) plus(0, () => setRangTransitoire(message.avant));
      plus(DEPART, () => setFete({ ...message, reglages: r }));
      plus(DEPART + r.bascule, () => setRangTransitoire(message.cible === lettre ? null : message.cible));
      // Les effets s'arrêtent ; le badge reste jusqu'à ce qu'on le touche.
      plus(DEPART + r.fin, () => {
        setFete((f) => (f ? { ...f, calme: true } : f));
        if (message.cible !== lettre) setRangTransitoire(null);
        verdictsMontres.add(`${lettre}|${niveau}`);
      });
    } else {
      plus(DEPART, () => setFete(message));
      plus(DEPART + 2600, () => {
        setFete((f) => (f ? { ...f, calme: true } : f));
        verdictsMontres.add(`${lettre}|${niveau}`);
      });
    }
    return () => minuteurs.forEach(clearTimeout);
  }, [lettre, niveau]);

  const type = fete && !fete.calme ? fete.type : null;

  useEffect(() => {
    enFete.current = Boolean(type);
  }, [type]);

  useEffect(() => {
    const carte = carteRef.current;
    if (!carte) return undefined;

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
      const vitesse = enFete.current ? 0.2 : 0.08;
      const nx = x + (tx - x) * vitesse;
      const ny = y + (ty - y) * vitesse;
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

  function fermerBadge() {
    setFete((f) => (f ? { ...f, sortie: true } : f));
    setTimeout(() => setFete(null), 380);
  }

  const lettreAffichee = rangTransitoire ?? lettre;
  const { materiau, finition } = apparenceRang(lettreAffichee);
  const r = type === "rang" ? fete.reglages : null;
  const a = (cle) => Boolean(r?.a(cle));

  // Variables de minutage, lues par les animations CSS.
  const tempo = r
    ? {
        "--prelude": `${r.prelude}ms`,
        "--duree": `${r.duree}ms`,
        "--tours": `${r.tours}deg`,
        "--avance": r.avance,
        "--atterrissage": `${r.atterrissage}ms`,
      }
    : {};

  const scan =
    jours == null ? null : jours === 0 ? "Scan d'aujourd'hui" : jours === 1 ? "Scan d'hier" : `Scan il y a ${jours} j`;

  return (
    <div
      className={`carte-rang-scene relative h-full ${type ? "z-20" : ""}`}
      data-finition={finition}
      style={{ ...variablesMateriau(materiau), ...tempo }}
    >
      {fete && (
        <button
          type="button"
          onClick={fermerBadge}
          aria-label={`${fete.titre} ${fete.valeur}, toucher pour fermer`}
          className={`carte-rang-badge absolute left-1/2 top-0 z-30 flex h-11 items-center gap-2 whitespace-nowrap rounded-full border border-white/20 bg-[#0b0f16] px-4 text-xs font-semibold ${
            fete.type === "niveau" ? "badge-niveau" : ""
          } ${fete.sortie ? "badge-sortie" : ""}`}
          style={variablesMateriau(apparenceRang(fete.cible ?? lettre).materiau)}
        >
          <span className="text-foreground-muted">{fete.titre}</span>
          <span className={fete.type === "niveau" ? "text-sm text-accent" : "carte-rang-texte-matiere text-sm"}>
            {fete.valeur}
          </span>
          <span className="ml-0.5 text-foreground-muted/60" aria-hidden="true">×</span>
        </button>
      )}

      {/* Derrière la carte */}
      {a("rayons") && <div className="fx-rayons pointer-events-none absolute left-1/2 top-1/2" aria-hidden="true" />}
      {a("aura") && <div className="fx-aura pointer-events-none absolute inset-0 rounded-[28px]" aria-hidden="true" />}
      {a("onde") && <div className="fx-onde pointer-events-none absolute inset-0 rounded-[28px]" aria-hidden="true" />}
      {a("ondeDouble") && <div className="fx-onde fx-onde-2 pointer-events-none absolute inset-0 rounded-[28px]" aria-hidden="true" />}

      <div className={`h-full ${type === "rang" ? "fete-tour" : ""}`} style={{ transformStyle: "preserve-3d" }}>
        <div
          ref={carteRef}
          className="carte-rang relative flex h-full min-h-[260px] flex-col rounded-[28px]"
          onPointerMove={(e) => e.pointerType === "mouse" && suivre(e.clientX, e.clientY)}
          onPointerLeave={(e) => e.pointerType === "mouse" && relacher()}
          onTouchMove={(e) => suivre(e.touches[0].clientX, e.touches[0].clientY)}
          onTouchEnd={relacher}
          onClick={activerGyroscope}
          style={{ "--mx": 0, "--my": 0 }}
        >
          <div className="carte-rang-face relative flex flex-1 flex-col overflow-hidden rounded-[27px] bg-[#06080c] p-5 sm:p-6">
            {finition === "brosse" && <div className="carte-rang-brosse pointer-events-none absolute inset-0" />}
            <div className="carte-rang-film pointer-events-none absolute inset-0" />
            <div className="carte-rang-reflet pointer-events-none absolute inset-0" />

            {/* Pendant le tour : la face devient une plaque de métal pleine. */}
            {type === "rang" && (
              <div className="fx-plaque pointer-events-none absolute inset-0 z-10" aria-hidden="true">
                {a("spectre") && <div className="fx-spectre absolute inset-0" />}
              </div>
            )}
            {a("eclat") && <div className="fx-eclat pointer-events-none absolute inset-0 z-10" aria-hidden="true" />}
            {a("fissures") && (
              <>
                <svg
                  className="fx-fissures pointer-events-none absolute inset-0 z-10 h-full w-full"
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
                <div className="fx-eclair pointer-events-none absolute inset-0 z-10" aria-hidden="true" />
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
                  {rang ? lettreAffichee : "?"}
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

          {/* Devant la carte */}
          {r?.nbEclats > 0 && (
            <div className="pointer-events-none absolute left-1/2 top-1/2 z-20" aria-hidden="true">
              {ECLATS.slice(0, r.nbEclats).map((e, i) => (
                <span
                  key={i}
                  className={`fx-eclat-piece absolute ${e.clair ? "fx-clair" : ""}`}
                  style={{
                    "--angle": `${e.angle}deg`,
                    "--distance": `${e.distance}px`,
                    "--tour": `${e.tour}deg`,
                    "--retard": `${e.delai}ms`,
                    width: e.largeur,
                    height: e.hauteur,
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {a("etoiles") &&
        ETOILES.map((e, i) => (
          <span
            key={i}
            className="fx-etoile pointer-events-none absolute z-20"
            style={{ left: e.x, top: e.y, "--retard": `${(i % 5) * 70}ms` }}
            aria-hidden="true"
          />
        ))}
      {a("pluie") && (
        <div className="fx-pluie pointer-events-none absolute inset-x-[-10%] -top-10 bottom-0 z-20" aria-hidden="true">
          {GOUTTES.map((g, i) => (
            <span
              key={i}
              className="fx-goutte absolute top-0"
              style={{ left: g.x, width: g.taille, "--retard": `${g.delai}ms`, "--chute": `${g.duree}ms` }}
            />
          ))}
        </div>
      )}

      <style>{`
        .carte-rang-scene { perspective: 1600px; }
        .carte-rang {
          padding: 1px;
          transform-style: preserve-3d;
          transform: rotateY(calc(var(--mx) * 8deg)) rotateX(calc(var(--my) * -8deg));
          background: linear-gradient(125deg, var(--c1), var(--c2), var(--c3), var(--c2));
          box-shadow: 0 30px 60px -30px rgba(0,0,0,0.9), 0 0 50px -28px var(--lueur);
          will-change: transform;
          touch-action: pan-y;
          -webkit-tap-highlight-color: transparent;
        }
        /* Contenu décollé d'un pixel du fond : sur le même plan, Safari ne
           savait plus lequel afficher devant quand la carte s'inclinait, et
           les infos disparaissaient. Dos caché : pendant un tour, on voit le
           métal du dos de la carte. */
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

        /* Film et reflet : de grandes couches qui glissent (transform) au lieu
           de dégradés redessinés à chaque image. */
        .carte-rang-film {
          inset: -60%;
          background: repeating-linear-gradient(115deg,
            transparent 0%, var(--f1) 4%, rgba(255,255,255,0.35) 7.5%, var(--f2) 11%, transparent 15%);
          transform: translate3d(calc(var(--mx) * 14%), calc(var(--my) * 14%), 0);
          mix-blend-mode: color-dodge;
          opacity: 0.13;
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
        }
        [data-finition="brosse"] .carte-rang-reflet { opacity: 0.4; }
        /* Pas de filtre sur la lettre : recalculé à chaque image d'un
           mouvement 3D, c'était la principale cause de saccades. */
        .carte-rang-lettre { transform: translate3d(calc(var(--mx) * 6px), calc(var(--my) * 6px), 0); }
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

        /* ── Badge ─────────────────────────────────────────────────────── */
        .carte-rang-badge {
          transform: translate(-50%, -50%);
          box-shadow: 0 0 40px -6px var(--lueur);
          animation: badge-entree 0.7s calc(var(--atterrissage, 900ms) + 100ms) cubic-bezier(0.34, 1.56, 0.64, 1) both;
        }
        .carte-rang-badge.badge-niveau { animation: badge-entree 0.6s 1s cubic-bezier(0.34, 1.9, 0.64, 1) both; }
        .carte-rang-badge.badge-sortie { animation: badge-sortie 0.38s cubic-bezier(0.4, 0, 1, 1) both; }
        @keyframes badge-entree {
          from { opacity: 0; transform: translate(-50%, -10%) scale(0.8); }
          to { opacity: 1; transform: translate(-50%, -50%) scale(1); }
        }
        @keyframes badge-sortie {
          from { opacity: 1; transform: translate(-50%, -50%) scale(1); }
          to { opacity: 0; transform: translate(-50%, -80%) scale(0.92); }
        }

        /* ── Le tour (base commune à tous les paliers) ──────────────────
           Élan en arrière, rotation qui bascule légèrement d'avant en
           arrière, atterrissage avec un petit dépassement. 3D modérée :
           perspective longue, pas de déplacement en profondeur. */
        .fete-tour {
          will-change: transform;
          animation: tour var(--duree) var(--prelude) both;
        }
        @keyframes tour {
          0% { transform: rotateY(0deg) rotateX(0deg) scale(1); animation-timing-function: cubic-bezier(0.33, 0, 0.5, 1); }
          10% { transform: rotateY(-16deg) rotateX(4deg) scale(0.985); animation-timing-function: cubic-bezier(0.5, 0, 0.25, 1); }
          50% { transform: rotateY(calc(var(--tours) * 0.55)) rotateX(-6deg) scale(var(--avance)); animation-timing-function: cubic-bezier(0.25, 0, 0.25, 1); }
          86% { transform: rotateY(calc(var(--tours) + 7deg)) rotateX(2deg) scale(1); animation-timing-function: cubic-bezier(0.3, 0, 0.3, 1); }
          100% { transform: rotateY(var(--tours)) rotateX(0deg) scale(1); }
        }
        /* Pendant le tour, ni infos ni couches coûteuses : la face est une
           plaque de métal, le dos aussi. */
        .fete-tour .carte-rang-film, .fete-tour .carte-rang-reflet, .fete-tour .carte-rang-etincelle { display: none; }
        .fete-tour .carte-rang-info { animation: info-tour var(--duree) var(--prelude) both; }
        @keyframes info-tour {
          0% { opacity: 1; } 7% { opacity: 0; } 84% { opacity: 0; } 100% { opacity: 1; }
        }
        .fx-plaque {
          background:
            repeating-linear-gradient(90deg, rgba(255,255,255,0.05) 0 1px, transparent 1px 3px),
            linear-gradient(125deg, var(--c3), var(--c2) 45%, var(--c1) 60%, var(--c3));
          opacity: 0;
          animation: plaque var(--duree) var(--prelude) both;
        }
        @keyframes plaque {
          0% { opacity: 0; } 7% { opacity: 1; } 84% { opacity: 1; } 100% { opacity: 0; }
        }

        /* ── Effets ajoutés palier par palier ────────────────────────── */
        .fx-eclat {
          background: linear-gradient(105deg, transparent 32%, rgba(255,255,255,0.4) 48%, var(--f1) 52%, transparent 68%);
          transform: translateX(-130%);
          animation: eclat 1.1s var(--atterrissage) cubic-bezier(0.4, 0, 0.2, 1) both;
        }
        @keyframes eclat { to { transform: translateX(130%); } }

        /* Lueur pleine (et non une ombre portée autour de la carte : son
           intérieur restait sombre, on voyait un rectangle noir pendant le tour). */
        .fx-aura {
          inset: -18% !important;
          border-radius: 50%;
          background: radial-gradient(closest-side, var(--lueur), transparent);
          opacity: 0;
          animation: aura calc(var(--duree) + 600ms) var(--prelude) cubic-bezier(0.22, 1, 0.36, 1) both;
        }
        @keyframes aura {
          0% { opacity: 0; transform: scale(0.94); }
          45% { opacity: 1; transform: scale(1.02); }
          100% { opacity: 0; transform: scale(1.06); }
        }

        .fx-etoile {
          width: 12px; height: 12px; margin: -6px 0 0 -6px; background: var(--l1);
          clip-path: polygon(50% 0,60% 40%,100% 50%,60% 60%,50% 100%,40% 60%,0 50%,40% 40%);
          opacity: 0;
          animation: etoile 0.9s calc(var(--atterrissage) + var(--retard)) cubic-bezier(0.34, 1.56, 0.64, 1) both;
        }
        @keyframes etoile {
          0% { opacity: 0; transform: scale(0) rotate(0deg); }
          45% { opacity: 1; transform: scale(1.2) rotate(60deg); }
          100% { opacity: 0; transform: scale(0.4) rotate(120deg); }
        }

        .fx-eclat-piece {
          left: 0; top: 0; border-radius: 1px;
          background: linear-gradient(135deg, var(--l1), var(--l2));
          opacity: 0;
          animation: eclat-vol 1.3s calc(var(--atterrissage) + var(--retard)) cubic-bezier(0.12, 0.8, 0.3, 1) both;
        }
        .fx-eclat-piece.fx-clair { background: #fff; }
        @keyframes eclat-vol {
          0% { opacity: 0; transform: rotate(var(--angle)) translateX(8px) rotate(0deg) scale(1); }
          2% { opacity: 1; }
          70% { opacity: 1; }
          100% { opacity: 0; transform: rotate(var(--angle)) translateX(var(--distance)) rotate(var(--tour)) scale(0.4); }
        }

        .fx-onde {
          border: 1.5px solid var(--l1);
          opacity: 0;
          animation: onde 1.3s var(--atterrissage) cubic-bezier(0.16, 1, 0.3, 1) both;
        }
        .fx-onde-2 { animation-delay: calc(var(--atterrissage) + 220ms); border-width: 1px; }
        /* Première image à opacité nulle : pendant son délai, l'animation
           applique sa première image, et un cadre restait visible tout le tour. */
        @keyframes onde {
          0% { opacity: 0; transform: scale(1); }
          2% { opacity: 0.9; transform: scale(1); }
          100% { opacity: 0; transform: scale(1.35); }
        }

        .fx-rayons {
          width: 180%; aspect-ratio: 1; margin: -90% 0 0 -90%;
          background: repeating-conic-gradient(from 0deg, var(--lueur) 0deg 5deg, transparent 5deg 22deg);
          -webkit-mask-image: radial-gradient(circle, #000 15%, transparent 62%);
          mask-image: radial-gradient(circle, #000 15%, transparent 62%);
          opacity: 0;
          animation: rayons calc(var(--duree) + 1200ms) var(--prelude) ease-out both;
        }
        @keyframes rayons {
          0% { opacity: 0; transform: rotate(0deg) scale(0.8); }
          30% { opacity: 1; }
          100% { opacity: 0; transform: rotate(70deg) scale(1.05); }
        }

        .fx-fissures polyline {
          fill: none; stroke: #fff; stroke-width: 0.6; vector-effect: non-scaling-stroke;
          stroke-dasharray: 160; stroke-dashoffset: 160;
          animation: fissure 1.05s cubic-bezier(0.5, 0, 0.9, 0.5) both, fissure-fin 0.35s 1.1s ease-out both;
        }
        @keyframes fissure { to { stroke-dashoffset: 0; } }
        @keyframes fissure-fin { to { opacity: 0; } }
        .fx-eclair {
          background: radial-gradient(circle at 50% 48%, #fff, var(--f1) 40%, transparent 75%);
          opacity: 0;
          animation: eclair 0.8s 1.05s ease-out both;
        }
        @keyframes eclair { 0% { opacity: 0; } 15% { opacity: 1; } 100% { opacity: 0; } }

        .fx-spectre {
          background: linear-gradient(110deg, transparent 20%, rgba(143,227,255,0.7) 38%, rgba(228,236,243,0.8) 50%, rgba(185,164,255,0.7) 62%, transparent 80%);
          background-size: 100% 100%;
          mix-blend-mode: screen;
          transform: translateX(-100%);
          animation: spectre var(--duree) var(--prelude) linear both;
        }
        @keyframes spectre { to { transform: translateX(100%); } }

        .fx-goutte {
          height: 34px; border-radius: 2px;
          background: linear-gradient(180deg, transparent, var(--l1));
          opacity: 0;
          animation: chute var(--chute) calc(var(--atterrissage) + var(--retard)) cubic-bezier(0.4, 0, 1, 1) both;
        }
        @keyframes chute {
          0% { opacity: 0; transform: translateY(-20px); }
          15% { opacity: 0.9; }
          100% { opacity: 0; transform: translateY(380px); }
        }

        /* ── Niveau (habitudes) : la barre déborde, le badge rebondit ── */
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

        /* Pas de version « animations réduites » : décision de l'utilisateur
           (12/11/2026). Son Windows a les effets d'animation désactivés, et la
           version en fondus, sans rotation, ressemblait à un bug. Appli
           personnelle, mono-utilisateur : la carte tourne toujours. */
      `}</style>
    </div>
  );
}
