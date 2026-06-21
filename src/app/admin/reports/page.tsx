"use client";

import { useEffect, useState } from "react";
import { formatBytes, formatDate } from "@/lib/utils";

interface DailyRow { date: string; bytesTotal: number; username: string; name: string | null; }
interface SessionRow { id: number; username: string; ip: string; mac: string; bytesIn: number; bytesOut: number; startedAt: string; endedAt: string | null; }

export default function ReportsPage() {
  const [from, setFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().slice(0, 10);
  });
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [daily, setDaily] = useState<DailyRow[]>([]);
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    const res = await fetch(`/api/admin/reports?from=${from}&to=${to}`);
    const data = await res.json();
    setDaily(data.usage);
    setSessions(data.sessions);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function exportCSV() {
    const header = "Data,Usuário,Nome,Bytes\n";
    const rows = daily.map((r) => `${r.date},${r.username},${r.name ?? ""},${r.bytesTotal}`).join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `relatorio-${from}-${to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Relatórios</h1>
        <button onClick={exportCSV} className="text-sm border border-gray-300 rounded-lg px-4 py-2 hover:bg-gray-50 transition-colors">
          Exportar CSV
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6 flex flex-wrap gap-4 items-end">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">De</label>
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Até</label>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm" />
        </div>
        <button onClick={load} disabled={loading} className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm rounded-lg px-4 py-2 transition-colors">
          {loading ? "..." : "Filtrar"}
        </button>
      </div>

      {/* Daily usage */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-6">
        <div className="px-5 py-3 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900 text-sm">Consumo por dia</h2>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              {["Data", "Usuário", "Nome", "Consumo"].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {daily.length === 0 ? (
              <tr><td colSpan={4} className="px-4 py-6 text-center text-gray-400 text-sm">Nenhum dado para o período</td></tr>
            ) : daily.map((r, i) => (
              <tr key={i} className="border-b border-gray-50 last:border-0">
                <td className="px-4 py-2 text-gray-700">{r.date}</td>
                <td className="px-4 py-2 text-gray-700">{r.username}</td>
                <td className="px-4 py-2 text-gray-500">{r.name ?? "—"}</td>
                <td className="px-4 py-2 font-medium text-gray-800">{formatBytes(r.bytesTotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Sessions */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900 text-sm">Sessões recentes (últimas 100)</h2>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              {["Usuário", "IP", "Download", "Upload", "Total", "Início"].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sessions.map((s) => (
              <tr key={s.id} className="border-b border-gray-50 last:border-0">
                <td className="px-4 py-2 text-gray-700">{s.username}</td>
                <td className="px-4 py-2 text-gray-500">{s.ip}</td>
                <td className="px-4 py-2 text-gray-600">{formatBytes(s.bytesIn)}</td>
                <td className="px-4 py-2 text-gray-600">{formatBytes(s.bytesOut)}</td>
                <td className="px-4 py-2 font-medium text-gray-800">{formatBytes(s.bytesIn + s.bytesOut)}</td>
                <td className="px-4 py-2 text-gray-400">{formatDate(s.startedAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
