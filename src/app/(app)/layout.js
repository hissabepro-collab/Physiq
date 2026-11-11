import Sidebar from "@/components/Sidebar";
import PageTransition from "@/components/PageTransition";
import SwipeNavigation from "@/components/SwipeNavigation";

export default function AppLayout({ children }) {
  return (
    <div className="flex min-h-screen flex-1 flex-col">
      <SwipeNavigation />
      <Sidebar />
      {/* `clip` et non `hidden` : voir globals.css. `hidden` ferait de <main>
          un conteneur de défilement qui avale la molette sans rien faire.
          La barre de navigation flotte : on réserve sa place en bas (mobile)
          ou à gauche (ordinateur). */}
      <main className="flex-1 overflow-x-clip pb-28 sm:pb-0 sm:pl-[92px]">
        <PageTransition>{children}</PageTransition>
      </main>
    </div>
  );
}
