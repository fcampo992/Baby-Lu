'use client'
import Image from 'next/image'
import Link from 'next/link'
import { useState, useRef } from 'react'
import { useCart } from '@/components/CartProvider'
import { addItem } from '@/lib/cart'
import type { ProductSummary, ProductVariantSummary } from '@/lib/filters'
import { isAvailable, totalStock } from '@/lib/filters'

interface ProductCardProps {
  product: ProductSummary
}

interface FlyingEmoji {
  id: number
  x: number
  y: number
}

/** Builds a human-readable label like "Talle M / Rojo" */
function buildVariantLabel(variant: ProductVariantSummary): string {
  const parts: string[] = []
  if (variant.size) parts.push(`Talle ${variant.size}`)
  if (variant.color) parts.push(variant.color)
  return parts.join(' / ')
}

export function ProductCard({ product }: ProductCardProps) {
  const { cart, setCart, addToastNotification } = useCart()
  const [added, setAdded] = useState(false)
  const [flyingEmojis, setFlyingEmojis] = useState<FlyingEmoji[]>([])
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const emojiCounter = useRef(0)

  // ── Variant selection state ──────────────────────────────────────────────
  const hasVariants = product.variants && product.variants.length > 0
  const [selectedSize, setSelectedSize] = useState<string | null>(null)
  const [selectedColor, setSelectedColor] = useState<string | null>(null)

  // Unique sizes and colors from variants that have stock
  const allSizes = hasVariants
    ? [...new Set(product.variants!.map(v => v.size).filter(Boolean) as string[])]
    : []
  const allColors = hasVariants
    ? [...new Set(product.variants!.map(v => v.color).filter(Boolean) as string[])]
    : []

  // Resolved selected variant — only match on dimensions that actually exist
  const selectedVariant: ProductVariantSummary | null = hasVariants
    ? (product.variants!.find(v => {
        const sizeMatch = allSizes.length === 0 || v.size === selectedSize
        const colorMatch = allColors.length === 0 || v.color === selectedColor
        return sizeMatch && colorMatch
      }) ?? null)
    : null

  // Is a variant selection required but not yet complete?
  const needsVariantSelection =
    hasVariants &&
    ((allSizes.length > 0 && !selectedSize) || (allColors.length > 0 && !selectedColor))

  // Stock to display: variant stock if applicable, else product stock
  const effectiveStock = hasVariants
    ? selectedVariant?.stock ?? 0
    : product.stock

  // Show out-of-stock overlay when:
  //  - No variants: product.stock === 0
  //  - Has variants: no variant has stock at all
  const outOfStock = !isAvailable(product)

  // ── Image gallery ────────────────────────────────────────────────────────
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

  // ── Add to cart ──────────────────────────────────────────────────────────
  function handleAddToCart(e: React.MouseEvent<HTMLButtonElement>) {
    const variantLabel = selectedVariant ? buildVariantLabel(selectedVariant) : null
    const stockToUse = hasVariants ? (selectedVariant?.stock ?? 0) : product.stock

    const updated = addItem(cart, {
      productId: product.id,
      variantId: selectedVariant?.id ?? null,
      variantLabel,
      title: product.title,
      price: product.price,
      stock: stockToUse,
      imageUrl: product.imageUrl,
    })
    setCart(updated)

    const toastLabel = variantLabel
      ? `${product.title} (${variantLabel})`
      : product.title
    addToastNotification(toastLabel)

    // Flying emoji
    const btn = buttonRef.current
    if (btn) {
      const rect = btn.getBoundingClientRect()
      const id = ++emojiCounter.current
      setFlyingEmojis(prev => [...prev, { id, x: rect.left + rect.width / 2, y: rect.top }])
      setTimeout(() => setFlyingEmojis(prev => prev.filter(f => f.id !== id)), 800)
    }

    setAdded(true)
    setTimeout(() => setAdded(false), 2000)
  }

  // ── Formatted price ──────────────────────────────────────────────────────
  const formattedPrice = new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(product.price)

  // ── Is add-to-cart disabled? ─────────────────────────────────────────────
  const addDisabled =
    outOfStock ||
    needsVariantSelection ||
    (hasVariants && selectedVariant !== null && selectedVariant.stock === 0)

  const stockDisplay = hasVariants
    ? selectedVariant
      ? `${selectedVariant.stock} disponibles`
      : `${totalStock(product)} en stock (elegí opciones)`
    : `${product.stock} disponibles`

  return (
    <>
      <div className="group bg-white border border-gray-100 rounded-lg overflow-hidden hover:border-gray-200 hover:shadow-medium transition flex flex-col">
        <Link href={`/products/${product.id}`}>
          <div className="relative w-full h-56 bg-gray-50 overflow-hidden">
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

            {outOfStock && (
              <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                <span className="bg-black text-white text-xs font-semibold px-3 py-1 rounded-full">
                  Sin stock
                </span>
              </div>
            )}

            {product.isNew && !outOfStock && (
              <span className="absolute top-2 left-2 z-10 bg-green-500 text-white text-xs font-bold px-2.5 py-1 rounded-full shadow-sm tracking-wide">
                Nuevo
              </span>
            )}
          </div>
        </Link>

        <div className="p-4 flex flex-col gap-3 flex-1">
          <Link href={`/products/${product.id}`} className="group/link flex-1">
            <p className="text-xs text-gray-500 uppercase tracking-wider">{product.category.name}</p>
            <h3 className="font-semibold text-gray-900 mt-1 line-clamp-2 group-hover/link:text-blue-600">
              {product.title}
            </h3>
          </Link>

          {/* ── Variant selectors ── */}
          {hasVariants && !outOfStock && (
            <div className="space-y-2">
              {/* Sizes */}
              {allSizes.length > 0 && (
                <div>
                  <p className="text-xs text-gray-500 mb-1 font-medium">Talle</p>
                  <div className="flex flex-wrap gap-1.5">
                    {allSizes.map(size => {
                      // Available if at least one variant with this size has stock
                      // Only cross-filter by color when colors actually exist
                      const available = product.variants!.some(
                        v =>
                          v.size === size &&
                          (allColors.length === 0 || !selectedColor || v.color === selectedColor) &&
                          v.stock > 0
                      )
                      const selected = selectedSize === size
                      return (
                        <button
                          key={size}
                          type="button"
                          onClick={() => setSelectedSize(selected ? null : size)}
                          disabled={!available}
                          className={`px-2.5 py-1 text-xs font-medium rounded-md border transition ${
                            selected
                              ? 'bg-black text-white border-black'
                              : available
                              ? 'bg-gray-100 text-gray-700 border-gray-300 hover:border-gray-600 hover:bg-gray-200'
                              : 'bg-gray-50 text-gray-300 border-gray-100 cursor-not-allowed line-through'
                          }`}
                        >
                          {size}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Colors */}
              {allColors.length > 0 && (
                <div>
                  <p className="text-xs text-gray-500 mb-1 font-medium">Color</p>
                  <div className="flex flex-wrap gap-1.5">
                    {allColors.map(color => {
                      const available = product.variants!.some(
                        v =>
                          v.color === color &&
                          (allSizes.length === 0 || !selectedSize || v.size === selectedSize) &&
                          v.stock > 0
                      )
                      const selected = selectedColor === color
                      return (
                        <button
                          key={color}
                          type="button"
                          onClick={() => setSelectedColor(selected ? null : color)}
                          disabled={!available}
                          className={`px-2.5 py-1 text-xs font-medium rounded-md border transition ${
                            selected
                              ? 'bg-black text-white border-black'
                              : available
                              ? 'bg-gray-100 text-gray-700 border-gray-300 hover:border-gray-600 hover:bg-gray-200'
                              : 'bg-gray-50 text-gray-300 border-gray-100 cursor-not-allowed line-through'
                          }`}
                        >
                          {color}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="flex items-baseline gap-2 mt-auto">
            <p className="text-lg font-bold text-gray-900">{formattedPrice}</p>
            <p className="text-xs text-gray-400">{stockDisplay}</p>
          </div>

          {/* Add to cart button */}
          <div className="relative">
            {added && (
              <span className="absolute inset-0 rounded-lg" style={{
                animation: 'cart-pulse 0.6s ease-out forwards',
                border: '2px solid #22c55e',
                pointerEvents: 'none',
              }} />
            )}
            <button
              ref={buttonRef}
              onClick={handleAddToCart}
              disabled={addDisabled}
              className={`w-full py-2.5 px-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                outOfStock
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : needsVariantSelection
                  ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
                  : hasVariants && selectedVariant?.stock === 0
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : added
                  ? 'bg-green-500 text-white scale-105'
                  : 'bg-black text-white hover:bg-gray-800'
              }`}
              style={{ transform: added ? 'scale(1.04)' : 'scale(1)', transition: 'background-color 0.2s, transform 0.15s' }}
            >
              {outOfStock
                ? 'Sin stock'
                : needsVariantSelection
                ? `Elegí ${allSizes.length > 0 && !selectedSize ? 'talle' : 'color'}`
                : hasVariants && selectedVariant?.stock === 0
                ? 'Sin stock en esta opción'
                : added
                ? '✓ ¡Agregado!'
                : 'Agregar al carrito'}
            </button>
          </div>
        </div>
      </div>

      {/* Flying emojis */}
      {flyingEmojis.map(emoji => (
        <span key={emoji.id} style={{
          position: 'fixed', left: emoji.x, top: emoji.y, zIndex: 9999,
          pointerEvents: 'none', fontSize: '1.25rem',
          animation: 'fly-up 0.8s ease-out forwards', transform: 'translateX(-50%)',
        }}>🛒</span>
      ))}
    </>
  )
}
