'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useState, useRef } from 'react'
import { useCart } from '@/components/CartProvider'
import { addItem } from '@/lib/cart'

// ── Types ─────────────────────────────────────────────────────────────────────

interface FlyingEmoji {
  id: number
  x: number
  y: number
}

interface ProductImage {
  url: string
  order: number
}

interface ProductVariant {
  id: string
  size: string | null
  color: string | null
  stock: number
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
  variants?: ProductVariant[]
}

interface Props {
  product: ProductDetail
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function buildVariantLabel(v: ProductVariant): string {
  const parts: string[] = []
  if (v.size) parts.push(`Talle ${v.size}`)
  if (v.color) parts.push(v.color)
  return parts.join(' / ')
}

function FormattedDescription({ text }: { text: string }) {
  if (!text?.trim()) return null
  const paragraphs = text.split(/\n{2,}/).map(p => p.trim()).filter(Boolean)
  return (
    <div className="prose prose-sm prose-gray max-w-none text-gray-600 leading-relaxed space-y-3">
      {paragraphs.map((para, i) => {
        const lines = para.split(/\n/).map(l => l.trim())
        return (
          <p key={i} className="text-gray-600 leading-relaxed">
            {lines.map((line, j) => (
              <span key={j}>{line}{j < lines.length - 1 && <br />}</span>
            ))}
          </p>
        )
      })}
    </div>
  )
}

function StockIndicator({ stock }: { stock: number }) {
  if (stock === 0)
    return (
      <span className="inline-flex items-center gap-1.5 text-sm text-red-600 font-medium">
        <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />Sin stock
      </span>
    )
  if (stock <= 5)
    return (
      <span className="inline-flex items-center gap-1.5 text-sm text-amber-600 font-medium">
        <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />¡Solo quedan {stock}!
      </span>
    )
  return (
    <span className="inline-flex items-center gap-1.5 text-sm text-green-600 font-medium">
      <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />{stock} disponibles
    </span>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export function ProductDetailClient({ product }: Props) {
  const { cart, setCart, addToastNotification } = useCart()
  const [added, setAdded] = useState(false)
  const [quantity, setQuantity] = useState(1)
  const [activeImageIndex, setActiveImageIndex] = useState(0)
  const [flyingEmojis, setFlyingEmojis] = useState<FlyingEmoji[]>([])
  const buttonRef = useRef<HTMLButtonElement>(null)
  const emojiCounter = useRef(0)

  // ── Variant state ──────────────────────────────────────────────────────────
  const hasVariants = product.variants && product.variants.length > 0
  const [selectedSize, setSelectedSize] = useState<string | null>(null)
  const [selectedColor, setSelectedColor] = useState<string | null>(null)
  const [variantError, setVariantError] = useState('')

  // Unique sizes / colors
  const allSizes = hasVariants
    ? [...new Set(product.variants!.map(v => v.size).filter(Boolean) as string[])]
    : []
  const allColors = hasVariants
    ? [...new Set(product.variants!.map(v => v.color).filter(Boolean) as string[])]
    : []

  // Find variant matching current selection — only match on dimensions that exist
  const selectedVariant: ProductVariant | null = hasVariants
    ? (product.variants!.find(v => {
        const sizeMatch = allSizes.length === 0 || v.size === selectedSize
        const colorMatch = allColors.length === 0 || v.color === selectedColor
        return sizeMatch && colorMatch
      }) ?? null)
    : null

  // Needs selection: has options but user hasn't chosen yet
  const needsSize = allSizes.length > 0 && !selectedSize
  const needsColor = allColors.length > 0 && !selectedColor
  const needsVariantSelection = needsSize || needsColor

  // Effective stock for quantity cap and indicators
  const effectiveStock = hasVariants
    ? (selectedVariant?.stock ?? 0)
    : product.stock

  // Global out-of-stock: no variant has stock at all (or product.stock = 0)
  const globalOutOfStock = hasVariants
    ? product.variants!.every(v => v.stock === 0)
    : product.stock === 0

  // This specific variant is out of stock (but product isn't globally)
  const variantOutOfStock =
    hasVariants && selectedVariant !== null && selectedVariant.stock === 0

  // ── Images ─────────────────────────────────────────────────────────────────
  const allImages: string[] =
    product.images && product.images.length > 0
      ? [...product.images].sort((a, b) => a.order - b.order).map(i => i.url)
      : product.imageUrl
      ? [product.imageUrl]
      : []

  const activeImage = allImages[activeImageIndex] ?? null

  // ── Quantity ───────────────────────────────────────────────────────────────
  function decreaseQty() { setQuantity(q => Math.max(1, q - 1)) }
  function increaseQty() { setQuantity(q => Math.min(effectiveStock, q + 1)) }

  // ── Add to cart ────────────────────────────────────────────────────────────
  function handleAddToCart() {
    setVariantError('')

    if (needsVariantSelection) {
      const missing: string[] = []
      if (needsSize) missing.push('talle')
      if (needsColor) missing.push('color')
      setVariantError(`Por favor elegí ${missing.join(' y ')} antes de agregar al carrito.`)
      return
    }

    if (variantOutOfStock) {
      setVariantError('Esta combinación no tiene stock disponible.')
      return
    }

    const variantLabel = selectedVariant ? buildVariantLabel(selectedVariant) : null
    const stockToUse = hasVariants ? (selectedVariant?.stock ?? 0) : product.stock

    const updated = addItem(cart, {
      productId: product.id,
      variantId: selectedVariant?.id ?? null,
      variantLabel,
      title: product.title,
      price: product.price,
      stock: stockToUse,
      imageUrl: product.imageUrl ?? undefined,
    }, quantity)

    setCart(updated)
    addToastNotification(variantLabel ? `${product.title} (${variantLabel})` : product.title)

    // Flying emoji from button position
    const btn = buttonRef.current
    if (btn) {
      const rect = btn.getBoundingClientRect()
      const id = ++emojiCounter.current
      setFlyingEmojis(prev => [...prev, { id, x: rect.left + rect.width / 2, y: rect.top }])
      setTimeout(() => setFlyingEmojis(prev => prev.filter(f => f.id !== id)), 800)
    }

    setAdded(true)
    setTimeout(() => setAdded(false), 2500)
  }

  // ── Button label / state ───────────────────────────────────────────────────
  const addDisabled = globalOutOfStock || variantOutOfStock || added

  function buttonLabel() {
    if (globalOutOfStock) return 'Sin stock'
    if (added) return '✓ ¡Agregado al carrito!'
    return '🛒 Agregar al carrito'
  }

  const formattedPrice = new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
  }).format(product.price)

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <>
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="grid grid-cols-1 lg:grid-cols-2">

        {/* Image panel */}
        <div className="relative bg-gray-50 flex flex-col">
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

            {globalOutOfStock && (
              <div className="absolute inset-0 bg-white/70 backdrop-blur-sm flex items-center justify-center">
                <span className="bg-gray-900 text-white text-sm font-semibold px-5 py-2.5 rounded-full shadow-lg">
                  Sin stock disponible
                </span>
              </div>
            )}
          </div>

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
                  <Image src={url} alt={`${product.title} — imagen ${idx + 1}`} fill className="object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Info panel */}
        <div className="flex flex-col p-7 lg:p-10 lg:border-l border-gray-100">

          {/* Category breadcrumb */}
          <div className="flex items-center gap-2 mb-4">
            <Link href="/" className="text-xs text-gray-400 hover:text-indigo-600 transition">Inicio</Link>
            <span className="text-gray-300 text-xs">›</span>
            <span className="text-xs text-gray-500 font-medium uppercase tracking-wide">{product.category.name}</span>
          </div>

          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 leading-tight mb-4">{product.title}</h1>

          <div className="flex items-baseline gap-3 mb-4">
            <span className="text-3xl font-extrabold text-gray-900">{formattedPrice}</span>
          </div>

          {/* Stock indicator — hidden from buyers, only shown internally */}

          <hr className="border-gray-100 mb-6" />

          {/* Description */}
          {product.description?.trim() && (
            <div className="mb-6 flex-1">
              <h2 className="text-sm font-semibold text-gray-800 uppercase tracking-wider mb-3">Descripción</h2>
              <FormattedDescription text={product.description} />
            </div>
          )}

          {/* ── Variant selectors ─────────────────────────────── */}
          {hasVariants && !globalOutOfStock && (
            <div className="mb-6 space-y-4">

              {/* Size selector */}
              {allSizes.length > 0 && (
                <div>
                  <p className="text-sm font-semibold text-gray-800 mb-2">
                    Talle
                    {selectedSize && (
                      <span className="ml-2 font-normal text-indigo-600">{selectedSize}</span>
                    )}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {allSizes.map(size => {
                      // Available if at least one variant with this size has stock
                      // (considering selected color filter if any)
                      const available = product.variants!.some(
                        v =>
                          v.size === size &&
                          (allColors.length === 0 || !selectedColor || v.color === selectedColor) &&
                          v.stock > 0
                      )
                      const isSelected = selectedSize === size
                      return (
                        <button
                          key={size}
                          type="button"
                          onClick={() => {
                            setSelectedSize(isSelected ? null : size)
                            setVariantError('')
                          }}
                          disabled={!available}
                          className={`min-w-[44px] px-3.5 py-2 text-sm font-medium rounded-lg border-2 transition ${
                            isSelected
                              ? 'bg-gray-900 text-white border-gray-900'
                              : available
                              ? 'bg-gray-100 text-gray-800 border-gray-300 hover:border-gray-700 hover:bg-gray-200'
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

              {/* Color selector */}
              {allColors.length > 0 && (
                <div>
                  <p className="text-sm font-semibold text-gray-800 mb-2">
                    Color
                    {selectedColor && (
                      <span className="ml-2 font-normal text-indigo-600">{selectedColor}</span>
                    )}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {allColors.map(color => {
                      const available = product.variants!.some(
                        v =>
                          v.color === color &&
                          (allSizes.length === 0 || !selectedSize || v.size === selectedSize) &&
                          v.stock > 0
                      )
                      const isSelected = selectedColor === color
                      return (
                        <button
                          key={color}
                          type="button"
                          onClick={() => {
                            setSelectedColor(isSelected ? null : color)
                            setVariantError('')
                          }}
                          disabled={!available}
                          className={`px-3.5 py-2 text-sm font-medium rounded-lg border-2 transition ${
                            isSelected
                              ? 'bg-gray-900 text-white border-gray-900'
                              : available
                              ? 'bg-gray-100 text-gray-800 border-gray-300 hover:border-gray-700 hover:bg-gray-200'
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

              {/* Variant error */}
              {variantError && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  {variantError}
                </p>
              )}

              {/* Stock hint removed — not shown to buyers */}
            </div>
          )}

          {/* Quantity selector */}
          {!globalOutOfStock && !variantOutOfStock && (
            <div className="mb-5">
              <p className="text-sm font-medium text-gray-700 mb-2">Cantidad</p>
              <div className="flex items-center gap-3">
                <div className="inline-flex items-center border border-gray-200 rounded-lg overflow-hidden">
                  <button
                    onClick={decreaseQty}
                    disabled={quantity <= 1}
                    className="w-10 h-10 flex items-center justify-center text-gray-600 hover:bg-gray-50 disabled:opacity-40 transition text-lg font-medium"
                    aria-label="Reducir cantidad"
                  >−</button>
                  <span className="w-10 text-center text-sm font-semibold text-gray-900">{quantity}</span>
                  <button
                    onClick={increaseQty}
                    disabled={quantity >= effectiveStock}
                    className="w-10 h-10 flex items-center justify-center text-gray-600 hover:bg-gray-50 disabled:opacity-40 transition text-lg font-medium"
                    aria-label="Aumentar cantidad"
                  >+</button>
                </div>
                <span className="text-xs text-gray-400">
                  {needsVariantSelection ? 'Elegí las opciones primero' : ''}
                </span>
              </div>
            </div>
          )}

          {/* CTA */}
          <button
            ref={buttonRef}
            onClick={handleAddToCart}
            disabled={addDisabled}
            className={`w-full py-3.5 px-6 rounded-xl font-semibold text-sm transition-all duration-300 ${
              globalOutOfStock || variantOutOfStock
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                : added
                ? 'bg-green-500 text-white scale-[0.99] shadow-md shadow-green-200'
                : 'bg-gray-900 text-white hover:bg-gray-700 active:scale-[0.98] shadow-sm hover:shadow-md'
            }`}
          >
            {buttonLabel()}
          </button>

          {/* View cart link */}
          <Link
            href="/cart"
            className="mt-3 w-full py-3 px-6 rounded-xl border border-gray-200 text-gray-700 text-sm font-medium text-center hover:bg-gray-50 transition"
          >
            Ver carrito
          </Link>

          {/* Trust badges */}
          <div className="mt-6 pt-5 border-t border-gray-100 grid grid-cols-2 gap-3">
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <span className="text-base">🔒</span><span>Compra segura</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <span className="text-base">💬</span><span>Pedido por WhatsApp</span>
            </div>
          </div>
        </div>
      </div>
    </div>

      {/* Flying emojis */}
      {flyingEmojis.map(emoji => (
        <span key={emoji.id} style={{
          position: 'fixed', left: emoji.x, top: emoji.y, zIndex: 9999,
          pointerEvents: 'none', fontSize: '1.5rem',
          animation: 'fly-up 0.8s ease-out forwards',
          transform: 'translateX(-50%)',
        }}>🛒</span>
      ))}
    </>
  )
}
