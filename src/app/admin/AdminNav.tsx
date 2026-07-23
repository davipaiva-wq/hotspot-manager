"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/users", label: "Usuários" },
  { href: "/admin/reports", label: "Relatórios" },
  { href: "/admin/rede", label: "Rede" },
  { href: "/admin/senha", label: "Alterar senha" },
];

export default function AdminNav({ onSignOut }: { onSignOut: () => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <header className="bg-gray-900 text-white">
      <div className="flex items-center justify-between px-4 py-3 sm:px-6">
        <div>
          <p className="text-sm font-bold tracking-wide">Hotspot Manager</p>
          <p className="text-xs text-gray-400">Admin</p>
        </div>

        {/* Desktop nav */}
        <nav className="hidden sm:flex items-center gap-1 text-sm">
          {links.map(l => (
            <Link
              key={l.href}
              href={l.href}
              className={`px-3 py-2 rounded-lg transition-colors ${
                pathname === l.href
                  ? "bg-gray-700 text-white"
                  : "text-gray-300 hover:bg-gray-800 hover:text-white"
              }`}
            >
              {l.label}
            </Link>
          ))}
          <form action={onSignOut} className="ml-2">
            <button type="submit" className="px-3 py-2 text-sm text-gray-400 hover:text-white rounded-lg hover:bg-gray-800 transition-colors">
              Sair
            </button>
          </form>
        </nav>

        {/* Mobile hamburger */}
        <button
          className="sm:hidden p-2 rounded-lg hover:bg-gray-800 transition-colors"
          onClick={() => setOpen(o => !o)}
          aria-label="Menu"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {open
              ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />}
          </svg>
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <nav className="sm:hidden border-t border-gray-700 px-4 py-2 space-y-1 text-sm">
          {links.map(l => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className={`block px-3 py-2 rounded-lg transition-colors ${
                pathname === l.href
                  ? "bg-gray-700 text-white"
                  : "text-gray-300 hover:bg-gray-800 hover:text-white"
              }`}
            >
              {l.label}
            </Link>
          ))}
          <form action={onSignOut}>
            <button type="submit" className="w-full text-left px-3 py-2 text-sm text-gray-400 hover:text-white rounded-lg hover:bg-gray-800 transition-colors">
              Sair
            </button>
          </form>
        </nav>
      )}
    </header>
  );
}
