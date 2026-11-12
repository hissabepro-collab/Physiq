import Link from "next/link";
import { prisma } from "@/lib/db";
import { calculerRang } from "@/lib/rang";
import { calculerXp } from "@/lib/xp";
import { calculerBilan } from "@/lib/profilStats";
import EvolutionChart from "@/components/EvolutionChart";
import StatCard from "@/components/StatCard";
import ProfilCard from "@/components/ProfilCard";
import CarteRang from "@/components/CarteRang";
import SemaineCard from "@/components/SemaineCard";
import MoisCard from "@/components/MoisCard";
import HistoriqueMois from "@/components/HistoriqueMois";
import {
  bilansParMois,
  bilanSemaine,
  calculerSerie,
  cleSemaine,
  libelleSemaine,
  OBJECTIFS_DEFAUT,
} from "@/lib/semaines";
import { GlareCard } from "@/components/ui/GlareCard";

export const dynamic = "force-dynamic";

function joursDepuis(date) {
  const debutJour = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  return Math.round((debutJour(new Date()) - debutJour(date)) / (1000 * 60 * 60 * 24));
}

function serieValeurs(mesures, champ) {
  return mesures.map((m) => m[champ]).filter((v) => v != null);
}

// Les trois étapes, affichées tant qu'aucun scan n'est enregistré.
const ETAPES = [
  { n: "01", titre: "Scanne-toi", texte: "Le mercredi soir, toutes les deux semaines, toujours dans les mêmes conditions.", href: "/scan" },
  { n: "02", titre: "Importe le PDF", href: "/scan", texte: "Dépose le rapport Visbody : Physiq lit tous les indicateurs." },
  { n: "03", titre: "Regarde-toi évoluer", texte: "Rang, XP, courbes et radar se construisent scan après scan.", href: "/historique" },
];

export default async function AccueilPage() {
  const [mesures, profil, entreesJournal] = await Promise.all([
    prisma.mesure.findMany({ orderBy: { dateScan: "asc" } }),
    prisma.profil.findUnique({ where: { id: 1 } }),
    prisma.journalEntry.findMany({ where: { semaineIso: { not: null } } }),
  ]);

  const parSemaine = Object.fromEntries(entreesJournal.map((e) => [e.semaineIso, e]));
  const semaineActuelle = cleSemaine(new Date());
  const bilan = bilanSemaine(parSemaine[semaineActuelle], OBJECTIFS_DEFAUT);
  const serie = calculerSerie(parSemaine, OBJECTIFS_DEFAUT, semaineActuelle);
  // Le premier est le mois en cours, les suivants sont l'historique figé.
  const [moisEnCours, ...moisPrecedents] = bilansParMois(parSemaine, OBJECTIFS_DEFAUT);

  const xp = calculerXp(entreesJournal, mesures.length, OBJECTIFS_DEFAUT, semaineActuelle);

  const derniere = mesures.at(-1);
  const precedente = mesures.at(-2);
  const prenom = profil?.prenom || "Issa";
  const rang = derniere ? calculerRang(derniere.scoreVisbody) : null;
  const jours = derniere ? joursDepuis(derniere.dateScan) : null;
  const bilanCorps = derniere ? calculerBilan(mesures) : null;

  const recentes = mesures.slice(-8);
  const chartSeries = [
    {
      label: "Masse musculaire",
      color: "#8fe3ff",
      points: recentes
        .filter((m) => m.masseMusculaireKg != null)
        .map((m) => ({ date: m.dateScan, value: m.masseMusculaireKg })),
    },
    {
      label: "Masse grasse",
      color: "#ff8f7a",
      dashed: true,
      points: recentes
        .filter((m) => m.masseGrasseKg != null)
        .map((m) => ({ date: m.dateScan, value: m.masseGrasseKg })),
    },
  ];

  const aujourdhui = new Date().toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "Europe/Paris",
  });

  return (
    <div className="mx-auto max-w-6xl px-4 pb-10 pt-[max(env(safe-area-inset-top),20px)] sm:px-8 sm:pt-10">
      <header className="flex items-end justify-between gap-4">
        <div>
          <div className="text-xs font-medium text-foreground-muted first-letter:uppercase">{aujourdhui}</div>
          <h1 className="titre mt-1 text-[30px] sm:text-[38px]">Salut {prenom}</h1>
        </div>
        <Link
          href="/scan"
          className="flex h-11 items-center gap-2 rounded-full border border-border-soft bg-white/[0.03] px-4 text-xs font-semibold text-foreground transition hover:border-white/20"
        >
          <span className={`h-1.5 w-1.5 rounded-full ${jours != null && jours > 13 ? "bg-amber-300" : "bg-mint"}`} />
          {jours != null && jours > 13 ? "Scan dû" : "Scanner"}
        </Link>
      </header>

      <div className="mt-6 grid grid-cols-1 gap-3 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <CarteRang rang={rang} jours={jours} xp={xp} />
        </div>

        <div className="lg:col-span-7">
          {derniere ? (
            <div className="grid h-full grid-cols-2 gap-3">
              <Link href="/historique" className="block rounded-[22px]">
                <StatCard
                  label="Poids"
                  value={derniere.poidsKg}
                  unite="kg"
                  precedente={precedente?.poidsKg}
                  senseInverse
                  historique={serieValeurs(recentes, "poidsKg")}
                />
              </Link>
              <Link href="/historique" className="block rounded-[22px]">
                <StatCard
                  label="Masse grasse"
                  value={derniere.bfpPct}
                  unite="%"
                  precedente={precedente?.bfpPct}
                  senseInverse
                  historique={serieValeurs(recentes, "bfpPct")}
                />
              </Link>
              <Link href="/historique" className="block rounded-[22px]">
                <StatCard
                  label="Muscle"
                  value={derniere.masseMusculaireKg}
                  unite="kg"
                  precedente={precedente?.masseMusculaireKg}
                  historique={serieValeurs(recentes, "masseMusculaireKg")}
                />
              </Link>
              <Link href="/historique" className="block rounded-[22px]">
                <StatCard
                  label="IMC"
                  value={derniere.imc}
                  unite=""
                  precedente={precedente?.imc}
                  senseInverse
                  historique={serieValeurs(recentes, "imc")}
                />
              </Link>
            </div>
          ) : (
            <ol className="grid h-full gap-3">
              {ETAPES.map((e) => (
                <li key={e.n}>
                  <Link href={e.href} className="block h-full rounded-[22px]">
                    <GlareCard className="h-full p-4 sm:p-5" tiltIntensity={4}>
                      <div className="flex gap-4">
                        <span className="tabular holo-texte text-sm font-semibold">{e.n}</span>
                        <div className="flex-1">
                          <h3 className="titre text-base">{e.titre}</h3>
                          <p className="mt-1 text-sm leading-relaxed text-foreground-muted">{e.texte}</p>
                        </div>
                        <span className="self-center text-foreground-muted" aria-hidden="true">→</span>
                      </div>
                    </GlareCard>
                  </Link>
                </li>
              ))}
            </ol>
          )}
        </div>

        <div className="lg:col-span-6">
          <SemaineCard
            libelle={libelleSemaine(semaineActuelle)}
            bilan={bilan}
            serie={serie}
            renseignee={Boolean(parSemaine[semaineActuelle])}
          />
        </div>

        {moisEnCours && (
          <div className="lg:col-span-6">
            <Link href="/objectifs" className="block h-full rounded-[22px]">
              <MoisCard bilan={moisEnCours} objectifs={OBJECTIFS_DEFAUT} />
            </Link>
          </div>
        )}

        {/* Mois précédents : juste après la semaine et le mois en cours. */}
        {moisPrecedents.length > 0 && (
          <div className="lg:col-span-12">
            <Link href="/journal" className="block rounded-[22px]">
              <HistoriqueMois mois={moisPrecedents} />
            </Link>
          </div>
        )}

        {derniere && (
          <>
            <GlareCard className="p-5 sm:p-6 lg:col-span-12" tiltIntensity={3}>
              <div className="flex items-baseline justify-between">
                <span className="etiquette">Évolution</span>
                <Link
                  href="/historique"
                  className="-my-3 inline-flex h-11 items-center text-xs font-medium text-foreground-muted transition hover:text-accent"
                >
                  {mesures.length} scans · Historique →
                </Link>
              </div>
              <div className="mt-4">
                <EvolutionChart series={chartSeries} />
              </div>
              <div className="mt-3 flex gap-5 text-xs font-medium text-foreground-muted">
                <span className="flex items-center gap-1.5">
                  <span className="h-[3px] w-3 rounded bg-accent" /> Muscle
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-[3px] w-3 rounded bg-coral" /> Masse grasse
                </span>
              </div>
            </GlareCard>

            {bilanCorps && (
              <Link href="/comparer" className="block rounded-[22px] lg:col-span-12">
                <GlareCard className="h-full p-5 sm:p-6" tiltIntensity={2}>
                  <ProfilCard bilan={bilanCorps} />
                </GlareCard>
              </Link>
            )}
          </>
        )}


        <Link href="/coach" className="group block rounded-[22px] lg:col-span-12">
          <GlareCard className="p-5" tiltIntensity={2}>
            <div className="flex items-center justify-between gap-4">
              <div>
                <span className="etiquette">Coach</span>
                <p className="titre mt-1 text-lg">Pose une question sur tes chiffres</p>
              </div>
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/15 text-accent transition group-hover:translate-x-1">
                →
              </span>
            </div>
          </GlareCard>
        </Link>

        <Link href="/parcours" className="group block rounded-[22px] lg:col-span-12">
          <GlareCard className="p-5" tiltIntensity={2}>
            <div className="flex items-center justify-between gap-4">
              <div>
                <span className="etiquette">Récit</span>
                <p className="titre mt-1 text-lg">Ton parcours, en plein écran</p>
              </div>
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/15 text-accent transition group-hover:translate-x-1">
                →
              </span>
            </div>
          </GlareCard>
        </Link>
      </div>
    </div>
  );
}
