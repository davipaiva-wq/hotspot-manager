"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { formatBytes } from "@/lib/utils";

interface Profile {
  username: string;
  name: string | null;
  packageName: string | null;
  packageExpiresAt: string | null;
  quotaBytes: number;
  consumedBytes: number;
  dailyLimitBytes: number;
  dailyConsumedBytes: number;
}

export default function HotspotConectar() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <p className="text-gray-500 text-sm">Carregando...</p>
      </div>
    }>
      <ConectarInner />
    </Suspense>
  );
}

function ConectarInner() {
  const params = useSearchParams();
  const router = useRouter();
  const link = params.get("link") ?? "";

  const [profile, setProfile] = useState<Profile | null>(null);
  const [dailyMB, setDailyMB] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    fetch("/api/user/profile").then(async (r) => {
      if (r.status === 401) { router.replace("/login"); return; }
      const d = await r.json();
      setProfile(d);
      setDailyMB(d.dailyLimitBytes > 0 ? String(d.dailyLimitBytes / 1048576) : "");
    });
  }, []);

  async function saveLimit() {
    setSaving(true);
    const bytes = dailyMB ? Math.round(parseFloat(dailyMB) * 1048576) : 0;
    await fetch("/api/user/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dailyLimitBytes: bytes }),
    });
    const d = await fetch("/api/user/profile").then((r) => r.json());
    setProfile(d);
    setDailyMB(d.dailyLimitBytes > 0 ? String(d.dailyLimitBytes / 1048576) : "");
    setMsg("Salvo!");
    setSaving(false);
  }

  function buildConnectUrl() {
    return `/api/hotspot/connect?link=${encodeURIComponent(link)}`;
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <p className="text-gray-500 text-sm">Carregando...</p>
      </div>
    );
  }

  const quotaReached = profile.quotaBytes > 0 && profile.consumedBytes >= profile.quotaBytes;
  const dailyReached = profile.dailyLimitBytes > 0 && profile.dailyConsumedBytes >= profile.dailyLimitBytes;
  const expired = !!profile.packageExpiresAt && new Date(profile.packageExpiresAt) < new Date();
  const hardBlocked = quotaReached || expired;

  const totalPct = profile.quotaBytes > 0 ? Math.min(100, Math.round((profile.consumedBytes / profile.quotaBytes) * 100)) : 0;
  const connectUrl = buildConnectUrl();


  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg w-full max-w-sm overflow-hidden">
        {/* Header */}
        <div className="bg-blue-600 px-6 py-5 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center text-lg font-bold">
              {(profile.name ?? profile.username).charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="font-bold">{profile.name ?? profile.username}</p>
              <p className="text-blue-200 text-xs">{profile.packageName ?? "Plano padrão"}</p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-4">
          {/* Quota do pacote */}
          {profile.quotaBytes > 0 && (
            <div>
              <div className="flex justify-between text-sm mb-1.5">
                <span className="text-gray-500">Pacote total</span>
                <span className={`font-semibold ${totalPct >= 90 ? "text-red-600" : "text-gray-800"}`}>
                  {formatBytes(profile.consumedBytes)} / {formatBytes(profile.quotaBytes)}
                </span>
              </div>
              <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-2.5 rounded-full transition-all ${totalPct >= 90 ? "bg-red-500" : totalPct >= 70 ? "bg-yellow-400" : "bg-blue-500"}`}
                  style={{ width: `${totalPct}%` }}
                />
              </div>
            </div>
          )}

          {/* Pacote expirado */}
          {expired && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">
              Pacote expirado em {new Date(profile.packageExpiresAt!).toLocaleDateString("pt-BR")}. Contate o administrador.
            </div>
          )}

          {/* Quota esgotada */}
          {quotaReached && !expired && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">
              Quota total esgotada. Contate o administrador para recarregar.
            </div>
          )}

          {/* Limite diário */}
          {!hardBlocked && (
            <div className="border border-gray-200 rounded-xl p-4 space-y-3">
              <div className="flex justify-between items-center">
                <p className="text-sm font-medium text-gray-700">Limite diário</p>
                {profile.dailyLimitBytes > 0 && (
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${dailyReached ? "bg-orange-100 text-orange-700" : "bg-green-100 text-green-700"}`}>
                    {formatBytes(profile.dailyConsumedBytes)} / {formatBytes(profile.dailyLimitBytes)}
                  </span>
                )}
                {profile.dailyLimitBytes === 0 && (
                  <span className="text-xs text-green-600 font-medium">Sem limite</span>
                )}
              </div>

              {dailyReached && (
                <p className="text-xs text-orange-600 font-medium">
                  Limite de hoje atingido. Aumente o limite abaixo ou aguarde meia-noite.
                </p>
              )}

              <div className="flex gap-2 items-center">
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={dailyMB}
                  onChange={(e) => setDailyMB(e.target.value)}
                  placeholder="MB/dia  (vazio = sem limite)"
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={saveLimit}
                  disabled={saving}
                  className="text-xs bg-gray-100 hover:bg-gray-200 disabled:opacity-50 text-gray-700 font-medium rounded-lg px-3 py-1.5 transition-colors whitespace-nowrap"
                >
                  {saving ? "..." : "Salvar"}
                </button>
              </div>
              {msg && <p className="text-xs text-green-600">{msg}</p>}
            </div>
          )}

          {/* Botão conectar */}
          {hardBlocked ? (
            <div className="text-center py-2">
              <p className="text-sm text-gray-400">Não é possível conectar no momento.</p>
            </div>
          ) : dailyReached ? (
            <button
              disabled
              className="w-full bg-gray-200 text-gray-400 font-bold rounded-xl py-3.5 text-sm cursor-not-allowed"
            >
              Ajuste o limite para conectar
            </button>
          ) : (
            <a
              href={connectUrl}
              className="block w-full text-center bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold rounded-xl py-3.5 text-sm transition-colors"
            >
              Conectar à internet →
            </a>
          )}

          <p className="text-center">
            <a href="/portal" className="text-xs text-gray-400 hover:text-gray-600">Ver meu painel completo</a>
          </p>
        </div>
      </div>
    </div>
  );
}
