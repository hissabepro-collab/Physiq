"use client";

import { useEffect, useRef, useState } from "react";
import PageHeader from "@/components/PageHeader";
import { MARQUEUR_RECHERCHE } from "@/lib/coachMarqueur";
import MemoireCoach from "@/components/MemoireCoach";

// Coach IA. La conversation reste sur le téléphone (localStorage) ; le
// serveur ne la stocke pas. Chaque question part avec l'historique et le
// serveur y ajoute le résumé des données (voir /api/coach).

const CLE = "physiq-coach";
const SUGGESTIONS = [
  "Que disent mes derniers chiffres ?",
  "Fais-moi une journée type de repas avec assez de protéines",
  "Propose-moi une séance haut du corps",
  "Quels muscles travaillent au développé couché, et pourquoi ?",
  "Mon sommeil freine-t-il mes résultats ?",
  "La créatine m'aiderait ? Donne-moi des études",
];

// Mise en forme légère, sans HTML injecté : **gras**, listes « - », paragraphes.
// Liens Markdown [texte](https://…) : seuls les liens https sont rendus
// cliquables (le serveur ne laisse passer que ceux des recherches réelles).
function enLigne(texte) {
  return texte.split(/(\*\*[^*]+\*\*|\[[^\]\n]+\]\(https:\/\/[^)\s]+\))/g).map((p, i) => {
    if (p.startsWith("**") && p.endsWith("**") && p.length > 4) return <strong key={i}>{enLigne(p.slice(2, -2))}</strong>;
    const lien = p.match(/^\[([^\]\n]+)\]\((https:\/\/[^)\s]+)\)$/);
    if (lien) {
      return (
        <a key={i} href={lien[2]} target="_blank" rel="noopener noreferrer" className="text-accent underline underline-offset-2">
          {lien[1]}
        </a>
      );
    }
    return p;
  });
}

function Texte({ texte }) {
  const blocs = [];
  let liste = null;
  texte.split("\n").forEach((ligne, i) => {
    const puce = ligne.match(/^\s*(?:[-*•]|\d+[.)])\s+(.*)$/);
    if (puce) {
      if (!liste) {
        liste = [];
        blocs.push(<ul key={`l${i}`} className="my-2 list-disc space-y-1 pl-5">{liste}</ul>);
      }
      liste.push(<li key={i}>{enLigne(puce[1])}</li>);
    } else {
      liste = null;
      if (ligne.trim()) blocs.push(<p key={i} className="my-2 first:mt-0 last:mb-0">{enLigne(ligne)}</p>);
    }
  });
  return <>{blocs}</>;
}

// Réduit une photo avant l'envoi : 1 280 px au plus, JPEG. Une requête ne
// peut pas dépasser 4,5 Mo sur Vercel, et une photo d'iPhone en fait souvent
// plus. Renvoie { type, donnees (base64 sans préfixe), apercu (data URL) }.
async function preparerPhoto(fichier) {
  const url = URL.createObjectURL(fichier);
  try {
    const img = await new Promise((ok, ko) => {
      const i = new Image();
      i.onload = () => ok(i);
      i.onerror = ko;
      i.src = url;
    });
    const echelle = Math.min(1, 1280 / Math.max(img.naturalWidth, img.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.naturalWidth * echelle);
    canvas.height = Math.round(img.naturalHeight * echelle);
    canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
    const apercu = canvas.toDataURL("image/jpeg", 0.82);
    return { type: "image/jpeg", donnees: apercu.split(",")[1], apercu };
  } finally {
    URL.revokeObjectURL(url);
  }
}

// Avis sur une réponse : 👍 se garde sur le téléphone ; 👎 avec une raison
// devient une note de la mémoire du coach (« Retour d'Issa… »), qu'il
// applique ensuite comme une consigne de qualité.
function AvisReponse({ avis, onAvis }) {
  const [raison, setRaison] = useState("");
  const [ouvert, setOuvert] = useState(false);
  const [etat, setEtat] = useState(null);

  async function envoyerRaison(e) {
    e.preventDefault();
    const texte = raison.trim();
    if (!texte) return;
    setEtat("envoi");
    try {
      const rep = await fetch("/api/coach/memoire", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ texte: `Retour d'Issa sur une réponse : ${texte}` }),
      });
      if (!rep.ok) throw new Error();
      setEtat("ok");
      setOuvert(false);
    } catch {
      setEtat("echec");
    }
  }

  return (
    <div className="mt-2">
      <div className="flex items-center gap-1 text-foreground-muted">
        <button
          type="button"
          onClick={() => onAvis(avis === "bien" ? null : "bien")}
          aria-label="Réponse utile"
          aria-pressed={avis === "bien"}
          className={`flex h-9 w-9 items-center justify-center rounded-full text-sm transition ${avis === "bien" ? "bg-white/10 text-foreground" : "hover:text-foreground"}`}
        >
          👍
        </button>
        <button
          type="button"
          onClick={() => {
            onAvis(avis === "mal" ? null : "mal");
            setOuvert(avis !== "mal");
          }}
          aria-label="Réponse à améliorer"
          aria-pressed={avis === "mal"}
          className={`flex h-9 w-9 items-center justify-center rounded-full text-sm transition ${avis === "mal" ? "bg-white/10 text-foreground" : "hover:text-foreground"}`}
        >
          👎
        </button>
        {etat === "ok" && <span className="text-[11px] text-accent">Noté, il en tiendra compte.</span>}
      </div>
      {ouvert && avis === "mal" && etat !== "ok" && (
        <form onSubmit={envoyerRaison} className="mt-1 flex items-center gap-2">
          <input
            value={raison}
            onChange={(e) => setRaison(e.target.value)}
            maxLength={200}
            placeholder="Qu'est-ce qui n'allait pas ? (trop long, faux…)"
            aria-label="Ce qui n'allait pas dans la réponse"
            className="h-10 min-w-0 flex-1 rounded-xl border border-white/12 bg-[#0a0f15] px-3 text-sm outline-none focus:border-accent/60"
          />
          <button type="submit" disabled={!raison.trim() || etat === "envoi"} className="h-10 shrink-0 rounded-full bg-white px-3 text-xs font-semibold text-[#06080c] disabled:opacity-40">
            Envoyer
          </button>
        </form>
      )}
      {etat === "echec" && <p className="text-[11px] text-coral">Ton avis n&apos;a pas pu être enregistré.</p>}
    </div>
  );
}

// Copie de secours (ancienne méthode) quand l'API du presse-papiers refuse.
function copierSecours(texte) {
  const zone = document.createElement("textarea");
  zone.value = texte;
  zone.setAttribute("readonly", "");
  zone.style.cssText = "position:fixed;top:0;left:0;opacity:0";
  document.body.appendChild(zone);
  zone.select();
  zone.setSelectionRange(0, texte.length);
  let ok = false;
  try {
    ok = document.execCommand("copy");
  } catch {
    ok = false;
  }
  zone.remove();
  return ok;
}

function BoutonCopier({ texte }) {
  const [copie, setCopie] = useState(false);
  const confirmer = () => {
    setCopie(true);
    setTimeout(() => setCopie(false), 1500);
  };
  return (
    <button
      type="button"
      onClick={() => {
        const secours = () => copierSecours(texte) && confirmer();
        // L'API peut rester en attente sans jamais répondre (page sans focus) :
        // au bout de 0,8 s, la méthode de secours prend le relais.
        try {
          Promise.race([
            navigator.clipboard.writeText(texte),
            new Promise((_, ko) => setTimeout(() => ko(new Error("délai")), 800)),
          ]).then(confirmer, secours);
        } catch {
          secours();
        }
      }}
      className="h-9 rounded-full px-3 text-[11px] font-semibold text-foreground-muted transition hover:text-foreground"
    >
      {copie ? "Copié ✓" : "Copier"}
    </button>
  );
}

export default function CoachClient({ service = "l'IA" }) {
  const [messages, setMessages] = useState([]);
  const [saisie, setSaisie] = useState("");
  const [enCours, setEnCours] = useState(false);
  const [inactif, setInactif] = useState(false);
  const [recherche, setRecherche] = useState(false);
  const [photo, setPhoto] = useState(null);
  const [erreurPhoto, setErreurPhoto] = useState(null);
  // Compteur de réponses terminées : la mémoire se relit après chacune.
  const [reponses, setReponses] = useState(0);
  const finRef = useRef(null);
  const charge = useRef(false);
  const arretRef = useRef(null);
  const fichierRef = useRef(null);
  const auto = useRef(false);

  useEffect(() => {
    const id = setTimeout(() => {
      let historique = [];
      try {
        const brut = JSON.parse(window.localStorage.getItem(CLE) || "[]");
        if (Array.isArray(brut)) historique = brut;
      } catch {
        // Conversation illisible : on repart de zéro.
      }
      setMessages(historique);
      charge.current = true;
      // Question préparée par une autre page (carnet, scan, bilan) :
      // /coach?q=…&mode=scan|semaine. Envoyée une seule fois, puis retirée
      // de l'adresse pour ne pas repartir au rechargement.
      if (!auto.current) {
        auto.current = true;
        const params = new URLSearchParams(window.location.search);
        const q = params.get("q");
        if (q) {
          window.history.replaceState(null, "", "/coach");
          envoyer(q.slice(0, 4000), { historique, mode: params.get("mode") });
        }
      }
    }, 0);
    return () => clearTimeout(id);
    // envoyer est stable pour ce premier chargement.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!charge.current || enCours) return;
    try {
      window.localStorage.setItem(CLE, JSON.stringify(messages.slice(-40)));
    } catch {
      // Stockage indisponible : la conversation ne sera pas gardée.
    }
  }, [messages, enCours]);

  useEffect(() => {
    finRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  async function choisirPhoto(e) {
    const fichier = e.target.files?.[0];
    e.target.value = "";
    if (!fichier) return;
    setErreurPhoto(null);
    try {
      setPhoto(await preparerPhoto(fichier));
    } catch {
      setErreurPhoto("Cette photo n'a pas pu être lue. Essaie avec une autre (JPEG ou PNG).");
    }
  }

  async function envoyer(question, options = {}) {
    const texte = question.trim() || (photo ? "Que penses-tu de cette photo ?" : "");
    if (!texte || enCours) return;
    const base = options.historique ?? messages;
    const image = options.historique ? null : photo;
    // La photo part avec la question mais n'est pas gardée dans la
    // conversation : seule une mention « photo jointe » y reste.
    const historique = [...base, { role: "user", content: texte, ...(image ? { photo: true } : {}) }];
    setMessages([...historique, { role: "assistant", content: "" }]);
    setSaisie("");
    setPhoto(null);
    setEnCours(true);
    const arret = new AbortController();
    arretRef.current = arret;
    let reponse = "";
    try {
      const envoi = historique.slice(-40).map((m) => ({ role: m.role, content: m.content }));
      if (image) envoi[envoi.length - 1].image = { type: image.type, donnees: image.donnees };
      const rep = await fetch("/api/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: envoi, mode: options.mode ?? undefined }),
        signal: arret.signal,
      });
      if (rep.status === 503) {
        setInactif(true);
        setMessages(base);
        setSaisie(texte);
        return;
      }
      if (!rep.ok || !rep.body) throw new Error(String(rep.status));
      const lecteur = rep.body.getReader();
      const decodeur = new TextDecoder();
      for (;;) {
        const { done, value } = await lecteur.read();
        if (done) break;
        reponse += decodeur.decode(value, { stream: true });
        // Pendant une recherche de sources, le serveur envoie un marqueur : on
        // l'enlève du texte et on affiche l'état tant qu'aucun mot n'arrive.
        if (reponse.includes(MARQUEUR_RECHERCHE)) {
          reponse = reponse.split(MARQUEUR_RECHERCHE).join("");
          setRecherche(true);
        }
        if (reponse.trim()) setRecherche(false);
        setMessages([...historique, { role: "assistant", content: reponse }]);
      }
      if (!reponse.trim()) throw new Error("vide");
    } catch {
      if (arret.signal.aborted) {
        setMessages([...historique, { role: "assistant", content: reponse.trim() ? `${reponse}\n\n(réponse arrêtée)` : "(réponse arrêtée)" }]);
      } else {
        setMessages([...historique, { role: "assistant", content: "⚠︎ Le coach n'a pas pu répondre. Vérifie ta connexion et réessaie." }]);
      }
    } finally {
      arretRef.current = null;
      setEnCours(false);
      setRecherche(false);
      setReponses((n) => n + 1);
    }
  }

  function nouvelle() {
    if (enCours) return;
    setMessages([]);
  }

  const definirAvis = (i, avis) => setMessages((liste) => liste.map((m, j) => (j === i ? { ...m, avis } : m)));
  const vide = messages.length === 0;

  return (
    <div className="mx-auto flex max-w-3xl flex-col px-5 py-8 sm:px-10 sm:py-10">
      <PageHeader
        kicker="Coach"
        title="Ton coach"
        subtitle="Nutritionniste, coach muscu et prof d'anatomie : il lit tes scans, tes bilans, ton carnet et tes objectifs."
        action={
          !vide && (
            <button
              type="button"
              onClick={nouvelle}
              disabled={enCours}
              className="h-11 rounded-full border border-white/15 px-4 text-sm font-semibold text-foreground-muted transition hover:text-foreground disabled:opacity-40"
            >
              Nouvelle conversation
            </button>
          )
        }
      />

      {inactif && (
        <div className="mt-6 rounded-2xl border border-coral/40 bg-coral/10 p-4 text-sm">
          Le coach n&apos;est pas encore activé : il manque la clé <strong>GEMINI_API_KEY</strong> dans les réglages Vercel.
        </div>
      )}

      <div className="mt-6 space-y-4">
        {vide && (
          <div className="verre rounded-2xl p-5">
            <p className="text-sm text-foreground-muted">Pose ta question, ou commence par :</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => envoyer(s)}
                  className="min-h-11 rounded-full border border-white/12 bg-white/[0.03] px-4 py-2 text-left text-sm transition hover:border-accent/50"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) =>
          m.role === "user" ? (
            <div key={i} className="flex justify-end">
              <div className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-md bg-white px-4 py-3 text-sm text-[#06080c]">
                {m.photo && <span className="mb-1 block text-xs font-semibold opacity-60">📷 Photo jointe</span>}
                {m.content}
              </div>
            </div>
          ) : (
            <div key={i} className="max-w-[92%]">
              <div className="verre rounded-2xl rounded-bl-md px-4 py-3 text-sm leading-relaxed">
                {m.content ? (
                  <Texte texte={m.content} />
                ) : recherche && i === messages.length - 1 ? (
                  <span className="coach-attente text-xs">Recherche de sources (études, presse)…</span>
                ) : (
                  <span className="coach-attente" aria-label="Le coach réfléchit">●●●</span>
                )}
              </div>
              {m.content && !(enCours && i === messages.length - 1) && !m.content.startsWith("⚠︎") && (
                <div className="flex items-start justify-between gap-2">
                  <AvisReponse avis={m.avis ?? null} onAvis={(a) => definirAvis(i, a)} />
                  <div className="mt-2">
                    <BoutonCopier texte={m.content} />
                  </div>
                </div>
              )}
            </div>
          )
        )}
        {/* Marge : le dernier message ne finit pas sous la barre de navigation. */}
        <div ref={finRef} className="scroll-mb-44" />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          envoyer(saisie);
        }}
        // Fond opaque : sans lui, les messages défilaient visiblement derrière
        // la zone de saisie collée en bas (constaté le 13/11/2026).
        className="sticky bottom-28 z-10 -mx-2 mt-6 rounded-3xl bg-[#050a0e] px-2 py-2 sm:bottom-6"
      >
        {photo && (
          <div className="mb-2 flex items-center gap-2 rounded-2xl border border-white/12 bg-[#0a0f15] p-2">
            {/* Aperçu local (data URL) : next/image n'apporte rien ici. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photo.apercu} alt="Photo jointe" className="h-12 w-12 rounded-lg object-cover" />
            <span className="flex-1 text-xs text-foreground-muted">Photo jointe à ta prochaine question (non conservée)</span>
            <button type="button" onClick={() => setPhoto(null)} aria-label="Retirer la photo" className="flex h-11 w-11 items-center justify-center text-foreground-muted hover:text-coral">
              ✕
            </button>
          </div>
        )}
        {erreurPhoto && <p className="mb-2 text-xs text-coral">{erreurPhoto}</p>}
        <div className="flex items-end gap-2">
          <input ref={fichierRef} type="file" accept="image/*" onChange={choisirPhoto} className="hidden" />
          <button
            type="button"
            onClick={() => fichierRef.current?.click()}
            disabled={enCours}
            aria-label="Joindre une photo (repas, physique, exercice, étiquette)"
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-white/12 bg-[#0a0f15] text-lg disabled:opacity-40"
          >
            📷
          </button>
          <textarea
            value={saisie}
            onChange={(e) => setSaisie(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && window.matchMedia("(pointer: fine)").matches) {
                e.preventDefault();
                envoyer(saisie);
              }
            }}
            rows={1}
            maxLength={4000}
            placeholder={photo ? "Ta question sur la photo…" : "Écris ta question…"}
            aria-label="Ta question au coach"
            className="max-h-40 min-h-12 min-w-0 flex-1 resize-none rounded-2xl border border-white/12 bg-[#0a0f15] px-4 py-3 text-base outline-none focus:border-accent/60"
          />
          {enCours ? (
            <button
              type="button"
              onClick={() => arretRef.current?.abort()}
              className="h-12 shrink-0 rounded-full border border-white/25 px-5 text-sm font-semibold"
            >
              Stop
            </button>
          ) : (
            <button
              type="submit"
              disabled={!saisie.trim() && !photo}
              className="h-12 shrink-0 rounded-full bg-white px-5 text-sm font-semibold text-[#06080c] transition disabled:opacity-40"
            >
              Envoyer
            </button>
          )}
        </div>
      </form>
      <p className="mt-3 text-[11px] text-foreground-muted">
        Pour répondre, tes chiffres sont envoyés à {service}. La conversation reste sur ce téléphone ; seules les notes
        « Ce que le coach retient » sont gardées sur ton compte. Les photos ne sont jamais conservées. Pas un avis médical.
      </p>
      <MemoireCoach version={reponses} />
      <style>{`.coach-attente{letter-spacing:.2em;opacity:.5;animation:coach-pulse 1.2s ease-in-out infinite}@keyframes coach-pulse{50%{opacity:.15}}`}</style>
    </div>
  );
}
