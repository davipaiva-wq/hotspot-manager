"use client";

import { formatBytes } from "@/lib/utils";

interface DataPoint {
  time: string;
  ether1Bytes: number;
  bridgeBytes: number;
}

function formatTime(t: string) {
  return new Date(t).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

export default function InterfaceChart({ data }: { data: DataPoint[] }) {
  if (data.length < 2) {
    return <p className="text-sm text-gray-400 text-center py-8">Aguardando mais leituras...</p>;
  }

  const W = 800;
  const H = 200;
  const PL = 64, PR = 16, PT = 10, PB = 28;

  const maxBytes = Math.max(...data.map(d => Math.max(d.ether1Bytes, d.bridgeBytes)), 1);

  const x = (i: number) => PL + (i / (data.length - 1)) * (W - PL - PR);
  const y = (v: number) => PT + (1 - v / maxBytes) * (H - PT - PB);

  const e1Path = data.map((d, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(d.ether1Bytes).toFixed(1)}`).join(" ");
  const brPath = data.map((d, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(d.bridgeBytes).toFixed(1)}`).join(" ");

  const midY = (H - PB + PT) / 2;

  return (
    <div>
      <div className="flex gap-4 mb-3 text-xs">
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-6 h-0.5 bg-orange-500 rounded" />
          <span className="text-gray-500">WAN (ether1)</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-6 h-0.5 bg-blue-500 rounded" />
          <span className="text-gray-500">Usuários (bridge)</span>
        </span>
      </div>
      <div className="overflow-x-auto">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ minWidth: 360 }}>
          {/* Grid */}
          {[PT, midY, H - PB].map(yv => (
            <line key={yv} x1={PL} y1={yv} x2={W - PR} y2={yv} stroke={yv === H - PB ? "#e5e7eb" : "#f3f4f6"} strokeWidth={1} />
          ))}
          {/* Y labels */}
          <text x={PL - 4} y={PT + 4} textAnchor="end" fontSize={9} fill="#9ca3af">{formatBytes(maxBytes)}</text>
          <text x={PL - 4} y={midY + 4} textAnchor="end" fontSize={9} fill="#9ca3af">{formatBytes(maxBytes / 2)}</text>
          <text x={PL - 4} y={H - PB + 4} textAnchor="end" fontSize={9} fill="#9ca3af">0</text>
          {/* Lines */}
          <path d={e1Path} fill="none" stroke="#f97316" strokeWidth={2} strokeLinejoin="round" />
          <path d={brPath} fill="none" stroke="#3b82f6" strokeWidth={2} strokeLinejoin="round" />
          {/* X labels */}
          <text x={PL} y={H} textAnchor="middle" fontSize={9} fill="#9ca3af">{formatTime(data[0].time)}</text>
          <text x={W - PR} y={H} textAnchor="middle" fontSize={9} fill="#9ca3af">{formatTime(data[data.length - 1].time)}</text>
        </svg>
      </div>
    </div>
  );
}
