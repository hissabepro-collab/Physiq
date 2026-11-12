"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import PageHeader from "@/components/PageHeader";
import CarteRang from "@/components/CarteRang";
import { PALIERS, ORDRE_RANGS, calculerRang } from "@/lib/rang";
import { MATERIAUX, apparenceRang, variablesMateriau } from "@/lib/materiaux";

// Collection des rangs : les 13 paliers rangés par matériau. Un rang atteint
// au moins une fois est déverrouillé : on voit sa matière et on peut rejouer
// sa célébration dans la grande carte. Les autres restent verrouillés, sans
// rien dévoiler de leur matière — seulement le score qui les ouvre.

const GROUPES = ["graphite", "acier", "bronze", "or", "prisme"].map((materiau) => ({
  materiau,
  paliers: PALIERS.filter((p) => apparenceRang(p.label).materiau === materiau),
}));

function Cadenas(props) {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" {...props}>
      <rect x="4.5" y="9" width="11" height="8" rx="2" stroke="currentColor" strokeWidth="1.6" />
      <path d="M7 9V6.5a3 3 0 0 1 6 0V9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export default function RangsClient({ meilleurScore, scoreActuel }) {
  const meilleur = calculerRang(meilleurScore);
  const indexMax = meilleur ? ORDRE_RANGS.indexOf(meilleur.label) : -1;
  const actuel = calculerRang(scoreActuel)?.label ?? null;
  const debloques = indexMax + 1;

  // Rang affiché dans la grande carte, et clé qui relance son animation.
  const [choisi, setChoisi] = useState(meilleur?.label ?? null);
  // Pas d'animation à l'arrivée sur la page (elle se jouait pendant la
  // transition de page et la faisait paraître lente) : seulement au toucher.
  const [cle, setCle] = useState(null);
  const [message, setMessage] = useState(null);
  const scene = useRef(null);

  // La grande carte est en haut : sur téléphone, on y remonte pour voir
  // l'animation qu'on vient de lancer depuis la grille.
  // Si la grande carte est hors de l'écran, on y remonte D'ABORD, puis on
  // lance l'animation : les deux en même temps faisaient saccader.
  const attente = useRef(0);
  function jouer(label) {
    setChoisi(label);
    setMessage(null);
    clearTimeout(attente.current);
    const r = scene.current?.getBoundingClientRect();
    const horsEcran = r && (r.top < 0 || r.bottom > window.innerHeight);
    if (horsEcran) scene.current.scrollIntoView({ behavior: "smooth", block: "start" });
    attente.current = setTimeout(() => setCle((c) => (c ?? 0) + 1), horsEcran ? 450 : 0);
  }

  const palierChoisi = PALIERS.find((p) => p.label === choisi);

  return (
    <div className="mx-auto max-w-4xl px-5 py-8 sm:px-10 sm:py-10">
      <PageHeader
        kicker="Collection"
        title="Tes rangs"
        subtitle={
          debloques > 0
            ? `${debloques} sur ${ORDRE_RANGS.length} débloqués. Touche un rang pour rejouer son animation.`
            : "Ton premier scan débloquera ton premier rang."
        }
      />

      {palierChoisi ? (
        <section ref={scene} className="mt-8 grid scroll-mt-6 gap-4 lg:grid-cols-[minmax(0,420px)_1fr] lg:items-center">
          <CarteRang rang={calculerRang(choisi === actuel ? scoreActuel : palierChoisi.min)} jours={null} xp={null} demo={{ cible: choisi, cle }} />
          <div>
            <p className="etiquette">{MATERIAUX[apparenceRang(choisi).materiau].nom}</p>
            <p className="titre mt-1 text-2xl">
              Rang {choisi}
              {choisi === actuel && <span className="ml-2 align-middle text-xs font-semibold text-accent">· ton rang actuel</span>}
            </p>
            <p className="mt-2 text-sm text-foreground-muted">
              De {palierChoisi.min} à {palierChoisi.max} points au score Visbody.
            </p>
            <button
              type="button"
              onClick={() => jouer(choisi)}
              className="mt-4 inline-flex h-11 items-center rounded-full border border-accent/60 bg-accent-soft px-5 text-sm font-semibold text-foreground transition hover:border-accent"
            >
              Rejouer l&apos;animation
            </button>
          </div>
        </section>
      ) : (
        <section className="verre mt-8 rounded-[22px] p-6 text-sm text-foreground-muted">
          Aucun rang débloqué pour l&apos;instant.{" "}
          <Link href="/scan" className="font-semibold text-accent">
            Importer mon rapport →
          </Link>
        </section>
      )}

      <div className="mt-10 space-y-6">
        {GROUPES.map(({ materiau, paliers }) => (
          <section key={materiau}>
            <h2 className="etiquette">{MATERIAUX[materiau].nom}</h2>
            <div className="mt-2 grid grid-cols-3 gap-2 sm:gap-3">
              {paliers.map((p) => {
                const ouvert = ORDRE_RANGS.indexOf(p.label) <= indexMax;
                const selectionne = p.label === choisi;
                if (!ouvert) {
                  return (
                    <button
                      key={p.label}
                      type="button"
                      onClick={() => setMessage(`Le rang ${p.label} s'ouvre à ${p.min} points.`)}
                      className="flex h-24 flex-col items-center justify-center gap-1 rounded-2xl border border-dashed border-white/10 bg-white/[0.015] text-foreground-faint"
                      aria-label={`Rang ${p.label} verrouillé, s'ouvre à ${p.min} points`}
                    >
                      <Cadenas width={20} height={20} />
                      <span className="text-[11px] font-medium">dès {p.min} pts</span>
                    </button>
                  );
                }
                return (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => jouer(p.label)}
                    aria-pressed={selectionne}
                    aria-label={`Rejouer l'animation du rang ${p.label}`}
                    className={`tuile-rang relative flex h-24 flex-col items-center justify-center rounded-2xl p-px ${
                      selectionne ? "tuile-rang-active" : ""
                    }`}
                    style={variablesMateriau(materiau)}
                  >
                    <span className="flex h-full w-full flex-col items-center justify-center rounded-[15px] bg-[#06080c]">
                      <span className="carte-rang-texte-matiere text-[34px] font-semibold leading-none tracking-[-0.05em]">
                        {p.label}
                      </span>
                      <span className="mt-1 text-[10px] font-medium text-foreground-muted">
                        {p.label === actuel ? "actuel" : `${p.min}–${p.max}`}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        ))}
      </div>

      {message && (
        <p role="status" className="mt-4 text-center text-sm text-foreground-muted">
          {message}
        </p>
      )}

      <style>{`
        .tuile-rang { background: linear-gradient(125deg, var(--c1), var(--c2), var(--c3)); opacity: 0.85; transition: opacity 0.2s, box-shadow 0.2s; }
        .tuile-rang:hover { opacity: 1; }
        .tuile-rang-active { opacity: 1; box-shadow: 0 0 24px -6px var(--lueur); }
        .tuile-rang .carte-rang-texte-matiere {
          display: inline-block;
          background-image: linear-gradient(100deg, var(--l1), var(--l2), var(--l3));
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
        }
      `}</style>
    </div>
  );
}
