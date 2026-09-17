"use client";

import { useEffect, useState } from "react";
import { trouverEcranDemarrage } from "@/lib/ecransDemarrage";

// iOS n'accepte une image de démarrage que si elle fait EXACTEMENT la taille
// de l'écran. Une seule dimension qui diffère, et il l'ignore en affichant du
// blanc — sans rien signaler.
//
// Ce bloc affiche les trois nombres dont iOS se sert pour choisir, et dit si
// une image correspond. C'est la seule façon fiable de savoir si le noir au
// lancement peut fonctionner sur cet appareil : le modèle commercial ne suffit
// pas, deux iPhone du même nom peuvent différer.

function Ligne({ label, valeur, alerte }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-border-soft/40 py-1.5 last:border-0">
      <span className="text-[11px] uppercase tracking-wide text-foreground-muted">{label}</span>
      <span
        className="font-display text-xs font-bold tabular-nums"
        style={alerte ? { color: "#f0a38f" } : undefined}
      >
        {valeur}
      </span>
    </div>
  );
}

export default function DiagnosticDemarrage() {
  const [info, setInfo] = useState(null);

  useEffect(() => {
    const l = window.screen.width;
    const h = window.screen.height;
    const d = window.devicePixelRatio;

    setInfo({
      l,
      h,
      d,
      fichier: trouverEcranDemarrage(l, h, d),
      autonome: window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true,
      serviceWorker: Boolean(navigator.serviceWorker?.controller),
    });
  }, []);

  if (!info) return null;

  return (
    <section className="rounded-2xl border border-border-soft bg-background-soft/30 p-4">
      <h2 className="font-display text-sm font-semibold">Écran de démarrage</h2>
      <p className="mt-1 text-[11px] leading-relaxed text-foreground-muted">
        Si « Image trouvée » indique aucune, iOS affiche du blanc au lancement. Communique alors les trois
        premières valeurs.
      </p>

      <div className="mt-3">
        <Ligne label="Largeur" valeur={`${info.l} pt`} />
        <Ligne label="Hauteur" valeur={`${info.h} pt`} />
        <Ligne label="Densité" valeur={`×${info.d}`} />
        <Ligne
          label="Image trouvée"
          valeur={info.fichier ?? "aucune"}
          alerte={!info.fichier}
        />
        <Ligne
          label="Mode application"
          valeur={info.autonome ? "oui" : "non — ouvert dans Safari"}
          alerte={!info.autonome}
        />
        <Ligne
          label="Cache de lancement"
          valeur={info.serviceWorker ? "actif" : "pas encore"}
          alerte={!info.serviceWorker}
        />
      </div>
    </section>
  );
}
