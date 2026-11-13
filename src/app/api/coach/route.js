import Anthropic from "@anthropic-ai/sdk";
import { GoogleGenAI, ApiError as GeminiApiError } from "@google/genai";
import { construireContexte } from "@/lib/coachContexte";
import { ROLE } from "@/lib/coachRole";
import { fournisseurCoach } from "@/lib/coachFournisseur";

// Coach IA (chantier 2). Protégé par la session comme toutes les routes
// /api (voir src/proxy.js). La conversation est gardée sur le téléphone ;
// le serveur ne stocke rien : il ajoute le résumé des données, interroge
// l'IA et renvoie la réponse au fil de l'écriture.
//
// Fournisseur (voir lib/coachFournisseur.js) :
//  - GEMINI_API_KEY : Gemini, offre gratuite (choix de l'utilisateur le
//    13/11/2026, en sachant que Google peut utiliser les échanges de l'offre
//    gratuite pour améliorer ses produits) ;
//  - sinon ANTHROPIC_API_KEY : Claude (payant à l'usage) ;
//  - sinon : 503, la page passe en mode « copier vers Claude ».
// Les clés ne sont que dans les variables d'environnement Vercel.

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MODELE_GEMINI = "gemini-3.8-flash";
const MODELE_CLAUDE = "claude-opus-5-5";
const MAX_MESSAGES = 40;
const MAX_CARACTERES = 4000;
const MAX_SORTIE = 8000;

const MSG_SURCHARGE = "Le coach est surchargé pour le moment (limite de l'offre gratuite). Réessaie dans une minute.";
const MSG_CLE = "La clé du coach n'est pas valide. Vérifie-la dans les réglages Vercel.";
const MSG_ECHEC = "Le coach n'a pas pu répondre. Réessaie.";

let clientClaude = null;
let clientGemini = null;

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

// Chaque fonction écrit la réponse morceau par morceau via `ecrire`, et
// renvoie un texte d'erreur à afficher en cas d'échec (ou null).

async function repondreGemini({ systeme, messages, ecrire, signal }) {
  if (!clientGemini) clientGemini = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  try {
    const flux = await clientGemini.models.generateContentStream({
      model: MODELE_GEMINI,
      contents: messages.map((m) => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content }] })),
      config: { systemInstruction: systeme, maxOutputTokens: MAX_SORTIE, abortSignal: signal },
    });
    let usage = null;
    let fin = null;
    for await (const morceau of flux) {
      if (morceau.text) ecrire(morceau.text);
      if (morceau.usageMetadata) usage = morceau.usageMetadata;
      const raison = morceau.candidates?.[0]?.finishReason;
      if (raison) fin = raison;
    }
    console.log(
      `[coach] ${MODELE_GEMINI} entree=${usage?.promptTokenCount ?? "?"} sortie=${usage?.candidatesTokenCount ?? "?"} reflexion=${usage?.thoughtsTokenCount ?? 0} fin=${fin ?? "?"}`
    );
    if (fin === "SAFETY" || fin === "PROHIBITED_CONTENT" || fin === "BLOCKLIST") {
      return "Je ne peux pas répondre à cette question. Reformule-la, ou pose-la à un professionnel de santé.";
    }
    if (fin === "MAX_TOKENS") ecrire("…");
    return null;
  } catch (e) {
    if (signal.aborted) return null;
    const statut = e instanceof GeminiApiError ? e.status : null;
    console.error("[coach] échec Gemini :", statut ?? e?.name);
    if (statut === 429 || statut === 503 || statut === 500) return MSG_SURCHARGE;
    // Google répond 400 (et non 401) quand la clé est invalide.
    if (statut === 401 || statut === 403 || (statut === 400 && /api[ _-]?key/i.test(e?.message ?? ""))) return MSG_CLE;
    return MSG_ECHEC;
  }
}

async function repondreClaude({ systeme, messages, ecrire, signal }) {
  if (!clientClaude) clientClaude = new Anthropic();
  try {
    const flux = clientClaude.beta.messages.stream(
      {
        model: MODELE_CLAUDE,
        max_tokens: MAX_SORTIE,
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: "default",
        output_config: { effort: "medium" },
        cache_control: { type: "ephemeral" },
        system: systeme,
        messages,
      },
      { signal }
    );
    flux.on("text", ecrire);
    const final = await flux.finalMessage();
    const u = final.usage;
    console.log(
      `[coach] ${final.model} entree=${u.input_tokens} cache_lu=${u.cache_read_input_tokens ?? 0} cache_ecrit=${u.cache_creation_input_tokens ?? 0} sortie=${u.output_tokens}`
    );
    if (final.stop_reason === "refusal") {
      return "Je ne peux pas répondre à cette question. Reformule-la, ou pose-la à un professionnel de santé.";
    }
    if (final.stop_reason === "max_tokens") ecrire("…");
    return null;
  } catch (e) {
    if (signal.aborted) return null;
    console.error("[coach] échec Claude :", e instanceof Anthropic.APIError ? `${e.status} ${e.name}` : e?.name);
    if (e instanceof Anthropic.RateLimitError || e instanceof Anthropic.InternalServerError) return MSG_SURCHARGE;
    if (e instanceof Anthropic.AuthenticationError) return MSG_CLE;
    return MSG_ECHEC;
  }
}

export async function POST(request) {
  const fournisseur = fournisseurCoach();
  if (!fournisseur) return Response.json({ erreur: "coach-inactif" }, { status: 503 });

  let corps;
  try {
    corps = await request.json();
  } catch {
    return Response.json({ erreur: "requete-invalide" }, { status: 400 });
  }
  const messages = messagesValides(corps?.messages);
  if (!messages) return Response.json({ erreur: "requete-invalide" }, { status: 400 });

  const systeme = `${ROLE}\n\nDonnées d'Issa, lues dans l'app à l'instant :\n\n${await construireContexte()}`;
  const repondre = fournisseur === "gemini" ? repondreGemini : repondreClaude;
  const arret = new AbortController();
  const encodeur = new TextEncoder();

  const sortie = new ReadableStream({
    async start(controleur) {
      const ecrire = (t) => controleur.enqueue(encodeur.encode(t));
      try {
        const erreur = await repondre({ systeme, messages, ecrire, signal: arret.signal });
        if (erreur) ecrire(`\n\n⚠︎ ${erreur}`);
      } finally {
        try {
          controleur.close();
        } catch {
          // Flux déjà fermé (l'utilisateur a quitté la page).
        }
      }
    },
    cancel() {
      arret.abort();
    },
  });

  return new Response(sortie, {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
  });
}
