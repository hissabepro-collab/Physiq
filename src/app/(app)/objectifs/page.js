import { prisma } from "@/lib/db";
import ObjectifsClient from "@/components/ObjectifsClient";

export const dynamic = "force-dynamic";

export default async function ObjectifsPage() {
  const [objectifs, mesures] = await Promise.all([
    prisma.objectif.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.mesure.findMany({ orderBy: { dateScan: "asc" } }),
  ]);
  return <ObjectifsClient objectifsInitiaux={objectifs} mesures={mesures} />;
}
