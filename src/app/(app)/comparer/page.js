import { prisma } from "@/lib/db";
import ComparerClient from "@/components/ComparerClient";

export const dynamic = "force-dynamic";

export default async function ComparerPage() {
  const [mesures, journal] = await Promise.all([
    prisma.mesure.findMany({ orderBy: { dateScan: "asc" } }),
    prisma.journalEntry.findMany({ where: { photoUrl: { not: null } } }),
  ]);
  return <ComparerClient mesures={mesures} photosParMesure={Object.fromEntries(journal.filter(j => j.mesureId).map(j => [j.mesureId, j.photoUrl]))} />;
}
