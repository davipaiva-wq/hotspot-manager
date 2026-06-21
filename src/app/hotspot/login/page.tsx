import { redirect } from "next/navigation";
import { db } from "@/db";
import { users, macMappings } from "@/db/schema";
import { eq } from "drizzle-orm";
import { auth, signIn } from "@/lib/auth";
import bcrypt from "bcryptjs";

export default async function HotspotLogin({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const params = await searchParams;
  const linkLogin = params["link-login-only"] ?? "";
  const mac = params["mac"] ?? "";
  const ip = params["ip"] ?? "";
  const error = params["error"] ?? "";

  // Already logged in → go straight to conectar
  const session = await auth();
  if (session) {
    redirect(
      `/hotspot/conectar?link=${encodeURIComponent(linkLogin)}&mac=${encodeURIComponent(mac)}&ip=${encodeURIComponent(ip)}`
    );
  }

  async function loginAction(formData: FormData) {
    "use server";
    const username = (formData.get("username") as string ?? "").trim();
    const password = (formData.get("password") as string) ?? "";
    const lLink = (formData.get("lLink") as string) ?? "";
    const lMac = (formData.get("lMac") as string) ?? "";
    const lIp = (formData.get("lIp") as string) ?? "";

    const errorRedirect = `/hotspot/login?error=1&link-login-only=${encodeURIComponent(lLink)}&mac=${encodeURIComponent(lMac)}&ip=${encodeURIComponent(lIp)}`;

    const [user] = await db.select().from(users).where(eq(users.username, username)).limit(1);
    if (!user || !user.active) redirect(errorRedirect);

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) redirect(errorRedirect);

    if (lMac) {
      await db
        .insert(macMappings)
        .values({ mac: lMac, userId: user.id, updatedAt: new Date() })
        .onConflictDoUpdate({ target: macMappings.mac, set: { userId: user.id, updatedAt: new Date() } });
    }

    await signIn("credentials", {
      username,
      password,
      redirectTo: `/hotspot/conectar?link=${encodeURIComponent(lLink)}&mac=${encodeURIComponent(lMac)}&ip=${encodeURIComponent(lIp)}`,
    });
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-sm">
        <div className="text-center mb-6">
          <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-3">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.143 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-gray-900">WiFi Hotspot</h1>
          <p className="text-sm text-gray-500 mt-1">Entre com seu usuário para conectar</p>
        </div>

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3">
            Usuário ou senha incorretos.
          </div>
        )}

        <form action={loginAction} className="space-y-4">
          <input type="hidden" name="lLink" value={linkLogin} />
          <input type="hidden" name="lMac" value={mac} />
          <input type="hidden" name="lIp" value={ip} />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Usuário</label>
            <input
              name="username"
              type="text"
              autoComplete="username"
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
              autoFocus
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Senha</label>
            <input
              name="password"
              type="password"
              autoComplete="current-password"
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg py-2.5 text-sm transition-colors"
          >
            Entrar
          </button>
        </form>

        <p className="text-xs text-gray-400 text-center mt-4">
          Problemas? Fale com o responsável pela rede.
        </p>
      </div>
    </div>
  );
}
