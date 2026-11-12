import { notFound } from "next/navigation";
import CarteRang from "@/components/CarteRang";
import StatCard from "@/components/StatCard";
import { calculerRang } from "@/lib/rang";
import RangsClient from "@/components/RangsClient";

// Page d'aperçu pour la vérification des livrables (outils/verif) :
// la carte de rang avec des données fictives, dans la mise en page de
// l'accueil. N'existe qu'en développement : en production, 404.
//   /apercu?score=81&fete=A-
//   /apercu?vue=rangs&meilleur=81&score=78   (page Collection des rangs)
export const dynamic = "force-dynamic";

const XP = { total: 1170, niveau: 5, xpDansNiveau: 70, xpPourSuivant: 400, pourcent: 18, semaine: { total: 85 } };

export default async function Apercu({ searchParams }) {
  if (process.env.NODE_ENV === "production") notFound();
  const q = await searchParams;
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
