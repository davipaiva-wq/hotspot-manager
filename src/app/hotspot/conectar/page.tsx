import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { formatBytes } from "@/lib/utils";
import DailyLimitForm from "./DailyLimitForm";

export default async function HotspotConectar({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const cookieStore = await cookies();
  const uid = cookieStore.get("hsp-uid")?.value;
  if (!uid) redirect("/hotspot/login");

  const [user] = await db.select().from(users).where(eq(users.id, parseInt(uid))).limit(1);
  if (!user) redirect("/hotspot/login");

  const params = await searchParams;
  const link = params["link"] ?? "";

  const quotaReached = user.quotaBytes > 0 && user.consumedBytes >= user.quotaBytes;
  const dailyReached = user.dailyLimitBytes > 0 && user.dailyConsumedBytes >= user.dailyLimitBytes;
  const expired = !!user.packageExpiresAt && new Date(user.packageExpiresAt) < new Date();
  const hardBlocked = quotaReached || expired;

  const totalPct = user.quotaBytes > 0 ? Math.min(100, Math.round((user.consumedBytes / user.quotaBytes) * 100)) : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg w-full max-w-sm overflow-hidden">
        {/* Header */}
        <div className="bg-blue-600 px-6 py-5 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center text-lg font-bold">
              {(user.name ?? user.username).charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="font-bold">{user.name ?? user.username}</p>
              <p className="text-blue-200 text-xs">{user.packageName ?? "Plano padrão"}</p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-4">
          {/* Quota do pacote */}
          {user.quotaBytes > 0 && (
            <div>
              <div className="flex justify-between text-sm mb-1.5">
                <span className="text-gray-500">Pacote total</span>
                <span className={`font-semibold ${totalPct >= 90 ? "text-red-600" : "text-gray-800"}`}>
                  {formatBytes(user.consumedBytes)} / {formatBytes(user.quotaBytes)}
                </span>
              </div>
              <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-2.5 rounded-full ${totalPct >= 90 ? "bg-red-500" : totalPct >= 70 ? "bg-yellow-400" : "bg-blue-500"}`}
                  style={{ width: `${totalPct}%` }}
                />
              </div>
            </div>
          )}

          {/* Alertas bloqueantes */}
          {expired && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">
              Pacote expirado em {new Date(user.packageExpiresAt!).toLocaleDateString("pt-BR")}. Contate o administrador.
            </div>
          )}
          {quotaReached && !expired && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">
              Quota total esgotada. Contate o administrador.
            </div>
          )}

          {/* Limite diário + botão conectar */}
          {!hardBlocked && (
            <DailyLimitForm
              userId={user.id}
              dailyLimitBytes={user.dailyLimitBytes}
              dailyConsumedBytes={user.dailyConsumedBytes}
              dailyReached={dailyReached}
              link={link}
            />
          )}

          {hardBlocked && (
            <p className="text-sm text-gray-400 text-center py-2">Não é possível conectar no momento.</p>
          )}
        </div>
      </div>
    </div>
  );
}
