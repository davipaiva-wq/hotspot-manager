import { db } from "@/db";
import { users, sessions } from "@/db/schema";
import { eq, count, sum, desc } from "drizzle-orm";
import { formatBytes } from "@/lib/utils";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const [totalUsers] = await db.select({ count: count() }).from(users).where(eq(users.role, "user"));
  const [activeUsers] = await db.select({ count: count() }).from(users).where(eq(users.active, true));
  const [totalConsumed] = await db.select({ sum: sum(users.consumedBytes) }).from(users);
  const recentSessions = await db
    .select({ username: users.username, bytesIn: sessions.bytesIn, bytesOut: sessions.bytesOut, startedAt: sessions.startedAt, ip: sessions.ip })
    .from(sessions)
    .leftJoin(users, eq(sessions.userId, users.id))
    .orderBy(desc(sessions.startedAt))
    .limit(8);

  const topConsumers = await db
    .select({ username: users.username, name: users.name, consumedBytes: users.consumedBytes, quotaBytes: users.quotaBytes })
    .from(users)
    .where(eq(users.role, "user"))
    .orderBy(desc(users.consumedBytes))
    .limit(5);

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Dashboard</h1>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <StatCard label="Total de usuários" value={String(totalUsers.count)} />
        <StatCard label="Usuários ativos" value={String(activeUsers.count)} />
        <StatCard label="Consumo total" value={formatBytes(Number(totalConsumed.sum ?? 0))} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top consumers */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">Maiores consumidores</h2>
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
              {topConsumers.map((u) => (
                <tr key={u.username} className="border-b border-gray-50 last:border-0">
                  <td className="py-2 text-gray-700">{u.name ?? u.username}</td>
                  <td className="py-2 text-right text-gray-600">{formatBytes(u.consumedBytes)}</td>
                  <td className="py-2 text-right text-gray-400">{u.quotaBytes > 0 ? formatBytes(u.quotaBytes) : "Ilimitado"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Recent sessions */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="font-semibold text-gray-900 mb-4">Sessões recentes</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b border-gray-100">
                <th className="pb-2 font-medium">Usuário</th>
                <th className="pb-2 font-medium">IP</th>
                <th className="pb-2 font-medium text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {recentSessions.map((s, i) => (
                <tr key={i} className="border-b border-gray-50 last:border-0">
                  <td className="py-2 text-gray-700">{s.username}</td>
                  <td className="py-2 text-gray-500">{s.ip}</td>
                  <td className="py-2 text-right text-gray-600">{formatBytes(s.bytesIn + s.bytesOut)}</td>
                </tr>
              ))}
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
