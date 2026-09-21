'use client'

import { useEffect, useState } from 'react'
import { ProductCard } from '@/components/ProductCard'
import { HeroCarousel, BannerItem } from '@/components/HeroCarousel'
import { filterProducts, ProductSummary } from '@/lib/filters'

interface Category {
  id: string
  name: string
}

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

      {/* ── Barra de búsqueda y filtros — ANTES del banner ── */}
      <div className="flex gap-2">
        {/* Search */}
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

        {/* Category select */}
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="px-3 py-2.5 border border-gray-200 rounded-xl bg-white text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent max-w-[140px] sm:max-w-none truncate"
        >
          <option value="">Categorías</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>{cat.name}</option>
          ))}
        </select>

        {/* Clear button — solo cuando hay filtros activos */}
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

      {/* ── Título — solo desktop ── */}
      <div className="hidden sm:block">
        <h1 className="text-3xl font-bold text-gray-900">Nuestro Catálogo</h1>
        <p className="text-gray-500 text-sm mt-1">Encontrá los mejores productos</p>
      </div>

      {/* ── Chips de categoría activa (mobile) ── */}
      {categories.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1 sm:hidden scrollbar-hide -mx-3 px-3">
          <button
            onClick={() => setSelectedCategory('')}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition ${
              !selectedCategory
                ? 'bg-black text-white border-black'
                : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
            }`}
          >
            Todas
          </button>
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(selectedCategory === cat.id ? '' : cat.id)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition ${
                selectedCategory === cat.id
                  ? 'bg-black text-white border-black'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      )}

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
