"use client";

import { useEffect, useState } from "react";
import { formatBytes, formatDate } from "@/lib/utils";

interface DailyRow { date: string; bytesTotal: number; }
interface SessionRow { id: number; ip: string; bytesIn: number; bytesOut: number; startedAt: string; endedAt: string | null; }

export default function HistoryPage() {
  const [daily, setDaily] = useState<DailyRow[]>([]);
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/user/history")
      .then((r) => r.json())
      .then((d) => { setDaily(d.daily); setSessions(d.sessions); setLoading(false); });
  }, []);

  if (loading) return <p className="text-sm text-gray-500">Carregando...</p>;

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-900 mb-6">Histórico de consumo</h1>

      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden mb-6">
        <div className="px-5 py-3 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900 text-sm">Consumo diário (últimos 30 dias)</h2>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Data</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Total</th>
            </tr>
          </thead>
          <tbody>
            {daily.length === 0 ? (
              <tr><td colSpan={2} className="px-4 py-6 text-center text-gray-400 text-sm">Nenhum dado ainda</td></tr>
            ) : daily.map((r) => (
              <tr key={r.date} className="border-b border-gray-50 last:border-0">
                <td className="px-4 py-2 text-gray-700">{r.date}</td>
                <td className="px-4 py-2 text-right font-medium text-gray-800">{formatBytes(r.bytesTotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900 text-sm">Sessões recentes</h2>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Início</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">IP</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Download</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Upload</th>
            </tr>
          </thead>
          <tbody>
            {sessions.map((s) => (
              <tr key={s.id} className="border-b border-gray-50 last:border-0">
                <td className="px-4 py-2 text-gray-600">{formatDate(s.startedAt)}</td>
                <td className="px-4 py-2 text-gray-500">{s.ip}</td>
                <td className="px-4 py-2 text-right text-gray-700">{formatBytes(s.bytesIn)}</td>
                <td className="px-4 py-2 text-right text-gray-700">{formatBytes(s.bytesOut)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
