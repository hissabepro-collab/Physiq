"use client";

import { useEffect, useRef, useState } from "react";

// Page d'erreur de l'application. Sans elle, Next affichait sa page par
// défaut, BLANCHE, quand le serveur échouait (base en train de se réveiller
// au lancement) : c'était l'« écran blanc comme un bug » (12/11/2026).
// Ici, fond sombre comme le reste, et nouvelles tentatives automatiques.
export default function Erreur({ reset }) {
  const [essai, setEssai] = useState(0);
  const minuteur = useRef(0);

  useEffect(() => {
    if (essai >= 3) return undefined;
    minuteur.current = setTimeout(() => {
      setEssai((n) => n + 1);
      reset();
    }, 1200 + essai * 1200);
    return () => clearTimeout(minuteur.current);
  }, [essai, reset]);

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-6 text-center">
      <span className="h-2 w-2 animate-pulse rounded-full bg-accent" aria-hidden="true" />
      <p className="mt-4 text-sm font-semibold">{essai < 3 ? "Connexion au serveur…" : "Le serveur ne répond pas."}</p>
      <p className="mt-1 text-xs text-foreground-muted">
        {essai < 3 ? "Il se réveille, ça prend quelques secondes." : "Vérifie ta connexion, puis réessaie."}
      </p>
      {essai >= 3 && (
        <button
          type="button"
          onClick={() => {
            setEssai(0);
            reset();
          }}
          className="mt-5 inline-flex h-11 items-center rounded-full border border-accent/60 bg-accent-soft px-5 text-sm font-semibold"
        >
          Réessayer
        </button>
      )}
    </div>
  );
}
