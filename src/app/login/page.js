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
    <div className="flex flex-1 items-center justify-center px-6">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-2xl border border-border-soft bg-background-soft/60 p-8 backdrop-blur"
      >
        <div className="mb-6 flex items-center gap-3">
          <div className="relative h-6 w-6 rounded-full border border-accent">
            <div className="absolute inset-[7px] rounded-full bg-accent shadow-[0_0_10px_var(--accent)]" />
          </div>
          <span className="font-display text-lg font-bold tracking-wide">PHYSIQ</span>
        </div>

        <h1 className="font-display text-xl font-semibold">Accès privé</h1>
        <p className="mt-1 text-sm text-foreground-muted">
          Entre le mot de passe pour consulter tes données.
        </p>

        <input
          type="password"
          autoFocus
          value={motDePasse}
          onChange={(e) => setMotDePasse(e.target.value)}
          placeholder="Mot de passe"
          className="mt-6 w-full rounded-lg border border-border-soft bg-black/20 px-4 py-3 text-sm text-foreground outline-none focus:border-accent"
        />

        {erreur && <p className="mt-3 text-sm text-red-400">{erreur}</p>}

        <button
          type="submit"
          disabled={chargement}
          className="mt-5 w-full rounded-lg bg-accent-soft border border-accent px-4 py-3 text-sm font-semibold text-foreground transition hover:bg-accent/20 disabled:opacity-50"
        >
          {chargement ? "Connexion..." : "Se connecter"}
        </button>
      </form>
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
