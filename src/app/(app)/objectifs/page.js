import { prisma } from "@/lib/db";
import ObjectifsClient from "@/components/ObjectifsClient";
import ObjectifsMensuels from "@/components/ObjectifsMensuels";
import { bilanMois, cleSemaine, OBJECTIFS_DEFAUT } from "@/lib/semaines";

export const dynamic = "force-dynamic";

export default async function ObjectifsPage() {
  const [objectifs, mesures, mensuels, journal] = await Promise.all([
    prisma.objectif.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.mesure.findMany({ orderBy: { dateScan: "asc" } }),
    prisma.objectifMensuel.findMany(),
    prisma.journalEntry.findMany({ where: { semaineIso: { not: null } } }),
  ]);

  // Bilan du mois en cours, rapporté à chaque objectif mensuel fixé.
  const aujourdhui = new Date();
  const parSemaine = Object.fromEntries(journal.map((e) => [e.semaineIso, e]));
  const bilan = bilanMois(parSemaine, OBJECTIFS_DEFAUT, aujourdhui.getFullYear(), aujourdhui.getMonth(), aujourdhui);

  // Une cible mensuelle est due au prorata des jours écoulés, comme sur le
  // tableau de bord : le 3 du mois, on n'attend pas encore la totalité.
  const cibles = Object.fromEntries(mensuels.map((o) => [o.nature, o.valeurCible]));
  const ratio = bilan.joursDuMois ? bilan.jours / bilan.joursDuMois : 1;

  const progression = {
    seances: cibles.seances != null
      ? { fait: bilan.seances.fait, cible: cibles.seances, duJour: Math.round(cibles.seances * ratio) }
      : null,
    diete: cibles.diete != null
      ? { fait: bilan.diete.fait, cible: cibles.diete, duJour: Math.round(cibles.diete * ratio) }
      : null,
    sommeil: cibles.sommeil != null
      ? { moyenne: bilan.sommeil.moyenne, cible: cibles.sommeil, nuits: bilan.sommeil.nuits }
      : null,
  };

  return (
    <>
      {/* Le titre de la page vient en premier : les objectifs mensuels sont
          une section, pas l'en-tête. ObjectifsClient porte le PageHeader. */}
      <ObjectifsClient
        objectifsInitiaux={objectifs}
        mesures={mesures}
        sectionDuMois={<ObjectifsMensuels progression={progression} libelleMois={bilan.libelle} />}
      />
    </>
  );
}
