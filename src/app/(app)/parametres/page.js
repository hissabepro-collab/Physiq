"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { IconLogout } from "@/components/icons";
import PageHeader from "@/components/PageHeader";
import DiagnosticDemarrage from "@/components/DiagnosticDemarrage";

export default function ParametresPage() {
  const router = useRouter();
  const [motDePasseActuel, setMotDePasseActuel] = useState("");
  const [nouveauMotDePasse, setNouveauMotDePasse] = useState("");
  const [messagePwd, setMessagePwd] = useState(null);
  const [confirmationSuppression, setConfirmationSuppression] = useState("");

  async function changerMotDePasse(e) {
    e.preventDefault();
    setMessagePwd(null);
    const res = await fetch("/api/profil/password", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ motDePasseActuel, nouveauMotDePasse }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      setMessagePwd({ type: "ok", texte: "Mot de passe mis à jour." });
      setMotDePasseActuel("");
      setNouveauMotDePasse("");
    } else {
      setMessagePwd({ type: "erreur", texte: data.error || "Erreur" });
    }
  }

  async function supprimerTout() {
    if (confirmationSuppression !== "SUPPRIMER") return;
    await fetch("/api/profil/supprimer-tout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  async function seDeconnecter() {
    await fetch("/api/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-2xl px-5 py-8 sm:px-10 sm:py-10">
      <PageHeader kicker="Ton compte" title="Paramètres" />

      <section className="mt-6 rounded-2xl border border-border-soft bg-background-soft/40 p-5">
        <h2 className="font-display text-sm font-semibold">Mot de passe</h2>
        <form onSubmit={changerMotDePasse} className="mt-3 space-y-3">
          <input
            type="password"
            placeholder="Mot de passe actuel"
            value={motDePasseActuel}
            onChange={(e) => setMotDePasseActuel(e.target.value)}
            className="w-full rounded-lg border border-border-soft bg-black/20 px-3 py-2 text-sm outline-none focus:border-accent"
          />
          <input
            type="password"
            placeholder="Nouveau mot de passe"
            value={nouveauMotDePasse}
            onChange={(e) => setNouveauMotDePasse(e.target.value)}
            className="w-full rounded-lg border border-border-soft bg-black/20 px-3 py-2 text-sm outline-none focus:border-accent"
          />
          <button type="submit" className="rounded-lg border border-accent bg-accent-soft px-4 py-2 text-sm font-semibold">
            Mettre à jour
          </button>
          {messagePwd && (
            <p className={`text-sm ${messagePwd.type === "ok" ? "text-emerald-300" : "text-red-400"}`}>
              {messagePwd.texte}
            </p>
          )}
        </form>
      </section>

      <section className="mt-5 rounded-2xl border border-border-soft bg-background-soft/40 p-5">
        <h2 className="font-display text-sm font-semibold">Exporter mes données</h2>
        <p className="mt-1 text-sm text-foreground-muted">Récupère toutes tes mesures à tout moment.</p>
        <div className="mt-3 flex flex-wrap gap-3">
          <a href="/api/export" className="rounded-lg border border-border-soft px-4 py-2 text-sm font-semibold hover:border-accent/60">
            Télécharger en CSV
          </a>
          <a href="/export-pdf" target="_blank" className="rounded-lg border border-border-soft px-4 py-2 text-sm font-semibold hover:border-accent/60">
            Export imprimable (PDF)
          </a>
        </div>
      </section>

      <div className="mt-5">
        <DiagnosticDemarrage />
      </div>

      <section className="mt-5 rounded-2xl border border-red-400/25 bg-red-400/5 p-5">
        <h2 className="font-display text-sm font-semibold text-red-300">Zone dangereuse</h2>
        <p className="mt-1 text-sm text-foreground-muted">
          Supprime définitivement toutes tes mesures, objectifs, notes de journal et ton mot de passe. Irréversible.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <input
            type="text"
            placeholder='Tape "SUPPRIMER" pour confirmer'
            value={confirmationSuppression}
            onChange={(e) => setConfirmationSuppression(e.target.value)}
            className="rounded-lg border border-border-soft bg-black/20 px-3 py-2 text-sm outline-none focus:border-red-400"
          />
          <button
            onClick={supprimerTout}
            disabled={confirmationSuppression !== "SUPPRIMER"}
            className="rounded-lg border border-red-400/50 bg-red-400/10 px-4 py-2 text-sm font-semibold text-red-300 disabled:opacity-30"
          >
            Tout supprimer
          </button>
        </div>
      </section>

      <button
        onClick={seDeconnecter}
        className="mt-5 flex items-center gap-2 rounded-lg border border-border-soft px-4 py-2 text-sm font-semibold text-foreground-muted hover:text-foreground"
      >
        <IconLogout width={16} height={16} /> Se déconnecter
      </button>
    </div>
  );
}
