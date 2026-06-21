import { redirect } from "next/navigation";
import { auth, signOut } from "@/lib/auth";
import Link from "next/link";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session) redirect("/login");

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <div>
          <p className="font-semibold text-gray-900 text-sm">Hotspot Manager</p>
          <p className="text-xs text-gray-400">Olá, {session.user?.name ?? session.user?.email}</p>
        </div>
        <nav className="flex items-center gap-4 text-sm">
          <Link href="/portal" className="text-gray-600 hover:text-gray-900">Início</Link>
          <Link href="/portal/history" className="text-gray-600 hover:text-gray-900">Histórico</Link>
          <Link href="/portal/password" className="text-gray-600 hover:text-gray-900">Senha</Link>
          <Link href="/portal/limits" className="text-gray-600 hover:text-gray-900">Meu limite</Link>
          <form action={async () => { "use server"; await signOut({ redirectTo: "/login" }); }}>
            <button type="submit" className="text-gray-400 hover:text-gray-700">Sair</button>
          </form>
        </nav>
      </header>
      <main className="max-w-3xl mx-auto px-4 py-8">{children}</main>
    </div>
  );
}
