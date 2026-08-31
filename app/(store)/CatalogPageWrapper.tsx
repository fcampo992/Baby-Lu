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

  return (
    <div className="space-y-8">
      {banners.length > 0 && <HeroCarousel banners={banners} />}

      <div className="space-y-1">
        <h1 className="text-4xl font-bold text-gray-900">Nuestro Catálogo</h1>
        <p className="text-gray-500">Encontrá los mejores productos</p>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Buscar por nombre o descripción..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
          />
        </div>
        <div className="flex gap-2">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-4 py-3 border border-gray-200 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-black"
          >
            <option value="">Todas las categorías</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
          {(search || selectedCategory) && (
            <button
              onClick={() => { setSearch(''); setSelectedCategory('') }}
              className="px-4 py-3 text-sm text-gray-600 hover:text-gray-900 border border-gray-200 rounded-lg"
            >
              Limpiar
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">Cargando productos...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 bg-gray-50 rounded-lg border border-gray-100">
          <p className="text-lg text-gray-600">No se encontraron productos.</p>
          <button onClick={() => { setSearch(''); setSelectedCategory('') }}
            className="mt-4 text-sm text-blue-600 hover:underline">
            Ver todos
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {filtered.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  )
}
