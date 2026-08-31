'use client'

import { useState } from 'react'
import { ProductCard } from '@/components/ProductCard'
import { HeroCarousel, BannerItem } from '@/components/HeroCarousel'
import { filterProducts, ProductSummary } from '@/lib/filters'

interface Category {
  id: string
  name: string
}

interface Props {
  initialProducts: ProductSummary[]
  initialCategories: Category[]
  initialBanners: BannerItem[]
}

export function CatalogClient({ initialProducts, initialCategories, initialBanners }: Props) {
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')

  const filtered = filterProducts(initialProducts, {
    search,
    categoryId: selectedCategory || undefined,
  })

  return (
    <div className="space-y-8">
      {/* Hero Carousel */}
      {initialBanners.length > 0 && <HeroCarousel banners={initialBanners} />}

      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-4xl font-bold text-gray-900">Nuestro Catálogo</h1>
        <p className="text-gray-500">Encontrá los mejores productos</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1">
          <input
            id="search"
            type="text"
            placeholder="Buscar por nombre o descripción..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
          />
        </div>
        <div className="flex gap-2">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black bg-white text-gray-900"
          >
            <option value="">Todas las categorías</option>
            {initialCategories.map((cat) => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
          {(search || selectedCategory) && (
            <button
              onClick={() => { setSearch(''); setSelectedCategory('') }}
              className="px-4 py-3 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 border border-gray-200 rounded-lg transition"
            >
              Limpiar filtros
            </button>
          )}
        </div>
      </div>

      {/* Products Grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 bg-gray-50 rounded-lg border border-gray-100">
          <p className="text-lg text-gray-600">No se encontraron productos.</p>
          <button
            onClick={() => { setSearch(''); setSelectedCategory('') }}
            className="mt-4 px-4 py-2 text-sm text-blue-600 hover:underline"
          >
            Ver todos los productos
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
