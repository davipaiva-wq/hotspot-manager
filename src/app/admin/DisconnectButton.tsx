"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function DisconnectButton({ userId, username }: { userId: number; username: string }) {
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const router = useRouter();

  async function disconnect() {
    if (!confirm(`Desconectar "${username}" agora?`)) return;
    setLoading(true);
    await fetch(`/api/admin/users/${userId}/disconnect`, { method: "POST" });
    setDone(true);
    setLoading(false);
    router.refresh();
  }

  if (done) return <span className="text-xs text-red-600 font-medium">Desconectando...</span>;

  return (
    <button
      onClick={disconnect}
      disabled={loading}
      className="text-xs bg-red-50 hover:bg-red-100 disabled:opacity-50 text-red-600 border border-red-200 font-medium px-3 py-1.5 rounded-lg transition-colors"
    >
      {loading ? "..." : "Desconectar"}
    </button>
  );
}
