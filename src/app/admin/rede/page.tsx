import { db } from "@/db";
import { interfaceStats } from "@/db/schema";
import { desc, gte } from "drizzle-orm";
import { formatBytes } from "@/lib/utils";
import InterfaceChart from "./InterfaceChart";
import AutoRefresh from "../AutoRefresh";

export const dynamic = "force-dynamic";

export default async function RedePage() {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const rows = await db
    .select()
    .from(interfaceStats)
    .where(gte(interfaceStats.recordedAt, since))
    .orderBy(interfaceStats.recordedAt);

  // Calcula delta entre leituras consecutivas para obter bytes por intervalo
  const points = rows.flatMap((row, i) => {
    if (i === 0) return [];
    const prev = rows[i - 1];
    const e1Delta = (row.ether1RxBytes + row.ether1TxBytes) - (prev.ether1RxBytes + prev.ether1TxBytes);
    const brDelta = (row.bridgeRxBytes + row.bridgeTxBytes) - (prev.bridgeRxBytes + prev.bridgeTxBytes);
    // Ignora deltas negativos (reboot do MikroTik zera os contadores)
    if (e1Delta < 0 || brDelta < 0) return [];
    return [{ time: row.recordedAt.toISOString(), ether1Bytes: e1Delta, bridgeBytes: brDelta }];
  });

  const totalEther1 = points.reduce((acc, p) => acc + p.ether1Bytes, 0);
  const totalBridge = points.reduce((acc, p) => acc + p.bridgeBytes, 0);
  const gap = totalEther1 - totalBridge;
  const gapPct = totalEther1 > 0 ? ((gap / totalEther1) * 100).toFixed(1) : "0";

  const latest = rows[rows.length - 1];

  return (
    <div>
      <AutoRefresh interval={60000} />
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Monitoramento de Rede</h1>

      {/* Cards resumo */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-sm text-gray-500 mb-1">WAN (ether1) — últimas 24h</p>
          <p className="text-2xl font-bold text-orange-600">{formatBytes(totalEther1)}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-sm text-gray-500 mb-1">Usuários (bridge) — últimas 24h</p>
          <p className="text-2xl font-bold text-blue-600">{formatBytes(totalBridge)}</p>
        </div>
        <div className={`rounded-xl border p-5 ${gap > 0 ? "bg-red-50 border-red-200" : "bg-green-50 border-green-200"}`}>
          <p className={`text-sm mb-1 ${gap > 0 ? "text-red-600" : "text-green-600"}`}>
            Gap não contabilizado ({gapPct}%)
          </p>
          <p className={`text-2xl font-bold ${gap > 0 ? "text-red-700" : "text-green-700"}`}>
            {formatBytes(Math.abs(gap))}
          </p>
        </div>
      </div>

      {/* Gráfico */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-900">Tráfego por intervalo — últimas 24h</h2>
          {latest && (
            <span className="text-xs text-gray-400">
              Última leitura: {new Date(latest.recordedAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
            </span>
          )}
        </div>
        {points.length > 1 ? (
          <InterfaceChart data={points} />
        ) : (
          <p className="text-sm text-gray-400 text-center py-8">
            Sem dados ainda. Configure o script no MikroTik para começar a coletar.
          </p>
        )}
      </div>

      {/* Tabela últimas leituras */}
      {rows.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="font-semibold text-gray-900 mb-4">Últimas leituras (contadores acumulados)</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b border-gray-100">
                  <th className="pb-2 font-medium">Hora</th>
                  <th className="pb-2 font-medium text-right text-orange-600">ether1 RX</th>
                  <th className="pb-2 font-medium text-right text-orange-600">ether1 TX</th>
                  <th className="pb-2 font-medium text-right text-blue-600">bridge RX</th>
                  <th className="pb-2 font-medium text-right text-blue-600">bridge TX</th>
                </tr>
              </thead>
              <tbody>
                {[...rows].reverse().slice(0, 20).map(row => (
                  <tr key={row.id} className="border-b border-gray-50 last:border-0">
                    <td className="py-1.5 text-gray-500 text-xs">
                      {new Date(row.recordedAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                    </td>
                    <td className="py-1.5 text-right text-gray-600">{formatBytes(row.ether1RxBytes)}</td>
                    <td className="py-1.5 text-right text-gray-600">{formatBytes(row.ether1TxBytes)}</td>
                    <td className="py-1.5 text-right text-gray-600">{formatBytes(row.bridgeRxBytes)}</td>
                    <td className="py-1.5 text-right text-gray-600">{formatBytes(row.bridgeTxBytes)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
