import { prisma } from "@/lib/db";
import CarnetClient from "@/components/CarnetClient";

export const dynamic = "force-dynamic";
export const metadata = { title: "Carnet · Physiq" };

// Carnet d'entraînement (13/11/2026) : séances détaillées (exercices,
// séries, charges), lues aussi par le coach pour suivre la progression.
export default async function CarnetPage() {
  const seances = await prisma.seanceMuscu.findMany({ orderBy: { date: "desc" }, take: 200 });
  return <CarnetClient seances={JSON.parse(JSON.stringify(seances))} />;
}
