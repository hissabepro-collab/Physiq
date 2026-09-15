import RedirectionAccueil from "@/components/RedirectionAccueil";

// Page d'entrée de l'application installée.
//
// Elle est entièrement statique : aucune donnée, aucune requête serveur,
// aucune base. Elle est donc servie depuis le réseau de diffusion en quelques
// dizaines de millisecondes, là où le tableau de bord doit réveiller une
// fonction serveur puis interroger une base distante — c'est cette attente
// qui laissait un écran blanc au lancement.
//
// Elle peint immédiatement le fond sombre et le logo, puis bascule vers le
// tableau de bord (ou l'écran de connexion, via le pare-feu) une fois le
// navigateur prêt.
export const dynamic = "force-static";

export const metadata = {
  title: "Physiq",
};

export default function Demarrage() {
  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center gap-6"
      style={{ backgroundColor: "#050a0e" }}
    >
      <div className="relative h-20 w-20">
        <div className="absolute inset-0 rounded-full border border-accent/60" />
        <div className="absolute inset-0 m-auto h-8 w-8 rounded-full bg-accent shadow-[0_0_30px_var(--accent)]" />
      </div>
      <div className="font-display text-sm font-bold tracking-[0.35em] text-accent">PHYSIQ</div>
      <RedirectionAccueil />
    </div>
  );
}
