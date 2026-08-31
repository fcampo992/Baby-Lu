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
  const [menuOpen, setMenuOpen] = useState(false)
  const { storeName, logoUrl } = useCart()

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setUser(data?.user ?? null))
      .catch(() => setUser(null))
  }, [])

  async function handleLogout() {
    if (user?.sub && typeof window !== 'undefined') {
      localStorage.removeItem(`ecommerce_cart_${user.sub}`)
    }
    await fetch('/api/auth/logout', { method: 'POST' })
    setUser(null)
    window.location.href = '/'
  }

  return (
    <nav className="sticky top-0 z-50 bg-white border-b border-gray-100 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">

          {/* ── Brand: logo + nombre siempre juntos ── */}
          <Link
            href="/"
            className="flex items-center gap-3 group flex-shrink-0"
            aria-label={`Ir al inicio — ${storeName}`}
          >
            {logoUrl && (
              <div className="relative flex-shrink-0">
                <Image
                  src={logoUrl}
                  alt={storeName}
                  width={140}
                  height={56}
                  className="h-10 sm:h-14 w-auto object-contain transition-opacity group-hover:opacity-85"
                  unoptimized
                  priority
                />
              </div>
            )}
            <span
              className={[
                'font-extrabold tracking-tight leading-none transition-colors group-hover:opacity-80',
                logoUrl
                  ? 'text-base sm:text-lg text-gray-800'
                  : 'text-xl sm:text-2xl text-gray-900',
              ].join(' ')}
            >
              {storeName}
            </span>
          </Link>

          {/* ── Nav links — desktop ── */}
          <div className="hidden md:flex items-center gap-1">
            <NavLink href="/">Catálogo</NavLink>

            {user ? (
              <>
                <NavLink href="/orders">Mis Pedidos</NavLink>
                {user.role === 'ADMIN' && (
                  <NavLink href="/admin">Admin</NavLink>
                )}
                <span className="text-gray-300 mx-1 select-none">|</span>
                <span className="text-sm text-gray-500 px-2">
                  Hola,{' '}
                  <span className="font-semibold text-gray-800">{user.name}</span>
                </span>
                <button
                  onClick={handleLogout}
                  className="text-sm font-medium text-gray-500 hover:text-red-500 transition-colors px-3 py-1.5 rounded-lg hover:bg-red-50"
                >
                  Salir
                </button>
              </>
            ) : (
              <Link
                href="/login"
                className="text-sm font-medium text-white bg-gray-900 hover:bg-gray-700 transition-colors px-4 py-2 rounded-lg ml-2"
              >
                Iniciar sesión
              </Link>
            )}

            <div className="ml-2">
              <CartIcon />
            </div>
          </div>

          {/* ── Mobile: cart + hamburger ── */}
          <div className="flex md:hidden items-center gap-3">
            <CartIcon />
            <button
              onClick={() => setMenuOpen((v) => !v)}
              aria-label="Menú"
              className="p-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
            >
              {menuOpen ? (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ── Mobile menu ── */}
      {menuOpen && (
        <div className="md:hidden border-t border-gray-100 bg-white px-4 py-3 space-y-1 shadow-md">
          <MobileNavLink href="/" onClick={() => setMenuOpen(false)}>Catálogo</MobileNavLink>

          {user ? (
            <>
              <MobileNavLink href="/orders" onClick={() => setMenuOpen(false)}>Mis Pedidos</MobileNavLink>
              {user.role === 'ADMIN' && (
                <MobileNavLink href="/admin" onClick={() => setMenuOpen(false)}>Administración</MobileNavLink>
              )}
              <div className="pt-2 border-t border-gray-100 mt-2">
                <p className="text-xs text-gray-400 px-3 pb-1">Sesión: {user.name}</p>
                <button
                  onClick={() => { setMenuOpen(false); handleLogout() }}
                  className="w-full text-left text-sm font-medium text-red-500 hover:bg-red-50 transition-colors px-3 py-2 rounded-lg"
                >
                  Cerrar sesión
                </button>
              </div>
            </>
          ) : (
            <Link
              href="/login"
              onClick={() => setMenuOpen(false)}
              className="block text-sm font-medium text-white bg-gray-900 hover:bg-gray-700 transition-colors px-4 py-2.5 rounded-lg text-center mt-2"
            >
              Iniciar sesión
            </Link>
          )}
        </div>
      )}
    </nav>
  )
}

// ── Helper components ──────────────────────────────────────────────────────

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors px-3 py-1.5 rounded-lg hover:bg-gray-50"
    >
      {children}
    </Link>
  )
}

function MobileNavLink({
  href,
  onClick,
  children,
}: {
  href: string
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="block text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50 transition-colors px-3 py-2.5 rounded-lg"
    >
      {children}
    </Link>
  )
}
