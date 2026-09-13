import { prisma } from "@/lib/db";
import HistoriqueClient from "@/components/HistoriqueClient";

export const dynamic = "force-dynamic";

export default async function HistoriquePage() {
  const mesures = await prisma.mesure.findMany({ orderBy: { dateScan: "asc" } });
  return <HistoriqueClient mesuresInitiales={mesures} />;
}
