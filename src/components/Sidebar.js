"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
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
];

function NavIcon({ href, label, Icon, actif }) {
  return (
    <Link
      href={href}
      title={label}
      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition ${
        actif
          ? "bg-accent-soft text-accent border border-accent/50 shadow-[0_0_18px_-4px_rgba(77,232,255,0.6)]"
          : "text-foreground-muted hover:text-foreground"
      }`}
    >
      <Icon width={19} height={19} />
    </Link>
  );
}

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <nav
      className="safe-bottom fixed inset-x-0 bottom-0 z-20 flex min-h-16 items-center justify-around border-t border-border-soft bg-background-soft/90 px-2 backdrop-blur
                 sm:static sm:min-h-0 sm:h-auto sm:w-[76px] sm:flex-col sm:justify-start sm:gap-7 sm:border-t-0 sm:border-r sm:bg-background-soft/60 sm:px-0 sm:py-6"
    >
      <Link
        href="/"
        className="relative hidden h-7 w-7 rounded-full border border-accent sm:block"
      >
        <div className="absolute inset-[7px] rounded-full bg-accent shadow-[0_0_10px_var(--accent)]" />
      </Link>

      <div className="flex flex-1 items-center justify-around sm:flex-col sm:justify-start sm:gap-2">
        {LIENS.map(({ href, label, Icon }) => (
          <NavIcon key={href} href={href} label={label} Icon={Icon} actif={pathname === href} />
        ))}
      </div>

      <NavIcon href="/parametres" label="Paramètres" Icon={IconSettings} actif={pathname === "/parametres"} />
      <button
        onClick={handleLogout}
        title="Se déconnecter"
        className="hidden h-11 w-11 items-center justify-center rounded-xl text-foreground-muted transition hover:text-red-400 sm:flex"
      >
        <IconLogout width={19} height={19} />
      </button>
    </nav>
  );
}
