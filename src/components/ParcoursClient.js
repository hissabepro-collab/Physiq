"use client";

import { useRef } from "react";
import Link from "next/link";
import { motion, useScroll, useTransform, useReducedMotion } from "framer-motion";
import HoloRing from "@/components/HoloRing";
import EvolutionChart from "@/components/EvolutionChart";
import RadarStats from "@/components/RadarStats";
import { IconArrowRight } from "@/components/icons";

const CHAPITRES = ["Rang", "Chiffres", "Évolution", "Profil", "Semaine", "Accès"];

/**
 * Un chapitre occupe tout l'écran et reste collé pendant que le défilement
 * le traverse : c'est ce "point fixe" qui donne la sensation d'avancer dans
 * un parcours plutôt que de faire défiler une page.
 */
function Chapitre({ children, index, reduit }) {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });

  const opacity = useTransform(scrollYProgress, [0, 0.28, 0.72, 1], [0, 1, 1, 0]);
  const scale = useTransform(scrollYProgress, [0, 0.28, 0.72, 1], [0.9, 1, 1, 0.94]);
  const y = useTransform(scrollYProgress, [0, 0.5, 1], [70, 0, -70]);

  return (
    <section ref={ref} className="sticky top-0 flex min-h-screen items-center justify-center px-5 py-16">
      {reduit ? (
        <div className="w-full max-w-3xl">{children}</div>
      ) : (
        <motion.div style={{ opacity, scale, y }} className="w-full max-w-3xl">
          {children}
        </motion.div>
      )}
    </section>
  );
}

function TitreChapitre({ numero, titre }) {
  return (
    <div className="mb-6 flex items-center gap-3">
      <span className="font-display text-xs font-bold text-accent">{String(numero).padStart(2, "0")}</span>
      <span className="h-px flex-1 bg-gradient-to-r from-accent/60 to-transparent" />
      <span className="text-[11px] font-semibold uppercase tracking-[0.25em] text-foreground-muted">{titre}</span>
    </div>
  );
}

function format(n, decimales = 1) {
  if (n == null) return "—";
  return n.toLocaleString("fr-FR", { maximumFractionDigits: decimales });
}

export default function ParcoursClient({
  prenom,
  derniere,
  precedente,
  mesures,
  rang,
  axesProfil,
  bilan,
  serie,
  libelleSemaine,
}) {
  const reduit = useReducedMotion();
  const { scrollYProgress } = useScroll();
  const progression = useTransform(scrollYProgress, [0, 1], ["0%", "100%"]);

  if (!derniere) {
    return (
      <div className="flex min-h-screen items-center justify-center px-6 text-center text-sm text-foreground-muted">
        Ajoute un premier scan pour découvrir ton parcours.
      </div>
    );
  }

  const recentes = mesures.slice(-8);
  const series = [
    {
      label: "Masse musculaire",
      color: "#4de8ff",
      points: recentes.filter((m) => m.masseMusculaireKg != null).map((m) => ({ date: new Date(m.dateScan), value: m.masseMusculaireKg })),
    },
    {
      label: "Masse grasse",
      color: "#f0a38f",
      dashed: true,
      points: recentes.filter((m) => m.masseGrasseKg != null).map((m) => ({ date: new Date(m.dateScan), value: m.masseGrasseKg })),
    },
  ];

  const stats = [
    { label: "Poids", valeur: derniere.poidsKg, unite: "kg", avant: precedente?.poidsKg, inverse: true },
    { label: "Masse grasse", valeur: derniere.bfpPct, unite: "%", avant: precedente?.bfpPct, inverse: true },
    { label: "Masse musculaire", valeur: derniere.masseMusculaireKg, unite: "kg", avant: precedente?.masseMusculaireKg, inverse: false },
    { label: "IMC", valeur: derniere.imc, unite: "", avant: precedente?.imc, inverse: true },
  ];

  return (
    <div className="relative">
      {/* Barre de progression du parcours */}
      <div className="fixed left-0 right-0 top-0 z-40 h-[3px] bg-black/30">
        <motion.div
          className="h-full bg-accent shadow-[0_0_10px_var(--accent)]"
          style={{ width: reduit ? "0%" : progression }}
        />
      </div>

      <Link
        href="/"
        className="fixed right-4 top-5 z-40 rounded-full border border-border-soft bg-background-soft/80 px-4 py-2 text-xs font-semibold backdrop-blur hover:border-accent/60"
      >
        Quitter le parcours
      </Link>

      {/* Repères des chapitres */}
      <div className="fixed left-4 top-1/2 z-40 hidden -translate-y-1/2 flex-col gap-2.5 sm:flex">
        {CHAPITRES.map((c, i) => (
          <span key={c} className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-accent/50" />
            <span className="text-[9.5px] font-semibold uppercase tracking-wider text-foreground-muted/70">{c}</span>
          </span>
        ))}
      </div>

      <Chapitre index={0} reduit={reduit}>
        <div className="flex flex-col items-center text-center">
          <HoloRing size={200} scanBeam equator />
          <p className="mt-8 text-[11px] font-semibold uppercase tracking-[0.3em] text-accent">Ton parcours, {prenom}</p>
          {rang && (
            <>
              <div className="mt-3 font-display text-7xl font-bold" style={{ textShadow: "0 0 40px rgba(77,232,255,0.5)" }}>
                {rang.label}
              </div>
              <p className="mt-2 text-sm text-foreground-muted">
                Score de composition {rang.score}/100
                {rang.palierSuivant && ` — ${rang.pointsAvantPalierSuivant} pt avant ${rang.palierSuivant}`}
              </p>
            </>
          )}
          <p className="mt-10 text-xs text-foreground-muted">Fais défiler pour avancer ↓</p>
        </div>
      </Chapitre>

      <Chapitre index={1} reduit={reduit}>
        <TitreChapitre numero={1} titre="Tes chiffres" />
        <div className="grid grid-cols-2 gap-4">
          {stats.map((s) => {
            const delta = s.valeur != null && s.avant != null ? s.valeur - s.avant : null;
            const bon = delta != null && (s.inverse ? delta < 0 : delta > 0);
            return (
              <div key={s.label} className="rounded-2xl border border-border-soft bg-background-soft/40 p-5 backdrop-blur-md">
                <div className="text-[11px] font-semibold uppercase tracking-wide text-foreground-muted">{s.label}</div>
                <div className="mt-2 font-display text-3xl font-bold sm:text-4xl">
                  {format(s.valeur)}
                  <span className="ml-1 text-base font-medium text-foreground-muted">{s.unite}</span>
                </div>
                {delta != null && Math.abs(delta) > 0.05 && (
                  <div className={`mt-2 text-xs font-bold ${bon ? "text-emerald-300" : "text-red-300"}`}>
                    {delta > 0 ? "+" : ""}
                    {format(delta)} depuis le scan précédent
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Chapitre>

      <Chapitre index={2} reduit={reduit}>
        <TitreChapitre numero={2} titre="Ton évolution" />
        <div className="rounded-2xl border border-border-soft bg-background-soft/40 p-5 backdrop-blur-md sm:p-7">
          <EvolutionChart series={series} />
          <div className="mt-3 flex gap-5 text-xs font-medium text-foreground-muted">
            <span className="flex items-center gap-1.5">
              <span className="h-[3px] w-3 rounded bg-[#4de8ff]" /> Masse musculaire
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-[3px] w-3 rounded bg-[#f0a38f]" /> Masse grasse
            </span>
          </div>
        </div>
      </Chapitre>

      {axesProfil && (
        <Chapitre index={3} reduit={reduit}>
          <TitreChapitre numero={3} titre="Ton profil" />
          <div className="rounded-2xl border border-border-soft bg-background-soft/40 p-5 backdrop-blur-md sm:p-7">
            <div className="mx-auto max-w-sm">
              <RadarStats axes={axesProfil} />
            </div>
            <ul className="mt-4 grid grid-cols-2 gap-x-6 gap-y-1.5 border-t border-border-soft pt-4">
              {axesProfil.map((a) => (
                <li key={a.label} className="flex items-baseline justify-between text-[11.5px]">
                  <span className="text-foreground-muted">{a.label}</span>
                  <span className="font-semibold">
                    {format(a.valeurReelle, 2)} {a.unite}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </Chapitre>
      )}

      <Chapitre index={4} reduit={reduit}>
        <TitreChapitre numero={4} titre="Ta semaine" />
        <div className="rounded-2xl border border-border-soft bg-background-soft/40 p-6 backdrop-blur-md sm:p-8">
          <p className="text-xs text-foreground-muted">{libelleSemaine}</p>
          {serie > 0 && (
            <p className="mt-1 font-display text-2xl font-bold text-accent" style={{ textShadow: "0 0 20px rgba(77,232,255,0.5)" }}>
              {serie} semaine{serie > 1 ? "s" : ""} d'affilée
            </p>
          )}
          <div className="mt-5 space-y-4">
            {[
              { label: "Séances", ...bilan.seances, couleur: "#4de8ff", unite: "" },
              { label: "Diète", ...bilan.diete, couleur: "#2fe6b8", unite: "" },
              { label: "Sommeil", ...bilan.sommeil, couleur: "#b69cff", unite: "h" },
            ].map((j) => (
              <div key={j.label}>
                <div className="flex items-baseline justify-between text-sm">
                  <span className="font-semibold text-foreground-muted">{j.label}</span>
                  <span className="font-display font-bold" style={j.atteint ? { color: j.couleur } : undefined}>
                    {format(j.valeur)}
                    <span className="text-foreground-muted">
                      /{j.cible}
                      {j.unite}
                    </span>
                  </span>
                </div>
                <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-black/30">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${Math.min(100, ((j.valeur ?? 0) / j.cible) * 100)}%`,
                      background: j.couleur,
                      opacity: j.atteint ? 1 : 0.55,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </Chapitre>

      <Chapitre index={5} reduit={reduit}>
        <TitreChapitre numero={5} titre="Où aller" />
        <div className="grid grid-cols-2 gap-3">
          {[
            { href: "/scan", label: "Nouveau scan" },
            { href: "/historique", label: "Historique" },
            { href: "/comparer", label: "Comparer" },
            { href: "/objectifs", label: "Objectifs" },
            { href: "/journal", label: "Journal" },
            { href: "/", label: "Tableau de bord" },
          ].map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="flex items-center justify-between rounded-xl border border-border-soft bg-background-soft/40 px-4 py-3.5 text-sm font-semibold backdrop-blur-md transition hover:border-accent/60"
            >
              {l.label}
              <IconArrowRight width={16} height={16} className="text-accent" />
            </Link>
          ))}
        </div>
      </Chapitre>

      {/* Hauteur de défilement : chaque chapitre étant collé, il faut de la
          course pour les traverser un à un. */}
      <div className="h-[40vh]" />
    </div>
  );
}
