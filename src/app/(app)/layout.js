import Sidebar from "@/components/Sidebar";
import PageTransition from "@/components/PageTransition";
import SwipeNavigation from "@/components/SwipeNavigation";

export default function AppLayout({ children }) {
  return (
    <div className="flex min-h-screen flex-1 flex-col sm:flex-row">
      <SwipeNavigation />
      <Sidebar />
      {/* `clip` et non `hidden` : voir globals.css. `hidden` ferait de <main>
          un conteneur de défilement qui avale la molette sans rien faire. */}
      <main className="flex-1 overflow-x-clip pb-20 sm:pb-0">
        <PageTransition>{children}</PageTransition>
      </main>
    </div>
  );
}
