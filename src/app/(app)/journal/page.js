import { prisma } from "@/lib/db";
import JournalClient from "@/components/JournalClient";

export const dynamic = "force-dynamic";

export default async function JournalPage() {
  const [entrees, mesures] = await Promise.all([
    prisma.journalEntry.findMany({ orderBy: { date: "desc" } }),
    prisma.mesure.findMany({ orderBy: { dateScan: "desc" }, select: { id: true, dateScan: true } }),
  ]);
  return <JournalClient entreesInitiales={entrees} mesures={mesures} />;
}
