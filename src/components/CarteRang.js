"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ORDRE_RANGS } from "@/lib/rang";
import { MATERIAUX, apparenceRang, variablesMateriau } from "@/lib/materiaux";
import {
  BRAISES,
  ECLATS,
  ETINCELLES,
  ETOILES,
  GOUTTES,
  POUSSIERE,
  reglagesFete,
  scintillementsRepos,
} from "@/lib/celebrations";
import "./carte-rang.css";

// Carte de rang, pièce maîtresse du tableau de bord.
//
// MATIÈRE. La lettre fixe le matériau (graphite, acier, bronze, or, prisme),
// le signe fixe la finition (brossé, poli, étincelant) : voir lib/materiaux.
// Les couleurs passent par des variables CSS (--c1… cadre, --l1… lettre,
// --f1/--f2 film, --lueur) : changer de matériau = changer ces variables.
//
// INCLINAISON. Au repos la carte se balance doucement ; elle suit la souris,
// le doigt, ou le gyroscope (iOS, après un toucher). La boucle écrit
// directement la transformation de quatre éléments (carte, film, reflet,
// lettre), seulement quand elle change. Surtout PAS de variables CSS : une
// variable modifiée sur la carte est héritée par tout son contenu, et Safari
// (WebKit) recalculait alors toute la carte à chaque image — mesuré à 107 ms
// par image au lieu de 16 dans le moteur de Safari (12/11/2026).
//
// CÉLÉBRATION D'UNE MONTÉE DE RANG. Une signature par lettre, enrichie par le
// signe (voir lib/celebrations) : D impact, C lame, B forge, A couronne,
// S ascension. Pendant le tour, la carte devient une plaque de métal pleine
// (sans les infos) et la nouvelle matière apparaît quand elle est de dos.
// Le passage de niveau (habitudes) a sa propre animation, sans tour : la
// barre d'XP se remplit, déborde, et le badge rebondit. Styles : carte-rang.css.
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
  return /^[aeiouy]/.test(nom) ? `Passage à l'${nom}` : `Passage au ${nom}`;
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

// Programme une célébration : changement de matière au bon moment, effets,
// puis retour au calme (le badge reste jusqu'au toucher). Renvoie les
// minuteurs, à annuler si la carte disparaît entre-temps.
function programmerFete(message, { lettre, setFete, setRangTransitoire, apresCalme }) {
  const minuteurs = [];
  const plus = (ms, f) => minuteurs.push(setTimeout(f, ms));
  const DEPART = 300;
  plus(0, () => setFete(null));
  if (message.type === "rang") {
    const r = reglagesFete(message.cible);
    if (message.avant) plus(0, () => setRangTransitoire(message.avant));
    plus(DEPART, () => setFete({ ...message, reglages: r }));
    plus(DEPART + r.bascule, () => setRangTransitoire(message.cible === lettre ? null : message.cible));
    plus(DEPART + r.fin, () => {
      setFete((f) => (f ? { ...f, calme: true } : f));
      if (message.cible !== lettre) setRangTransitoire(null);
      apresCalme?.();
    });
  } else {
    plus(DEPART, () => setFete(message));
    plus(DEPART + 2600, () => {
      setFete((f) => (f ? { ...f, calme: true } : f));
      apresCalme?.();
    });
  }
  return minuteurs;
}

// `demo` (page Collection des rangs) : { cible: "B+", cle } rejoue la montée
// vers ce rang à chaque nouvelle clé, sans rien lire ni écrire dans la mémoire
// de l'appareil (dernier rang vu), et sans célébration automatique.
export default function CarteRang({ rang, jours, xp, demo = null }) {
  const carteRef = useRef(null);
  const filmRef = useRef(null);
  const refletRef = useRef(null);
  const lettreRef = useRef(null);
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

  const modeDemo = Boolean(demo);
  const demoCle = demo?.cle ?? null;
  const demoCible = demo?.cible ?? null;

  useEffect(() => {
    if (modeDemo) return undefined;
    const message = verdictCelebration(lettre, niveau);
    if (!message) return undefined;
    const minuteurs = programmerFete(message, {
      lettre,
      setFete,
      setRangTransitoire,
      apresCalme: () => verdictsMontres.add(`${lettre}|${niveau}`),
    });
    return () => minuteurs.forEach(clearTimeout);
  }, [lettre, niveau, modeDemo]);

  useEffect(() => {
    if (!demoCible || demoCle == null) return undefined;
    const i = ORDRE_RANGS.indexOf(demoCible);
    const avant = i > 0 ? ORDRE_RANGS[i - 1] : null;
    const message = { type: "rang", titre: titreMontee(avant, demoCible), valeur: demoCible, cible: demoCible, avant };
    const minuteurs = programmerFete(message, { lettre: demoCible, setFete, setRangTransitoire });
    return () => minuteurs.forEach(clearTimeout);
  }, [demoCle, demoCible]);

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
        carte.style.transform = `rotateY(${(nx * 8).toFixed(2)}deg) rotateX(${(-ny * 8).toFixed(2)}deg)`;
        if (filmRef.current) filmRef.current.style.transform = `translate3d(${(nx * 12).toFixed(2)}%, ${(ny * 12).toFixed(2)}%, 0)`;
        if (refletRef.current) refletRef.current.style.transform = `translate3d(${(nx * 15).toFixed(2)}%, ${(ny * 15).toFixed(2)}%, 0)`;
        if (lettreRef.current) lettreRef.current.style.transform = `translate3d(${(nx * 6).toFixed(1)}px, ${(ny * 6).toFixed(1)}px, 0)`;
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
  const fx = r?.fx ?? {};
  const scintillements = rang ? scintillementsRepos(materiau, finition) : [];

  // Variables de minutage, lues par les animations CSS.
  const tempo = r
    ? {
        "--prelude": `${r.prelude}ms`,
        "--duree": `${r.duree}ms`,
        "--tours": `${r.tours}deg`,
        "--atterrissage": `${r.atterrissage}ms`,
      }
    : {};

  const scan =
    jours == null ? null : jours === 0 ? "Scan d'aujourd'hui" : jours === 1 ? "Scan d'hier" : `Scan il y a ${jours} j`;

  return (
    <div
      className={`carte-rang-scene relative h-full ${type ? "z-20" : ""}`}
      data-materiau={materiau}
      data-finition={finition}
      data-info={r?.info}
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
      {fx.rayons && <div className="fx-rayons pointer-events-none absolute left-1/2 top-1/2" aria-hidden="true" />}
      {fx.aura && <div className="fx-aura pointer-events-none absolute inset-0 rounded-[28px]" aria-hidden="true" />}
      {fx.onde && <div className="fx-onde pointer-events-none absolute inset-0 rounded-[28px]" aria-hidden="true" />}
      {fx.ondeDouble && <div className="fx-onde fx-onde-2 pointer-events-none absolute inset-0 rounded-[28px]" aria-hidden="true" />}
      {fx.grandeOnde && <div className="fx-grande-onde pointer-events-none absolute inset-0 rounded-[28px]" aria-hidden="true" />}

      <div className={`h-full ${r ? `fete-tour tour-${r.famille}` : ""}`} style={{ transformStyle: "preserve-3d" }}>
        <div
          ref={carteRef}
          className="carte-rang relative flex h-full min-h-[260px] flex-col rounded-[28px]"
          onPointerMove={(e) => e.pointerType === "mouse" && suivre(e.clientX, e.clientY)}
          onPointerLeave={(e) => e.pointerType === "mouse" && relacher()}
          onTouchMove={(e) => suivre(e.touches[0].clientX, e.touches[0].clientY)}
          onTouchEnd={relacher}
          onClick={activerGyroscope}
        >
          <div className="carte-rang-face relative flex flex-1 flex-col overflow-hidden rounded-[27px] bg-[#06080c] p-5 sm:p-6">
            <div className="carte-rang-texture pointer-events-none absolute inset-0" />
            <div ref={filmRef} className="carte-rang-film pointer-events-none absolute inset-0" />
            <div ref={refletRef} className="carte-rang-reflet pointer-events-none absolute inset-0" />
            {scintillements.map((e, i) => (
              <span
                key={i}
                className={`scint scint-${e.forme} pointer-events-none absolute`}
                style={{ left: e.x, top: e.y, animationDelay: e.retard }}
                aria-hidden="true"
              />
            ))}

            {/* Pendant le tour : la face devient une plaque de métal pleine. */}
            {r && (
              <div className="fx-plaque pointer-events-none absolute inset-0 z-10" aria-hidden="true">
                {fx.spectre && <div className="fx-spectre absolute inset-0" />}
              </div>
            )}
            {fx.chaleur && <div className="fx-chaleur pointer-events-none absolute inset-0 z-10 rounded-[27px]" aria-hidden="true" />}
            {fx.trait && <div className="fx-trait pointer-events-none absolute inset-0 z-10" aria-hidden="true" />}
            {fx.fissures && (
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
              <span
                ref={lettreRef}
                className="carte-rang-lettre carte-rang-texte-matiere tabular select-none text-[104px] font-semibold leading-none tracking-[-0.06em] sm:text-[128px]"
              >
                {rang ? lettreAffichee : "?"}
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

              {modeDemo ? null : rang ? (
                <div className="-mb-2 flex items-center justify-between gap-3">
                  <Link
                    href="/journal"
                    className="inline-flex h-11 items-center text-xs font-medium text-foreground-muted transition hover:text-accent"
                  >
                    Gagner des XP →
                  </Link>
                  <Link
                    href="/rangs"
                    className="inline-flex h-11 items-center text-xs font-medium text-foreground-muted transition hover:text-accent"
                  >
                    Mes rangs →
                  </Link>
                </div>
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

          {/* Devant la carte, partant de son centre */}
          {(fx.etincelles > 0 || fx.paillettes > 0 || fx.eclatsPrisme > 0) && (
            <div className="pointer-events-none absolute left-1/2 top-1/2 z-20" aria-hidden="true">
              {ETINCELLES.slice(0, fx.etincelles).map((e, i) => (
                <span
                  key={`e${i}`}
                  className="fx-etincelle absolute"
                  style={{ "--angle": `${e.angle}deg`, "--distance": `${e.distance}px`, "--retard": `${e.retard}ms` }}
                />
              ))}
              {ECLATS.slice(0, fx.paillettes || fx.eclatsPrisme).map((e, i) => (
                <span
                  key={`p${i}`}
                  className={`fx-eclat-piece absolute ${fx.eclatsPrisme ? "fx-eclat-prisme" : e.clair ? "fx-clair" : ""}`}
                  style={{
                    "--angle": `${e.angle}deg`,
                    "--distance": `${e.distance}px`,
                    "--tour": `${e.tour}deg`,
                    "--retard": `${e.retard}ms`,
                    width: e.largeur,
                    height: e.hauteur,
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Autour de la carte */}
      {POUSSIERE.slice(0, fx.poussiere ?? 0).map((p, i) => (
        <span
          key={`d${i}`}
          className="fx-poussiere pointer-events-none absolute z-20"
          style={{ width: p.taille * 3, height: p.taille * 2, "--dx": `${p.dx}px`, "--dy": `${p.dy}px`, "--retard": `${p.retard}ms` }}
          aria-hidden="true"
        />
      ))}
      {BRAISES.slice(0, fx.braises ?? 0).map((b, i) => (
        <span
          key={`b${i}`}
          className="fx-braise pointer-events-none absolute z-20"
          style={{
            left: b.x,
            width: b.taille,
            height: b.taille,
            "--dx": `${b.dx}px`,
            "--hauteur": `${b.hauteur}px`,
            "--retard": `${b.retard}ms`,
            "--duree-p": `${b.duree}ms`,
          }}
          aria-hidden="true"
        />
      ))}
      {ETOILES.slice(0, fx.etoiles ?? 0).map((e, i) => (
        <span
          key={`s${i}`}
          className="fx-etoile pointer-events-none absolute z-20"
          style={{ left: e.x, top: e.y, width: e.taille, height: e.taille, "--retard": `${e.retard}ms` }}
          aria-hidden="true"
        />
      ))}
      {fx.pluie > 0 && (
        <div className="pointer-events-none absolute inset-x-[-10%] -top-10 bottom-0 z-20" aria-hidden="true">
          {GOUTTES.slice(0, fx.pluie).map((g, i) => (
            <span
              key={i}
              className="fx-goutte absolute top-0"
              style={{ left: g.x, width: g.taille, "--retard": `${g.retard}ms`, "--chute": `${g.duree}ms` }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
