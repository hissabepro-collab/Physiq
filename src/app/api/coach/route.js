import Anthropic from "@anthropic-ai/sdk";
import { GoogleGenAI, ApiError as GeminiApiError, ThinkingLevel, FunctionCallingConfigMode } from "@google/genai";
import { construireContexte } from "@/lib/coachContexte";
import { ROLE } from "@/lib/coachRole";
import { fournisseurCoach } from "@/lib/coachFournisseur";
import { rechercherEtudes } from "@/lib/rechercheEtudes";
import { rechercherPresse } from "@/lib/recherchePresse";
import { MARQUEUR_RECHERCHE } from "@/lib/coachMarqueur";
import { creerFiltreLiens } from "@/lib/filtreLiens";
import { ajouterNote } from "@/lib/coachMemoire";

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

// Photo jointe à la dernière question : envoyée à l'IA avec elle, jamais
// stockée (ni sur le serveur, ni dans la conversation gardée sur le téléphone).
const TYPES_IMAGE = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_IMAGE_BASE64 = 3_000_000; // ~2,2 Mo : la page réduit la photo avant envoi (limite Vercel 4,5 Mo par requête)

function imageValide(img) {
  if (!img || typeof img !== "object") return null;
  if (!TYPES_IMAGE.has(img.type) || typeof img.donnees !== "string") return null;
  if (img.donnees.length > MAX_IMAGE_BASE64 || !/^[A-Za-z0-9+/=]+$/.test(img.donnees.slice(0, 200))) return null;
  return { type: img.type, donnees: img.donnees };
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
  const image = imageValide(brut.at(-1)?.image);
  if (image) messages.at(-1).image = image;
  return messages;
}

// Questions qui appellent une source : la première étape oblige alors le
// modèle à chercher (Flash-Lite ne le faisait pas toujours de lui-même).
const BESOIN_SOURCE =
  /cr[ée]atine|compl[ée]ment|suppl[ée]ment|whey|cas[ée]ine|caf[ée]ine|vitamine|om[ée]ga|magn[ée]sium|collag[èe]ne|bcaa|glutamine|ashwagandha|r[ée]gime|je[uû]ne|keto|c[ée]tog|[ée]tude|scientifi|prouv[ée]|preuve|actualit|presse|article|tendance|mythe|id[ée]e re[çc]ue|est-ce vrai|c'est vrai|efficace|dangereux/i;

// Modes spéciaux, déclenchés par la page (analyse après un import de scan,
// bilan de la semaine) : consignes ajoutées au rôle pour cette réponse.
const CONSIGNES_MODE = {
  scan: `## Mode : analyse du dernier scan
Issa vient d'importer un scan. Fais-lui une analyse complète mais lisible sur téléphone :
1. Les 3 ou 4 indicateurs qui comptent le plus (masse grasse, SMM, eau, score, segments si utile), avec leur valeur, leur plage normale et l'écart avec le scan précédent s'il existe.
2. Ce qui est fiable et ce qui peut venir des conditions de mesure ou de l'hydratation (eau intra et extracellulaire, ratio). Avec un seul scan, présente-le comme le point de départ, sans tendance.
3. Le lien avec ses habitudes des deux dernières semaines (séances, alimentation, sommeil, carnet d'entraînement), avec prudence.
4. Le cap des deux semaines jusqu'au prochain scan : 2 ou 3 actions chiffrées.
Pas de recherche de sources pour ce mode, sauf si un chiffre l'exige vraiment.`,
  semaine: `## Mode : bilan de la semaine
Fais le bilan de la semaine qui se termine (ou en cours) à partir de ses bilans hebdomadaires et de son carnet d'entraînement : séances faites contre l'objectif, progression des charges, jours d'alimentation tenus, sommeil nuit par nuit (hors vendredi et samedi), ressenti et note éventuelle. Compare à la semaine précédente. Termine par le cap de la semaine qui vient : 2 ou 3 actions chiffrées et réalistes. Ton encourageant mais honnête. 8 à 14 lignes. Pas de recherche de sources.`,
};

function partiesQuestion(m) {
  const parties = [{ text: m.content }];
  if (m.image) parties.unshift({ inlineData: { mimeType: m.image.type, data: m.image.donnees } });
  return parties;
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
  memoriser: {
    // Pas une recherche : écrit une note dans la mémoire du coach (base).
    memoire: true,
    executer: async (args) => {
      const r = await ajouterNote(args?.note, "coach");
      return r.erreur ? { erreur: r.erreur } : { enregistre: r.note.texte, dejaConnu: Boolean(r.deja) };
    },
    declaration: {
      name: "memoriser",
      description:
        "Enregistre dans ta mémoire permanente une information durable sur Issa, que tu relis à chaque question : préférence, contrainte, blessure ou gêne, horaires, matériel disponible, goûts alimentaires, objectif personnel, ou consigne sur ta façon de répondre. Pas pour une donnée passagère ni pour ce qui est déjà dans son dossier.",
      parametersJsonSchema: {
        type: "object",
        properties: {
          note: { type: "string", description: "Une phrase courte et autonome, à la 3e personne. Ex. : « S'entraîne le soir vers 19 h, en salle. » ; « Veut des réponses plus courtes. »" },
        },
        required: ["note"],
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
async function essaiGemini(modele, { systeme, messages, ecrire, signal, forcerRecherche = false, suite = null }) {
  const arretEssai = new AbortController();
  const surArret = () => arretEssai.abort();
  signal.addEventListener("abort", surArret);
  let minuteur = null;
  let aEcrit = false;
  let aCherche = false;
  // Texte déjà envoyé : sert à faire reprendre la suite par un autre modèle
  // si celui-ci tombe en pleine réponse.
  let texteEcrit = suite ?? "";
  // Liens réellement renvoyés par les recherches de cette réponse : seuls
  // ceux-là peuvent apparaître dans le texte (voir lib/filtreLiens).
  const autorises = new Set();
  const filtre = creerFiltreLiens(autorises, (t) => {
    texteEcrit += t;
    ecrire(t);
  });
  const contenu = messages.map((m) => ({ role: m.role === "assistant" ? "model" : "user", parts: m.role === "user" ? partiesQuestion(m) : [{ text: m.content }] }));
  if (suite) {
    // Reprise : le modèle voit le début déjà affiché et continue sans le répéter.
    contenu.push({ role: "model", parts: [{ text: suite }] });
    contenu.push({ role: "user", parts: [{ text: "Ta réponse a été coupée. Continue exactement là où elle s'arrête, sans répéter ni réintroduire ce qui précède, et sans le signaler." }] });
  }
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
          toolConfig: {
            functionCallingConfig:
              suite || tour >= MAX_RECHERCHES
                ? { mode: FunctionCallingConfigMode.NONE }
                : tour === 0 && forcerRecherche
                  ? { mode: FunctionCallingConfigMode.ANY, allowedFunctionNames: ["rechercher_etudes", "rechercher_presse"] }
                  : { mode: FunctionCallingConfigMode.AUTO },
          },
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
        // Rien d'écrit (même après une recherche ou une note) : le modèle
        // suivant reprend la question ; la mémoire ignore les doublons.
        if (!aEcrit) return { relais: true };
        return { ok: true };
      }
      // Le modèle demande une recherche : on l'exécute et on lui renvoie les
      // études, puis il rédige sa réponse au tour suivant.
      aCherche = true;
      if (appels.some((a) => !OUTILS[a.name]?.memoire)) ecrire(MARQUEUR_RECHERCHE);
      contenu.push({ role: "model", parts: partiesModele });
      const reponses = [];
      // Les recherches demandées en même temps partent en parallèle.
      const resultats = await Promise.all(
        appels.slice(0, 3).map(async (appel) => {
          const outil = OUTILS[appel.name];
          if (!outil) return { erreur: "Outil inconnu." };
          try {
            if (outil.memoire) {
              const r = await outil.executer(appel.args);
              console.log(`[coach] memoriser : ${r.erreur ? "refus" : r.dejaConnu ? "déjà connu" : "note ajoutée"}`);
              return r;
            }
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
    if (!aEcrit && (muet || statut === 429 || statut === 503 || statut === 500 || statut === 404)) return { relais: true };
    if (aEcrit) return { coupee: true, texte: texteEcrit };
    return { erreur: aCherche && (muet || statut === 429 || statut === 503) ? MSG_SURCHARGE : MSG_ECHEC };
  } finally {
    if (minuteur) clearTimeout(minuteur);
    signal.removeEventListener("abort", surArret);
  }
}

async function repondreGemini(params) {
  if (!clientGemini) clientGemini = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  let suite = null;
  for (const modele of MODELES_GEMINI) {
    const r = await essaiGemini(modele, { ...params, suite, forcerRecherche: params.forcerRecherche && !suite });
    if (r.ok) return null;
    if (r.erreur) return r.erreur;
    if (params.signal.aborted) return null;
    // Coupée en pleine réponse : le modèle suivant reprend la suite.
    if (r.coupee) {
      console.log(`[coach] réponse coupée sur ${modele}, reprise par le modèle suivant`);
      suite = r.texte;
    }
  }
  return suite ? MSG_COUPEE : MSG_SURCHARGE;
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
        messages: messages.map((m) =>
          m.image
            ? { role: m.role, content: [{ type: "image", source: { type: "base64", media_type: m.image.type, data: m.image.donnees } }, { type: "text", text: m.content }] }
            : { role: m.role, content: m.content }
        ),
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

  const mode = CONSIGNES_MODE[corps?.mode] ? corps.mode : null;
  const derniere = messages.at(-1);
  const forcerRecherche = !mode && !derniere.image && BESOIN_SOURCE.test(derniere.content);
  const systeme = `${ROLE}${mode ? `\n\n${CONSIGNES_MODE[mode]}` : ""}\n\nDonnées d'Issa, lues dans l'app à l'instant :\n\n${await contexteP}`;
  const repondre = fournisseur === "gemini" ? repondreGemini : repondreClaude;
  const arret = new AbortController();
  const encodeur = new TextEncoder();

  const sortie = new ReadableStream({
    async start(controleur) {
      const ecrire = (t) => controleur.enqueue(encodeur.encode(t));
      try {
        const erreur = await repondre({ systeme, messages, ecrire, signal: arret.signal, forcerRecherche });
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
