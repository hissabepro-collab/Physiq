import { prisma } from "@/lib/db";
import { OBJECTIFS_DEFAUT } from "@/lib/semaines";
import { construireParcours } from "@/lib/parcours";
import ParcoursClient from "@/components/ParcoursClient";

export const dynamic = "force-dynamic";

export default async function ParcoursPage() {
  const [mesures, entreesJournal] = await Promise.all([
    prisma.mesure.findMany({ orderBy: { dateScan: "asc" } }),
    prisma.journalEntry.findMany({ where: { semaineIso: { not: null } } }),
  ]);
  return <ParcoursClient parcours={construireParcours(mesures, entreesJournal, OBJECTIFS_DEFAUT)} />;
}
