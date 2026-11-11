import Link from "next/link";
import { prisma } from "@/lib/db";
import { calculerRang } from "@/lib/rang";
import { calculerAxesProfil } from "@/lib/profilStats";
import EvolutionChart from "@/components/EvolutionChart";
import StatCard from "@/components/StatCard";
import ProfilCard from "@/components/ProfilCard";
import HeroCorps from "@/components/HeroCorps";
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

// Titre de chapitre éditorial, réutilisé entre les sections de l'accueil.
function Chapitre({ numero, etiquette, titre, children }) {
  return (
    <section className="mt-16 first:mt-0 sm:mt-24">
      <div className="etiquette flex items-center gap-3">
        <span className="tabular text-accent">{numero}</span>
        <span className="h-px w-8 bg-white/15" />
        {etiquette}
      </div>
      <h2 className="titre-serif mt-3 text-[34px] italic sm:text-[46px]">{titre}</h2>
      <div className="mt-6">{children}</div>
    </section>
  );
}

// Les trois étapes, affichées tant qu'aucun scan n'est enregistré.
const ETAPES = [
  { n: "01", titre: "Scanne-toi", texte: "Le mercredi matin, à jeun, avant la séance. Toutes les deux semaines." },
  { n: "02", titre: "Importe le PDF", texte: "Dépose le rapport Visbody : Physiq lit tous les indicateurs." },
  { n: "03", titre: "Regarde-toi évoluer", texte: "Rang, anneau, courbes et radar se construisent scan après scan." },
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

  const derniere = mesures.at(-1);
  const precedente = mesures.at(-2);
  const prenom = profil?.prenom || "Issa";
  const rang = derniere ? calculerRang(derniere.scoreVisbody) : null;
  const jours = derniere ? joursDepuis(derniere.dateScan) : null;
  const axesProfil = derniere ? calculerAxesProfil(mesures) : null;

  const recentes = mesures.slice(-8);
  const chartSeries = [
    {
      label: "Masse musculaire",
      color: "#4de8ff",
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

  let numero = 0;
  const suivant = () => String(++numero).padStart(2, "0");

  return (
    <div className="relative">
      <HeroCorps prenom={prenom} rang={rang} jours={jours} />

      <div className="relative mx-auto max-w-5xl px-5 pb-10 sm:px-10">
        {derniere ? (
          <Chapitre numero={suivant()} etiquette="Dernier scan" titre="Les chiffres.">
            {jours > 13 && (
              <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-amber-300/30 bg-amber-300/10 px-3 py-1.5 text-xs font-semibold text-amber-200">
                Ton prochain scan est dû : mercredi matin, à jeun.
              </p>
            )}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <StatCard
                label="Poids"
                value={derniere.poidsKg}
                unite="kg"
                precedente={precedente?.poidsKg}
                senseInverse
                historique={serieValeurs(recentes, "poidsKg")}
              />
              <StatCard
                label="Masse grasse"
                value={derniere.bfpPct}
                unite="%"
                precedente={precedente?.bfpPct}
                senseInverse
                historique={serieValeurs(recentes, "bfpPct")}
              />
              <StatCard
                label="Muscle"
                value={derniere.masseMusculaireKg}
                unite="kg"
                precedente={precedente?.masseMusculaireKg}
                historique={serieValeurs(recentes, "masseMusculaireKg")}
              />
              <StatCard
                label="IMC"
                value={derniere.imc}
                unite=""
                precedente={precedente?.imc}
                senseInverse
                historique={serieValeurs(recentes, "imc")}
              />
            </div>
          </Chapitre>
        ) : (
          <Chapitre numero={suivant()} etiquette="Pour commencer" titre="Trois gestes, et c'est parti.">
            <ol className="grid gap-3 sm:grid-cols-3">
              {ETAPES.map((e) => (
                <li key={e.n} className="verre rounded-[26px] p-5">
                  <span className="tabular font-display text-sm font-semibold text-accent">{e.n}</span>
                  <h3 className="titre-serif mt-3 text-2xl italic">{e.titre}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-foreground-muted">{e.texte}</p>
                </li>
              ))}
            </ol>
            <Link
              href="/scan"
              className="mt-5 inline-flex h-12 items-center gap-2 rounded-full bg-accent px-6 text-sm font-semibold text-[#04121a] shadow-[0_0_30px_-6px_rgba(77,232,255,0.7)]"
            >
              Importer mon premier rapport →
            </Link>
          </Chapitre>
        )}

        <Chapitre numero={suivant()} etiquette="Habitudes" titre="Le rythme.">
          <SemaineCard
            libelle={libelleSemaine(semaineActuelle)}
            bilan={bilan}
            serie={serie}
            renseignee={Boolean(parSemaine[semaineActuelle])}
          />
          {moisEnCours && (
            <div className="mt-3">
              <MoisCard bilan={moisEnCours} objectifs={OBJECTIFS_DEFAUT} />
            </div>
          )}
          {moisPrecedents.length > 0 && (
            <div className="mt-3">
              <HistoriqueMois mois={moisPrecedents} />
            </div>
          )}
        </Chapitre>

        {derniere && (
          <Chapitre numero={suivant()} etiquette="Tendance" titre="La courbe.">
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_320px]">
              <GlareCard className="p-5 sm:p-7" tiltIntensity={3}>
                <div className="flex items-baseline justify-between">
                  <span className="etiquette">Évolution</span>
                  <span className="tabular text-xs text-foreground-muted">{mesures.length} scans</span>
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

              {axesProfil && (
                <GlareCard className="p-5 sm:p-6" tiltIntensity={4}>
                  <ProfilCard axes={axesProfil} />
                </GlareCard>
              )}
            </div>
          </Chapitre>
        )}

        <Link
          href="/parcours"
          className="verre group mt-16 flex items-center justify-between gap-4 rounded-[26px] p-6 transition hover:border-white/20 sm:mt-24 sm:p-8"
        >
          <div>
            <span className="etiquette">Récit</span>
            <p className="titre-serif mt-2 text-3xl italic sm:text-4xl">Ton parcours, en plein écran.</p>
          </div>
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-white/15 text-accent transition group-hover:translate-x-1">
            →
          </span>
        </Link>
      </div>
    </div>
  );
}
