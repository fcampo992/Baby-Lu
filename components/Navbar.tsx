'use client'
import Link from 'next/link'
import Image from 'next/image'
import { useEffect, useState } from 'react'
import { CartIcon } from '@/components/CartIcon'
import { useCart } from '@/components/CartProvider'

interface SessionUser {
  sub: string
  name: string
  role: string
}

export function Navbar() {
  const [user, setUser] = useState<SessionUser | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const { storeName, logoUrl } = useCart()

  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => res.ok ? res.json() : null)
      .then(data => setUser(data?.user ?? null))
      .catch(() => setUser(null))
  }, [])

  // Close drawer on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setDrawerOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  // Prevent body scroll when drawer is open
  useEffect(() => {
    document.body.style.overflow = drawerOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [drawerOpen])

  async function handleLogout() {
    if (user?.sub && typeof window !== 'undefined') {
      localStorage.removeItem(`ecommerce_cart_${user.sub}`)
    }
    await fetch('/api/auth/logout', { method: 'POST' })
    setUser(null)
    window.location.href = '/'
  }

  const brand = (
    <Link
      href="/"
      className="flex items-center gap-2 group"
      aria-label={`Ir al inicio — ${storeName}`}
    >
      {logoUrl && (
        <Image
          src={logoUrl}
          alt={storeName}
          width={140}
          height={56}
          className="h-10 sm:h-14 w-auto object-contain transition-opacity group-hover:opacity-85"
          unoptimized
          priority
        />
      )}
      <span className={[
        'font-extrabold tracking-tight leading-none transition-colors group-hover:opacity-80',
        logoUrl ? 'text-base sm:text-lg text-gray-800' : 'text-xl sm:text-2xl text-gray-900',
      ].join(' ')}>
        {storeName}
      </span>
    </Link>
  )

  return (
    <>
      <nav className="sticky top-0 z-50 bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

          {/* ── Desktop layout ── */}
          <div className="hidden md:flex items-center justify-between h-20">
            {brand}

            <div className="flex items-center gap-1">
              <NavLink href="/">Catálogo</NavLink>
              {user ? (
                <>
                  <NavLink href="/orders">Mis Pedidos</NavLink>
                  {user.role === 'ADMIN' && <NavLink href="/admin">Admin</NavLink>}
                  <span className="text-gray-300 mx-1 select-none">|</span>
                  <span className="text-sm text-gray-500 px-2">
                    Hola, <span className="font-semibold text-gray-800">{user.name}</span>
                  </span>
                  <button
                    onClick={handleLogout}
                    className="text-sm font-medium text-gray-500 hover:text-red-500 transition-colors px-3 py-1.5 rounded-lg hover:bg-red-50"
                  >
                    Salir
                  </button>
                </>
              ) : (
                <Link href="/login" className="text-sm font-medium text-white bg-gray-900 hover:bg-gray-700 transition-colors px-4 py-2 rounded-lg ml-2">
                  Iniciar sesión
                </Link>
              )}
              <div className="ml-2"><CartIcon /></div>
            </div>
          </div>

          {/* ── Mobile layout: hamburger | brand (center) | cart ── */}
          <div className="flex md:hidden items-center justify-between h-16">
            {/* Hamburger — left */}
            <button
              onClick={() => setDrawerOpen(true)}
              aria-label="Abrir menú"
              className="p-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors w-10"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>

            {/* Brand — center (absolute so it's truly centered regardless of side elements) */}
            <div className="absolute left-1/2 -translate-x-1/2">
              {brand}
            </div>

            {/* Cart — right */}
            <div className="w-10 flex justify-end">
              <CartIcon />
            </div>
          </div>

        </div>
      </nav>

      {/* ── Mobile drawer overlay ── */}
      {drawerOpen && (
        <div
          className="md:hidden fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
          onClick={() => setDrawerOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* ── Mobile drawer ── */}
      <aside
        className={`md:hidden fixed top-0 left-0 z-50 h-full w-72 bg-white shadow-xl flex flex-col transition-transform duration-300 ease-in-out ${
          drawerOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        aria-label="Menú de navegación"
      >
        {/* Header del drawer */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div onClick={() => setDrawerOpen(false)}>
            {brand}
          </div>
          <button
            onClick={() => setDrawerOpen(false)}
            aria-label="Cerrar menú"
            className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition ml-2 flex-shrink-0"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Nav links */}
        <nav className="flex-1 px-4 py-3 space-y-1 overflow-y-auto">
          <DrawerLink href="/" onClick={() => setDrawerOpen(false)}>🏠 Catálogo</DrawerLink>

          {user ? (
            <>
              <DrawerLink href="/orders" onClick={() => setDrawerOpen(false)}>📦 Mis Pedidos</DrawerLink>
              {user.role === 'ADMIN' && (
                <DrawerLink href="/admin" onClick={() => setDrawerOpen(false)}>⚙️ Administración</DrawerLink>
              )}
              <div className="pt-3 mt-3 border-t border-gray-100 space-y-1">
                <p className="text-xs text-gray-400 px-3 pb-1">Sesión: {user.name}</p>
                <button
                  onClick={() => { setDrawerOpen(false); handleLogout() }}
                  className="w-full text-left text-sm font-medium text-red-500 hover:bg-red-50 transition px-3 py-2.5 rounded-lg"
                >
                  Cerrar sesión
                </button>
              </div>
            </>
          ) : (
            <Link
              href="/login"
              onClick={() => setDrawerOpen(false)}
              className="block text-sm font-medium text-white bg-gray-900 hover:bg-gray-700 transition px-4 py-2.5 rounded-lg text-center mt-2"
            >
              Iniciar sesión
            </Link>
          )}
        </nav>
      </aside>
    </>
  )
}

// ── Helpers ────────────────────────────────────────────────────────────────

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors px-3 py-1.5 rounded-lg hover:bg-gray-50">
      {children}
    </Link>
  )
}

function DrawerLink({ href, onClick, children }: { href: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <Link href={href} onClick={onClick} className="flex items-center text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50 transition px-3 py-2.5 rounded-lg">
      {children}
    </Link>
  )
}
