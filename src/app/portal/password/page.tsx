"use client";

import { useState } from "react";

export default function PasswordPage() {
  const [form, setForm] = useState({ current: "", next: "", confirm: "" });
  const [msg, setMsg] = useState({ text: "", ok: false });
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (form.next !== form.confirm) {
      setMsg({ text: "As senhas novas não coincidem.", ok: false });
      return;
    }
    if (form.next.length < 6) {
      setMsg({ text: "A nova senha deve ter pelo menos 6 caracteres.", ok: false });
      return;
    }

    setLoading(true);
    setMsg({ text: "", ok: false });

    const res = await fetch("/api/user/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword: form.current, newPassword: form.next }),
    });

    if (res.ok) {
      setMsg({ text: "Senha alterada com sucesso!", ok: true });
      setForm({ current: "", next: "", confirm: "" });
    } else {
      const err = await res.json();
      setMsg({ text: err.error ?? "Erro ao alterar senha.", ok: false });
    }
    setLoading(false);
  }

  return (
    <div className="max-w-sm">
      <h1 className="text-xl font-bold text-gray-900 mb-1">Alterar senha</h1>
      <p className="text-sm text-gray-500 mb-6">Escolha uma senha segura com pelo menos 6 caracteres.</p>

      {msg.text && (
        <div className={`mb-4 rounded-lg px-4 py-3 text-sm ${msg.ok ? "bg-green-50 border border-green-200 text-green-700" : "bg-red-50 border border-red-200 text-red-700"}`}>
          {msg.text}
        </div>
      )}

      <form onSubmit={submit} className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
        {[
          { label: "Senha atual", key: "current" },
          { label: "Nova senha", key: "next" },
          { label: "Confirmar nova senha", key: "confirm" },
        ].map(({ label, key }) => (
          <div key={key}>
            <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
            <input
              type="password"
              value={form[key as keyof typeof form]}
              onChange={(e) => setForm({ ...form, [key]: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
        ))}
        <button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium rounded-lg py-2 text-sm transition-colors">
          {loading ? "Alterando..." : "Alterar senha"}
        </button>
      </form>
    </div>
  );
}
