import CoachClient from "@/components/CoachClient";
import CoachGratuit from "@/components/CoachGratuit";
import { construireContexte } from "@/lib/coachContexte";
import { ROLE } from "@/lib/coachRole";
import { fournisseurCoach } from "@/lib/coachFournisseur";

export const dynamic = "force-dynamic";
export const metadata = { title: "Coach · Physiq" };

// Deux modes :
//  - avec GEMINI_API_KEY (gratuit) ou ANTHROPIC_API_KEY (payant) sur Vercel :
//    discussion directe dans l'app (voir /api/coach) ;
//  - sans clé (choix de l'utilisateur, 13/11/2026 : gratuit) : l'app prépare
//    le dossier complet, l'utilisateur le colle dans son app Claude.
export default async function CoachPage() {
  const fournisseur = fournisseurCoach();
  if (fournisseur) return <CoachClient service={fournisseur === "gemini" ? "Gemini (Google)" : "Claude (Anthropic)"} />;
  const contexte = await construireContexte();
  // Les outils de recherche n'existent que dans l'app : on retire cette
  // partie des consignes copiées vers Claude.
  const consignes = ROLE.replace(/## Recherche de sources[\s\S]*?(?=\n## Limites)/, "");
  const dossier = `${consignes}\n\nJe suis Issa. Voici mes données, exportées de mon app Physiq à l'instant :\n\n${contexte}`;
  return <CoachGratuit dossier={dossier} />;
}
