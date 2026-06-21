"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function RenewButton({
  userId,
  username,
  packageDays,
}: {
  userId: number;
  username: string;
  packageDays: number;
}) {
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const router = useRouter();

  async function renew() {
    if (!confirm(`Renovar pacote de "${username}" por ${packageDays} dias e zerar o consumo?`)) return;
    setLoading(true);
    await fetch(`/api/admin/users/${userId}/renew`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ days: packageDays }),
    });
    setDone(true);
    setLoading(false);
    router.refresh();
  }

  if (done) return <span className="text-xs text-green-600 font-medium">Renovado!</span>;

  return (
    <button
      onClick={renew}
      disabled={loading}
      className="text-xs bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium px-3 py-1.5 rounded-lg transition-colors"
    >
      {loading ? "..." : `Renovar +${packageDays}d`}
    </button>
  );
}
