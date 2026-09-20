'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'

const NAV_ITEMS = [
  { href: '/admin',                   label: '📊 Dashboard',            exact: true  },
  { href: '/admin/products',          label: '📦 Productos',             exact: false },
  { href: '/admin/orders',            label: '🛒 Pedidos',               exact: false },
  { href: '/admin/customers',         label: '👥 Clientes',              exact: false },
  { href: '/admin/stock',             label: '📋 Stock',                 exact: false },
  { href: '/admin/categories',        label: '🏷️ Categorías',            exact: false },
  { href: '/admin/variant-options',   label: '🎨 Talles y Colores',      exact: false },
  { href: '/admin/delivery-options',  label: '📍 Puntos de Entrega',     exact: false },
  { href: '/admin/banners',           label: '🖼️ Banners',               exact: false },
  { href: '/admin/branding',          label: '🎨 Identidad',              exact: false },
  { href: '/admin/settings',          label: '⚙️ Configuración',         exact: false },
  { href: '/admin/admins',            label: '👥 Administradores',       exact: false },
]

function SidebarContent({
  storeName,
  logoUrl,
  onNavigate,
}: {
  storeName: string
  logoUrl: string | null
  onNavigate?: () => void
}) {
  const pathname = usePathname()

  function isActive(item: { href: string; exact: boolean }) {
    if (item.exact) return pathname === item.href
    return pathname.startsWith(item.href)
  }

  async function handleLogout() {
    const response = await fetch('/api/auth/logout', { method: 'POST' })
    if (response.ok) window.location.href = '/admin/login'
  }

  return (
    <div className="flex flex-col h-full">
      {/* Logo / store name */}
      <div className="p-5 border-b border-gray-100">
        <Link href="/admin" className="flex items-center gap-3 group" onClick={onNavigate}>
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

      {/* Nav links */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
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
          onClick={onNavigate}
          className="block px-3 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 bg-gray-50 hover:bg-gray-100 rounded border border-gray-200 transition mt-4"
        >
          ← Ir a la Tienda
        </Link>
      </nav>

      {/* Logout */}
      <div className="p-4 border-t border-gray-100">
        <button
          onClick={handleLogout}
          className="w-full py-2 text-sm text-red-600 hover:bg-red-50 rounded transition"
        >
          Cerrar Sesión
        </button>
      </div>
    </div>
  )
}

export function AdminSidebar() {
  const [open, setOpen] = useState(false)
  const [storeName, setStoreName] = useState('Tienda')
  const [logoUrl, setLogoUrl] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/settings')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!data?.settings) return
        const map = Object.fromEntries(
          (data.settings as { key: string; value: string }[]).map(s => [s.key, s.value])
        )
        if (map.store_name) setStoreName(map.store_name)
        if (map.store_logo_url) setLogoUrl(map.store_logo_url)
      })
      .catch(() => {})
  }, [])

  // Close drawer on Escape key
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  // Prevent body scroll when drawer is open on mobile
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [open])

  return (
    <>
      {/* ── Desktop sidebar (always visible ≥ lg) ── */}
      <aside className="hidden lg:flex w-64 bg-white border-r border-gray-200 min-h-screen flex-col flex-shrink-0">
        <SidebarContent storeName={storeName} logoUrl={logoUrl} />
      </aside>

      {/* ── Mobile: top bar with hamburger ── */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-4 h-14 bg-white border-b border-gray-200 shadow-sm">
        <button
          onClick={() => setOpen(true)}
          aria-label="Abrir menú"
          className="p-2 rounded-lg text-gray-600 hover:bg-gray-100 transition"
        >
          {/* Hamburger icon */}
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        {/* Store name / logo in top bar */}
        <Link href="/admin" className="flex items-center gap-2">
          {logoUrl ? (
            <Image src={logoUrl} alt={storeName} width={80} height={24}
              className="h-6 w-auto object-contain" unoptimized />
          ) : (
            <span className="font-bold text-gray-900 text-sm">{storeName} Admin</span>
          )}
        </Link>

        {/* Spacer to center the title */}
        <div className="w-10" />
      </div>

      {/* ── Mobile: overlay ── */}
      {open && (
        <div
          className="lg:hidden fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* ── Mobile: drawer ── */}
      <aside
        className={`lg:hidden fixed top-0 left-0 z-50 h-full w-72 bg-white shadow-xl flex flex-col transition-transform duration-300 ease-in-out ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
        aria-label="Menú de administración"
      >
        {/* Close button inside drawer */}
        <div className="flex items-center justify-end px-4 pt-4 pb-0">
          <button
            onClick={() => setOpen(false)}
            aria-label="Cerrar menú"
            className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <SidebarContent
          storeName={storeName}
          logoUrl={logoUrl}
          onNavigate={() => setOpen(false)}
        />
      </aside>
    </>
  )
}
