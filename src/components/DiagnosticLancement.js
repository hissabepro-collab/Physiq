"use client";

import { useEffect, useState } from "react";
import { trouverEcranDemarrage } from "@/lib/ecransDemarrage";

// Diagnostic du lancement (Paramètres) : tout ce qu'il faut pour comprendre
// un écran blanc ou gris à l'ouverture, en une capture d'écran.
//   - écran (largeur × hauteur × densité) et image de démarrage iOS
//     correspondante : sans image exacte, iOS affiche du BLANC au lancement ;
//   - mode application (standalone) ou navigateur ;
//   - thème du système : en thème clair, le fond par défaut d'iOS est blanc ;
//   - durées du dernier lancement depuis l'icône (mesurées par
//     MesureLancement, à partir de l'heure notée par /demarrage.html).

function Ligne({ label, valeur, alerte }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1.5 text-sm">
      <span className="text-foreground-muted">{label}</span>
      <span className={`text-right font-semibold ${alerte ? "text-coral" : ""}`}>{valeur}</span>
    </div>
  );
}

export default function DiagnosticLancement() {
  const [infos, setInfos] = useState(null);

  useEffect(() => {
    const id = setTimeout(() => {
      const l = window.screen.width;
      const h = window.screen.height;
      const d = window.devicePixelRatio;
      let dernier = null;
      try {
        dernier = JSON.parse(window.localStorage.getItem("physiq-dernier-lancement") || "null");
      } catch {
        dernier = null;
      }
      setInfos({
        ecran: `${l} × ${h} @${d}x`,
        image: trouverEcranDemarrage(l, h, d),
        standalone: window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true,
        theme: window.matchMedia("(prefers-color-scheme: dark)").matches ? "sombre" : "clair",
        systeme: (navigator.userAgent.match(/OS (\d+[_\d]*)/)?.[1] ?? "?").replace(/_/g, "."),
        dernier,
      });
    }, 0);
    return () => clearTimeout(id);
  }, []);

  if (!infos) return null;

  return (
    <section className="mt-6 rounded-2xl border border-border-soft bg-background-soft/40 p-5">
      <h2 className="titre text-lg">Diagnostic du lancement</h2>
      <p className="mt-1 text-xs text-foreground-muted">
        En cas d&apos;écran blanc ou gris à l&apos;ouverture, envoie une capture de ce bloc.
      </p>
      <div className="mt-3 divide-y divide-white/5">
        <Ligne label="Écran" valeur={infos.ecran} />
        <Ligne
          label="Image de démarrage"
          valeur={infos.image ? `${infos.image} ✓` : "aucune pour cet écran"}
          alerte={!infos.image}
        />
        <Ligne label="Mode application" valeur={infos.standalone ? "oui ✓" : "non (navigateur)"} alerte={!infos.standalone} />
        <Ligne label="Thème de l'iPhone" valeur={infos.theme} />
        <Ligne label="Version d'iOS" valeur={infos.systeme} />
        <Ligne
          label="Dernier lancement"
          valeur={
            infos.dernier
              ? `${new Date(infos.dernier.quand).toLocaleString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}`
              : "pas encore mesuré"
          }
        />
        {infos.dernier && (
          <>
            <Ligne label="Icône → page affichée" valeur={`${(infos.dernier.total / 1000).toFixed(1)} s`} alerte={infos.dernier.total > 3000} />
            <Ligne label="dont réponse du serveur" valeur={`${(infos.dernier.serveur / 1000).toFixed(1)} s`} alerte={infos.dernier.serveur > 2000} />
          </>
        )}
      </div>
    </section>
  );
}
