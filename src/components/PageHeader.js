export default function PageHeader({ kicker, title, subtitle, action }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div>
        {kicker && (
          <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-accent">{kicker}</div>
        )}
        <h1
          className="mt-1 font-display text-2xl font-bold sm:text-3xl"
          style={{ textShadow: "0 0 24px rgba(77,232,255,0.25)" }}
        >
          {title}
        </h1>
        {subtitle && <p className="mt-1.5 text-sm text-foreground-muted">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
