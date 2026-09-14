// Affiché instantanément pendant que l'écran suivant interroge la base.
// Sans lui, le balayage semble bloqué le temps de l'aller-retour réseau.
export default function Chargement() {
  return (
    <div className="mx-auto max-w-5xl px-5 py-8 sm:px-10 sm:py-10">
      <div className="h-3 w-24 animate-pulse rounded bg-accent/25" />
      <div className="mt-3 h-8 w-52 animate-pulse rounded bg-foreground/10" />

      <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-28 animate-pulse rounded-2xl border border-border-soft bg-background-soft/40"
            style={{ animationDelay: `${i * 90}ms` }}
          />
        ))}
      </div>

      <div className="mt-6 h-56 animate-pulse rounded-2xl border border-border-soft bg-background-soft/40" />
    </div>
  );
}
