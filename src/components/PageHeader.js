// En-tête de page éditorial : petite étiquette en capitales, grand titre en
// serif italique, sous-titre discret. Même gabarit sur toutes les « pièces ».
export default function PageHeader({ kicker, title, subtitle, action }) {
  return (
    <div className="apparait flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {kicker && (
          <div className="etiquette flex items-center gap-2">
            <span className="h-px w-6 bg-accent/70" />
            {kicker}
          </div>
        )}
        <h1 className="titre-serif mt-3 text-[40px] italic sm:text-[54px]">{title}</h1>
        {subtitle && <p className="mt-2 text-sm text-foreground-muted">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
