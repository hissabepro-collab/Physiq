import { prisma } from "@/lib/db";
import { calculerRang } from "@/lib/rang";
import { calculerAxesProfil } from "@/lib/profilStats";
import EvolutionChart from "@/components/EvolutionChart";
import StatCard from "@/components/StatCard";
import RangBadge from "@/components/RangBadge";
import RadarStats from "@/components/RadarStats";
import { GlareCard } from "@/components/ui/GlareCard";

export const dynamic = "force-dynamic";

function joursDepuis(date) {
  const debutJour = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  return Math.round((debutJour(new Date()) - debutJour(date)) / (1000 * 60 * 60 * 24));
}

function serieValeurs(mesures, champ) {
  return mesures.map((m) => m[champ]).filter((v) => v != null);
}

export default async function AccueilPage() {
  const [mesures, profil] = await Promise.all([
    prisma.mesure.findMany({ orderBy: { dateScan: "asc" } }),
    prisma.profil.findUnique({ where: { id: 1 } }),
  ]);

  const derniere = mesures.at(-1);
  const precedente = mesures.at(-2);
  const prenom = profil?.prenom || "Issa";

  if (!derniere) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 px-6 text-center">
        <h1 className="font-display text-xl font-semibold">Bienvenue, {prenom}</h1>
        <p className="max-w-sm text-sm text-foreground-muted">
          Aucun scan enregistré pour l'instant. Ajoute ton premier rapport Visbody pour démarrer ton suivi.
        </p>
        <a
          href="/scan"
          className="mt-2 rounded-lg border border-accent bg-accent-soft px-5 py-2.5 text-sm font-semibold"
        >
          Ajouter mon premier rapport
        </a>
      </div>
    );
  }

  const rang = calculerRang(derniere.scoreVisbody);
  const axesProfil = calculerAxesProfil(mesures);
  const jours = joursDepuis(derniere.dateScan);

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
      color: "#f0a38f",
      dashed: true,
      points: recentes
        .filter((m) => m.masseGrasseKg != null)
        .map((m) => ({ date: m.dateScan, value: m.masseGrasseKg })),
    },
  ];

  return (
    <div className="mx-auto max-w-5xl px-5 py-8 sm:px-10 sm:py-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold">Salut {prenom} 👋</h1>
          <p className="mt-1 text-sm text-foreground-muted">
            Dernier scan {jours === 0 ? "aujourd'hui" : jours === 1 ? "hier" : `il y a ${jours} jours`}
            {jours > 10 && (
              <span className="ml-2 rounded-full border border-amber-400/40 bg-amber-400/10 px-2 py-0.5 text-xs font-semibold text-amber-300">
                pense à ton prochain scan
              </span>
            )}
          </p>
        </div>
        {rang && <RangBadge rang={rang} />}
      </div>

      <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
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
          label="Masse musculaire"
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

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-[1fr_320px]">
        <GlareCard className="p-5 sm:p-7" tiltIntensity={3}>
          <div className="flex items-baseline justify-between">
            <h2 className="font-display text-base font-semibold">Évolution</h2>
            <span className="text-xs text-foreground-muted">{mesures.length} scans enregistrés</span>
          </div>
          <div className="mt-4">
            <EvolutionChart series={chartSeries} />
          </div>
          <div className="mt-3 flex gap-5 text-xs font-medium text-foreground-muted">
            <span className="flex items-center gap-1.5">
              <span className="h-[3px] w-3 rounded bg-[#4de8ff]" /> Masse musculaire
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-[3px] w-3 rounded bg-[#f0a38f]" /> Masse grasse
            </span>
          </div>
        </GlareCard>

        {axesProfil && (
          <GlareCard className="p-5 sm:p-6" tiltIntensity={4}>
            <h2 className="font-display text-base font-semibold">Profil</h2>
            <p className="text-xs text-foreground-muted">Basé sur ton dernier scan</p>
            <div className="mt-2">
              <RadarStats axes={axesProfil} />
            </div>
          </GlareCard>
        )}
      </div>
    </div>
  );
}
