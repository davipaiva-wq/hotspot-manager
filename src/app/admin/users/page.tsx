"use client";

import { useEffect, useState } from "react";
import { formatBytes, percentUsed } from "@/lib/utils";

interface User {
  id: number;
  username: string;
  name: string | null;
  mac: string | null;
  role: string;
  quotaBytes: number;
  consumedBytes: number;
  dailyLimitBytes: number;
  dailyConsumedBytes: number;
  active: boolean;
  createdAt: string;
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [form, setForm] = useState({ username: "", password: "", name: "", mac: "", quotaGB: "", dailyLimitMB: "" });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  async function load() {
    const res = await fetch("/api/admin/users");
    setUsers(await res.json());
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function openNew() {
    setEditUser(null);
    setForm({ username: "", password: "", name: "", mac: "", quotaGB: "", dailyLimitMB: "" });
    setShowModal(true);
  }

  function openEdit(u: User) {
    setEditUser(u);
    setForm({
      username: u.username,
      password: "",
      name: u.name ?? "",
      mac: u.mac ?? "",
      quotaGB: u.quotaBytes > 0 ? String(u.quotaBytes / 1073741824) : "",
      dailyLimitMB: u.dailyLimitBytes > 0 ? String(u.dailyLimitBytes / 1048576) : "",
    });
    setShowModal(true);
  }

  async function save() {
    setSaving(true);
    setMsg("");
    const body = {
      username: form.username,
      password: form.password || undefined,
      name: form.name || null,
      mac: form.mac || null,
      quotaBytes: form.quotaGB ? Math.round(parseFloat(form.quotaGB) * 1073741824) : 0,
      dailyLimitBytes: form.dailyLimitMB ? Math.round(parseFloat(form.dailyLimitMB) * 1048576) : 0,
    };

    const url = editUser ? `/api/admin/users/${editUser.id}` : "/api/admin/users";
    const method = editUser ? "PATCH" : "POST";
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

    if (res.ok) {
      setShowModal(false);
      load();
    } else {
      const err = await res.json();
      setMsg(err.error ?? "Erro ao salvar.");
    }
    setSaving(false);
  }

  async function toggleActive(u: User) {
    await fetch(`/api/admin/users/${u.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !u.active }),
    });
    load();
  }

  async function resetConsumption(u: User) {
    if (!confirm(`Zerar consumo de ${u.username}?`)) return;
    await fetch(`/api/admin/users/${u.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resetConsumed: true }),
    });
    load();
  }

  async function deleteUser(u: User) {
    if (!confirm(`Excluir ${u.username}?`)) return;
    await fetch(`/api/admin/users/${u.id}`, { method: "DELETE" });
    load();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Usuários</h1>
        <button onClick={openNew} className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg px-4 py-2 transition-colors">
          + Novo usuário
        </button>
      </div>

      {loading ? (
        <p className="text-gray-500 text-sm">Carregando...</p>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {["Usuário", "Consumo", "Quota", "Diário", "Status", "Ações"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.filter(u => u.role === "user").map((u) => {
                const pct = percentUsed(u.consumedBytes, u.quotaBytes);
                return (
                  <tr key={u.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{u.username}</p>
                      {u.name && <p className="text-gray-400 text-xs">{u.name}</p>}
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-gray-700">{formatBytes(u.consumedBytes)}</p>
                      {u.quotaBytes > 0 && (
                        <div className="w-24 h-1.5 bg-gray-200 rounded-full mt-1">
                          <div
                            className={`h-1.5 rounded-full ${pct >= 90 ? "bg-red-500" : pct >= 70 ? "bg-yellow-400" : "bg-green-500"}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{u.quotaBytes > 0 ? formatBytes(u.quotaBytes) : "Ilimitado"}</td>
                    <td className="px-4 py-3 text-gray-600">{u.dailyLimitBytes > 0 ? formatBytes(u.dailyLimitBytes) : "—"}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${u.active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}>
                        {u.active ? "Ativo" : "Bloqueado"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button onClick={() => openEdit(u)} className="text-xs text-blue-600 hover:underline">Editar</button>
                        <button onClick={() => toggleActive(u)} className="text-xs text-yellow-600 hover:underline">{u.active ? "Bloquear" : "Ativar"}</button>
                        <button onClick={() => resetConsumption(u)} className="text-xs text-gray-500 hover:underline">Zerar</button>
                        <button onClick={() => deleteUser(u)} className="text-xs text-red-500 hover:underline">Excluir</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md mx-4">
            <h2 className="text-lg font-bold text-gray-900 mb-4">{editUser ? "Editar usuário" : "Novo usuário"}</h2>
            {msg && <p className="text-sm text-red-600 mb-3">{msg}</p>}
            <div className="space-y-3">
              {!editUser && (
                <Field label="Usuário *" value={form.username} onChange={(v) => setForm({ ...form, username: v })} />
              )}
              <Field label={editUser ? "Nova senha (deixe em branco para manter)" : "Senha *"} type="password" value={form.password} onChange={(v) => setForm({ ...form, password: v })} />
              <Field label="Nome completo" value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
              <Field label="MAC address (ex: AA:BB:CC:DD:EE:FF)" value={form.mac} onChange={(v) => setForm({ ...form, mac: v })} />
              <Field label="Quota total (GB, 0 = ilimitado)" type="number" value={form.quotaGB} onChange={(v) => setForm({ ...form, quotaGB: v })} />
              <Field label="Limite diário (MB, 0 = sem limite)" type="number" value={form.dailyLimitMB} onChange={(v) => setForm({ ...form, dailyLimitMB: v })} />
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={save} disabled={saving} className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg py-2 transition-colors">
                {saving ? "Salvando..." : "Salvar"}
              </button>
              <button onClick={() => setShowModal(false)} className="flex-1 border border-gray-300 text-gray-700 text-sm rounded-lg py-2 hover:bg-gray-50 transition-colors">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>
  );
}
