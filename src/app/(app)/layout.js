import Sidebar from "@/components/Sidebar";

export default function AppLayout({ children }) {
  return (
    <div className="flex min-h-screen flex-1 flex-col sm:flex-row">
      <Sidebar />
      <main className="flex-1 overflow-x-hidden pb-20 sm:pb-0">{children}</main>
    </div>
  );
}
