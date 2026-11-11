"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [motDePasse, setMotDePasse] = useState("");
  const [erreur, setErreur] = useState(null);
  const [chargement, setChargement] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setErreur(null);
    setChargement(true);
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ motDePasse }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setErreur(data.error || "Connexion impossible");
        return;
      }
      router.push(searchParams.get("from") || "/");
      router.refresh();
    } finally {
      setChargement(false);
    }
  }

  return (
    <div className="relative flex flex-1 flex-col items-center justify-center px-6 py-16">
      <div className="apparait w-full max-w-sm">
        <div className="etiquette flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-accent shadow-[0_0_8px_var(--accent)]" />
          Accès privé
        </div>
        <h1 className="titre-serif mt-4 text-[64px] italic leading-none">
          Physiq<span className="text-accent">.</span>
        </h1>
        <p className="mt-3 text-sm text-foreground-muted">Ton corps, scan après scan.</p>

        <form onSubmit={handleSubmit} className="verre mt-10 rounded-[28px] p-6">
          <label htmlFor="mot-de-passe" className="etiquette">
            Mot de passe
          </label>
          <input
            id="mot-de-passe"
            type="password"
            autoFocus
            autoComplete="current-password"
            value={motDePasse}
            onChange={(e) => setMotDePasse(e.target.value)}
            className="mt-3 h-12 w-full rounded-2xl border border-border-soft bg-white/[0.04] px-4 text-base text-foreground outline-none transition focus:border-accent/70 focus:bg-white/[0.06]"
          />

          {erreur && <p className="mt-3 text-sm text-coral">{erreur}</p>}

          <button
            type="submit"
            disabled={chargement}
            className="mt-5 h-12 w-full rounded-full bg-accent text-sm font-semibold text-[#04121a] shadow-[0_0_30px_-6px_rgba(77,232,255,0.7)] transition hover:brightness-110 disabled:opacity-50"
          >
            {chargement ? "Connexion…" : "Entrer"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
