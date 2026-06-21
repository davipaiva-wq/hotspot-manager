import { redirect } from "next/navigation";
import { auth, signOut } from "@/lib/auth";
import Link from "next/link";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session) redirect("/login");

  const name = session.user?.name ?? session.user?.email ?? "Usuário";

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <div>
          <p className="font-semibold text-gray-900 text-sm leading-tight">Olá, {name}</p>
          <p className="text-xs text-gray-400">Hotspot Manager</p>
        </div>
        <a
          href="http://192.168.85.2/logout"
          className="text-xs bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 rounded-lg px-3 py-1.5 font-medium transition-colors"
        >
          Desconectar WiFi
        </a>
      </header>

      {/* Content */}
      <main className="flex-1 max-w-lg w-full mx-auto px-4 py-5 pb-24">
        {children}
      </main>

      {/* Bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex z-10">
        <Link href="/portal" className="flex-1 flex flex-col items-center gap-1 py-3 text-gray-500 hover:text-blue-600 transition-colors">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <span className="text-xs">Pacote</span>
        </Link>
        <Link href="/portal/history" className="flex-1 flex flex-col items-center gap-1 py-3 text-gray-500 hover:text-blue-600 transition-colors">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-xs">Histórico</span>
        </Link>
        <Link href="/portal/password" className="flex-1 flex flex-col items-center gap-1 py-3 text-gray-500 hover:text-blue-600 transition-colors">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
          </svg>
          <span className="text-xs">Senha</span>
        </Link>
        <form action={async () => { "use server"; await signOut({ redirectTo: "/login" }); }} className="flex-1">
          <button type="submit" className="w-full h-full flex flex-col items-center gap-1 py-3 text-gray-500 hover:text-red-500 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span className="text-xs">Sair</span>
          </button>
        </form>
      </nav>
    </div>
  );
}
