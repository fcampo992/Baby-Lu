'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

// ─── Types ───────────────────────────────────────────────────────────────────

type OrderStatus = 'PENDING' | 'CONFIRMED' | 'DELIVERED' | 'CANCELLED'

interface OrderItem {
  id: string
  quantity: number
  unitPrice: number
  product: { id: string; title: string; imageUrl: string | null }
}

interface Order {
  id: string
  customerName: string
  address: string
  notes: string | null
  total: number
  status: OrderStatus
  createdAt: string
  user: { id: string; name: string; email: string } | null
  items: OrderItem[]
}

interface Pagination {
  page: number
  limit: number
  total: number
  pages: number
}

interface Summary {
  PENDING: number
  CONFIRMED: number
  DELIVERED: number
  CANCELLED: number
  total: number
}

// ─── Constants ───────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  OrderStatus | 'ALL',
  { label: string; color: string; badge: string; icon: string }
> = {
  ALL: {
    label: 'Todos',
    color: 'bg-gray-100 text-gray-700 hover:bg-gray-200',
    badge: 'bg-gray-200 text-gray-700',
    icon: '🗂️',
  },
  PENDING: {
    label: 'Pendiente',
    color: 'bg-yellow-50 text-yellow-700 hover:bg-yellow-100',
    badge: 'bg-yellow-100 text-yellow-800',
    icon: '⏳',
  },
  CONFIRMED: {
    label: 'Confirmado',
    color: 'bg-blue-50 text-blue-700 hover:bg-blue-100',
    badge: 'bg-blue-100 text-blue-800',
    icon: '✅',
  },
  DELIVERED: {
    label: 'Entregado',
    color: 'bg-green-50 text-green-700 hover:bg-green-100',
    badge: 'bg-green-100 text-green-800',
    icon: '📦',
  },
  CANCELLED: {
    label: 'Cancelado',
    color: 'bg-red-50 text-red-700 hover:bg-red-100',
    badge: 'bg-red-100 text-red-800',
    icon: '✕',
  },
}

const STATUS_KEYS = ['ALL', 'PENDING', 'CONFIRMED', 'DELIVERED', 'CANCELLED'] as const

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Intl.DateTimeFormat('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso))
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 2,
  }).format(amount)
}

// ─── StatusBadge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: OrderStatus }) {
  const cfg = STATUS_CONFIG[status]
  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${cfg.badge}`}
    >
      <span>{cfg.icon}</span>
      {cfg.label}
    </span>
  )
}

// ─── StatusSelect ─────────────────────────────────────────────────────────────

function StatusSelect({
  orderId,
  current,
  onUpdate,
}: {
  orderId: string
  current: OrderStatus
  onUpdate: (id: string, status: OrderStatus) => void
}) {
  const [loading, setLoading] = useState(false)

  async function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const next = e.target.value as OrderStatus
    if (next === current) return
    setLoading(true)
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: next }),
      })
      if (res.ok) {
        onUpdate(orderId, next)
      } else {
        alert('Error al actualizar el estado del pedido')
      }
    } catch {
      alert('Error de conexión')
    } finally {
      setLoading(false)
    }
  }

  return (
    <select
      value={current}
      onChange={handleChange}
      disabled={loading}
      className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400 disabled:opacity-50 cursor-pointer"
    >
      {(['PENDING', 'CONFIRMED', 'DELIVERED', 'CANCELLED'] as OrderStatus[]).map(
        (s) => (
          <option key={s} value={s}>
            {STATUS_CONFIG[s].icon} {STATUS_CONFIG[s].label}
          </option>
        )
      )}
    </select>
  )
}

// ─── OrderRow ─────────────────────────────────────────────────────────────────

function OrderRow({
  order,
  onStatusUpdate,
}: {
  order: Order
  onStatusUpdate: (id: string, status: OrderStatus) => void
}) {
  const [expanded, setExpanded] = useState(false)

  return (
    <>
      <tr
        className="hover:bg-gray-50 transition cursor-pointer select-none"
        onClick={() => setExpanded((v) => !v)}
      >
        {/* ID */}
        <td className="py-3 px-4 text-xs text-gray-400 font-mono">
          #{order.id.slice(-8).toUpperCase()}
        </td>

        {/* Customer */}
        <td className="py-3 px-4">
          <p className="text-sm font-medium text-gray-900">{order.customerName}</p>
          {order.user ? (
            <p className="text-xs text-gray-400">{order.user.email}</p>
          ) : (
            <p className="text-xs text-gray-300 italic">Invitado</p>
          )}
        </td>

        {/* Date */}
        <td className="py-3 px-4 text-xs text-gray-500 whitespace-nowrap">
          {formatDate(order.createdAt)}
        </td>

        {/* Items summary */}
        <td className="py-3 px-4 text-xs text-gray-500">
          {order.items.length} producto{order.items.length !== 1 ? 's' : ''}
        </td>

        {/* Total */}
        <td className="py-3 px-4 text-sm font-semibold text-gray-900 whitespace-nowrap">
          {formatCurrency(order.total)}
        </td>

        {/* Status */}
        <td className="py-3 px-4" onClick={(e) => e.stopPropagation()}>
          <StatusSelect
            orderId={order.id}
            current={order.status}
            onUpdate={onStatusUpdate}
          />
        </td>

        {/* Expand chevron */}
        <td className="py-3 px-4 text-right text-gray-300">
          <span className={`inline-block transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}>
            ▾
          </span>
        </td>
      </tr>

      {/* Expanded detail */}
      {expanded && (
        <tr className="bg-indigo-50/30">
          <td colSpan={7} className="px-6 py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Order detail */}
              <div className="space-y-3">
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Detalle del pedido
                </h4>
                <div className="space-y-2">
                  {order.items.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between bg-white rounded-lg px-4 py-2.5 border border-gray-100"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gray-100 rounded flex items-center justify-center text-lg">
                          {item.product.imageUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={item.product.imageUrl}
                              alt={item.product.title}
                              className="w-8 h-8 rounded object-cover"
                            />
                          ) : (
                            '📦'
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-800">
                            {item.product.title}
                          </p>
                          <p className="text-xs text-gray-400">
                            {item.quantity} × {formatCurrency(item.unitPrice)}
                          </p>
                        </div>
                      </div>
                      <span className="text-sm font-semibold text-gray-700">
                        {formatCurrency(item.unitPrice * item.quantity)}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Total row */}
                <div className="flex justify-between items-center px-4 py-2 bg-white rounded-lg border border-indigo-100">
                  <span className="text-sm font-semibold text-gray-700">Total</span>
                  <span className="text-base font-bold text-indigo-700">
                    {formatCurrency(order.total)}
                  </span>
                </div>
              </div>

              {/* Customer & delivery info */}
              <div className="space-y-3">
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Datos de entrega
                </h4>
                <div className="bg-white rounded-lg border border-gray-100 p-4 space-y-2.5 text-sm">
                  <div className="flex gap-2">
                    <span className="text-gray-400 w-20 shrink-0">Cliente</span>
                    <span className="font-medium text-gray-800">{order.customerName}</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-gray-400 w-20 shrink-0">Dirección</span>
                    <span className="text-gray-700">{order.address}</span>
                  </div>
                  {order.notes && (
                    <div className="flex gap-2">
                      <span className="text-gray-400 w-20 shrink-0">Notas</span>
                      <span className="text-gray-700 italic">{order.notes}</span>
                    </div>
                  )}
                  {order.user && (
                    <div className="flex gap-2">
                      <span className="text-gray-400 w-20 shrink-0">Cuenta</span>
                      <span className="text-gray-700">{order.user.email}</span>
                    </div>
                  )}
                  <div className="flex gap-2">
                    <span className="text-gray-400 w-20 shrink-0">Fecha</span>
                    <span className="text-gray-700">{formatDate(order.createdAt)}</span>
                  </div>
                  <div className="flex gap-2 items-center">
                    <span className="text-gray-400 w-20 shrink-0">Estado</span>
                    <StatusBadge status={order.status} />
                  </div>
                </div>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [pagination, setPagination] = useState<Pagination | null>(null)
  const [summary, setSummary] = useState<Summary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Filters
  const [activeStatus, setActiveStatus] = useState<string>('ALL')
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [page, setPage] = useState(1)

  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  const fetchOrders = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const params = new URLSearchParams()
      if (activeStatus !== 'ALL') params.set('status', activeStatus)
      if (search) params.set('search', search)
      if (from) params.set('from', from)
      if (to) params.set('to', to)
      params.set('page', String(page))
      params.set('limit', '20')

      const res = await fetch(`/api/orders/admin?${params.toString()}`)
      if (!res.ok) throw new Error('Error cargando pedidos')
      const data = await res.json()
      setOrders(data.orders)
      setPagination(data.pagination)
      setSummary(data.summary)
    } catch {
      setError('No se pudieron cargar los pedidos. Intentá de nuevo.')
    } finally {
      setLoading(false)
    }
  }, [activeStatus, search, from, to, page])

  useEffect(() => {
    fetchOrders()
  }, [fetchOrders])

  // Debounce search input
  function handleSearchChange(value: string) {
    setSearchInput(value)
    if (searchTimeout.current) clearTimeout(searchTimeout.current)
    searchTimeout.current = setTimeout(() => {
      setSearch(value)
      setPage(1)
    }, 400)
  }

  function handleStatusFilter(status: string) {
    setActiveStatus(status)
    setPage(1)
  }

  function handleStatusUpdate(id: string, status: OrderStatus) {
    setOrders((prev) =>
      prev.map((o) => (o.id === id ? { ...o, status } : o))
    )
    // Refresh summary after status change
    fetchOrders()
  }

  function handleDateChange(field: 'from' | 'to', value: string) {
    if (field === 'from') setFrom(value)
    else setTo(value)
    setPage(1)
  }

  function clearFilters() {
    setActiveStatus('ALL')
    setSearch('')
    setSearchInput('')
    setFrom('')
    setTo('')
    setPage(1)
  }

  const hasActiveFilters =
    activeStatus !== 'ALL' || search || from || to

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Pedidos</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            Gestioná y hacé seguimiento de todos los pedidos de la tienda
          </p>
        </div>
        <button
          onClick={fetchOrders}
          className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-600 text-sm rounded-lg hover:bg-gray-50 transition"
        >
          <span className={loading ? 'animate-spin inline-block' : ''}>↺</span>
          Actualizar
        </button>
      </div>

      {/* ── Summary cards ── */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {(['PENDING', 'CONFIRMED', 'DELIVERED', 'CANCELLED'] as OrderStatus[]).map(
            (s) => (
              <button
                key={s}
                onClick={() => handleStatusFilter(s)}
                className={`text-left rounded-xl border p-4 transition ${
                  activeStatus === s
                    ? 'border-indigo-400 ring-2 ring-indigo-200 bg-white'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xl">{STATUS_CONFIG[s].icon}</span>
                  <span
                    className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_CONFIG[s].badge}`}
                  >
                    {STATUS_CONFIG[s].label}
                  </span>
                </div>
                <p className="text-2xl font-bold text-gray-900">{summary[s]}</p>
                <p className="text-xs text-gray-400 mt-0.5">pedidos</p>
              </button>
            )
          )}
        </div>
      )}

      {/* ── Filters bar ── */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-4">
        {/* Status tabs */}
        <div className="flex flex-wrap gap-2">
          {STATUS_KEYS.map((s) => (
            <button
              key={s}
              onClick={() => handleStatusFilter(s)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition ${
                activeStatus === s
                  ? s === 'ALL'
                    ? 'bg-gray-800 text-white'
                    : `${STATUS_CONFIG[s].badge} ring-2 ring-offset-1 ring-current`
                  : STATUS_CONFIG[s].color
              }`}
            >
              {STATUS_CONFIG[s].icon} {STATUS_CONFIG[s].label}
              {summary && s !== 'ALL' && (
                <span className="ml-1 opacity-70">({summary[s as OrderStatus]})</span>
              )}
              {summary && s === 'ALL' && (
                <span className="ml-1 opacity-70">({summary.total})</span>
              )}
            </button>
          ))}
        </div>

        {/* Search + date range */}
        <div className="flex flex-wrap gap-3">
          <div className="flex-1 min-w-[200px] relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
            <input
              type="text"
              placeholder="Buscar por cliente, dirección o ID..."
              value={searchInput}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>

          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-500 whitespace-nowrap">Desde</label>
            <input
              type="date"
              value={from}
              onChange={(e) => handleDateChange('from', e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>

          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-500 whitespace-nowrap">Hasta</label>
            <input
              type="date"
              value={to}
              onChange={(e) => handleDateChange('to', e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>

          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="px-3 py-2 text-xs text-red-500 hover:text-red-700 border border-red-200 hover:border-red-300 rounded-lg transition"
            >
              ✕ Limpiar filtros
            </button>
          )}
        </div>
      </div>

      {/* ── Table ── */}
      {error ? (
        <div className="text-center py-12 bg-red-50 rounded-xl border border-red-100">
          <p className="text-red-500">{error}</p>
          <button
            onClick={fetchOrders}
            className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 transition"
          >
            Reintentar
          </button>
        </div>
      ) : loading ? (
        <div className="text-center py-16 text-gray-400">
          <div className="inline-block animate-spin text-3xl mb-3">↺</div>
          <p>Cargando pedidos...</p>
        </div>
      ) : orders.length === 0 ? (
        <div className="text-center py-16 bg-gray-50 rounded-xl border border-gray-100">
          <p className="text-4xl mb-3">🛒</p>
          <p className="text-gray-500 font-medium">No hay pedidos con los filtros aplicados</p>
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="mt-3 text-indigo-600 text-sm hover:underline"
            >
              Limpiar filtros
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      ID
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Cliente
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Fecha
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Ítems
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Total
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Estado
                    </th>
                    <th className="py-3 px-4 w-8" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {orders.map((order) => (
                    <OrderRow
                      key={order.id}
                      order={order}
                      onStatusUpdate={handleStatusUpdate}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* ── Pagination ── */}
          {pagination && pagination.pages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">
                Mostrando {(pagination.page - 1) * pagination.limit + 1}–
                {Math.min(pagination.page * pagination.limit, pagination.total)} de{' '}
                {pagination.total} pedidos
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={pagination.page <= 1}
                  className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
                >
                  ← Anterior
                </button>
                <span className="text-sm text-gray-600 px-2">
                  Página {pagination.page} de {pagination.pages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))}
                  disabled={pagination.page >= pagination.pages}
                  className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
                >
                  Siguiente →
                </button>
              </div>
            </div>
          )}

          {pagination && (
            <p className="text-xs text-gray-400 text-right">
              {pagination.total} pedido{pagination.total !== 1 ? 's' : ''} en total
            </p>
          )}
        </>
      )}
    </div>
  )
}
