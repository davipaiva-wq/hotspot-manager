"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { formatBytes } from "@/lib/utils";
import UsageBarChart from "@/components/UsageBarChart";

interface UserDetail {
  id: number;
  username: string;
  name: string | null;
  mac: string | null;
  packageName: string | null;
  packageExpiresAt: string | null;
  packageDays: number;
  lastRenewedAt: string | null;
  quotaBytes: number;
  consumedBytes: number;
  dailyLimitBytes: number;
  dailyConsumedBytes: number;
  active: boolean;
  lastSeenAt: string | null;
  createdAt: string;
}

interface Session {
  id: number;
  sessionId: string | null;
  ip: string | null;
  mac: string | null;
  bytesIn: number;
  bytesOut: number;
  startedAt: string;
}

interface DailyUsage {
  date: string;
  bytesTotal: number;
}

interface Stats {
  user: UserDetail;
  sessions: Session[];
  daily: DailyUsage[];
}


export default function UserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [disconnecting, setDisconnecting] = useState(false);

  useEffect(() => {
    function load() {
      fetch(`/api/admin/users/${id}/stats`).then(r => r.json()).then(setStats);
    }
    load();
    const id_ = setInterval(load, 10000);
    return () => clearInterval(id_);
  }, [id]);

  async function handleDisconnect() {
    if (!confirm("Desconectar este usuário agora?")) return;
    setDisconnecting(true);
    await fetch(`/api/admin/users/${id}/disconnect`, { method: "POST" });
    setDisconnecting(false);
  }

  if (!stats) return <p className="text-sm text-gray-400">Carregando...</p>;

  const { user, sessions, daily } = stats;
  const pct = user.quotaBytes > 0 ? Math.min(100, Math.round((user.consumedBytes / user.quotaBytes) * 100)) : 0;
  const daysLeft = user.packageExpiresAt
    ? Math.ceil((new Date(user.packageExpiresAt).getTime() - Date.now()) / 86400000)
    : null;

  const twoMinAgo = new Date(Date.now() - 2 * 60 * 1000);
  const isOnline = user.lastSeenAt ? new Date(user.lastSeenAt) >= twoMinAgo : false;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => router.back()} className="text-sm text-gray-500 hover:text-gray-900">← Voltar</button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">{user.name ?? user.username}</h1>
            {isOnline && (
              <span className="flex items-center gap-1.5 text-xs font-medium text-green-700 bg-green-50 border border-green-200 px-2.5 py-1 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                Online
              </span>
            )}
            <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${user.active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}>
              {user.active ? "Ativo" : "Bloqueado"}
            </span>
          </div>
          <p className="text-sm text-gray-500 mt-0.5">@{user.username}</p>
        </div>
        {isOnline && (
          <button
            onClick={handleDisconnect}
            disabled={disconnecting}
            className="text-sm font-medium bg-red-50 border border-red-200 text-red-600 hover:bg-red-100 disabled:opacity-50 px-4 py-2 rounded-lg transition-colors"
          >
            {disconnecting ? "Desconectando..." : "Desconectar"}
          </button>
        )}
      </div>

      {/* Info cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-400 uppercase font-semibold mb-1">MAC</p>
          <p className="text-sm font-mono font-medium text-gray-800">{user.mac ?? "—"}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-400 uppercase font-semibold mb-1">Pacote</p>
          <p className="text-sm font-medium text-gray-800">{user.packageName ?? "—"}</p>
          {daysLeft !== null && (
            <p className={`text-xs mt-0.5 ${daysLeft <= 0 ? "text-red-500" : daysLeft <= 5 ? "text-yellow-600" : "text-gray-400"}`}>
              {daysLeft <= 0 ? "Expirado" : `${daysLeft} dias restantes`}
            </p>
          )}
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-400 uppercase font-semibold mb-1">Consumo total</p>
          <p className="text-sm font-medium text-gray-800">{formatBytes(user.consumedBytes)}</p>
          {user.quotaBytes > 0 && (
            <>
              <div className="h-1.5 bg-gray-100 rounded-full mt-2">
                <div className={`h-1.5 rounded-full ${pct >= 90 ? "bg-red-500" : pct >= 70 ? "bg-yellow-400" : "bg-blue-500"}`} style={{ width: `${pct}%` }} />
              </div>
              <p className="text-xs text-gray-400 mt-1">{pct}% de {formatBytes(user.quotaBytes)}</p>
            </>
          )}
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-400 uppercase font-semibold mb-1">Sessões</p>
          <p className="text-sm font-medium text-gray-800">{sessions.length}</p>
          {user.lastSeenAt && (
            <p className="text-xs text-gray-400 mt-0.5">
              Visto: {new Date(user.lastSeenAt).toLocaleString("pt-BR")}
            </p>
          )}
        </div>
      </div>

      {/* Gráfico de uso diário */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="font-semibold text-gray-900 mb-4">Consumo diário</h2>
        {(() => {
          const chartTo = user.packageExpiresAt ? user.packageExpiresAt.slice(0, 10) : undefined;
          const days = user.packageDays ?? 30;
          const chartFrom = user.lastRenewedAt
            ? new Date(user.lastRenewedAt).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).split("/").reverse().join("-")
            : chartTo
            ? new Date(new Date(chartTo + "T12:00:00Z").getTime() - (days - 1) * 86400000).toISOString().split("T")[0]
            : undefined;
          return <UsageBarChart data={daily} from={chartFrom} to={chartTo} />;
        })()}
      </div>

      {/* Sessões */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="font-semibold text-gray-900 mb-4">Sessões (últimas {sessions.length})</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b border-gray-100">
                <th className="pb-2 font-medium">Data</th>
                <th className="pb-2 font-medium">IP</th>
                <th className="pb-2 font-medium">MAC</th>
                <th className="pb-2 font-medium text-right">Download</th>
                <th className="pb-2 font-medium text-right">Upload</th>
                <th className="pb-2 font-medium text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {sessions.length === 0 ? (
                <tr><td colSpan={6} className="py-6 text-center text-gray-400">Nenhuma sessão registrada.</td></tr>
              ) : sessions.map(s => (
                <tr key={s.id} className="border-b border-gray-50 last:border-0">
                  <td className="py-2 text-gray-600 whitespace-nowrap">{new Date(s.startedAt).toLocaleString("pt-BR")}</td>
                  <td className="py-2 text-gray-600 font-mono text-xs">{s.ip ?? "—"}</td>
                  <td className="py-2 text-gray-600 font-mono text-xs">{s.mac ?? "—"}</td>
                  <td className="py-2 text-right text-gray-600">{formatBytes(s.bytesOut)}</td>
                  <td className="py-2 text-right text-gray-600">{formatBytes(s.bytesIn)}</td>
                  <td className="py-2 text-right font-medium text-gray-800">{formatBytes(s.bytesIn + s.bytesOut)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
