import { redirect } from "next/navigation";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { todayDate } from "@/lib/utils";
import bcrypt from "bcryptjs";

// MikroTik redirects here with: ?username=X&password=X&link-login-only=URL&dst=URL&ip=X&mac=X
// We validate the user against our DB before letting MikroTik authenticate.
export default async function HotspotLogin({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const params = await searchParams;
  const username = params["username"] ?? "";
  const password = params["password"] ?? "";
  const linkLogin = params["link-login-only"] ?? "";
  const dst = params["dst"] ?? "";
  const ip = params["ip"] ?? "";
  const mac = params["mac"] ?? "";

  // If no username/password yet, show the login form
  if (!username || !password) {
    return <LoginForm linkLogin={linkLogin} dst={dst} ip={ip} mac={mac} />;
  }

  // Validate credentials and quota
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.username, username))
    .limit(1);

  if (!user || !user.active) {
    return <ErrorPage title="Acesso negado" message="Usuário inativo ou não encontrado." />;
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    return <ErrorPage title="Senha incorreta" message="Usuário ou senha inválidos." />;
  }

  // Verificar validade do pacote
  if (user.packageExpiresAt && new Date(user.packageExpiresAt) < new Date()) {
    return (
      <ErrorPage
        title="Pacote expirado"
        message={`Seu pacote "${user.packageName ?? "atual"}" venceu em ${new Date(user.packageExpiresAt).toLocaleDateString("pt-BR")}. Entre em contato com o administrador para renovar.`}
      />
    );
  }

  if (user.quotaBytes > 0 && user.consumedBytes >= user.quotaBytes) {
    return (
      <ErrorPage
        title="Quota esgotada"
        message={`Você atingiu seu limite total de dados. Entre em contato com o administrador para recarregar.`}
      />
    );
  }

  if (user.dailyLimitBytes > 0) {
    const today = todayDate();
    const resetDate = user.dailyResetAt
      ? new Date(user.dailyResetAt)
          .toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" })
          .split("/")
          .reverse()
          .join("-")
      : null;

    if (resetDate === today && user.dailyConsumedBytes >= user.dailyLimitBytes) {
      return (
        <ErrorPage
          title="Limite diário atingido"
          message="Você atingiu seu limite de dados para hoje. O acesso será liberado automaticamente à meia-noite."
        />
      );
    }
  }

  // All good — redirect to MikroTik login endpoint to authenticate
  // linkLogin is an internal MikroTik URL like http://192.168.xx.xx/login
  // The user's browser (on local network) will follow this redirect.
  let loginUrl: URL;
  try {
    loginUrl = new URL(linkLogin);
  } catch {
    return <ErrorPage title="Erro de configuração" message="URL de login inválida. Verifique as configurações do MikroTik." />;
  }
  loginUrl.searchParams.set("username", username);
  loginUrl.searchParams.set("password", password);
  if (dst) loginUrl.searchParams.set("dst", dst);

  redirect(loginUrl.toString());
}

function LoginForm({ linkLogin, dst, ip, mac }: { linkLogin: string; dst: string; ip: string; mac: string }) {
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

        <form method="GET" action="/hotspot/login" className="space-y-4">
          <input type="hidden" name="link-login-only" value={linkLogin} />
          <input type="hidden" name="dst" value={dst} />
          <input type="hidden" name="ip" value={ip} />
          <input type="hidden" name="mac" value={mac} />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Usuário</label>
            <input
              name="username"
              type="text"
              autoComplete="username"
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg py-2.5 text-sm transition-colors"
          >
            Conectar
          </button>
        </form>

        <p className="text-xs text-gray-400 text-center mt-4">
          Problemas? Fale com o responsável pela rede.
        </p>
      </div>
    </div>
  );
}

function ErrorPage({ title, message }: { title: string; message: string }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-sm text-center">
        <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h1 className="text-lg font-bold text-gray-900 mb-2">{title}</h1>
        <p className="text-sm text-gray-500">{message}</p>
      </div>
    </div>
  );
}
