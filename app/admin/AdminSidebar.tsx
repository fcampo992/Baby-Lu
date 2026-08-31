'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'

const NAV_ITEMS = [
  { href: '/admin',            label: '📊 Dashboard',         exact: true  },
  { href: '/admin/products',   label: '📦 Productos',          exact: false },
  { href: '/admin/orders',     label: '🛒 Pedidos',            exact: false },
  { href: '/admin/customers',  label: '👥 Clientes',           exact: false },
  { href: '/admin/stock',      label: '📋 Stock',              exact: false },
  { href: '/admin/categories', label: '🏷️ Categorías',         exact: false },
  { href: '/admin/banners',    label: '🖼️ Banners',            exact: false },
  { href: '/admin/branding',   label: '🎨 Identidad',           exact: false },
  { href: '/admin/settings',   label: '⚙️ Configuración',      exact: false },
  { href: '/admin/admins',     label: '👥 Administradores',    exact: false },
]

export function AdminSidebar() {
  const pathname = usePathname()
  const [storeName, setStoreName] = useState('Tienda')
  const [logoUrl, setLogoUrl] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/settings')
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (!data?.settings) return
        const map = Object.fromEntries(
          (data.settings as { key: string; value: string }[]).map((s) => [s.key, s.value])
        )
        if (map.store_name) setStoreName(map.store_name)
        if (map.store_logo_url) setLogoUrl(map.store_logo_url)
      })
      .catch(() => {})
  }, [])

  async function handleLogout() {
    const response = await fetch('/api/auth/logout', { method: 'POST' })
    if (response.ok) {
      window.location.href = '/admin/login'
    }
  }

  function isActive(item: { href: string; exact: boolean }) {
    if (item.exact) return pathname === item.href
    return pathname.startsWith(item.href)
  }

  return (
    <aside className="w-64 bg-white border-r border-gray-200 min-h-screen flex flex-col">
      <div className="p-5 border-b border-gray-100">
        <Link href="/admin" className="flex items-center gap-3 group">
          {logoUrl ? (
            <Image src={logoUrl} alt={storeName} width={120} height={32}
              className="h-8 w-auto object-contain" unoptimized />
          ) : (
            <>
              <span className="text-2xl font-bold text-indigo-600">🛒</span>
              <span className="font-bold text-lg text-gray-900 group-hover:text-indigo-600 transition truncate">
                {storeName} Admin
              </span>
            </>
          )}
        </Link>
      </div>

      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`block px-3 py-2 rounded text-sm font-medium transition ${
              isActive(item)
                ? 'text-indigo-600 bg-indigo-50 hover:bg-indigo-100'
                : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
            }`}
          >
            {item.label}
          </Link>
        ))}

        <Link
          href="/"
          className="block px-3 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 bg-gray-50 hover:bg-gray-100 rounded border border-gray-200 transition mt-4"
        >
          ← Ir a la Tienda
        </Link>
      </nav>

      <div className="p-4 border-t border-gray-100">
        <button
          onClick={handleLogout}
          className="w-full py-2 text-sm text-red-600 hover:bg-red-50 rounded transition"
        >
          Cerrar Sesión
        </button>
      </div>
    </aside>
  )
}
