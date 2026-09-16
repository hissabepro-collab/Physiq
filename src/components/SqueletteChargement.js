// Squelette affiché pendant la navigation d'une page à l'autre.
//
// Volontairement très peu contrasté et SANS animation de pulsation : sur fond
// sombre, des blocs gris clignotants qui disparaissent au bout de 200 ms
// donnent une impression de grésillement. Ici il reprend simplement la
// silhouette de la page, assez discret pour que l'apparition du vrai contenu
// passe inaperçue.
function Bloc({ className }) {
  return <div className={`rounded-2xl border border-border-soft/40 bg-foreground/[0.03] ${className}`} />;
}

export default function SqueletteChargement() {
  return (
    <div className="mx-auto max-w-5xl px-5 py-8 sm:px-10 sm:py-10">
      <Bloc className="h-3 w-24 rounded" />
      <Bloc className="mt-3 h-8 w-52 rounded-lg" />

      <Bloc className="mt-6 h-44 rounded-3xl" />

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Bloc className="h-28" />
        <Bloc className="h-28" />
        <Bloc className="h-28" />
        <Bloc className="h-28" />
      </div>

      <Bloc className="mt-6 h-56" />
    </div>
  );
}
