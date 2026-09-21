'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useCart } from '@/components/CartProvider'
import { updateQty, removeItem, clearCart, itemSubtotal, cartTotal, cartItemKey, CartItem } from '@/lib/cart'

const fmt = (n: number) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(n)

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
    <div className="max-w-2xl mx-auto px-3 sm:px-4 py-6 sm:py-8 space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Tu Carrito</h1>
        <Link href="/" className="text-sm text-gray-500 hover:text-gray-700 font-medium">
          ← Catálogo
        </Link>
      </div>

      {items.length === 0 ? (
        <div className="text-center py-16 bg-gray-50 rounded-xl border border-gray-100">
          <p className="text-lg text-gray-400 mb-4">Tu carrito está vacío.</p>
          <Link href="/" className="inline-flex items-center px-6 py-3 bg-black text-white rounded-lg hover:bg-gray-800 transition text-sm font-medium">
            Comenzar comprando
          </Link>
        </div>
      ) : (
        <>
          <ul className="space-y-3">
            {items.map((item) => (
              <li
                key={cartItemKey(item.productId, item.variantId)}
                className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden"
              >
                {/* ── Fila superior: imagen + info + botón eliminar ── */}
                <div className="flex items-start gap-3 p-3 sm:p-4">

                  {/* Imagen */}
                  <div className="relative w-16 h-16 sm:w-20 sm:h-20 bg-gray-100 flex-shrink-0 rounded-lg overflow-hidden">
                    {item.imageUrl ? (
                      <Image src={item.imageUrl} alt={item.title} fill className="object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-2xl text-gray-300">📦</div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <h2 className="font-semibold text-gray-900 text-sm sm:text-base leading-snug line-clamp-2">
                      {item.title}
                    </h2>
                    {item.variantLabel && (
                      <p className="text-xs text-indigo-600 font-medium mt-0.5">{item.variantLabel}</p>
                    )}
                    <p className="text-xs sm:text-sm text-gray-500 mt-1">
                      {fmt(item.price)} c/u
                    </p>
                  </div>

                  {/* Botón eliminar */}
                  <button
                    onClick={() => handleRemove(item)}
                    className="p-1.5 text-gray-300 hover:text-red-500 transition flex-shrink-0 rounded-lg hover:bg-red-50"
                    aria-label="Eliminar producto"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {/* ── Fila inferior: cantidad + subtotal ── */}
                <div className="flex items-center justify-between px-3 pb-3 sm:px-4 sm:pb-4 pt-0">
                  {/* Controles de cantidad */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleDecrement(item)}
                      className="w-8 h-8 border border-gray-200 rounded-full flex items-center justify-center text-gray-600 hover:bg-gray-100 transition text-lg leading-none"
                      aria-label="Reducir cantidad"
                    >−</button>
                    <span className="w-6 text-center text-sm font-semibold text-gray-900">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => handleIncrement(item)}
                      disabled={item.quantity >= item.stock}
                      className="w-8 h-8 border border-gray-200 rounded-full flex items-center justify-center text-gray-600 hover:bg-gray-100 transition disabled:opacity-40 disabled:cursor-not-allowed text-lg leading-none"
                      aria-label="Aumentar cantidad"
                    >+</button>
                  </div>

                  {/* Subtotal */}
                  <span className="text-sm sm:text-base font-bold text-gray-900">
                    {fmt(itemSubtotal(item))}
                  </span>
                </div>
              </li>
            ))}
          </ul>

          {/* Footer */}
          <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-4 sm:p-5 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-base font-medium text-gray-600">Total</span>
              <span className="text-xl sm:text-2xl font-bold text-gray-900">
                {fmt(cartTotal(cart))}
              </span>
            </div>

            <Link
              href="/checkout"
              className="block w-full text-center py-3 bg-black text-white rounded-xl font-medium hover:bg-gray-800 transition text-sm sm:text-base"
            >
              Finalizar compra →
            </Link>

            <button
              onClick={handleClear}
              className="block w-full text-center py-2.5 bg-gray-50 text-gray-500 rounded-xl text-sm hover:bg-gray-100 transition"
            >
              Vaciar carrito
            </button>
          </div>
        </>
      )}
    </div>
  )
}
