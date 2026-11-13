import Anthropic from "@anthropic-ai/sdk";
import { GoogleGenAI, ApiError as GeminiApiError, ThinkingLevel, FunctionCallingConfigMode } from "@google/genai";
import { construireContexte } from "@/lib/coachContexte";
import { ROLE } from "@/lib/coachRole";
import { fournisseurCoach } from "@/lib/coachFournisseur";
import { rechercherEtudes } from "@/lib/rechercheEtudes";
import { rechercherPresse } from "@/lib/recherchePresse";
import { MARQUEUR_RECHERCHE } from "@/lib/coachMarqueur";
import { creerFiltreLiens } from "@/lib/filtreLiens";

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

// Ordre de préférence (offre gratuite), mesuré le 13/11/2026.
// Limites gratuites du compte (AI Studio, « Limite de débit ») : 3.5
// Flash-Lite 15/min et 500/jour ; 3.6 Flash et 3.8 Flash seulement 5/min et
// 20/jour. Une question avec recherche consomme 2 à 3 requêtes : Flash-Lite
// est donc le modèle principal (et le plus rapide : 1er mot ~0,6 s), les
// deux autres servent de relais quand il est saturé.
const MODELES_GEMINI = ["gemini-3.5-flash-lite", "gemini-3.6-flash", "gemini-3.8-flash"];
const DELAI_PREMIER_MORCEAU = 8000;
const MODELE_CLAUDE = "claude-opus-5-5";
const MAX_MESSAGES = 40;
const MAX_CARACTERES = 4000;
const MAX_SORTIE = 8000;

const MSG_SURCHARGE = "Le coach est surchargé pour le moment (offre gratuite de Google). Réessaie dans une minute.";
const MSG_CLE = "La clé du coach n'est pas valide. Vérifie-la dans les réglages Vercel.";
const MSG_ECHEC = "Le coach n'a pas pu répondre. Réessaie.";
const MSG_COUPEE = "La réponse a été coupée (serveur de Google saturé). Repose ta question.";

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

// Outils proposés au modèle : études scientifiques (PubMed) et presse
// (Google Actualités). Gratuits, sans clé ; seuls des termes de recherche
// généraux en sortent, jamais les données de l'utilisateur.
const OUTILS = {
  rechercher_etudes: {
    executer: rechercherEtudes,
    cle: "etudes",
    declaration: {
      name: "rechercher_etudes",
      description:
        "Cherche des études scientifiques publiées (PubMed, 10 dernières années, méta-analyses et revues en priorité) et renvoie titre, année, revue, type, résumé et lien. Pour une recommandation chiffrée, l'effet d'un complément, d'un régime ou d'une méthode d'entraînement.",
      parametersJsonSchema: {
        type: "object",
        properties: {
          requete: { type: "string", description: "Termes de recherche en anglais, scientifiques, sans aucune donnée personnelle. Ex. : creatine supplementation lean mass resistance training" },
        },
        required: ["requete"],
      },
    },
  },
  rechercher_presse: {
    executer: rechercherPresse,
    cle: "articles",
    declaration: {
      name: "rechercher_presse",
      description:
        "Cherche des articles de presse récents (Google Actualités, 2 dernières années, en français) et renvoie titre, média, date et lien. Pour l'actualité, une tendance, un produit, une idée reçue dont on parle, ou pour compléter une étude par un article grand public. Seul le titre est fourni, pas le contenu.",
      parametersJsonSchema: {
        type: "object",
        properties: {
          requete: { type: "string", description: "Termes de recherche en français, généraux, sans aucune donnée personnelle. Ex. : créatine perte de gras" },
        },
        required: ["requete"],
      },
    },
  },
};
const DECLARATIONS = Object.values(OUTILS).map((o) => o.declaration);
const MAX_RECHERCHES = 2;

// Une tentative sur un modèle Gemini, avec au plus MAX_RECHERCHES appels à
// l'outil. Renvoie { ok } quand la réponse est partie, { relais: true }
// quand le modèle est saturé ou muet AVANT d'avoir rien produit (on passe
// alors au modèle suivant), sinon { erreur }.
async function essaiGemini(modele, { systeme, messages, ecrire, signal }) {
  const arretEssai = new AbortController();
  const surArret = () => arretEssai.abort();
  signal.addEventListener("abort", surArret);
  let minuteur = null;
  let aEcrit = false;
  let aCherche = false;
  // Liens réellement renvoyés par les recherches de cette réponse : seuls
  // ceux-là peuvent apparaître dans le texte (voir lib/filtreLiens).
  const autorises = new Set();
  const filtre = creerFiltreLiens(autorises, ecrire);
  const contenu = messages.map((m) => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content }] }));
  try {
    for (let tour = 0; tour <= MAX_RECHERCHES; tour++) {
      // Délai de premier morceau : mesuré le 13/11/2026, un modèle saturé de
      // l'offre gratuite peut mettre plus d'une minute avant de refuser.
      minuteur = setTimeout(() => arretEssai.abort(), DELAI_PREMIER_MORCEAU);
      const flux = await clientGemini.models.generateContentStream({
        model: modele,
        contents: contenu,
        // Réflexion minimale : le dossier est déjà préparé, une longue
        // réflexion ne fait que retarder le premier mot (voir MODELES_GEMINI).
        config: {
          systemInstruction: systeme,
          maxOutputTokens: MAX_SORTIE,
          thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL },
          tools: [{ functionDeclarations: DECLARATIONS }],
          // Au dernier tour, plus de recherche possible : il doit rédiger avec
          // ce qu'il a trouvé (constaté le 13/11/2026 : sinon il enchaîne les
          // recherches et ne répond jamais).
          toolConfig: { functionCallingConfig: { mode: tour < MAX_RECHERCHES ? FunctionCallingConfigMode.AUTO : FunctionCallingConfigMode.NONE } },
          abortSignal: arretEssai.signal,
        },
      });
      let usage = null;
      let fin = null;
      const partiesModele = [];
      const appels = [];
      for await (const morceau of flux) {
        const parties = morceau.candidates?.[0]?.content?.parts ?? [];
        if (parties.length && minuteur) {
          clearTimeout(minuteur);
          minuteur = null;
        }
        // On garde les parties telles quelles (signatures de réflexion
        // comprises) : Gemini 3 les exige quand on lui renvoie un appel d'outil.
        partiesModele.push(...parties);
        for (const p of parties) {
          if (p.functionCall) appels.push(p.functionCall);
          else if (p.text && !p.thought) {
            aEcrit = true;
            filtre.ecrire(p.text);
          }
        }
        if (morceau.usageMetadata) usage = morceau.usageMetadata;
        const raison = morceau.candidates?.[0]?.finishReason;
        if (raison) fin = raison;
      }
      if (minuteur) {
        clearTimeout(minuteur);
        minuteur = null;
      }
      console.log(
        `[coach] ${modele} tour=${tour} entree=${usage?.promptTokenCount ?? "?"} sortie=${usage?.candidatesTokenCount ?? "?"} reflexion=${usage?.thoughtsTokenCount ?? 0} appels=${appels.length} fin=${fin ?? "?"}`
      );
      if (fin === "SAFETY" || fin === "PROHIBITED_CONTENT" || fin === "BLOCKLIST") {
        return { erreur: "Je ne peux pas répondre à cette question. Reformule-la, ou pose-la à un professionnel de santé." };
      }
      filtre.vider();
      if (appels.length === 0) {
        if (fin === "MAX_TOKENS") ecrire("…");
        if (!aEcrit) return aCherche ? { erreur: MSG_ECHEC } : { relais: true };
        return { ok: true };
      }
      // Le modèle demande une recherche : on l'exécute et on lui renvoie les
      // études, puis il rédige sa réponse au tour suivant.
      aCherche = true;
      ecrire(MARQUEUR_RECHERCHE);
      contenu.push({ role: "model", parts: partiesModele });
      const reponses = [];
      // Les recherches demandées en même temps partent en parallèle.
      const resultats = await Promise.all(
        appels.slice(0, 3).map(async (appel) => {
          const outil = OUTILS[appel.name];
          if (!outil) return { erreur: "Outil inconnu." };
          try {
            const liste = await outil.executer(appel.args?.requete);
            console.log(`[coach] ${appel.name} « ${String(appel.args?.requete ?? "").slice(0, 80)} » : ${liste.length} résultat(s)`);
            for (const r of liste) if (r.lien) autorises.add(r.lien);
            return { [outil.cle]: liste, nombre: liste.length };
          } catch (e) {
            console.error(`[coach] échec ${appel.name} :`, e?.message);
            return { erreur: "Recherche indisponible pour le moment. Réponds sans cette source, et précise en une phrase que la recherche n'a pas abouti." };
          }
        })
      );
      appels.slice(0, 3).forEach((appel, k) => reponses.push({ functionResponse: { id: appel.id, name: appel.name, response: resultats[k] } }));
      // Dernier tour : consigne explicite en plus du mode NONE, que le modèle
      // n'a pas toujours respecté seul (13/11/2026).
      if (tour + 1 >= MAX_RECHERCHES) reponses.push({ text: "Plus de recherche possible : rédige maintenant ta réponse avec les sources déjà trouvées (ou sans source si rien n'est pertinent)." });
      contenu.push({ role: "user", parts: reponses });
    }
    return aEcrit ? { ok: true } : { erreur: MSG_ECHEC };
  } catch (e) {
    filtre.vider();
    if (signal.aborted) return { ok: true };
    const statut = e instanceof GeminiApiError ? e.status : null;
    const muet = arretEssai.signal.aborted;
    console.error(`[coach] échec ${modele} :`, muet ? "délai dépassé" : (statut ?? e?.name));
    // Google répond 400 (et non 401) quand la clé est invalide.
    if (statut === 401 || statut === 403 || (statut === 400 && /api[ _-]?key/i.test(e?.message ?? ""))) return { erreur: MSG_CLE };
    if (!aEcrit && !aCherche && (muet || statut === 429 || statut === 503 || statut === 500 || statut === 404)) return { relais: true };
    if (aEcrit) return { erreur: MSG_COUPEE };
    return { erreur: aCherche && (muet || statut === 429 || statut === 503) ? MSG_SURCHARGE : MSG_ECHEC };
  } finally {
    if (minuteur) clearTimeout(minuteur);
    signal.removeEventListener("abort", surArret);
  }
}

async function repondreGemini(params) {
  if (!clientGemini) clientGemini = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  for (const modele of MODELES_GEMINI) {
    const r = await essaiGemini(modele, params);
    if (r.ok) return null;
    if (r.erreur) return r.erreur;
    if (params.signal.aborted) return null;
  }
  return MSG_SURCHARGE;
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
  // Lecture de la base lancée tout de suite, en parallèle de la question.
  const contexteP = construireContexte();
  contexteP.catch(() => {});

  let corps;
  try {
    corps = await request.json();
  } catch {
    return Response.json({ erreur: "requete-invalide" }, { status: 400 });
  }
  const messages = messagesValides(corps?.messages);
  if (!messages) return Response.json({ erreur: "requete-invalide" }, { status: 400 });

  const systeme = `${ROLE}\n\nDonnées d'Issa, lues dans l'app à l'instant :\n\n${await contexteP}`;
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
