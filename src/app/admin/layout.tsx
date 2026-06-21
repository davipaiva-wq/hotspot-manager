import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import Link from "next/link";
import { signOut } from "@/lib/auth";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session || (session.user as { role: string }).role !== "admin") {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside className="w-56 bg-gray-900 text-white flex flex-col">
        <div className="px-5 py-5 border-b border-gray-700">
          <p className="text-sm font-bold tracking-wide text-white">Hotspot Manager</p>
          <p className="text-xs text-gray-400 mt-0.5">Admin</p>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1 text-sm">
          <Link href="/admin" className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-800 text-gray-300 hover:text-white transition-colors">
            Dashboard
          </Link>
          <Link href="/admin/users" className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-800 text-gray-300 hover:text-white transition-colors">
            Usuários
          </Link>
          <Link href="/admin/reports" className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-800 text-gray-300 hover:text-white transition-colors">
            Relatórios
          </Link>
        </nav>
        <div className="px-3 py-4 border-t border-gray-700">
          <form action={async () => { "use server"; await signOut({ redirectTo: "/login" }); }}>
            <button type="submit" className="w-full text-left px-3 py-2 text-sm text-gray-400 hover:text-white rounded-lg hover:bg-gray-800 transition-colors">
              Sair
            </button>
          </form>
        </div>
      </aside>

      {/* Content */}
      <main className="flex-1 p-8 overflow-auto">
        {children}
      </main>
    </div>
  );
}
