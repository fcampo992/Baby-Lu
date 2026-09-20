'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useCart } from '@/components/CartProvider'
import { clearCart, cartTotal, itemSubtotal } from '@/lib/cart'

interface DeliveryOption {
  id: string
  name: string
  description: string | null
}

interface FormData {
  customerName: string
  deliveryOptionId: string
  notes: string
}

interface FormErrors {
  customerName?: string
  deliveryOptionId?: string
  submit?: string
}

export default function CheckoutPage() {
  const router = useRouter()
  const { cart, setCart } = useCart()

  const [formData, setFormData] = useState<FormData>({
    customerName: '',
    deliveryOptionId: '',
    notes: '',
  })
  const [errors, setErrors] = useState<FormErrors>({})
  const [loading, setLoading] = useState(false)
  const [hydrated, setHydrated] = useState(false)
  const [deliveryOptions, setDeliveryOptions] = useState<DeliveryOption[]>([])
  const [loadingDelivery, setLoadingDelivery] = useState(true)

  useEffect(() => {
    setHydrated(true)
  }, [])

  // Load delivery options
  useEffect(() => {
    fetch('/api/delivery-options?activeOnly=true')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        const opts: DeliveryOption[] = data?.options ?? []
        setDeliveryOptions(opts)
        // Auto-select first option if only one available
        if (opts.length === 1) {
          setFormData(prev => ({ ...prev, deliveryOptionId: opts[0].id }))
        }
      })
      .catch(() => {})
      .finally(() => setLoadingDelivery(false))
  }, [])

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
    if (!formData.deliveryOptionId) {
      newErrors.deliveryOptionId = 'Seleccioná un punto de entrega'
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!validate()) return

    setLoading(true)

    const orderItems = cart.items.map(item => ({
      productId: item.productId,
      variantId: item.variantId ?? null,
      variantLabel: item.variantLabel ?? null,
      title: item.title,
      quantity: item.quantity,
      unitPrice: item.price,
    }))

    const total = cartTotal(cart)

    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: formData.customerName.trim(),
          deliveryOptionId: formData.deliveryOptionId,
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
        } else if (errorData?.error === 'VALIDATION_ERROR' && errorData.fields) {
          setErrors(errorData.fields)
        } else {
          setErrors({ submit: errorData?.error || 'Error al crear el pedido. Por favor intentá nuevamente.' })
        }
        setLoading(false)
        return
      }

      const data = await response.json()
      setCart(clearCart())
      window.open(data.whatsappUrl, '_blank')
    } catch {
      setErrors({ submit: 'Error de conexión. Por favor intentá nuevamente.' })
      setLoading(false)
    }
  }

  if (!hydrated || cart.items.length === 0) return null

  const total = cartTotal(cart)
  const selectedOption = deliveryOptions.find(o => o.id === formData.deliveryOptionId)

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Checkout</h1>
        <Link href="/cart" className="text-sm text-gray-500 hover:text-gray-700 transition">
          ← Volver al carrito
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Order Summary */}
        <div className="bg-white border border-gray-100 rounded-lg p-6 shadow-sm">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Resumen del pedido</h2>
          <ul className="space-y-3 divide-y divide-gray-50">
            {cart.items.map(item => (
              <li
                key={`${item.productId}-${item.variantId ?? 'base'}`}
                className="flex justify-between items-start pt-3 first:pt-0 text-sm"
              >
                <span className="text-gray-700 flex-1 pr-4">
                  {item.title}{' '}
                  {item.variantLabel && (
                    <span className="text-indigo-600 font-medium">({item.variantLabel})</span>
                  )}{' '}
                  <span className="text-gray-400">× {item.quantity}</span>
                </span>
                <span className="font-medium text-gray-900 whitespace-nowrap">
                  {new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(itemSubtotal(item))}
                </span>
              </li>
            ))}
          </ul>

          {/* Delivery option summary */}
          {selectedOption && (
            <div className="mt-4 pt-3 border-t border-gray-100">
              <div className="flex items-start gap-2 text-sm">
                <span className="text-gray-400 shrink-0">📍 Entrega:</span>
                <div>
                  <span className="font-medium text-gray-800">{selectedOption.name}</span>
                  {selectedOption.description && (
                    <p className="text-xs text-gray-500 mt-0.5">{selectedOption.description}</p>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="mt-4 pt-4 border-t border-gray-200 flex justify-between items-center font-bold text-gray-900">
            <span>Total</span>
            <span className="text-xl">
              {new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(total)}
            </span>
          </div>
        </div>

        {/* Checkout Form */}
        <form
          onSubmit={handleSubmit}
          noValidate
          className="bg-white border border-gray-100 rounded-lg p-6 shadow-sm space-y-5"
        >
          <h2 className="text-lg font-bold text-gray-900">Tus datos</h2>

          {errors.submit && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm p-3 rounded-lg">
              {errors.submit}
            </div>
          )}

          {/* Name */}
          <div>
            <label htmlFor="customerName" className="block text-sm font-medium text-gray-700 mb-1">
              Nombre completo <span className="text-red-500">*</span>
            </label>
            <input
              id="customerName"
              type="text"
              autoComplete="name"
              value={formData.customerName}
              onChange={e => setFormData(prev => ({ ...prev, customerName: e.target.value }))}
              className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-black transition ${
                errors.customerName ? 'border-red-400 focus:ring-red-400' : 'border-gray-200'
              }`}
              placeholder="Juan Pérez"
            />
            {errors.customerName && (
              <p className="text-red-500 text-xs mt-1" role="alert">{errors.customerName}</p>
            )}
          </div>

          {/* Delivery option */}
          <div>
            <label htmlFor="deliveryOptionId" className="block text-sm font-medium text-gray-700 mb-1">
              Punto de entrega <span className="text-red-500">*</span>
            </label>

            {loadingDelivery ? (
              <div className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm text-gray-400">
                Cargando opciones...
              </div>
            ) : deliveryOptions.length === 0 ? (
              <div className="w-full px-4 py-3 border border-amber-200 bg-amber-50 rounded-lg text-sm text-amber-700">
                No hay opciones de entrega disponibles. Contactá al vendedor.
              </div>
            ) : (
              <div className="space-y-2">
                {deliveryOptions.map(opt => (
                  <label
                    key={opt.id}
                    className={`flex items-start gap-3 p-3.5 border-2 rounded-xl cursor-pointer transition ${
                      formData.deliveryOptionId === opt.id
                        ? 'border-black bg-gray-50'
                        : 'border-gray-200 hover:border-gray-400'
                    }`}
                  >
                    <input
                      type="radio"
                      name="deliveryOptionId"
                      value={opt.id}
                      checked={formData.deliveryOptionId === opt.id}
                      onChange={() => {
                        setFormData(prev => ({ ...prev, deliveryOptionId: opt.id }))
                        setErrors(prev => ({ ...prev, deliveryOptionId: undefined }))
                      }}
                      className="mt-0.5 accent-black"
                    />
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{opt.name}</p>
                      {opt.description && (
                        <p className="text-xs text-gray-500 mt-0.5">{opt.description}</p>
                      )}
                    </div>
                  </label>
                ))}
              </div>
            )}

            {errors.deliveryOptionId && (
              <p className="text-red-500 text-xs mt-1" role="alert">{errors.deliveryOptionId}</p>
            )}
          </div>

          {/* Notes */}
          <div>
            <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
              Notas adicionales{' '}
              <span className="text-gray-400 font-normal">(opcional)</span>
            </label>
            <textarea
              id="notes"
              rows={3}
              value={formData.notes}
              onChange={e => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black resize-none transition"
              placeholder="Instrucciones especiales, consultas..."
            />
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading || deliveryOptions.length === 0}
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
