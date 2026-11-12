import { prisma } from "@/lib/db";
import RangsClient from "@/components/RangsClient";

export const dynamic = "force-dynamic";

// Collection des rangs : les 13 paliers, déverrouillés jusqu'au meilleur rang
// jamais atteint (meilleur score Visbody de tous les scans, pas seulement le
// dernier : un rang gagné reste acquis même si le score redescend).
export default async function RangsPage() {
  const [meilleur, dernier] = await Promise.all([
    prisma.mesure.aggregate({ _max: { scoreVisbody: true } }),
    prisma.mesure.findFirst({ orderBy: { dateScan: "desc" }, select: { scoreVisbody: true } }),
  ]);
  return (
    <RangsClient
      meilleurScore={meilleur._max.scoreVisbody ?? null}
      scoreActuel={dernier?.scoreVisbody ?? null}
    />
  );
}
