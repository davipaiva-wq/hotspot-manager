"use client";

import { formatBytes } from "@/lib/utils";

interface DayData {
  date: string;
  bytesTotal: number;
}

function shortDate(dateStr: string) {
  const [, m, d] = dateStr.split("-");
  const months = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
  return `${parseInt(d)} de ${months[parseInt(m) - 1]}.`;
}

function fillRange(data: DayData[], from: string, to: string): DayData[] {
  const map = new Map(data.map((d) => [d.date, d.bytesTotal]));
  const result: DayData[] = [];
  const cur = new Date(from + "T12:00:00Z");
  const end = new Date(to + "T12:00:00Z");
  while (cur <= end) {
    const dateStr = cur.toISOString().split("T")[0];
    result.push({ date: dateStr, bytesTotal: map.get(dateStr) ?? 0 });
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return result;
}

export default function UsageBarChart({
  data,
  from,
  to,
  color = "blue",
}: {
  data: DayData[];
  from?: string;
  to?: string;
  color?: "blue" | "indigo";
}) {
  const filled = from && to ? fillRange(data, from, to) : data;

  if (!filled.length)
    return <p className="text-sm text-gray-400 text-center py-8">Sem dados de uso.</p>;

  const max = Math.max(...filled.map((d) => d.bytesTotal), 1);
  const total = filled.reduce((acc, d) => acc + d.bytesTotal, 0);
  const barColor = color === "indigo" ? "bg-indigo-500 hover:bg-indigo-600" : "bg-blue-500 hover:bg-blue-600";

  const first = filled[0].date;
  const last = filled[filled.length - 1].date;

  return (
    <div>
      <div className="flex items-baseline justify-between mb-4">
        <p className="text-sm text-gray-500 font-medium">Uso total no período</p>
        <p className="text-2xl font-bold text-gray-900">{formatBytes(total)}</p>
      </div>

      <div className="flex gap-3">
        {/* Y axis */}
        <div className="flex flex-col justify-between text-right text-xs text-gray-400 shrink-0 pb-5 w-14">
          <span>{formatBytes(max)}</span>
          <span>0</span>
        </div>

        {/* Bars + X axis */}
        <div className="flex-1 min-w-0">
          <div className="flex items-end gap-px h-36 border-b border-gray-200">
            {filled.map((d) => {
              const pct = (d.bytesTotal / max) * 100;
              return (
                <div
                  key={d.date}
                  className="flex-1 relative group cursor-default"
                  style={{ height: "100%", display: "flex", alignItems: "flex-end" }}
                >
                  {d.bytesTotal > 0 && (
                    <>
                      <div
                        className={`w-full rounded-t transition-colors ${barColor}`}
                        style={{ height: `${pct}%` }}
                      />
                      <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs rounded px-2 py-1 whitespace-nowrap hidden group-hover:block z-10 pointer-events-none">
                        {shortDate(d.date)}: {formatBytes(d.bytesTotal)}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>

          <div className="flex justify-between text-xs text-gray-400 mt-1.5">
            <span>{shortDate(first)}</span>
            <span>{shortDate(last)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
