"use client";

import { useEffect, useState } from "react";
import { formatBytes, percentUsed } from "@/lib/utils";
import UsageBarChart from "@/components/UsageBarChart";

interface Profile {
  username: string;
  name: string | null;
  packageName: string | null;
  packageExpiresAt: string | null;
  packageDays: number;
  lastRenewedAt: string | null;
  quotaBytes: number;
  consumedBytes: number;
  dailyLimitBytes: number;
  dailyConsumedBytes: number;
}

interface DayData { date: string; bytesTotal: number; }

export default function PortalHome() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [daily, setDaily] = useState<DayData[]>([]);
  const [dailyMB, setDailyMB] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState({ text: "", ok: false });

  async function load() {
    const [profileRes, historyRes] = await Promise.all([
      fetch("/api/user/profile"),
      fetch("/api/user/history"),
    ]);
    const data = await profileRes.json();
    const history = await historyRes.json();
    setProfile(data);
    setDaily((history.daily ?? []).slice().reverse());
    setDailyMB(data.dailyLimitBytes > 0 ? String(data.dailyLimitBytes / 1048576) : "");
  }

  useEffect(() => {
    load();
    const id = setInterval(load, 15000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!profile) return;
    const esgotado =
      (profile.quotaBytes > 0 && profile.consumedBytes >= profile.quotaBytes) ||
      (profile.dailyLimitBytes > 0 && profile.dailyConsumedBytes >= profile.dailyLimitBytes);
    if (esgotado) {
      window.location.href = "http://192.168.85.2/logout";
    }
  }, [profile]);

  async function saveLimit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMsg({ text: "", ok: false });
    const bytes = dailyMB ? Math.round(parseFloat(dailyMB) * 1048576) : 0;
    const res = await fetch("/api/user/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dailyLimitBytes: bytes }),
    });
    if (res.ok) {
      setMsg({ text: "Limite diário salvo!", ok: true });
      load();
    } else {
      setMsg({ text: "Erro ao salvar.", ok: false });
    }
    setSaving(false);
  }

  if (!profile) return <p className="text-sm text-gray-400">Carregando...</p>;

  const totalPct = percentUsed(profile.consumedBytes, profile.quotaBytes);
  const dailyPct = percentUsed(profile.dailyConsumedBytes, profile.dailyLimitBytes);
  const remaining = profile.quotaBytes > 0 ? Math.max(0, profile.quotaBytes - profile.consumedBytes) : null;

  const expiresAt = profile.packageExpiresAt ? new Date(profile.packageExpiresAt) : null;
  const today = new Date();
  const daysLeft = expiresAt ? Math.ceil((expiresAt.getTime() - today.getTime()) / 86400000) : null;
  const expired = daysLeft !== null && daysLeft <= 0;

  const quotaEsgotada = profile.quotaBytes > 0 && profile.consumedBytes >= profile.quotaBytes;
  const quotaAlerta = !quotaEsgotada && totalPct >= 80;
  const diarioEsgotado = profile.dailyLimitBytes > 0 && profile.dailyConsumedBytes >= profile.dailyLimitBytes;
  const diarioAlerta = !diarioEsgotado && dailyPct >= 80;

  return (
    <div className="space-y-5">
      {quotaEsgotada && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-5">
          <p className="font-bold text-red-700 mb-1">Limite de dados esgotado</p>
          <p className="text-sm text-red-600">
            Você utilizou {formatBytes(profile.consumedBytes)} de {formatBytes(profile.quotaBytes)}.
            Você foi desconectado automaticamente do WiFi.
          </p>
        </div>
      )}

      {quotaAlerta && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
          <svg className="w-5 h-5 text-amber-500 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div>
            <p className="text-sm font-semibold text-amber-800">Atenção: {totalPct}% do limite usado</p>
            <p className="text-xs text-amber-700 mt-0.5">Restam apenas {formatBytes(remaining!)} do seu pacote.</p>
          </div>
        </div>
      )}

      {diarioEsgotado && (
        <div className="bg-orange-50 border border-orange-200 rounded-2xl p-5">
          <p className="font-bold text-orange-700 mb-1">Limite diário atingido</p>
          <p className="text-sm text-orange-600">
            Você usou {formatBytes(profile.dailyConsumedBytes)} de {formatBytes(profile.dailyLimitBytes)} hoje.
            Você foi desconectado automaticamente. O acesso volta à meia-noite.
          </p>
        </div>
      )}

      {diarioAlerta && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
          <svg className="w-5 h-5 text-amber-500 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div>
            <p className="text-sm font-semibold text-amber-800">Atenção: {dailyPct}% do limite diário usado</p>
            <p className="text-xs text-amber-700 mt-0.5">Você já usou {formatBytes(profile.dailyConsumedBytes)} de {formatBytes(profile.dailyLimitBytes)} hoje.</p>
          </div>
        </div>
      )}
      {/* Gráfico de consumo diário */}
      {(() => {
        const expiresAt = profile.packageExpiresAt;
        const renewedAt = profile.lastRenewedAt;
        const days = profile.packageDays ?? 30;
        const chartTo = expiresAt ? expiresAt.slice(0, 10) : undefined;
        const chartFrom = renewedAt
          ? new Date(renewedAt).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).split("/").reverse().join("-")
          : chartTo
          ? new Date(new Date(chartTo + "T12:00:00Z").getTime() - (days - 1) * 86400000).toISOString().split("T")[0]
          : undefined;
        return (
          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <h2 className="font-semibold text-gray-900 mb-4">Consumo diário</h2>
            <UsageBarChart data={daily} from={chartFrom} to={chartTo} />
          </div>
        );
      })()}

      <div>
        <h1 className="text-xl font-bold text-gray-900">Meu Pacote</h1>
        <p className="text-sm text-gray-500 mt-0.5">Acompanhe seu plano e consumo de dados</p>
      </div>

      {/* Pacote */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5">
        <p className="text-xs text-gray-400 uppercase font-semibold tracking-wide mb-3">Plano contratado</p>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-lg font-bold text-gray-900">
              {profile.packageName ?? "Plano padrão"}
            </p>
            <p className="text-sm text-gray-500 mt-0.5">
              Quota total: <span className="font-medium text-gray-700">{profile.quotaBytes > 0 ? formatBytes(profile.quotaBytes) : "Ilimitado"}</span>
            </p>
          </div>
          {expiresAt && (
            <div className={`text-right px-3 py-2 rounded-xl text-sm font-medium ${expired ? "bg-red-50 text-red-600" : daysLeft! <= 5 ? "bg-yellow-50 text-yellow-700" : "bg-green-50 text-green-700"}`}>
              {expired ? "Expirado" : (
                <>
                  <p className="font-bold">{daysLeft} {daysLeft === 1 ? "dia" : "dias"}</p>
                  <p className="text-xs font-normal opacity-80">restantes</p>
                </>
              )}
            </div>
          )}
        </div>
        {expiresAt && (
          <p className="text-xs text-gray-400 mt-2">
            Validade: {expiresAt.toLocaleDateString("pt-BR")}
          </p>
        )}
      </div>

      {/* Quota total */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5">
        <p className="text-xs text-gray-400 uppercase font-semibold tracking-wide mb-3">Consumo total</p>
        {profile.quotaBytes === 0 ? (
          <div className="flex items-center justify-between">
            <p className="text-2xl font-bold text-gray-900">{formatBytes(profile.consumedBytes)}</p>
            <span className="text-sm text-green-600 font-medium bg-green-50 px-3 py-1 rounded-full">Ilimitado</span>
          </div>
        ) : (
          <>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-500">Usado</span>
              <span className="font-semibold text-gray-900">{formatBytes(profile.consumedBytes)} / {formatBytes(profile.quotaBytes)}</span>
            </div>
            <div className="h-4 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-4 rounded-full transition-all ${totalPct >= 90 ? "bg-red-500" : totalPct >= 70 ? "bg-yellow-400" : "bg-blue-500"}`}
                style={{ width: `${totalPct}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-gray-400 mt-1.5">
              <span>{totalPct}% usado</span>
              {remaining !== null && <span>{formatBytes(remaining)} restantes</span>}
            </div>
          </>
        )}
      </div>

      {/* Hoje */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5">
        <p className="text-xs text-gray-400 uppercase font-semibold tracking-wide mb-3">Uso de hoje</p>
        <div className="flex justify-between text-sm mb-2">
          <span className="text-gray-500">Consumido hoje</span>
          <span className="font-semibold text-gray-900">{formatBytes(profile.dailyConsumedBytes)}</span>
        </div>
        {profile.dailyLimitBytes > 0 && (
          <>
            <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-3 rounded-full transition-all ${dailyPct >= 90 ? "bg-red-500" : dailyPct >= 70 ? "bg-yellow-400" : "bg-green-500"}`}
                style={{ width: `${dailyPct}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-gray-400 mt-1.5">
              <span>{dailyPct}% do limite diário</span>
              <span>Limite: {formatBytes(profile.dailyLimitBytes)}</span>
            </div>
          </>
        )}
      </div>

      {/* Ajuste de limite diário */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5">
        <p className="text-xs text-gray-400 uppercase font-semibold tracking-wide mb-1">Meu limite diário</p>
        <p className="text-sm text-gray-500 mb-4">
          Defina quanto quer usar por dia. Ao atingir o limite o acesso é pausado até meia-noite.
        </p>

        {msg.text && (
          <div className={`mb-3 rounded-lg px-3 py-2 text-sm ${msg.ok ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"}`}>
            {msg.text}
          </div>
        )}

        <form onSubmit={saveLimit} className="flex gap-3 items-end">
          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Limite em MB (deixe vazio = sem limite)
            </label>
            <input
              type="number"
              min="0"
              step="any"
              value={dailyMB}
              onChange={(e) => setDailyMB(e.target.value)}
              placeholder="Ex: 500"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {dailyMB && parseFloat(dailyMB) > 0 && (
              <p className="text-xs text-gray-400 mt-1">= {formatBytes(Math.round(parseFloat(dailyMB) * 1048576))}/dia</p>
            )}
          </div>
          <button
            type="submit"
            disabled={saving}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium rounded-lg px-4 py-2 text-sm transition-colors whitespace-nowrap"
          >
            {saving ? "Salvando..." : "Salvar"}
          </button>
        </form>
      </div>
    </div>
  );
}
