'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useState } from 'react'
import { useCart } from '@/components/CartProvider'
import { addItem } from '@/lib/cart'

interface ProductImage {
  url: string
  order: number
}

interface ProductDetail {
  id: string
  title: string
  description: string
  price: number
  stock: number
  imageUrl?: string | null
  active: boolean
  category: { id: string; name: string }
  images?: ProductImage[]
}

interface Props {
  product: ProductDetail
}

// Renders description preserving line breaks and treating blank lines as paragraphs
function FormattedDescription({ text }: { text: string }) {
  if (!text?.trim()) return null

  // Split on double line breaks → paragraphs; single breaks → <br />
  const paragraphs = text.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean)

  return (
    <div className="prose prose-sm prose-gray max-w-none text-gray-600 leading-relaxed space-y-3">
      {paragraphs.map((para, i) => {
        const lines = para.split(/\n/).map((l) => l.trim())
        return (
          <p key={i} className="text-gray-600 leading-relaxed">
            {lines.map((line, j) => (
              <span key={j}>
                {line}
                {j < lines.length - 1 && <br />}
              </span>
            ))}
          </p>
        )
      })}
    </div>
  )
}

// Stock indicator component
function StockIndicator({ stock }: { stock: number }) {
  if (stock === 0) {
    return (
      <span className="inline-flex items-center gap-1.5 text-sm text-red-600 font-medium">
        <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />
        Sin stock
      </span>
    )
  }
  if (stock <= 5) {
    return (
      <span className="inline-flex items-center gap-1.5 text-sm text-amber-600 font-medium">
        <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
        ¡Solo quedan {stock}!
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-sm text-green-600 font-medium">
      <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
      {stock} disponibles
    </span>
  )
}

export function ProductDetailClient({ product }: Props) {
  const { cart, setCart } = useCart()
  const [added, setAdded] = useState(false)
  const [quantity, setQuantity] = useState(1)
  const [activeImageIndex, setActiveImageIndex] = useState(0)
  const outOfStock = product.stock === 0

  // Build ordered image list
  const allImages: string[] =
    product.images && product.images.length > 0
      ? [...product.images].sort((a, b) => a.order - b.order).map((i) => i.url)
      : product.imageUrl
      ? [product.imageUrl]
      : []

  const activeImage = allImages[activeImageIndex] ?? null

  function handleAddToCart() {
    const updated = addItem(cart, {
      productId: product.id,
      title: product.title,
      price: product.price,
      stock: product.stock,
      imageUrl: product.imageUrl ?? undefined,
    }, quantity)
    setCart(updated)
    setAdded(true)
    setTimeout(() => setAdded(false), 2500)
  }

  function decreaseQty() {
    setQuantity((q) => Math.max(1, q - 1))
  }

  function increaseQty() {
    setQuantity((q) => Math.min(product.stock, q + 1))
  }

  const formattedPrice = new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 2,
  }).format(product.price)

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="grid grid-cols-1 lg:grid-cols-2">

        {/* ── Image panel ─────────────────────────────────────── */}
        <div className="relative bg-gray-50 flex flex-col">
          {/* Main image */}
          <div className="relative w-full aspect-square lg:aspect-auto lg:min-h-[520px]">
            {activeImage ? (
              <Image
                src={activeImage}
                alt={product.title}
                fill
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="object-contain p-4"
                priority
              />
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-gray-300">
                <span className="text-8xl select-none">📦</span>
                <span className="text-sm text-gray-400">Sin imagen</span>
              </div>
            )}

            {/* Out-of-stock overlay */}
            {outOfStock && (
              <div className="absolute inset-0 bg-white/70 backdrop-blur-sm flex items-center justify-center">
                <span className="bg-gray-900 text-white text-sm font-semibold px-5 py-2.5 rounded-full shadow-lg">
                  Sin stock disponible
                </span>
              </div>
            )}
          </div>

          {/* Thumbnail strip — only when multiple images */}
          {allImages.length > 1 && (
            <div className="flex gap-2 p-3 border-t border-gray-100 overflow-x-auto">
              {allImages.map((url, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setActiveImageIndex(idx)}
                  className={`relative flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition ${
                    idx === activeImageIndex
                      ? 'border-indigo-500 ring-1 ring-indigo-300'
                      : 'border-gray-200 hover:border-gray-400'
                  }`}
                  aria-label={`Ver imagen ${idx + 1}`}
                >
                  <Image
                    src={url}
                    alt={`${product.title} — imagen ${idx + 1}`}
                    fill
                    className="object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── Info panel ──────────────────────────────────────── */}
        <div className="flex flex-col p-7 lg:p-10 lg:border-l border-gray-100">

          {/* Breadcrumb / category */}
          <div className="flex items-center gap-2 mb-4">
            <Link
              href="/"
              className="text-xs text-gray-400 hover:text-indigo-600 transition"
            >
              Inicio
            </Link>
            <span className="text-gray-300 text-xs">›</span>
            <span className="text-xs text-gray-500 font-medium uppercase tracking-wide">
              {product.category.name}
            </span>
          </div>

          {/* Title */}
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 leading-tight mb-4">
            {product.title}
          </h1>

          {/* Price */}
          <div className="flex items-baseline gap-3 mb-3">
            <span className="text-3xl font-extrabold text-gray-900">
              {formattedPrice}
            </span>
          </div>

          {/* Stock indicator */}
          <div className="mb-5">
            <StockIndicator stock={product.stock} />
          </div>

          {/* Divider */}
          <hr className="border-gray-100 mb-6" />

          {/* Description */}
          {product.description?.trim() && (
            <div className="mb-6 flex-1">
              <h2 className="text-sm font-semibold text-gray-800 uppercase tracking-wider mb-3">
                Descripción
              </h2>
              <FormattedDescription text={product.description} />
            </div>
          )}

          {/* Quantity selector + Add to cart */}
          {!outOfStock && (
            <div className="mb-4">
              <p className="text-sm font-medium text-gray-700 mb-2">Cantidad</p>
              <div className="flex items-center gap-3">
                <div className="inline-flex items-center border border-gray-200 rounded-lg overflow-hidden">
                  <button
                    onClick={decreaseQty}
                    disabled={quantity <= 1}
                    className="w-10 h-10 flex items-center justify-center text-gray-600 hover:bg-gray-50 disabled:opacity-40 transition text-lg font-medium"
                    aria-label="Reducir cantidad"
                  >
                    −
                  </button>
                  <span className="w-10 text-center text-sm font-semibold text-gray-900">
                    {quantity}
                  </span>
                  <button
                    onClick={increaseQty}
                    disabled={quantity >= product.stock}
                    className="w-10 h-10 flex items-center justify-center text-gray-600 hover:bg-gray-50 disabled:opacity-40 transition text-lg font-medium"
                    aria-label="Aumentar cantidad"
                  >
                    +
                  </button>
                </div>
                <span className="text-xs text-gray-400">
                  Máx. {product.stock} unidades
                </span>
              </div>
            </div>
          )}

          {/* CTA button */}
          <button
            onClick={handleAddToCart}
            disabled={outOfStock || added}
            className={`w-full py-3.5 px-6 rounded-xl font-semibold text-sm transition-all duration-300 ${
              outOfStock
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                : added
                ? 'bg-green-500 text-white scale-[0.99] shadow-md shadow-green-200'
                : 'bg-gray-900 text-white hover:bg-gray-700 active:scale-[0.98] shadow-sm hover:shadow-md'
            }`}
          >
            {outOfStock
              ? 'Sin stock'
              : added
              ? '✓ ¡Agregado al carrito!'
              : '🛒 Agregar al carrito'}
          </button>

          {/* Secondary action */}
          <Link
            href="/cart"
            className="mt-3 w-full py-3 px-6 rounded-xl border border-gray-200 text-gray-700 text-sm font-medium text-center hover:bg-gray-50 transition"
          >
            Ver carrito
          </Link>

          {/* Trust badges */}
          <div className="mt-6 pt-5 border-t border-gray-100 grid grid-cols-2 gap-3">
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <span className="text-base">🔒</span>
              <span>Compra segura</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <span className="text-base">💬</span>
              <span>Pedido por WhatsApp</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
