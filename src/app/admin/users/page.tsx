"use client";

import { useEffect, useState } from "react";
import { formatBytes, percentUsed } from "@/lib/utils";

interface User {
  id: number;
  username: string;
  name: string | null;
  mac: string | null;
  role: string;
  packageName: string | null;
  packageDays: number;
  packageExpiresAt: string | null;
  quotaBytes: number;
  consumedBytes: number;
  dailyLimitBytes: number;
  active: boolean;
  createdAt: string;
}

const emptyForm = {
  username: "", password: "", name: "", mac: "",
  packageName: "", packageDays: "30", packageExpiresAt: "", quotaGB: "", dailyLimitMB: "",
};

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [form, setForm] = useState(emptyForm);
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
    setForm(emptyForm);
    setShowModal(true);
  }

  function openEdit(u: User) {
    setEditUser(u);
    setForm({
      username: u.username,
      password: "",
      name: u.name ?? "",
      mac: u.mac ?? "",
      packageName: u.packageName ?? "",
      packageDays: String(u.packageDays ?? 30),
      packageExpiresAt: u.packageExpiresAt ? u.packageExpiresAt.slice(0, 10) : "",
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
      packageName: form.packageName || null,
      packageDays: form.packageDays ? parseInt(form.packageDays) : 30,
      packageExpiresAt: form.packageExpiresAt || null,
      quotaBytes: form.quotaGB ? Math.round(parseFloat(form.quotaGB) * 1073741824) : 0,
      dailyLimitBytes: form.dailyLimitMB ? Math.round(parseFloat(form.dailyLimitMB) * 1048576) : 0,
    };
    const url = editUser ? `/api/admin/users/${editUser.id}` : "/api/admin/users";
    const method = editUser ? "PATCH" : "POST";
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (res.ok) { setShowModal(false); load(); }
    else { const e = await res.json(); setMsg(e.error ?? "Erro ao salvar."); }
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

  async function renew(u: User) {
    const days = u.packageDays || 30;
    if (!confirm(`Renovar pacote de "${u.username}" por ${days} dias e zerar o consumo?`)) return;
    await fetch(`/api/admin/users/${u.id}/renew`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ days }),
    });
    load();
  }

  async function deleteUser(u: User) {
    if (!confirm(`Excluir ${u.username}? Esta ação não pode ser desfeita.`)) return;
    await fetch(`/api/admin/users/${u.id}`, { method: "DELETE" });
    load();
  }

  function expiryBadge(expiresAt: string | null) {
    if (!expiresAt) return null;
    const days = Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 86400000);
    if (days <= 0) return <span className="text-xs font-medium text-red-600 bg-red-50 px-2 py-0.5 rounded-full">Expirado</span>;
    if (days <= 5) return <span className="text-xs font-medium text-yellow-700 bg-yellow-50 px-2 py-0.5 rounded-full">{days}d restantes</span>;
    return <span className="text-xs text-gray-400">{new Date(expiresAt).toLocaleDateString("pt-BR")}</span>;
  }

  const regularUsers = users.filter(u => u.role === "user");

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Usuários</h1>
          <p className="text-sm text-gray-500 mt-0.5">{regularUsers.length} usuário(s) cadastrado(s)</p>
        </div>
        <button onClick={openNew} className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg px-4 py-2 transition-colors">
          + Novo usuário
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-gray-400">Carregando...</p>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {["Usuário", "Pacote", "Consumo", "Limite diário", "Validade", "Status", "Ações"].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {regularUsers.map(u => {
                const pct = percentUsed(u.consumedBytes, u.quotaBytes);
                return (
                  <tr key={u.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{u.username}</p>
                      {u.name && <p className="text-gray-400 text-xs">{u.name}</p>}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{u.packageName ?? <span className="text-gray-300">—</span>}</td>
                    <td className="px-4 py-3">
                      <p className="text-gray-700">{formatBytes(u.consumedBytes)}</p>
                      {u.quotaBytes > 0 && (
                        <>
                          <div className="w-20 h-1.5 bg-gray-200 rounded-full mt-1">
                            <div className={`h-1.5 rounded-full ${pct >= 90 ? "bg-red-500" : pct >= 70 ? "bg-yellow-400" : "bg-blue-500"}`} style={{ width: `${pct}%` }} />
                          </div>
                          <p className="text-xs text-gray-400 mt-0.5">de {formatBytes(u.quotaBytes)}</p>
                        </>
                      )}
                      {u.quotaBytes === 0 && <p className="text-xs text-gray-400">Ilimitado</p>}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{u.dailyLimitBytes > 0 ? formatBytes(u.dailyLimitBytes) : <span className="text-gray-300">—</span>}</td>
                    <td className="px-4 py-3">{expiryBadge(u.packageExpiresAt)}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${u.active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}>
                        {u.active ? "Ativo" : "Bloqueado"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2 flex-wrap">
                        <button onClick={() => openEdit(u)} className="text-xs text-blue-600 hover:underline">Editar</button>
                        <button onClick={() => renew(u)} className="text-xs text-green-600 hover:underline font-medium">Renovar</button>
                        <button onClick={() => toggleActive(u)} className="text-xs text-yellow-600 hover:underline">{u.active ? "Bloquear" : "Ativar"}</button>
                        <button onClick={() => resetConsumption(u)} className="text-xs text-gray-500 hover:underline">Zerar</button>
                        <button onClick={() => deleteUser(u)} className="text-xs text-red-500 hover:underline">Excluir</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {regularUsers.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400 text-sm">Nenhum usuário cadastrado ainda.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold text-gray-900 mb-4">{editUser ? "Editar usuário" : "Novo usuário"}</h2>
            {msg && <p className="text-sm text-red-600 mb-3">{msg}</p>}
            <div className="space-y-3">
              {!editUser && <Field label="Usuário *" value={form.username} onChange={v => setForm({ ...form, username: v })} />}
              <Field label={editUser ? "Nova senha (deixe em branco para manter)" : "Senha *"} type="password" value={form.password} onChange={v => setForm({ ...form, password: v })} />
              <Field label="Nome completo" value={form.name} onChange={v => setForm({ ...form, name: v })} />

              <div className="border-t border-gray-100 pt-3">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Pacote</p>
                <div className="space-y-3">
                  <Field label="Nome do pacote (ex: Plano 10GB, Plano Mensal)" value={form.packageName} onChange={v => setForm({ ...form, packageName: v })} />
                  <Field label="Duração do pacote (dias) — usado no botão Renovar" type="number" value={form.packageDays} onChange={v => setForm({ ...form, packageDays: v })} />
                  <Field label="Validade inicial (data de vencimento)" type="date" value={form.packageExpiresAt} onChange={v => setForm({ ...form, packageExpiresAt: v })} />
                  <Field label="Quota total (GB — 0 = ilimitado)" type="number" value={form.quotaGB} onChange={v => setForm({ ...form, quotaGB: v })} />
                  <Field label="Limite diário padrão (MB — 0 = sem limite)" type="number" value={form.dailyLimitMB} onChange={v => setForm({ ...form, dailyLimitMB: v })} />
                </div>
              </div>

              <div className="border-t border-gray-100 pt-3">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Opcional</p>
                <Field label="MAC address (apenas informativo)" value={form.mac} onChange={v => setForm({ ...form, mac: v })} />
              </div>
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
        onChange={e => onChange(e.target.value)}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>
  );
}
