'use client'
import Image from 'next/image'
import Link from 'next/link'
import { useState, useRef } from 'react'
import { useCart } from '@/components/CartProvider'
import { addItem } from '@/lib/cart'
import type { ProductSummary } from '@/lib/filters'

interface ProductCardProps {
  product: ProductSummary
}

interface FlyingEmoji {
  id: number
  x: number
  y: number
}

export function ProductCard({ product }: ProductCardProps) {
  const { cart, setCart, addToastNotification } = useCart()
  const [added, setAdded] = useState(false)
  const [flyingEmojis, setFlyingEmojis] = useState<FlyingEmoji[]>([])
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const emojiCounter = useRef(0)

  // Build image list: prioritise images array, fall back to imageUrl
  const allImages: string[] =
    product.images && product.images.length > 0
      ? product.images.map((i) => i.url)
      : product.imageUrl
      ? [product.imageUrl]
      : []

  const currentImage = allImages[currentImageIndex] ?? null
  const hasMultipleImages = allImages.length > 1

  function prevImage(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    setCurrentImageIndex((idx) => (idx - 1 + allImages.length) % allImages.length)
  }

  function nextImage(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    setCurrentImageIndex((idx) => (idx + 1) % allImages.length)
  }

  function handleAddToCart(e: React.MouseEvent<HTMLButtonElement>) {
    const updated = addItem(cart, {
      productId: product.id,
      title: product.title,
      price: product.price,
      stock: product.stock,
      imageUrl: product.imageUrl,
    })
    setCart(updated)
    addToastNotification(product.title)

    // Get button position for flying emoji
    const btn = buttonRef.current
    if (btn) {
      const rect = btn.getBoundingClientRect()
      const id = ++emojiCounter.current
      setFlyingEmojis((prev) => [
        ...prev,
        { id, x: rect.left + rect.width / 2, y: rect.top },
      ])
      // Remove emoji after animation
      setTimeout(() => {
        setFlyingEmojis((prev) => prev.filter((f) => f.id !== id))
      }, 800)
    }

    // Show "¡Agregado!" state for 2 seconds
    setAdded(true)
    setTimeout(() => setAdded(false), 2000)
  }

  const outOfStock = product.stock === 0

  const formattedPrice = new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(product.price)

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

            {/* Mini-gallery arrows — only when multiple images */}
            {hasMultipleImages && (
              <>
                <button
                  type="button"
                  onClick={prevImage}
                  aria-label="Imagen anterior"
                  className="absolute left-1.5 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-white/70 text-gray-800 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition hover:bg-white shadow-sm z-10"
                >
                  ‹
                </button>
                <button
                  type="button"
                  onClick={nextImage}
                  aria-label="Imagen siguiente"
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-white/70 text-gray-800 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition hover:bg-white shadow-sm z-10"
                >
                  ›
                </button>
                {/* Dot indicators */}
                <div className="absolute bottom-1.5 left-0 right-0 flex justify-center gap-1 opacity-0 group-hover:opacity-100 transition z-10">
                  {allImages.map((_, idx) => (
                    <span
                      key={idx}
                      className={`w-1.5 h-1.5 rounded-full ${
                        idx === currentImageIndex ? 'bg-white' : 'bg-white/50'
                      }`}
                    />
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

            {/* "Nuevo" badge */}
            {product.isNew && !outOfStock && (
              <span className="absolute top-2 left-2 z-10 bg-green-500 text-white text-xs font-bold px-2.5 py-1 rounded-full shadow-sm tracking-wide">
                Nuevo
              </span>
            )}
          </div>
        </Link>

        <div className="p-4 flex flex-col gap-3 flex-1">
          <Link href={`/products/${product.id}`} className="group/link flex-1">
            <p className="text-xs text-gray-500 uppercase tracking-wider">
              {product.category.name}
            </p>
            <h3 className="font-semibold text-gray-900 mt-1 line-clamp-2 group-hover/link:text-blue-600">
              {product.title}
            </h3>
          </Link>

          <div className="flex items-baseline gap-2 mt-auto">
            <p className="text-lg font-bold text-gray-900">
              {formattedPrice}
            </p>
            <p className="text-xs text-gray-400">{product.stock} disponibles</p>
          </div>

          {/* Add to cart button with animation */}
          <div className="relative">
            {/* Pulse ring when added */}
            {added && (
              <span
                className="absolute inset-0 rounded-lg"
                style={{
                  animation: 'cart-pulse 0.6s ease-out forwards',
                  border: '2px solid #22c55e',
                  pointerEvents: 'none',
                }}
              />
            )}
            <button
              ref={buttonRef}
              onClick={handleAddToCart}
              disabled={outOfStock}
              className={`w-full py-2.5 px-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                outOfStock
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : added
                  ? 'bg-green-500 text-white scale-105'
                  : 'bg-black text-white hover:bg-gray-800'
              }`}
              style={{
                transform: added ? 'scale(1.04)' : 'scale(1)',
                transition: 'background-color 0.2s, transform 0.15s',
              }}
            >
              {outOfStock ? 'Sin stock' : added ? '✓ ¡Agregado!' : 'Agregar al carrito'}
            </button>
          </div>
        </div>
      </div>

      {/* Flying emojis — rendered at fixed position relative to viewport */}
      {flyingEmojis.map((emoji) => (
        <span
          key={emoji.id}
          style={{
            position: 'fixed',
            left: emoji.x,
            top: emoji.y,
            zIndex: 9999,
            pointerEvents: 'none',
            fontSize: '1.25rem',
            animation: 'fly-up 0.8s ease-out forwards',
            transform: 'translateX(-50%)',
          }}
        >
          🛒
        </span>
      ))}
    </>
  )
}
