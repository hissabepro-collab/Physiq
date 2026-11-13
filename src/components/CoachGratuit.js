"use client";

import { useState } from "react";
import PageHeader from "@/components/PageHeader";

// Coach en mode gratuit : l'app prépare le dossier (consignes du coach +
// données du moment + question), le copie, puis ouvre Claude où il suffit de
// coller. Aucune clé d'API, aucun coût. Les données ne passent pas dans
// l'adresse : seulement par le presse-papiers.

const SUGGESTIONS = [
  "Que disent mes derniers chiffres ?",
  "Que changer cette semaine ?",
  "Mon sommeil freine-t-il mes résultats ?",
  "Comment passer au rang suivant ?",
];

const URL_CLAUDE = "https://claude.ai/new";

export default function CoachGratuit({ dossier }) {
  const [question, setQuestion] = useState("");
  const [etat, setEtat] = useState(null);
  const [apercu, setApercu] = useState(false);

  function texteFinal() {
    const q = question.trim() || "Fais-moi un point rapide sur ma situation et dis-moi quoi faire cette semaine.";
    return `${dossier}\n\nMa question : ${q}`;
  }

  // Copie lancée dans le geste même du toucher (sinon Safari la refuse), puis
  // le lien ouvre Claude normalement.
  function copier() {
    const texte = texteFinal();
    try {
      navigator.clipboard.writeText(texte).then(
        () => setEtat("copie"),
        () => setEtat("echec")
      );
    } catch {
      setEtat("echec");
    }
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col px-5 py-8 sm:px-10 sm:py-10">
      <PageHeader kicker="Coach" title="Ton coach" subtitle="Gratuit : Physiq prépare ton dossier, Claude te répond." />

      <ol className="mt-6 space-y-2 text-sm text-foreground-muted">
        <li><span className="font-semibold text-foreground">1.</span> Choisis ou écris ta question.</li>
        <li><span className="font-semibold text-foreground">2.</span> Touche « Copier et ouvrir Claude ».</li>
        <li><span className="font-semibold text-foreground">3.</span> Dans Claude, appuie longuement dans le champ puis « Coller », et envoie.</li>
      </ol>

      <div className="verre mt-6 rounded-2xl p-5">
        <div className="flex flex-wrap gap-2">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setQuestion(s)}
              className={`min-h-11 rounded-full border px-4 py-2 text-left text-sm transition ${
                question === s ? "border-accent/70 bg-accent/10" : "border-white/12 bg-white/[0.03] hover:border-accent/50"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
        <textarea
          value={question}
          onChange={(e) => {
            setQuestion(e.target.value);
            setEtat(null);
          }}
          rows={3}
          maxLength={2000}
          placeholder="Ou écris ta propre question…"
          aria-label="Ta question au coach"
          className="mt-4 w-full resize-none rounded-2xl border border-white/12 bg-[#0a0f15] px-4 py-3 text-base outline-none focus:border-accent/60"
        />
        <a
          href={URL_CLAUDE}
          target="_blank"
          rel="noopener noreferrer"
          onClick={copier}
          className="mt-4 flex h-12 w-full items-center justify-center rounded-full bg-white text-sm font-semibold text-[#06080c]"
        >
          Copier et ouvrir Claude
        </a>
        {etat === "copie" && <p className="mt-3 text-center text-xs text-accent">Dossier copié ✓ Colle-le dans Claude.</p>}
        {etat === "echec" && (
          <p className="mt-3 text-center text-xs text-coral">
            La copie a échoué. Ouvre « Voir le dossier » ci-dessous, sélectionne tout et copie-le à la main.
          </p>
        )}
      </div>

      <button
        type="button"
        onClick={() => setApercu((v) => !v)}
        className="mt-5 h-11 self-start text-sm font-semibold text-foreground-muted underline-offset-4 hover:underline"
      >
        {apercu ? "Masquer le dossier" : "Voir le dossier envoyé"}
      </button>
      {apercu && (
        <pre className="verre mt-2 max-h-96 overflow-auto whitespace-pre-wrap rounded-2xl p-4 text-[12px] leading-relaxed text-foreground-muted">
          {texteFinal()}
        </pre>
      )}

      <p className="mt-6 text-[11px] text-foreground-muted">
        Fonctionne avec l&apos;app Claude ou claude.ai, même en version gratuite. Le dossier contient tes chiffres de santé : il
        n&apos;est envoyé qu&apos;à Claude, et seulement quand tu le colles. Pas un avis médical.
      </p>
    </div>
  );
}
