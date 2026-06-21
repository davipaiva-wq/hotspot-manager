import { auth } from "@/lib/auth";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { formatBytes, percentUsed } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function PortalHome() {
  const session = await auth();
  const [user] = await db
    .select({
      username: users.username,
      name: users.name,
      quotaBytes: users.quotaBytes,
      consumedBytes: users.consumedBytes,
      dailyLimitBytes: users.dailyLimitBytes,
      dailyConsumedBytes: users.dailyConsumedBytes,
    })
    .from(users)
    .where(eq(users.id, Number(session!.user!.id)))
    .limit(1);

  const totalPct = percentUsed(user.consumedBytes, user.quotaBytes);
  const dailyPct = percentUsed(user.dailyConsumedBytes, user.dailyLimitBytes);

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-900 mb-1">Meu consumo</h1>
      <p className="text-sm text-gray-500 mb-6">Acompanhe quanto você já usou da sua quota</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        {/* Total quota */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <p className="text-xs text-gray-500 uppercase tracking-wide font-medium mb-3">Quota total</p>
          {user.quotaBytes === 0 ? (
            <p className="text-2xl font-bold text-green-600">Ilimitado</p>
          ) : (
            <>
              <div className="flex justify-between text-sm mb-1">
                <span className="font-semibold text-gray-900">{formatBytes(user.consumedBytes)}</span>
                <span className="text-gray-400">de {formatBytes(user.quotaBytes)}</span>
              </div>
              <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-3 rounded-full transition-all ${totalPct >= 90 ? "bg-red-500" : totalPct >= 70 ? "bg-yellow-400" : "bg-blue-500"}`}
                  style={{ width: `${totalPct}%` }}
                />
              </div>
              <p className="text-xs text-gray-400 mt-1 text-right">{totalPct}% usado</p>
            </>
          )}
        </div>

        {/* Daily limit */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <p className="text-xs text-gray-500 uppercase tracking-wide font-medium mb-3">Limite diário</p>
          {user.dailyLimitBytes === 0 ? (
            <p className="text-sm text-gray-400">Sem limite diário configurado</p>
          ) : (
            <>
              <div className="flex justify-between text-sm mb-1">
                <span className="font-semibold text-gray-900">{formatBytes(user.dailyConsumedBytes)}</span>
                <span className="text-gray-400">de {formatBytes(user.dailyLimitBytes)}</span>
              </div>
              <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-3 rounded-full transition-all ${dailyPct >= 90 ? "bg-red-500" : dailyPct >= 70 ? "bg-yellow-400" : "bg-green-500"}`}
                  style={{ width: `${dailyPct}%` }}
                />
              </div>
              <p className="text-xs text-gray-400 mt-1 text-right">{dailyPct}% usado hoje</p>
            </>
          )}
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 text-sm text-blue-700">
        Acesse <strong>Histórico</strong> para ver o consumo dia a dia, <strong>Meu limite</strong> para configurar seu limite diário, ou <strong>Senha</strong> para alterar sua senha.
      </div>
    </div>
  );
}
