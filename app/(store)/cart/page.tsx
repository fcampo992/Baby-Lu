'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useCart } from '@/components/CartProvider'
import { updateQty, removeItem, clearCart, itemSubtotal, cartTotal, cartItemKey, CartItem } from '@/lib/cart'

export default function CartPage() {
  const { cart, setCart } = useCart()
  const items = cart.items

  function handleIncrement(item: CartItem) {
    setCart(updateQty(cart, item.productId, item.quantity + 1, item.variantId))
  }

  function handleDecrement(item: CartItem) {
    setCart(updateQty(cart, item.productId, item.quantity - 1, item.variantId))
  }

  function handleRemove(item: CartItem) {
    setCart(removeItem(cart, item.productId, item.variantId))
  }

  function handleClear() {
    setCart(clearCart())
  }

  return (
    <div className="space-y-8 max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Tu Carrito</h1>
        <Link href="/" className="inline-flex items-center text-gray-500 hover:text-gray-700 text-sm font-medium">
          ← Volver al catálogo
        </Link>
      </div>

      {items.length === 0 ? (
        <div className="text-center py-16 bg-gray-50 rounded-lg border border-gray-100">
          <p className="text-xl text-gray-400 mb-4">Tu carrito está vacío.</p>
          <Link href="/" className="inline-flex items-center px-6 py-3 bg-black text-white rounded-lg hover:bg-gray-800 transition">
            Comenzar comprando
          </Link>
        </div>
      ) : (
        <>
          <ul className="space-y-4">
            {items.map((item) => (
              <li
                key={cartItemKey(item.productId, item.variantId)}
                className="bg-white border border-gray-100 rounded-lg p-5 flex items-center gap-5 shadow-sm"
              >
                {/* Image */}
                <div className="relative w-20 h-20 bg-gray-100 flex-shrink-0 rounded overflow-hidden">
                  {item.imageUrl ? (
                    <Image src={item.imageUrl} alt={item.title} fill className="object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-2xl text-gray-300">📦</div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <h2 className="font-semibold text-gray-900 truncate">{item.title}</h2>
                  {/* Variant label */}
                  {item.variantLabel && (
                    <p className="text-xs text-indigo-600 font-medium mt-0.5">{item.variantLabel}</p>
                  )}
                  <p className="text-sm text-gray-500 mt-0.5">
                    {new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(item.price)} c/u
                  </p>
                </div>

                {/* Quantity Controls */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleDecrement(item)}
                    className="w-8 h-8 border border-gray-200 rounded-full flex items-center justify-center text-gray-600 hover:bg-gray-100 transition"
                    aria-label="Reducir cantidad"
                  >−</button>
                  <span className="w-8 text-center text-sm font-medium text-gray-900">{item.quantity}</span>
                  <button
                    onClick={() => handleIncrement(item)}
                    disabled={item.quantity >= item.stock}
                    className="w-8 h-8 border border-gray-200 rounded-full flex items-center justify-center text-gray-600 hover:bg-gray-100 transition disabled:opacity-40 disabled:cursor-not-allowed"
                    aria-label="Aumentar cantidad"
                  >+</button>
                </div>

                {/* Subtotal */}
                <span className="w-28 text-right font-semibold text-gray-900">
                  {new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(itemSubtotal(item))}
                </span>

                {/* Remove */}
                <button
                  onClick={() => handleRemove(item)}
                  className="text-red-400 hover:text-red-600 text-sm transition"
                  aria-label="Eliminar producto"
                >✕</button>
              </li>
            ))}
          </ul>

          {/* Footer */}
          <div className="pt-6 border-t border-gray-100">
            <div className="flex items-center justify-between mb-6">
              <span className="text-lg font-medium text-gray-700">Total:</span>
              <span className="text-2xl font-bold text-gray-900">
                {new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(cartTotal(cart))}
              </span>
            </div>

            <div className="flex gap-3">
              <Link href="/checkout"
                className="flex-1 text-center px-6 py-3 bg-black text-white rounded-lg hover:bg-gray-800 transition font-medium">
                Finalizar compra →
              </Link>
              <button onClick={handleClear}
                className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition">
                Vaciar carrito
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
