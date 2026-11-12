"use client";

import Link from "next/link";
import PageHeader from "@/components/PageHeader";
import { MATERIAUX, apparenceRang, variablesMateriau } from "@/lib/materiaux";
import "./carte-rang.css";

// Parcours : l'histoire de la progression (voir lib/parcours). Un résumé, le
// prochain cap, puis une frise du plus récent au plus ancien. Refait le
// 12/11/2026 : l'ancienne page recopiait l'accueil en plein écran.

const TYPES = {
  rang: { label: "Rang", couleur: "var(--c2)" },
  scan: { label: "Scan", couleur: "#8fe3ff" },
  niveau: { label: "Niveau", couleur: "#8fe3ff" },
  serie: { label: "Série", couleur: "#9ff0c4" },
  record: { label: "Record", couleur: "#fcd38a" },
  debut: { label: "Départ", couleur: "#8b93a3" },
};

function dateLongue(d) {
  return new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Paris" });
}

function moisAnnee(d) {
  const t = new Date(d).toLocaleDateString("fr-FR", { month: "long", year: "numeric", timeZone: "Europe/Paris" });
  return t.charAt(0).toUpperCase() + t.slice(1);
}

function PastilleRang({ label, taille = "md" }) {
  const { materiau } = apparenceRang(label);
  const grand = taille === "lg";
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-xl p-px ${grand ? "h-14 w-14" : "h-9 w-9"}`}
      style={{ ...variablesMateriau(materiau), background: "linear-gradient(125deg, var(--c1), var(--c2), var(--c3))" }}
    >
      <span className="flex h-full w-full items-center justify-center rounded-[11px] bg-[#06080c]">
        <span className={`carte-rang-texte-matiere font-semibold leading-none tracking-[-0.04em] ${grand ? "text-2xl" : "text-sm"}`}>
          {label}
        </span>
      </span>
    </span>
  );
}

function Chiffre({ valeur, legende }) {
  return (
    <div className="verre rounded-2xl p-4">
      <div className="tabular text-2xl font-semibold leading-none tracking-tight">{valeur}</div>
      <div className="mt-1.5 text-[11px] text-foreground-muted">{legende}</div>
    </div>
  );
}

export default function ParcoursClient({ parcours }) {
  const { resume, cap, evenements } = parcours;

  if (!resume.scans && !resume.semaines) {
    return (
      <div className="mx-auto max-w-3xl px-5 py-8 sm:px-10 sm:py-10">
        <PageHeader kicker="Récit" title="Ton parcours" subtitle="Ton histoire commence au premier scan ou au premier bilan de semaine." />
        <Link href="/scan" className="mt-6 inline-flex h-11 items-center rounded-full bg-white px-5 text-sm font-semibold text-[#06080c]">
          Importer mon rapport →
        </Link>
      </div>
    );
  }

  // Frise groupée par mois.
  const groupes = [];
  for (const e of evenements) {
    const mois = moisAnnee(e.date);
    if (groupes.at(-1)?.mois !== mois) groupes.push({ mois, items: [] });
    groupes.at(-1).items.push(e);
  }

  const rang = cap.rang;
  const niveau = cap.niveau;

  return (
    <div className="mx-auto max-w-3xl px-5 py-8 sm:px-10 sm:py-10">
      <PageHeader
        kicker="Récit"
        title="Ton parcours"
        subtitle={resume.depuis ? `Depuis le ${dateLongue(resume.depuis)}.` : undefined}
      />

      {/* Résumé */}
      <section className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Chiffre valeur={resume.scans} legende={resume.scans > 1 ? "scans" : "scan"} />
        <Chiffre valeur={resume.semaines} legende="semaines suivies" />
        <Chiffre valeur={`Niv. ${resume.niveau}`} legende={`${resume.xp.toLocaleString("fr-FR")} XP`} />
        <Chiffre valeur={resume.meilleureSerie || "—"} legende="meilleure série (semaines)" />
      </section>

      {/* Prochain cap */}
      <section className="verre mt-3 rounded-[22px] p-5 sm:p-6">
        <h2 className="etiquette">Prochain cap</h2>
        <ul className="mt-3 space-y-3">
          {rang && (
            <li className="flex items-center gap-3">
              <PastilleRang label={rang.label} />
              <div className="min-w-0 flex-1 text-sm">
                {rang.palierSuivant ? (
                  <>
                    <span className="font-semibold">{rang.pointsAvantPalierSuivant} pt{rang.pointsAvantPalierSuivant > 1 ? "s" : ""}</span>{" "}
                    <span className="text-foreground-muted">au score pour passer {rang.palierSuivant}</span>
                    {rang.palierSuivant[0] !== rang.label[0] && (
                      <span className="text-foreground-muted">
                        {" "}— et la carte en {MATERIAUX[apparenceRang(rang.palierSuivant).materiau].nom.toLowerCase()}
                      </span>
                    )}
                  </>
                ) : (
                  <span className="font-semibold">Rang maximum atteint.</span>
                )}
              </div>
            </li>
          )}
          <li className="flex items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-accent/40 text-[11px] font-semibold text-accent">
              {niveau.niveau + 1}
            </span>
            <div className="min-w-0 flex-1 text-sm">
              <span className="font-semibold">{(niveau.xpPourSuivant - niveau.xpDansNiveau).toLocaleString("fr-FR")} XP</span>{" "}
              <span className="text-foreground-muted">avant le niveau {niveau.niveau + 1}</span>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/[0.07]">
                <div className="h-full rounded-full bg-accent" style={{ width: `${Math.max(3, niveau.pourcent)}%` }} />
              </div>
            </div>
          </li>
          {cap.faible && (
            <li className="flex items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-amber-300/30 text-amber-200" aria-hidden="true">
                !
              </span>
              <div className="min-w-0 flex-1 text-sm">
                <span className="font-semibold">{cap.faible.label}</span>
                <span className="text-foreground-muted"> : {cap.faible.texte}</span>
              </div>
            </li>
          )}
        </ul>
      </section>

      {/* Frise */}
      <section className="mt-10">
        <h2 className="etiquette">L&apos;histoire</h2>
        <div className="mt-4 space-y-8">
          {groupes.map((g) => (
            <div key={g.mois}>
              <h3 className="titre text-base text-foreground-muted">{g.mois}</h3>
              <ol className="relative mt-3 space-y-3 border-l border-white/10 pl-5">
                {g.items.map((e, i) => {
                  const t = TYPES[e.type];
                  const matiere = e.rang ? variablesMateriau(apparenceRang(e.rang).materiau) : {};
                  return (
                    <li key={`${e.type}-${i}`} className="relative">
                      <span
                        className="absolute -left-[25px] top-4 h-2.5 w-2.5 rounded-full border-2 border-[#06080c]"
                        style={{ ...matiere, background: e.type === "rang" ? "var(--c2)" : t.couleur }}
                        aria-hidden="true"
                      />
                      <div
                        className={`verre flex items-start gap-3 rounded-2xl p-4 ${e.type === "rang" ? "border-[color:var(--c3)]" : ""}`}
                        style={matiere}
                      >
                        {e.rang && (e.type === "rang" || e.type === "scan") && <PastilleRang label={e.rang} taille={e.type === "rang" ? "lg" : "md"} />}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-baseline justify-between gap-2">
                            <span className="text-sm font-semibold">{e.titre}</span>
                            <span className="shrink-0 text-[10.5px] font-semibold uppercase tracking-wider" style={{ color: e.type === "rang" ? "var(--c2)" : t.couleur }}>
                              {t.label}
                            </span>
                          </div>
                          <p className="mt-0.5 text-[12.5px] leading-snug text-foreground-muted">{e.texte}</p>
                          {e.ecarts?.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              {e.ecarts.map((x) => (
                                <span key={x} className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[11px] font-medium">
                                  {x}
                                </span>
                              ))}
                            </div>
                          )}
                          <div className="mt-1.5 text-[11px] text-foreground-faint">{dateLongue(e.date)}</div>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ol>
            </div>
          ))}
        </div>
      </section>

      <div className="mt-10 flex flex-wrap gap-3">
        <Link href="/rangs" className="inline-flex h-11 items-center rounded-full border border-white/15 px-5 text-sm font-semibold transition hover:border-white/30">
          Mes rangs →
        </Link>
        <Link href="/historique" className="inline-flex h-11 items-center rounded-full border border-white/15 px-5 text-sm font-semibold transition hover:border-white/30">
          Historique des scans →
        </Link>
      </div>
    </div>
  );
}
