import { db } from "@/db";
import { users } from "@/db/schema";
import { eq, count, sum } from "drizzle-orm";
import { formatBytes } from "@/lib/utils";
import RenewButton from "./RenewButton";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const [totalUsers] = await db.select({ count: count() }).from(users).where(eq(users.role, "user"));
  const [activeUsers] = await db.select({ count: count() }).from(users).where(eq(users.active, true));
  const [totalConsumed] = await db.select({ sum: sum(users.consumedBytes) }).from(users);

  const allUsers = await db
    .select({
      id: users.id,
      username: users.username,
      name: users.name,
      consumedBytes: users.consumedBytes,
      quotaBytes: users.quotaBytes,
      dailyConsumedBytes: users.dailyConsumedBytes,
      dailyLimitBytes: users.dailyLimitBytes,
      packageName: users.packageName,
      packageDays: users.packageDays,
      packageExpiresAt: users.packageExpiresAt,
      active: users.active,
    })
    .from(users)
    .where(eq(users.role, "user"))
    .orderBy(users.username);

  const now = new Date();

  const expiredOrSoon = allUsers.filter(u => {
    if (!u.packageExpiresAt) return false;
    const days = Math.ceil((new Date(u.packageExpiresAt).getTime() - now.getTime()) / 86400000);
    return days <= 5;
  });

  function expiryInfo(expiresAt: Date | null) {
    if (!expiresAt) return null;
    const days = Math.ceil((new Date(expiresAt).getTime() - now.getTime()) / 86400000);
    if (days <= 0) return { label: `Expirou há ${Math.abs(days)}d`, cls: "bg-red-100 text-red-600" };
    if (days <= 5) return { label: `${days}d restantes`, cls: "bg-yellow-100 text-yellow-700" };
    return { label: new Date(expiresAt).toLocaleDateString("pt-BR"), cls: "bg-gray-100 text-gray-500" };
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Dashboard</h1>

      {/* Alertas */}
      {expiredOrSoon.length > 0 && (
        <div className="mb-6 bg-amber-50 border border-amber-200 rounded-xl p-4">
          <p className="text-sm font-semibold text-amber-800 mb-3">
            Pacotes vencidos ou vencendo em breve ({expiredOrSoon.length})
          </p>
          <div className="space-y-2">
            {expiredOrSoon.map(u => {
              const info = expiryInfo(u.packageExpiresAt);
              return (
                <div key={u.id} className="flex items-center justify-between bg-white rounded-lg px-4 py-2.5 border border-amber-100">
                  <div>
                    <span className="font-medium text-gray-900 text-sm">{u.username}</span>
                    {u.name && <span className="text-gray-400 text-xs ml-2">{u.name}</span>}
                    {info && <span className={`ml-2 text-xs font-medium px-2 py-0.5 rounded-full ${info.cls}`}>{info.label}</span>}
                  </div>
                  <RenewButton userId={u.id} username={u.username} packageDays={u.packageDays} />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <StatCard label="Total de usuários" value={String(totalUsers.count)} />
        <StatCard label="Usuários ativos" value={String(activeUsers.count)} />
        <StatCard label="Consumo total" value={formatBytes(Number(totalConsumed.sum ?? 0))} />
      </div>

      {/* Todos os usuários */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Todos os usuários</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {["Usuário", "Pacote", "Consumo total", "Hoje", "Validade", "Status", ""].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {allUsers.map(u => {
                const pct = u.quotaBytes > 0 ? Math.min(100, Math.round(u.consumedBytes / u.quotaBytes * 100)) : 0;
                const info = expiryInfo(u.packageExpiresAt);
                return (
                  <tr key={u.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{u.username}</p>
                      {u.name && <p className="text-xs text-gray-400">{u.name}</p>}
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-xs">{u.packageName ?? <span className="text-gray-300">—</span>}</td>
                    <td className="px-4 py-3">
                      <p className="text-gray-700 text-xs">{formatBytes(u.consumedBytes)}{u.quotaBytes > 0 && <span className="text-gray-400"> / {formatBytes(u.quotaBytes)}</span>}</p>
                      {u.quotaBytes > 0 && (
                        <div className="w-24 h-1.5 bg-gray-200 rounded-full mt-1">
                          <div className={`h-1.5 rounded-full ${pct >= 90 ? "bg-red-500" : pct >= 70 ? "bg-yellow-400" : "bg-blue-500"}`} style={{ width: `${pct}%` }} />
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600">
                      {formatBytes(u.dailyConsumedBytes)}
                      {u.dailyLimitBytes > 0 && <span className="text-gray-400"> / {formatBytes(u.dailyLimitBytes)}</span>}
                    </td>
                    <td className="px-4 py-3">
                      {info ? <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${info.cls}`}>{info.label}</span> : <span className="text-gray-300 text-xs">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${u.active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}>
                        {u.active ? "Ativo" : "Bloqueado"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <RenewButton userId={u.id} username={u.username} packageDays={u.packageDays} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
    </div>
  );
}
