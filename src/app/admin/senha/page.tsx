"use client";

import { useState } from "react";

export default function AdminSenhaPage() {
  const [current, setCurrent] = useState("");
  const [novo, setNovo] = useState("");
  const [confirma, setConfirma] = useState("");
  const [msg, setMsg] = useState("");
  const [ok, setOk] = useState(false);
  const [loading, setLoading] = useState(false);

  async function save() {
    if (novo !== confirma) { setMsg("As senhas não coincidem."); return; }
    if (novo.length < 6) { setMsg("A senha deve ter pelo menos 6 caracteres."); return; }
    setLoading(true);
    setMsg("");
    const res = await fetch("/api/portal/password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ current, novo }),
    });
    const data = await res.json();
    if (res.ok) { setOk(true); setCurrent(""); setNovo(""); setConfirma(""); }
    else setMsg(data.error ?? "Erro ao alterar senha.");
    setLoading(false);
  }

  return (
    <div className="max-w-md">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Alterar senha</h1>
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        {ok && <p className="text-sm text-green-600 font-medium">Senha alterada com sucesso.</p>}
        {msg && <p className="text-sm text-red-600">{msg}</p>}
        <Field label="Senha atual" value={current} onChange={setCurrent} />
        <Field label="Nova senha" value={novo} onChange={setNovo} />
        <Field label="Confirmar nova senha" value={confirma} onChange={setConfirma} />
        <button onClick={save} disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg py-2.5 transition-colors">
          {loading ? "Salvando..." : "Alterar senha"}
        </button>
      </div>
    </div>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input
        type="password"
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>
  );
}
