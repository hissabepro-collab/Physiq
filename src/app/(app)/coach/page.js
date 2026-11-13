import CoachClient from "@/components/CoachClient";
import CoachGratuit from "@/components/CoachGratuit";
import { construireContexte } from "@/lib/coachContexte";
import { ROLE } from "@/lib/coachRole";

export const dynamic = "force-dynamic";
export const metadata = { title: "Coach · Physiq" };

// Deux modes :
//  - avec ANTHROPIC_API_KEY sur Vercel : discussion directe dans l'app
//    (payant à l'usage, voir /api/coach) ;
//  - sans clé (choix de l'utilisateur, 13/11/2026 : gratuit) : l'app prépare
//    le dossier complet, l'utilisateur le colle dans son app Claude.
export default async function CoachPage() {
  if (process.env.ANTHROPIC_API_KEY) return <CoachClient />;
  const contexte = await construireContexte();
  const dossier = `${ROLE}\n\nJe suis Issa. Voici mes données, exportées de mon app Physiq à l'instant :\n\n${contexte}`;
  return <CoachGratuit dossier={dossier} />;
}
