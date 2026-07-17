"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function RenewAllButton() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const router = useRouter();

  async function renewAll() {
    if (!confirm("Renovar TODOS os usuários? Isso vai zerar o consumo e estender o pacote de cada um.")) return;
    setLoading(true);
    setResult(null);
    const res = await fetch("/api/admin/users/renew-all", { method: "POST" });
    const data = await res.json();
    setResult(`${data.renewed} usuários renovados`);
    setLoading(false);
    router.refresh();
  }

  return (
    <div className="flex items-center gap-3">
      {result && <span className="text-xs text-green-600 font-medium">{result} ✓</span>}
      <button
        onClick={renewAll}
        disabled={loading}
        className="text-sm bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-semibold px-4 py-2 rounded-lg transition-colors"
      >
        {loading ? "Renovando..." : "Renovar todos"}
      </button>
    </div>
  );
}
