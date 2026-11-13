import Anthropic from "@anthropic-ai/sdk";
import { construireContexte } from "@/lib/coachContexte";
import { ROLE } from "@/lib/coachRole";

// Coach IA (chantier 2). Protégé par la session comme toutes les routes
// /api (voir src/proxy.js). La conversation est gardée sur le téléphone ;
// le serveur ne stocke rien : il ajoute le résumé des données, interroge
// Claude et renvoie la réponse au fil de l'écriture.
//
// Clé : variable d'environnement ANTHROPIC_API_KEY (Vercel), jamais dans le
// code. Sans elle, la route répond 503 et l'app affiche « pas encore activé ».

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MODELE = "claude-opus-5-5";
const MAX_MESSAGES = 40;
const MAX_CARACTERES = 4000;


let client = null;
function obtenirClient() {
  if (!client) client = new Anthropic();
  return client;
}

function messagesValides(brut) {
  if (!Array.isArray(brut) || brut.length === 0 || brut.length > MAX_MESSAGES) return null;
  const messages = [];
  for (const m of brut) {
    if (!m || (m.role !== "user" && m.role !== "assistant")) return null;
    if (typeof m.content !== "string") return null;
    const texte = m.content.trim().slice(0, MAX_CARACTERES);
    if (!texte) continue;
    messages.push({ role: m.role, content: texte });
  }
  if (messages.length === 0 || messages[0].role !== "user" || messages.at(-1).role !== "user") return null;
  return messages;
}

export async function POST(request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json({ erreur: "coach-inactif" }, { status: 503 });
  }

  let corps;
  try {
    corps = await request.json();
  } catch {
    return Response.json({ erreur: "requete-invalide" }, { status: 400 });
  }
  const messages = messagesValides(corps?.messages);
  if (!messages) return Response.json({ erreur: "requete-invalide" }, { status: 400 });

  const contexte = await construireContexte();

  const flux = obtenirClient().beta.messages.stream({
    model: MODELE,
    max_tokens: 8000,
    // Refus de sécurité : la requête est relancée sur un modèle de secours
    // choisi par l'API, dans le même appel.
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: { effort: "medium" },
    // Mise en cache automatique du début de la requête (rôle, données, début
    // de conversation) : les questions suivantes coûtent beaucoup moins.
    cache_control: { type: "ephemeral" },
    system: [
      { type: "text", text: ROLE },
      { type: "text", text: `Données d'Issa, lues dans l'app à l'instant :\n\n${contexte}` },
    ],
    messages,
  });

  const encodeur = new TextEncoder();
  const sortie = new ReadableStream({
    async start(controleur) {
      try {
        flux.on("text", (morceau) => controleur.enqueue(encodeur.encode(morceau)));
        const final = await flux.finalMessage();
        if (final.stop_reason === "refusal") {
          controleur.enqueue(encodeur.encode("\n\nJe ne peux pas répondre à cette question. Reformule-la, ou pose-la à un professionnel de santé."));
        } else if (final.stop_reason === "max_tokens") {
          controleur.enqueue(encodeur.encode("…"));
        }
        // Coût mesuré par réponse (journaux Vercel), sans aucun contenu.
        const u = final.usage;
        console.log(
          `[coach] ${final.model} entree=${u.input_tokens} cache_lu=${u.cache_read_input_tokens ?? 0} cache_ecrit=${u.cache_creation_input_tokens ?? 0} sortie=${u.output_tokens}`
        );
      } catch (e) {
        console.error("[coach] échec :", e instanceof Anthropic.APIError ? `${e.status} ${e.name}` : e?.name);
        const texte =
          e instanceof Anthropic.RateLimitError || e instanceof Anthropic.InternalServerError
            ? "Le coach est surchargé pour le moment. Réessaie dans une minute."
            : e instanceof Anthropic.AuthenticationError
              ? "La clé du coach n'est pas valide. Vérifie ANTHROPIC_API_KEY sur Vercel."
              : "Le coach n'a pas pu répondre. Réessaie.";
        controleur.enqueue(encodeur.encode(`\n\n⚠︎ ${texte}`));
      } finally {
        controleur.close();
      }
    },
    cancel() {
      flux.abort();
    },
  });

  return new Response(sortie, {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
  });
}
