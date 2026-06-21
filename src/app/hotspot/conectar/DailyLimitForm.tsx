"use client";

import { useState } from "react";
import { formatBytes } from "@/lib/utils";

interface Props {
  userId: number;
  dailyLimitBytes: number;
  dailyConsumedBytes: number;
  dailyReached: boolean;
  link: string;
}

export default function DailyLimitForm({ userId, dailyLimitBytes, dailyConsumedBytes, dailyReached, link }: Props) {
  const [limitBytes, setLimitBytes] = useState(dailyLimitBytes);
  const [dailyMB, setDailyMB] = useState(dailyLimitBytes > 0 ? String(dailyLimitBytes / 1048576) : "");
  const [consumed, setConsumed] = useState(dailyConsumedBytes);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const reached = limitBytes > 0 && consumed >= limitBytes;
  const connectUrl = `/api/hotspot/connect?link=${encodeURIComponent(link)}`;

  async function saveLimit() {
    setSaving(true);
    const bytes = dailyMB ? Math.round(parseFloat(dailyMB) * 1048576) : 0;
    await fetch("/api/user/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dailyLimitBytes: bytes }),
    });
    setLimitBytes(bytes);
    setSaved(true);
    setSaving(false);
  }

  return (
    <div className="space-y-4">
      {/* Limite diário */}
      <div className="border border-gray-200 rounded-xl p-4 space-y-3">
        <div className="flex justify-between items-center">
          <p className="text-sm font-medium text-gray-700">Limite diário</p>
          {limitBytes > 0 ? (
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${reached ? "bg-orange-100 text-orange-700" : "bg-green-100 text-green-700"}`}>
              {formatBytes(consumed)} / {formatBytes(limitBytes)}
            </span>
          ) : (
            <span className="text-xs text-green-600 font-medium">Sem limite</span>
          )}
        </div>

        {reached && (
          <p className="text-xs text-orange-600 font-medium">
            Limite de hoje atingido. Aumente abaixo ou aguarde meia-noite.
          </p>
        )}

        <div className="flex gap-2 items-center">
          <input
            type="number"
            min="0"
            step="any"
            value={dailyMB}
            onChange={(e) => { setDailyMB(e.target.value); setSaved(false); }}
            placeholder="MB/dia  (vazio = sem limite)"
            className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={saveLimit}
            disabled={saving}
            className="text-xs bg-gray-100 hover:bg-gray-200 disabled:opacity-50 text-gray-700 font-medium rounded-lg px-3 py-1.5 transition-colors whitespace-nowrap"
          >
            {saving ? "..." : saved ? "Salvo ✓" : "Salvar"}
          </button>
        </div>
      </div>

      {/* Botão conectar */}
      {reached ? (
        <p className="text-xs text-center text-gray-400">Ajuste e salve o limite para poder conectar.</p>
      ) : (
        <a
          href={connectUrl}
          className="block w-full text-center bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold rounded-xl py-3.5 text-sm transition-colors"
        >
          Conectar à internet →
        </a>
      )}
    </div>
  );
}
