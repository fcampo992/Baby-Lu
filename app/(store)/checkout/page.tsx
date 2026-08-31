'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useCart } from '@/components/CartProvider'
import { clearCart, cartTotal, itemSubtotal } from '@/lib/cart'

interface FormData {
  customerName: string
  address: string
  notes: string
}

interface FormErrors {
  customerName?: string
  address?: string
  submit?: string
}

export default function CheckoutPage() {
  const router = useRouter()
  const { cart, setCart } = useCart()

  const [formData, setFormData] = useState<FormData>({
    customerName: '',
    address: '',
    notes: '',
  })
  const [errors, setErrors] = useState<FormErrors>({})
  const [loading, setLoading] = useState(false)
  const [hydrated, setHydrated] = useState(false)

  // Wait for cart to hydrate from localStorage before checking emptiness
  useEffect(() => {
    setHydrated(true)
  }, [])

  // Req 3.7: Redirect to catalogue if cart is empty
  useEffect(() => {
    if (hydrated && cart.items.length === 0) {
      router.replace('/')
    }
  }, [hydrated, cart.items.length, router])

  function validate(): boolean {
    const newErrors: FormErrors = {}
    if (!formData.customerName.trim()) {
      newErrors.customerName = 'El nombre completo es requerido'
    }
    if (!formData.address.trim()) {
      newErrors.address = 'La dirección de entrega es requerida'
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()

    // Req 3.6: Show per-field errors, do NOT proceed if invalid
    if (!validate()) return

    setLoading(true)

    const orderItems = cart.items.map(item => ({
      productId: item.productId,
      title: item.title,
      quantity: item.quantity,
      unitPrice: item.price,
    }))

    const total = cartTotal(cart)

    try {
      // Req 3.4: POST /api/orders with form data, cart items, total
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: formData.customerName.trim(),
          address: formData.address.trim(),
          notes: formData.notes.trim() || undefined,
          items: orderItems,
          total,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        if (errorData?.error === 'STOCK_ERROR' && errorData.items) {
          const stockMessages = Object.values(errorData.items as Record<string, string>).join(', ')
          setErrors({ submit: `Stock insuficiente: ${stockMessages}` })
        } else if (errorData?.error === 'WHATSAPP_NOT_CONFIGURED') {
          setErrors({ submit: 'El sistema de pedidos no está configurado aún. Contactá al administrador.' })
        } else {
          setErrors({ submit: errorData?.error || 'Error al crear el pedido. Por favor intentá nuevamente.' })
        }
        setLoading(false)
        return
      }

      const data = await response.json()
      const whatsappUrl: string = data.whatsappUrl

      // Clear cart on successful order
      setCart(clearCart())

      // Open WhatsApp with pre-loaded message
      window.open(whatsappUrl, '_blank')
      // Loading stays true briefly — page will redirect away or show empty cart
    } catch {
      setErrors({ submit: 'Error de conexión. Por favor intentá nuevamente.' })
      setLoading(false)
    }
  }

  // Show nothing while waiting for hydration (avoids flash before redirect)
  if (!hydrated || cart.items.length === 0) {
    return null
  }

  const total = cartTotal(cart)

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Checkout</h1>
        <Link
          href="/cart"
          className="text-sm text-gray-500 hover:text-gray-700 transition"
        >
          ← Volver al carrito
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Order Summary — Req 3.1 */}
        <div className="bg-white border border-gray-100 rounded-lg p-6 shadow-sm">
          <h2 className="text-lg font-bold text-gray-900 mb-4">
            Resumen del pedido
          </h2>
          <ul className="space-y-3 divide-y divide-gray-50">
            {cart.items.map(item => (
              <li
                key={item.productId}
                className="flex justify-between items-start pt-3 first:pt-0 text-sm"
              >
                <span className="text-gray-700 flex-1 pr-4">
                  {item.title}{' '}
                  <span className="text-gray-400">× {item.quantity}</span>
                </span>
                <span className="font-medium text-gray-900 whitespace-nowrap">
                  ${itemSubtotal(item).toFixed(2)}
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-4 pt-4 border-t border-gray-200 flex justify-between items-center font-bold text-gray-900">
            <span>Total</span>
            <span className="text-xl">${total.toFixed(2)}</span>
          </div>
        </div>

        {/* Checkout Form — Req 3.1, 3.6 */}
        <form
          onSubmit={handleSubmit}
          noValidate
          className="bg-white border border-gray-100 rounded-lg p-6 shadow-sm space-y-5"
        >
          <h2 className="text-lg font-bold text-gray-900">Tus datos</h2>

          {/* Submit-level error */}
          {errors.submit && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm p-3 rounded-lg">
              {errors.submit}
            </div>
          )}

          {/* customerName — required */}
          <div>
            <label
              htmlFor="customerName"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Nombre completo <span className="text-red-500">*</span>
            </label>
            <input
              id="customerName"
              type="text"
              autoComplete="name"
              value={formData.customerName}
              onChange={e =>
                setFormData(prev => ({ ...prev, customerName: e.target.value }))
              }
              className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-black transition ${
                errors.customerName
                  ? 'border-red-400 focus:ring-red-400'
                  : 'border-gray-200'
              }`}
              placeholder="Juan Pérez"
            />
            {errors.customerName && (
              <p className="text-red-500 text-xs mt-1" role="alert">
                {errors.customerName}
              </p>
            )}
          </div>

          {/* address — required */}
          <div>
            <label
              htmlFor="address"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Dirección de entrega <span className="text-red-500">*</span>
            </label>
            <input
              id="address"
              type="text"
              autoComplete="street-address"
              value={formData.address}
              onChange={e =>
                setFormData(prev => ({ ...prev, address: e.target.value }))
              }
              className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-black transition ${
                errors.address
                  ? 'border-red-400 focus:ring-red-400'
                  : 'border-gray-200'
              }`}
              placeholder="Av. Corrientes 1234, Buenos Aires"
            />
            {errors.address && (
              <p className="text-red-500 text-xs mt-1" role="alert">
                {errors.address}
              </p>
            )}
          </div>

          {/* notes — optional */}
          <div>
            <label
              htmlFor="notes"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Notas adicionales{' '}
              <span className="text-gray-400 font-normal">(opcional)</span>
            </label>
            <textarea
              id="notes"
              rows={3}
              value={formData.notes}
              onChange={e =>
                setFormData(prev => ({ ...prev, notes: e.target.value }))
              }
              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black resize-none transition"
              placeholder="Instrucciones de entrega, referencias, horarios..."
            />
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <span className="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                Procesando...
              </>
            ) : (
              '💬 Finalizar pedido por WhatsApp'
            )}
          </button>

          <p className="text-xs text-gray-400 text-center">
            Se abrirá WhatsApp con el detalle de tu pedido listo para enviar
          </p>
        </form>
      </div>
    </div>
  )
}
