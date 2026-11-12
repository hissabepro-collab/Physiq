import { notFound } from "next/navigation";
import CarteRang from "@/components/CarteRang";
import StatCard from "@/components/StatCard";
import { calculerRang } from "@/lib/rang";
import RangsClient from "@/components/RangsClient";
import ProfilCard from "@/components/ProfilCard";
import { GlareCard } from "@/components/ui/GlareCard";
import { calculerBilan } from "@/lib/profilStats";
import ParcoursClient from "@/components/ParcoursClient";
import JournalClient from "@/components/JournalClient";
import { construireParcours } from "@/lib/parcours";
import { OBJECTIFS_DEFAUT } from "@/lib/semaines";

// Journal fictif (calqué sur les vraies semaines de septembre à novembre).
const SEMAINES = [
  ["2026-W37", [0, 2, 4], [0, 1, 3, 4], [6, 7, 7, 6, 8, 8, 6]], ["2026-W38", [0, 5], [0, 1, 4, 6], [6.5, 6, 6, 5, 9, 9, 7.5]],
  ["2026-W39", [0, 2, 4], [0, 2, 4], [6.2, 6.5, 6.5, 6.5, null, null, 6.5]], ["2026-W40", [0, 5, 6], [0, 1, 5, 6], [7.2, 7.1, 6.5, 6.2, null, null, 6.5]],
  ["2026-W41", [0, 2], [1, 3, 4], [5.4, 6.5, 6.5, 6.5, null, null, 6.8]], ["2026-W42", [0, 1, 2, 4, 5], [1, 2, 3, 4, 5, 6], [8, 8, 8.2, 8, null, null, 8]],
  ["2026-W43", [0, 1, 2, 3, 4], [0, 1, 2, 3, 4, 5], [8, 8.5, 8, 8, null, null, 8.4]], ["2026-W44", [1, 2, 3, 4], [0, 1, 2, 3, 4], [7.5, 8, 6.5, 5, null, null, null]],
  ["2026-W45", [0, 1, 2, 3], [0, 1, 2, 3, 4], [7.7, 8, 7.5, 6, null, null, 8]], ["2026-W46", [0, 1, 2], [0, 1, 2], [8, 6, null, null, null, null, null]],
].map(([semaineIso, joursEntraines, joursDiete, heuresSommeil]) => ({ semaineIso, joursEntraines, joursDiete, heuresSommeil }));
const SCANS = [
  { dateScan: new Date("2026-10-14T19:00:00"), scoreVisbody: 77, masseMusculaireKg: 68.1, masseGrasseKg: 19.4, bfpPct: 21.3, ...{} },
  { dateScan: new Date("2026-10-28T19:00:00"), scoreVisbody: 79, masseMusculaireKg: 68.4, masseGrasseKg: 19.0, bfpPct: 20.9 },
];

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
//   /apercu?vue=journal                       (journal ; l'enregistrement part vers /api/journal)
//   /apercu?vue=parcours                      (parcours, journal et scans fictifs)
export const dynamic = "force-dynamic";

const XP = { total: 1170, niveau: 5, xpDansNiveau: 70, xpPourSuivant: 400, pourcent: 18, semaine: { total: 85 } };

export default async function Apercu({ searchParams }) {
  if (process.env.NODE_ENV === "production") notFound();
  const q = await searchParams;
  if (q.vue === "journal") {
    const entrees = SEMAINES.slice(-3).map((e, i) => ({ ...e, id: `fictif-${i}`, date: new Date(), texte: null, noteEtoiles: null }));
    return <JournalClient entreesInitiales={entrees} mesures={[]} />;
  }
  if (q.vue === "parcours") {
    const scans = [...SCANS, { ...SCAN, dateScan: new Date("2026-11-11T19:00:00"), scoreVisbody: 80, masseMusculaireKg: 68.7, masseGrasseKg: 18.6 }];
    return <ParcoursClient parcours={construireParcours(scans, SEMAINES, OBJECTIFS_DEFAUT)} />;
  }
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
