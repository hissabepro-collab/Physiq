"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import {
  IconHome,
  IconUpload,
  IconChart,
  IconCompare,
  IconTarget,
  IconJournal,
  IconSettings,
  IconLogout,
} from "@/components/icons";

const LIENS = [
  { href: "/", label: "Accueil", Icon: IconHome },
  { href: "/scan", label: "Nouveau scan", Icon: IconUpload },
  { href: "/historique", label: "Historique", Icon: IconChart },
  { href: "/comparer", label: "Comparer", Icon: IconCompare },
  { href: "/objectifs", label: "Objectifs", Icon: IconTarget },
  { href: "/journal", label: "Journal", Icon: IconJournal },
  { href: "/parametres", label: "Paramètres", Icon: IconSettings },
];

// Ressort de la pastille : rapide, avec un léger dépassement, pour qu'elle
// ait l'air de « couler » d'un onglet à l'autre plutôt que de glisser.
const RESSORT = { type: "spring", stiffness: 520, damping: 34, mass: 0.9 };

function Onglet({ href, label, Icon, actif, reduit }) {
  return (
    <Link
      href={href}
      title={label}
      aria-label={label}
      aria-current={actif ? "page" : undefined}
      // Fait passer ces onglets sur la durée de cache « statique » (5 min) au
      // lieu de la durée « dynamique » : une page déjà visitée se rouvre sans
      // aller-retour serveur. Voir aussi `staleTimes` dans next.config.mjs.
      prefetch
      className={`relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-colors duration-300 ${
        actif ? "text-[#04121a]" : "text-foreground-muted hover:text-foreground"
      }`}
    >
      {actif && (
        <motion.span
          layoutId="nav-pastille"
          transition={reduit ? { duration: 0 } : RESSORT}
          className="absolute inset-0 rounded-full"
          style={{
            background: "linear-gradient(180deg, #f4fdff 0%, #bff6ff 100%)",
            boxShadow: "0 0 22px -2px rgba(77,232,255,0.65), inset 0 -2px 6px rgba(77,232,255,0.35)",
          }}
        />
      )}
      <Icon width={19} height={19} className="relative z-10" />
    </Link>
  );
}

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const reduit = useReducedMotion();

  async function handleLogout() {
    await fetch("/api/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <nav
      aria-label="Navigation principale"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-30 flex justify-center px-3 pb-[calc(env(safe-area-inset-bottom,0px)+10px)]
                 sm:inset-y-0 sm:left-0 sm:right-auto sm:items-center sm:px-0 sm:pb-0 sm:pl-5"
    >
      <div className="verre-flottant pointer-events-auto flex items-center gap-0.5 rounded-full p-1.5 sm:flex-col sm:gap-1.5 sm:p-2">
        <Link
          href="/"
          aria-label="Physiq"
          className="hidden h-11 w-11 items-center justify-center sm:flex"
        >
          <span className="relative block h-5 w-5 rounded-full border border-accent/80">
            <span className="absolute inset-[5px] rounded-full bg-accent shadow-[0_0_10px_var(--accent)]" />
          </span>
        </Link>
        <span className="mx-auto hidden h-px w-6 bg-white/10 sm:block" />
        {LIENS.map(({ href, label, Icon }) => (
          <Onglet key={href} href={href} label={label} Icon={Icon} actif={pathname === href} reduit={reduit} />
        ))}
        <span className="mx-auto hidden h-px w-6 bg-white/10 sm:block" />
        <button
          onClick={handleLogout}
          title="Se déconnecter"
          aria-label="Se déconnecter"
          className="hidden h-11 w-11 items-center justify-center rounded-full text-foreground-muted transition hover:text-coral sm:flex"
        >
          <IconLogout width={19} height={19} />
        </button>
      </div>
    </nav>
  );
}
