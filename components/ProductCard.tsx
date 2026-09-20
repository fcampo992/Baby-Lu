'use client'
import Image from 'next/image'
import Link from 'next/link'
import { useState } from 'react'
import type { ProductSummary } from '@/lib/filters'
import { isAvailable } from '@/lib/filters'

interface ProductCardProps {
  product: ProductSummary
}

export function ProductCard({ product }: ProductCardProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0)

  const outOfStock = !isAvailable(product)
  const allImages: string[] =
    product.images && product.images.length > 0
      ? product.images.map(i => i.url)
      : product.imageUrl
      ? [product.imageUrl]
      : []

  const currentImage = allImages[currentImageIndex] ?? null
  const hasMultipleImages = allImages.length > 1

  function prevImage(e: React.MouseEvent) {
    e.preventDefault(); e.stopPropagation()
    setCurrentImageIndex(idx => (idx - 1 + allImages.length) % allImages.length)
  }

  function nextImage(e: React.MouseEvent) {
    e.preventDefault(); e.stopPropagation()
    setCurrentImageIndex(idx => (idx + 1) % allImages.length)
  }

  const formattedPrice = new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(product.price)

  return (
    <div className="group bg-white border border-gray-100 rounded-lg overflow-hidden hover:border-gray-200 hover:shadow-md transition flex flex-col">

      {/* Image */}
      <Link href={`/products/${product.id}`}>
        <div className="relative w-full h-48 sm:h-56 bg-gray-50 overflow-hidden">
          {currentImage ? (
            <Image
              src={currentImage}
              alt={product.title}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-200 text-5xl">
              📦
            </div>
          )}

          {/* Mini-gallery arrows */}
          {hasMultipleImages && (
            <>
              <button type="button" onClick={prevImage} aria-label="Imagen anterior"
                className="absolute left-1.5 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-white/70 text-gray-800 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition hover:bg-white shadow-sm z-10">
                ‹
              </button>
              <button type="button" onClick={nextImage} aria-label="Imagen siguiente"
                className="absolute right-1.5 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-white/70 text-gray-800 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition hover:bg-white shadow-sm z-10">
                ›
              </button>
              <div className="absolute bottom-1.5 left-0 right-0 flex justify-center gap-1 opacity-0 group-hover:opacity-100 transition z-10">
                {allImages.map((_, idx) => (
                  <span key={idx} className={`w-1.5 h-1.5 rounded-full ${idx === currentImageIndex ? 'bg-white' : 'bg-white/50'}`} />
                ))}
              </div>
            </>
          )}

          {/* Out of stock overlay */}
          {outOfStock && (
            <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
              <span className="bg-black text-white text-xs font-semibold px-3 py-1 rounded-full">
                Sin stock
              </span>
            </div>
          )}

          {/* New badge */}
          {product.isNew && !outOfStock && (
            <span className="absolute top-2 left-2 z-10 bg-green-500 text-white text-xs font-bold px-2.5 py-1 rounded-full shadow-sm tracking-wide">
              Nuevo
            </span>
          )}
        </div>
      </Link>

      {/* Info */}
      <div className="p-3 sm:p-4 flex flex-col gap-2 flex-1">
        <Link href={`/products/${product.id}`} className="flex-1">
          <p className="text-xs text-gray-500 uppercase tracking-wider">{product.category.name}</p>
          <h3 className="font-semibold text-gray-900 mt-0.5 text-sm sm:text-base line-clamp-2 group-hover:text-blue-600 transition-colors">
            {product.title}
          </h3>
        </Link>

        <p className="text-base sm:text-lg font-bold text-gray-900 mt-auto">{formattedPrice}</p>
      </div>
    </div>
  )
}
