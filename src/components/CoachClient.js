"use client";

import { useEffect, useRef, useState } from "react";
import PageHeader from "@/components/PageHeader";
import { MARQUEUR_RECHERCHE } from "@/lib/coachMarqueur";

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

export default function CoachClient({ service = "l'IA" }) {
  const [messages, setMessages] = useState([]);
  const [saisie, setSaisie] = useState("");
  const [enCours, setEnCours] = useState(false);
  const [inactif, setInactif] = useState(false);
  const [recherche, setRecherche] = useState(false);
  const finRef = useRef(null);
  const charge = useRef(false);

  useEffect(() => {
    const id = setTimeout(() => {
      try {
        const brut = JSON.parse(window.localStorage.getItem(CLE) || "[]");
        if (Array.isArray(brut)) setMessages(brut);
      } catch {
        // Conversation illisible : on repart de zéro.
      }
      charge.current = true;
    }, 0);
    return () => clearTimeout(id);
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

  async function envoyer(question) {
    const texte = question.trim();
    if (!texte || enCours) return;
    const historique = [...messages, { role: "user", content: texte }];
    setMessages([...historique, { role: "assistant", content: "" }]);
    setSaisie("");
    setEnCours(true);
    try {
      const rep = await fetch("/api/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: historique.slice(-40) }),
      });
      if (rep.status === 503) {
        setInactif(true);
        setMessages(historique.slice(0, -1));
        setSaisie(texte);
        return;
      }
      if (!rep.ok || !rep.body) throw new Error(String(rep.status));
      const lecteur = rep.body.getReader();
      const decodeur = new TextDecoder();
      let reponse = "";
      for (;;) {
        const { done, value } = await lecteur.read();
        if (done) break;
        reponse += decodeur.decode(value, { stream: true });
        // Pendant une recherche d'études, le serveur envoie un marqueur : on
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
      setMessages([...historique, { role: "assistant", content: "⚠︎ Le coach n'a pas pu répondre. Vérifie ta connexion et réessaie." }]);
    } finally {
      setEnCours(false);
      setRecherche(false);
    }
  }

  function nouvelle() {
    if (enCours) return;
    setMessages([]);
  }

  const vide = messages.length === 0;

  return (
    <div className="mx-auto flex max-w-3xl flex-col px-5 py-8 sm:px-10 sm:py-10">
      <PageHeader
        kicker="Coach"
        title="Ton coach"
        subtitle="Nutritionniste, coach muscu et prof d'anatomie : il lit tes scans, tes bilans et tes objectifs."
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
              <div className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-md bg-white px-4 py-3 text-sm text-[#06080c]">{m.content}</div>
            </div>
          ) : (
            <div key={i} className="verre max-w-[92%] rounded-2xl rounded-bl-md px-4 py-3 text-sm leading-relaxed">
              {m.content ? (
                <Texte texte={m.content} />
              ) : recherche && i === messages.length - 1 ? (
                <span className="coach-attente text-xs">Recherche de sources (études, presse)…</span>
              ) : (
                <span className="coach-attente" aria-label="Le coach réfléchit">●●●</span>
              )}
            </div>
          )
        )}
        <div ref={finRef} />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          envoyer(saisie);
        }}
        className="sticky bottom-28 mt-6 flex items-end gap-2 sm:bottom-6"
      >
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
          placeholder="Écris ta question…"
          aria-label="Ta question au coach"
          className="max-h-40 min-h-12 flex-1 resize-none rounded-2xl border border-white/12 bg-[#0a0f15] px-4 py-3 text-base outline-none focus:border-accent/60"
        />
        <button
          type="submit"
          disabled={enCours || !saisie.trim()}
          className="h-12 shrink-0 rounded-full bg-white px-5 text-sm font-semibold text-[#06080c] transition disabled:opacity-40"
        >
          Envoyer
        </button>
      </form>
      <p className="mt-3 text-[11px] text-foreground-muted">
        Pour répondre, tes chiffres sont envoyés à {service}. La conversation reste sur ce téléphone. Pas un avis médical.
      </p>
      <style>{`.coach-attente{letter-spacing:.2em;opacity:.5;animation:coach-pulse 1.2s ease-in-out infinite}@keyframes coach-pulse{50%{opacity:.15}}`}</style>
    </div>
  );
}
