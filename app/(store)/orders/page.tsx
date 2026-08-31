'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { buildWhatsAppURL } from '@/lib/whatsapp'

interface OrderItem {
  id: string
  productId: string
  quantity: number
  unitPrice: number
  product: {
    id: string
    title: string
  }
}

interface Order {
  id: string
  customerName: string
  address: string
  notes?: string | null
  total: number
  status: string
  createdAt: string
  items: OrderItem[]
}

const STATUS_LABELS: Record<string, { label: string; classes: string }> = {
  PENDING:   { label: 'Pendiente',  classes: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
  CONFIRMED: { label: 'Confirmado', classes: 'bg-blue-50 text-blue-700 border-blue-200'   },
  DELIVERED: { label: 'Entregado',  classes: 'bg-green-50 text-green-700 border-green-200' },
  CANCELLED: { label: 'Cancelado',  classes: 'bg-red-50 text-red-700 border-red-200'       },
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 2,
  }).format(amount)
}

function StatusBadge({ status }: { status: string }) {
  const config = STATUS_LABELS[status] ?? { label: status, classes: 'bg-gray-50 text-gray-700 border-gray-200' }
  return (
    <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${config.classes}`}>
      {config.label}
    </span>
  )
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState('')
  const [confirmCancelId, setConfirmCancelId] = useState<string | null>(null)
  const [cancellingId, setCancellingId] = useState<string | null>(null)
  const [cancelError, setCancelError] = useState<Record<string, string>>({})

  useEffect(() => {
    async function fetchOrders() {
      try {
        const res = await fetch('/api/orders/my')
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = await res.json()
        setOrders(data.orders || [])
      } catch {
        setFetchError('No se pudieron cargar tus pedidos. Intentá recargar la página.')
      } finally {
        setLoading(false)
      }
    }
    fetchOrders()
  }, [])

  async function handleCancelOrder(order: Order) {
    setCancellingId(order.id)
    setCancelError((prev) => ({ ...prev, [order.id]: '' }))
    try {
      const res = await fetch(`/api/orders/${order.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'CANCELLED' }),
      })

      if (res.ok) {
        // Update local state
        setOrders((prev) =>
          prev.map((o) => (o.id === order.id ? { ...o, status: 'CANCELLED' } : o))
        )
        setConfirmCancelId(null)

        // Send WhatsApp notification to admin
        try {
          const settingRes = await fetch('/api/settings/whatsapp_phone')
          let phone: string | null = null
          if (settingRes.ok) {
            const settingData = await settingRes.json()
            phone = settingData?.setting?.value ?? null
          }

          if (phone) {
            const message = `*Cancelación de pedido*\nEl cliente ${order.customerName} ha cancelado el pedido #${order.id}\nTotal: $${order.total.toFixed(2)}`
            const whatsappUrl = buildWhatsAppURL(phone, message)
            window.open(whatsappUrl, '_blank')
          }
        } catch {
          // WhatsApp notification failed silently — cancellation already succeeded
        }
      } else {
        const data = await res.json().catch(() => ({}))
        setCancelError((prev) => ({
          ...prev,
          [order.id]: data?.error || 'Error al cancelar el pedido',
        }))
        setConfirmCancelId(null)
      }
    } catch {
      setCancelError((prev) => ({ ...prev, [order.id]: 'Error de red al cancelar' }))
      setConfirmCancelId(null)
    } finally {
      setCancellingId(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-gray-400 text-sm">
        Cargando pedidos...
      </div>
    )
  }

  if (fetchError) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <p className="text-red-500 mb-4">{fetchError}</p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 transition"
        >
          Reintentar
        </button>
      </div>
    )
  }

  if (orders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="w-16 h-16 mb-6 rounded-full bg-gray-100 flex items-center justify-center">
          <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Aún no tienes pedidos</h2>
        <p className="text-gray-500 mb-8 max-w-sm">
          Cuando realices tu primera compra, aparecerá aquí con todos los detalles.
        </p>
        <Link
          href="/"
          className="px-6 py-3 bg-black text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition"
        >
          Ver catálogo
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Mis Pedidos</h1>
          <p className="text-gray-500 mt-1">
            {orders.length} {orders.length === 1 ? 'pedido' : 'pedidos'} en total
          </p>
        </div>
        <Link
          href="/"
          className="text-sm font-medium text-gray-600 hover:text-gray-900 transition"
        >
          ← Volver al catálogo
        </Link>
      </div>

      {/* Orders list */}
      <div className="space-y-4">
        {orders.map((order) => (
          <div
            key={order.id}
            className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm"
          >
            {/* Order header */}
            <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
              <div>
                <p className="text-sm text-gray-500">{formatDate(order.createdAt)}</p>
                <p className="text-xs text-gray-400 mt-0.5 font-mono">
                  #{order.id.slice(0, 8).toUpperCase()}
                </p>
              </div>
              <StatusBadge status={order.status} />
            </div>

            {/* Products */}
            <ul className="divide-y divide-gray-100 mb-4">
              {order.items.map((item) => (
                <li key={item.id} className="py-2.5 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-xs font-semibold text-gray-600">
                      {item.quantity}
                    </span>
                    <span className="text-sm text-gray-800 truncate">
                      {item.product.title}
                    </span>
                  </div>
                  <span className="flex-shrink-0 text-sm text-gray-500">
                    {formatCurrency(item.unitPrice * item.quantity)}
                  </span>
                </li>
              ))}
            </ul>

            {/* Order total */}
            <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
              <span className="text-sm text-gray-500">Total del pedido</span>
              <span className="text-lg font-bold text-gray-900">
                {formatCurrency(order.total)}
              </span>
            </div>

            {/* Feature 4: Botón de arrepentimiento (Ley 24.240) */}
            {order.status !== 'CANCELLED' && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                {cancelError[order.id] && (
                  <p className="text-red-500 text-xs mb-2">{cancelError[order.id]}</p>
                )}

                {confirmCancelId === order.id ? (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4 space-y-3">
                    <p className="text-sm text-red-800 font-medium">
                      ¿Estás seguro que querés cancelar este pedido? Esta acción no se puede deshacer.
                    </p>
                    <div className="flex gap-3">
                      <button
                        onClick={() => handleCancelOrder(order)}
                        disabled={cancellingId === order.id}
                        className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition disabled:opacity-50"
                      >
                        {cancellingId === order.id ? 'Cancelando...' : 'Sí, cancelar pedido'}
                      </button>
                      <button
                        onClick={() => setConfirmCancelId(null)}
                        className="px-4 py-2 bg-white border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition"
                      >
                        No, mantener pedido
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <button
                      onClick={() => setConfirmCancelId(order.id)}
                      className="px-4 py-2 bg-red-50 text-red-600 border border-red-200 text-sm font-medium rounded-lg hover:bg-red-100 transition"
                    >
                      Arrepentirme de esta compra
                    </button>
                    <p className="text-xs text-gray-400 mt-1">
                      Ejerciendo tu derecho de arrepentimiento según Ley 24.240
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
