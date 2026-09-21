'use client'

import { useEffect, useState, useRef } from 'react'
import { ProductCard } from '@/components/ProductCard'
import { HeroCarousel, BannerItem } from '@/components/HeroCarousel'
import { filterProducts, ProductSummary } from '@/lib/filters'

interface Category {
  id: string
  name: string
}

// ── Custom category dropdown (desktop) ────────────────────────────────────────

function CategoryDropdown({
  categories,
  value,
  onChange,
}: {
  categories: Category[]
  value: string
  onChange: (id: string) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const selected = categories.find(c => c.id === value)

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className={`flex items-center gap-2 px-3 py-2.5 border rounded-xl text-sm bg-white transition focus:outline-none focus:ring-2 focus:ring-black whitespace-nowrap ${
          value ? 'border-black text-black font-medium' : 'border-gray-200 text-gray-600 hover:border-gray-400'
        }`}
      >
        <span>{selected?.name ?? 'Categorías'}</span>
        <svg
          className={`w-3.5 h-3.5 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 mt-1.5 w-52 bg-white border border-gray-100 rounded-2xl shadow-lg overflow-hidden z-30 py-1">
          <button
            onClick={() => { onChange(''); setOpen(false) }}
            className={`w-full text-left px-4 py-2.5 text-sm transition hover:bg-gray-50 ${
              !value ? 'font-semibold text-black' : 'text-gray-600'
            }`}
          >
            Todas las categorías
          </button>
          <div className="border-t border-gray-50 my-1" />
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => { onChange(cat.id); setOpen(false) }}
              className={`w-full text-left px-4 py-2.5 text-sm transition hover:bg-gray-50 flex items-center justify-between ${
                value === cat.id ? 'font-semibold text-black' : 'text-gray-600'
              }`}
            >
              {cat.name}
              {value === cat.id && (
                <svg className="w-4 h-4 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Category chips with fade edges (mobile) ───────────────────────────────────

function CategoryChips({
  categories,
  value,
  onChange,
}: {
  categories: Category[]
  value: string
  onChange: (id: string) => void
}) {
  return (
    // Outer wrapper handles the fade mask on both edges
    <div className="relative -mx-3 sm:hidden">
      {/* Left fade */}
      <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-6 z-10 bg-gradient-to-r from-white to-transparent" />
      {/* Right fade */}
      <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-6 z-10 bg-gradient-to-l from-white to-transparent" />

      {/* Scrollable row — hidden scrollbar */}
      <div
        className="flex gap-2 overflow-x-auto px-3 pb-1"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {/* "Todas" chip */}
        <button
          onClick={() => onChange('')}
          className="flex-shrink-0 relative px-3.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap"
        >
          <span className={!value ? 'text-black' : 'text-gray-400'}>Todas</span>
          {!value && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-black rounded-full" />
          )}
        </button>

        {categories.map(cat => {
          const isSelected = value === cat.id
          return (
            <button
              key={cat.id}
              onClick={() => onChange(isSelected ? '' : cat.id)}
              className="flex-shrink-0 relative px-3.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap"
            >
              <span className={isSelected ? 'text-black' : 'text-gray-400'}>{cat.name}</span>
              {isSelected && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-black rounded-full" />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ── Main catalog ──────────────────────────────────────────────────────────────

export function CatalogPageWrapper() {
  const [products, setProducts] = useState<ProductSummary[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [banners, setBanners] = useState<BannerItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')

  useEffect(() => {
    async function fetchData() {
      try {
        const [resProducts, resCategories, resBanners] = await Promise.all([
          fetch('/api/products?activeOnly=true'),
          fetch('/api/categories'),
          fetch('/api/banners'),
        ])
        if (resProducts.ok) setProducts((await resProducts.json()).products || [])
        if (resCategories.ok) setCategories((await resCategories.json()).categories || [])
        if (resBanners.ok) setBanners((await resBanners.json()).banners || [])
      } catch {
        // ignore
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  const filtered = filterProducts(products, {
    search,
    categoryId: selectedCategory || undefined,
  })

  const hasFilters = search || selectedCategory

  return (
    <div className="space-y-4 sm:space-y-6">

      {/* ── Barra de búsqueda + filtro — ANTES del banner ── */}
      <div className="flex gap-2">
        {/* Search input */}
        <div className="relative flex-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
            </svg>
          </span>
          <input
            type="search"
            placeholder="Buscar productos..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent placeholder-gray-400"
          />
        </div>

        {/* Category dropdown — desktop only */}
        <div className="hidden sm:block">
          <CategoryDropdown
            categories={categories}
            value={selectedCategory}
            onChange={setSelectedCategory}
          />
        </div>

        {/* Clear button */}
        {hasFilters && (
          <button
            onClick={() => { setSearch(''); setSelectedCategory('') }}
            className="px-3 py-2.5 text-sm text-gray-500 hover:text-gray-900 border border-gray-200 rounded-xl bg-white hover:bg-gray-50 transition flex-shrink-0"
            aria-label="Limpiar filtros"
          >
            ✕
          </button>
        )}
      </div>

      {/* ── Banner hero ── */}
      {banners.length > 0 && <HeroCarousel banners={banners} />}

      {/* ── Category chips — mobile only ── */}
      {categories.length > 0 && (
        <CategoryChips
          categories={categories}
          value={selectedCategory}
          onChange={setSelectedCategory}
        />
      )}

      {/* ── Título — desktop only ── */}
      <div className="hidden sm:block">
        <h1 className="text-3xl font-bold text-gray-900">Nuestro Catálogo</h1>
        <p className="text-gray-500 text-sm mt-1">Encontrá los mejores productos</p>
      </div>

      {/* ── Grilla de productos ── */}
      {loading ? (
        <div className="text-center py-12 text-gray-400 text-sm">Cargando productos...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 bg-gray-50 rounded-xl border border-gray-100">
          <p className="text-gray-500 mb-3">No se encontraron productos.</p>
          <button
            onClick={() => { setSearch(''); setSelectedCategory('') }}
            className="text-sm text-black underline underline-offset-2"
          >
            Ver todos
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-5">
          {filtered.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  )
}
