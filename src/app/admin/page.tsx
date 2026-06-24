import { db } from "@/db";
import { users, sessions } from "@/db/schema";
import { eq, count, sum, desc, max, gte, isNotNull } from "drizzle-orm";
import { formatBytes } from "@/lib/utils";
import Link from "next/link";
import RenewButton from "./RenewButton";
import AutoRefresh from "./AutoRefresh";

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
      packageName: users.packageName,
      packageDays: users.packageDays,
      packageExpiresAt: users.packageExpiresAt,
      active: users.active,
    })
    .from(users)
    .where(eq(users.role, "user"))
    .orderBy(desc(users.consumedBytes));

  const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

  const sessionsByUser = await db
    .select({
      username: users.username,
      name: users.name,
      connections: count(sessions.id),
      bytesIn: sum(sessions.bytesIn),
      bytesOut: sum(sessions.bytesOut),
      lastSeen: max(sessions.startedAt),
    })
    .from(sessions)
    .leftJoin(users, eq(sessions.userId, users.id))
    .where(gte(sessions.startedAt, startOfMonth))
    .groupBy(users.id, users.username, users.name)
    .orderBy(desc(max(sessions.startedAt)));

  const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);
  const onlineUsers = await db
    .select({
      username: users.username,
      name: users.name,
      lastSeenAt: users.lastSeenAt,
      consumedBytes: users.consumedBytes,
      quotaBytes: users.quotaBytes,
    })
    .from(users)
    .where(gte(users.lastSeenAt, twoMinutesAgo))
    .orderBy(desc(users.lastSeenAt));

  const now = new Date();
  const expiredOrSoon = allUsers.filter(u => {
    if (!u.packageExpiresAt) return false;
    const days = Math.ceil((new Date(u.packageExpiresAt).getTime() - now.getTime()) / 86400000);
    return days <= 5;
  });

  return (
    <div>
      <AutoRefresh interval={10000} />
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Dashboard</h1>

      {/* Alertas de vencimento */}
      {expiredOrSoon.length > 0 && (
        <div className="mb-6 bg-amber-50 border border-amber-200 rounded-xl p-4">
          <p className="text-sm font-semibold text-amber-800 mb-3">
            Pacotes vencidos ou vencendo em breve ({expiredOrSoon.length})
          </p>
          <div className="space-y-2">
            {expiredOrSoon.map(u => {
              const days = u.packageExpiresAt
                ? Math.ceil((new Date(u.packageExpiresAt).getTime() - now.getTime()) / 86400000)
                : null;
              const expired = days !== null && days <= 0;
              return (
                <div key={u.id} className="flex items-center justify-between bg-white rounded-lg px-4 py-2.5 border border-amber-100">
                  <div>
                    <span className="font-medium text-gray-900 text-sm">{u.username}</span>
                    {u.name && <span className="text-gray-400 text-xs ml-2">{u.name}</span>}
                    <span className={`ml-2 text-xs font-medium px-2 py-0.5 rounded-full ${expired ? "bg-red-100 text-red-600" : "bg-yellow-100 text-yellow-700"}`}>
                      {expired ? `Expirou há ${Math.abs(days!)} dia(s)` : `Vence em ${days} dia(s)`}
                    </span>
                  </div>
                  <RenewButton userId={u.id} username={u.username} packageDays={u.packageDays} />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-8">
        <StatCard label="Total de usuários" value={String(totalUsers.count)} />
        <StatCard label="Usuários ativos" value={String(activeUsers.count)} />
        <StatCard label="Online agora" value={String(onlineUsers.length)} highlight={onlineUsers.length > 0} />
        <StatCard label="Consumo total" value={formatBytes(Number(totalConsumed.sum ?? 0))} />
      </div>

      {/* Online agora */}
      {onlineUsers.length > 0 && (
        <div className="mb-6 bg-green-50 border border-green-200 rounded-xl p-5">
          <p className="text-sm font-semibold text-green-800 mb-3">
            Online agora ({onlineUsers.length})
          </p>
          <div className="flex flex-wrap gap-2">
            {onlineUsers.map(u => (
              <div key={u.username} className="flex items-center gap-2 bg-white border border-green-100 rounded-lg px-3 py-2">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-sm font-medium text-gray-900">{u.name ?? u.username}</span>
                <span className="text-xs text-gray-400">{formatBytes(u.consumedBytes)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Todos os usuários por consumo */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">Consumo por usuário</h2>
            <Link href="/admin/reports" className="text-sm text-blue-600 hover:underline">Ver relatório</Link>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b border-gray-100">
                <th className="pb-2 font-medium">Usuário</th>
                <th className="pb-2 font-medium text-right">Consumo</th>
                <th className="pb-2 font-medium text-right">Quota</th>
              </tr>
            </thead>
            <tbody>
              {allUsers.map(u => (
                <tr key={u.username} className="border-b border-gray-50 last:border-0">
                  <td className="py-2 text-gray-700">{u.name ?? u.username}</td>
                  <td className="py-2 text-right text-gray-600">{formatBytes(u.consumedBytes)}</td>
                  <td className="py-2 text-right text-gray-400">{u.quotaBytes > 0 ? formatBytes(u.quotaBytes) : "Ilimitado"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Sessões por usuário no mês */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">Conexões no mês</h2>
            <Link href="/admin/reports" className="text-sm text-blue-600 hover:underline">Ver relatório</Link>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b border-gray-100">
                <th className="pb-2 font-medium">Usuário</th>
                <th className="pb-2 font-medium text-center">Sessões</th>
                <th className="pb-2 font-medium text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {sessionsByUser.length === 0 ? (
                <tr><td colSpan={3} className="py-4 text-center text-gray-400">Nenhuma sessão este mês</td></tr>
              ) : sessionsByUser.map((s, i) => (
                <tr key={i} className="border-b border-gray-50 last:border-0">
                  <td className="py-2 text-gray-700">{s.name ?? s.username}</td>
                  <td className="py-2 text-center text-gray-400">{s.connections}x</td>
                  <td className="py-2 text-right text-gray-600">{formatBytes(Number(s.bytesIn ?? 0) + Number(s.bytesOut ?? 0))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`rounded-xl border p-5 ${highlight ? "bg-green-50 border-green-200" : "bg-white border-gray-200"}`}>
      <p className={`text-sm ${highlight ? "text-green-700" : "text-gray-500"}`}>{label}</p>
      <p className={`text-2xl font-bold mt-1 ${highlight ? "text-green-800" : "text-gray-900"}`}>{value}</p>
    </div>
  );
}
