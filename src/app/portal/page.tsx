"use client";

import { useEffect, useState } from "react";
import { formatBytes, percentUsed } from "@/lib/utils";

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

export default function PortalHome() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [dailyMB, setDailyMB] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState({ text: "", ok: false });

  async function load() {
    const res = await fetch("/api/user/profile");
    const data = await res.json();
    setProfile(data);
    setDailyMB(data.dailyLimitBytes > 0 ? String(data.dailyLimitBytes / 1048576) : "");
  }

  useEffect(() => { load(); }, []);

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

  return (
    <div className="space-y-5">
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
