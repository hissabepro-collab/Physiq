import { notFound } from "next/navigation";
import CarteRang from "@/components/CarteRang";
import StatCard from "@/components/StatCard";
import { calculerRang } from "@/lib/rang";
import RangsClient from "@/components/RangsClient";
import ProfilCard from "@/components/ProfilCard";
import { GlareCard } from "@/components/ui/GlareCard";
import { calculerBilan } from "@/lib/profilStats";

// Scan fictif proche du vrai (11/11/2026), pour l'aperçu du bilan.
const SCAN = {
  smmKg: 41.8, bfpPct: 20.5, niveauGraisseViscerale: 7, rth: 0.98, metabolismeBaseKcal: 1951.6, ratioEcwTbw: 0.371,
  plages: {
    smmKg: { min: 31.4, max: 38.4 }, bfpPct: { min: 10, max: 20 }, niveauGraisseViscerale: { min: 1, max: 10 },
    rth: { min: 0.8, max: 0.9 }, metabolismeBaseKcal: { min: 1596.7, max: 1869.3 },
  },
  segments: { maigreKg: { brasDroit: 4.39, brasGauche: 4.35, jambeDroite: 10.76, jambeGauche: 10.67 } },
};

// Page d'aperçu pour la vérification des livrables (outils/verif) :
// la carte de rang avec des données fictives, dans la mise en page de
// l'accueil. N'existe qu'en développement : en production, 404.
//   /apercu?score=81&fete=A-
//   /apercu?vue=rangs&meilleur=81&score=78   (page Collection des rangs)
//   /apercu?vue=bilan                         (bilan corporel)
export const dynamic = "force-dynamic";

const XP = { total: 1170, niveau: 5, xpDansNiveau: 70, xpPourSuivant: 400, pourcent: 18, semaine: { total: 85 } };

export default async function Apercu({ searchParams }) {
  if (process.env.NODE_ENV === "production") notFound();
  const q = await searchParams;
  if (q.vue === "bilan") {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-8">
        <GlareCard className="p-5 sm:p-6" tiltIntensity={2}>
          <ProfilCard bilan={calculerBilan([SCAN])} />
        </GlareCard>
      </div>
    );
  }
  if (q.vue === "rangs") {
    return <RangsClient meilleurScore={q.meilleur ? Number(q.meilleur) : null} scoreActuel={q.score ? Number(q.score) : null} />;
  }
  return (
    <div className="mx-auto max-w-6xl px-4 pb-10 pt-10 sm:px-8">
      <h1 className="titre text-[30px] sm:text-[38px]">Salut Issa</h1>
      <div className="mt-6 grid grid-cols-1 gap-3 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <CarteRang rang={calculerRang(Number(q.score ?? 81))} jours={0} xp={XP} />
        </div>
        <div className="grid grid-cols-2 gap-3 lg:col-span-7">
          {["Poids", "Masse grasse", "Muscle", "IMC"].map((l) => (
            <StatCard key={l} label={l} value={50} unite="kg" />
          ))}
        </div>
      </div>
    </div>
  );
}
