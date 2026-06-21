"use client";

import { useEffect, useState } from "react";
import { formatBytes, formatDate } from "@/lib/utils";

interface DailyRow { date: string; bytesTotal: number; }
interface SessionRow { id: number; ip: string; bytesIn: number; bytesOut: number; startedAt: string; }

export default function HistoryPage() {
  const [daily, setDaily] = useState<DailyRow[]>([]);
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"sessions" | "daily">("sessions");

  useEffect(() => {
    fetch("/api/user/history")
      .then((r) => r.json())
      .then((d) => { setDaily(d.daily ?? []); setSessions(d.sessions ?? []); setLoading(false); });
  }, []);

  if (loading) return <p className="text-sm text-gray-500 py-8 text-center">Carregando...</p>;

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-900 mb-4">Histórico</h1>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-5">
        <button
          onClick={() => setTab("sessions")}
          className={`flex-1 text-sm font-medium rounded-lg py-2 transition-colors ${tab === "sessions" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
        >
          Conexões ({sessions.length})
        </button>
        <button
          onClick={() => setTab("daily")}
          className={`flex-1 text-sm font-medium rounded-lg py-2 transition-colors ${tab === "daily" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
        >
          Por dia ({daily.length})
        </button>
      </div>

      {/* Sessões */}
      {tab === "sessions" && (
        <div className="space-y-2">
          {sessions.length === 0 ? (
            <p className="text-center text-gray-400 text-sm py-8">Nenhuma sessão registrada</p>
          ) : sessions.map((s) => (
            <div key={s.id} className="bg-white rounded-xl border border-gray-200 px-4 py-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-gray-400">{formatDate(s.startedAt)}</span>
                <span className="text-xs text-gray-400 font-mono">{s.ip}</span>
              </div>
              <div className="flex gap-4">
                <div>
                  <p className="text-xs text-gray-400">Download</p>
                  <p className="text-sm font-semibold text-blue-600">{formatBytes(s.bytesOut)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Upload</p>
                  <p className="text-sm font-semibold text-gray-600">{formatBytes(s.bytesIn)}</p>
                </div>
                <div className="ml-auto text-right">
                  <p className="text-xs text-gray-400">Total</p>
                  <p className="text-sm font-bold text-gray-800">{formatBytes(s.bytesIn + s.bytesOut)}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Diário */}
      {tab === "daily" && (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          {daily.length === 0 ? (
            <p className="text-center text-gray-400 text-sm py-8">Nenhum dado ainda</p>
          ) : (
            <div className="divide-y divide-gray-50">
              {daily.map((r) => (
                <div key={r.date} className="flex items-center justify-between px-4 py-3">
                  <span className="text-sm text-gray-700">{r.date}</span>
                  <span className="text-sm font-semibold text-gray-900">{formatBytes(r.bytesTotal)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
