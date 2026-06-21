"use client";

import { useEffect, useState } from "react";
import { formatBytes } from "@/lib/utils";

export default function LimitsPage() {
  const [dailyMB, setDailyMB] = useState("");
  const [current, setCurrent] = useState(0);
  const [msg, setMsg] = useState({ text: "", ok: false });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/user/profile")
      .then((r) => r.json())
      .then((d) => {
        setCurrent(d.dailyLimitBytes ?? 0);
        setDailyMB(d.dailyLimitBytes > 0 ? String(d.dailyLimitBytes / 1048576) : "");
      });
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMsg({ text: "", ok: false });

    const bytes = dailyMB ? Math.round(parseFloat(dailyMB) * 1048576) : 0;
    const res = await fetch("/api/user/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dailyLimitBytes: bytes }),
    });

    if (res.ok) {
      setCurrent(bytes);
      setMsg({ text: "Limite salvo com sucesso!", ok: true });
    } else {
      setMsg({ text: "Erro ao salvar limite.", ok: false });
    }
    setLoading(false);
  }

  return (
    <div className="max-w-sm">
      <h1 className="text-xl font-bold text-gray-900 mb-1">Meu limite diário</h1>
      <p className="text-sm text-gray-500 mb-6">
        Defina quanto você quer usar por dia. Quando atingir o limite, o acesso será bloqueado até meia-noite.
      </p>

      {current > 0 && (
        <div className="mb-4 rounded-lg bg-blue-50 border border-blue-100 px-4 py-3 text-sm text-blue-700">
          Limite atual: <strong>{formatBytes(current)}/dia</strong>
        </div>
      )}

      {msg.text && (
        <div className={`mb-4 rounded-lg px-4 py-3 text-sm ${msg.ok ? "bg-green-50 border border-green-200 text-green-700" : "bg-red-50 border border-red-200 text-red-700"}`}>
          {msg.text}
        </div>
      )}

      <form onSubmit={save} className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Limite diário (MB — deixe em branco para sem limite)
          </label>
          <input
            type="number"
            min="0"
            step="any"
            value={dailyMB}
            onChange={(e) => setDailyMB(e.target.value)}
            placeholder="Ex: 500 (500 MB por dia)"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {dailyMB && parseFloat(dailyMB) > 0 && (
            <p className="text-xs text-gray-400 mt-1">
              = {formatBytes(Math.round(parseFloat(dailyMB) * 1048576))} por dia
            </p>
          )}
        </div>
        <button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium rounded-lg py-2 text-sm transition-colors">
          {loading ? "Salvando..." : "Salvar limite"}
        </button>
      </form>
    </div>
  );
}
