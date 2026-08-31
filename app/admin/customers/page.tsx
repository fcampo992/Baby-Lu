'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface CustomerSummary {
  id: string
  name: string
  email: string
  createdAt: string
  _count: { orders: number }
}

interface Pagination {
  page: number
  limit: number
  total: number
  pages: number
}

interface OrderItem {
  id: string
  quantity: number
  unitPrice: number
  product: { id: string; title: string; imageUrl: string | null }
}

type OrderStatus = 'PENDING' | 'CONFIRMED' | 'DELIVERED' | 'CANCELLED'

interface Order {
  id: string
  customerName: string
  address: string
  notes: string | null
  total: number
  status: OrderStatus
  createdAt: string
  items: OrderItem[]
}

interface CustomerDetail {
  id: string
  name: string
  email: string
  createdAt: string
  orders: Order[]
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<OrderStatus, { label: string; badge: string; icon: string }> = {
  PENDING: {
    label: 'Pendiente',
    badge: 'bg-yellow-100 text-yellow-800',
    icon: '⏳',
  },
  CONFIRMED: {
    label: 'Confirmado',
    badge: 'bg-blue-100 text-blue-800',
    icon: '✅',
  },
  DELIVERED: {
    label: 'Entregado',
    badge: 'bg-green-100 text-green-800',
    icon: '📦',
  },
  CANCELLED: {
    label: 'Cancelado',
    badge: 'bg-red-100 text-red-800',
    icon: '✕',
  },
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 2,
  }).format(amount)
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-AR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

function formatDateTime(iso: string) {
  return new Intl.DateTimeFormat('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso))
}

function calcTotalSpent(orders: Order[]) {
  return orders.reduce((sum, o) => sum + o.total, 0)
}

// ─── StatusBadge ──────────────────────────────────────────────────────────────

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

// ─── SkeletonRows ─────────────────────────────────────────────────────────────

function SkeletonRows() {
  return (
    <>
      {Array.from({ length: 8 }).map((_, i) => (
        <tr key={i} className="animate-pulse">
          <td className="py-3 px-4">
            <div className="h-4 bg-gray-200 rounded w-32" />
            <div className="h-3 bg-gray-100 rounded w-44 mt-1.5" />
          </td>
          <td className="py-3 px-4">
            <div className="h-4 bg-gray-200 rounded w-48" />
          </td>
          <td className="py-3 px-4">
            <div className="h-4 bg-gray-200 rounded w-28" />
          </td>
          <td className="py-3 px-4">
            <div className="h-4 bg-gray-200 rounded w-10" />
          </td>
          <td className="py-3 px-4">
            <div className="h-4 bg-gray-200 rounded w-24" />
          </td>
          <td className="py-3 px-4">
            <div className="h-7 bg-gray-200 rounded w-20" />
          </td>
        </tr>
      ))}
    </>
  )
}

// ─── OrderItemRow ─────────────────────────────────────────────────────────────

function OrderItemRow({ item }: { item: OrderItem }) {
  return (
    <div className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-gray-100">
      <div className="flex items-center gap-2.5">
        <div className="w-7 h-7 bg-gray-100 rounded flex items-center justify-center shrink-0">
          {item.product.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={item.product.imageUrl}
              alt={item.product.title}
              className="w-7 h-7 rounded object-cover"
            />
          ) : (
            <span className="text-sm">📦</span>
          )}
        </div>
        <div>
          <p className="text-xs font-medium text-gray-800 leading-tight">
            {item.product.title}
          </p>
          <p className="text-xs text-gray-400">
            {item.quantity} × {formatCurrency(item.unitPrice)}
          </p>
        </div>
      </div>
      <span className="text-xs font-semibold text-gray-700 shrink-0 ml-2">
        {formatCurrency(item.unitPrice * item.quantity)}
      </span>
    </div>
  )
}

// ─── OrderAccordion ───────────────────────────────────────────────────────────

function OrderAccordion({ order }: { order: Order }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="border border-gray-100 rounded-xl overflow-hidden">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 bg-white hover:bg-gray-50 transition text-left"
      >
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-xs font-mono text-gray-400 shrink-0">
            #{order.id.slice(-8).toUpperCase()}
          </span>
          <StatusBadge status={order.status} />
          <span className="text-xs text-gray-400 hidden sm:block shrink-0">
            {formatDateTime(order.createdAt)}
          </span>
        </div>
        <div className="flex items-center gap-3 shrink-0 ml-3">
          <span className="text-sm font-bold text-gray-900">
            {formatCurrency(order.total)}
          </span>
          <span
            className={`text-gray-300 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
          >
            ▾
          </span>
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 pt-2 bg-indigo-50/20 border-t border-gray-100 space-y-2">
          {/* Date on small screens */}
          <p className="text-xs text-gray-400 sm:hidden">{formatDateTime(order.createdAt)}</p>

          {order.items.map((item) => (
            <OrderItemRow key={item.id} item={item} />
          ))}

          {/* Delivery info */}
          <div className="bg-white rounded-lg border border-gray-100 px-3 py-2.5 mt-3 space-y-1.5 text-xs">
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
          </div>
        </div>
      )}
    </div>
  )
}

// ─── CustomerDrawer ───────────────────────────────────────────────────────────

function CustomerDrawer({
  customerId,
  onClose,
}: {
  customerId: string
  onClose: () => void
}) {
  const [customer, setCustomer] = useState<CustomerDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    setLoading(true)
    setError('')
    setCustomer(null)

    fetch(`/api/customers/${customerId}`)
      .then((res) => {
        if (!res.ok) throw new Error('Error cargando el cliente')
        return res.json() as Promise<{ customer: CustomerDetail }>
      })
      .then((data) => setCustomer(data.customer))
      .catch(() => setError('No se pudo cargar el perfil del cliente.'))
      .finally(() => setLoading(false))
  }, [customerId])

  // Close on Escape
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose])

  const totalSpent = customer ? calcTotalSpent(customer.orders) : 0

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 z-40 transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer panel */}
      <div className="fixed inset-y-0 right-0 w-full max-w-lg bg-white shadow-2xl z-50 flex flex-col">
        {/* Drawer header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
          <h2 className="text-lg font-bold text-gray-900">Perfil del cliente</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition"
            aria-label="Cerrar panel"
          >
            ✕
          </button>
        </div>

        {/* Drawer body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading && (
            <div className="space-y-4 animate-pulse">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-gray-200 rounded-full" />
                <div className="space-y-2 flex-1">
                  <div className="h-5 bg-gray-200 rounded w-40" />
                  <div className="h-4 bg-gray-100 rounded w-52" />
                </div>
              </div>
              <div className="h-px bg-gray-100" />
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-16 bg-gray-100 rounded-xl" />
              ))}
            </div>
          )}

          {error && (
            <div className="text-center py-10">
              <p className="text-4xl mb-3">⚠️</p>
              <p className="text-red-500 text-sm">{error}</p>
              <button
                onClick={() => {
                  setLoading(true)
                  setError('')
                  fetch(`/api/customers/${customerId}`)
                    .then((res) => {
                      if (!res.ok) throw new Error()
                      return res.json() as Promise<{ customer: CustomerDetail }>
                    })
                    .then((data) => setCustomer(data.customer))
                    .catch(() => setError('No se pudo cargar el perfil del cliente.'))
                    .finally(() => setLoading(false))
                }}
                className="mt-3 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 transition"
              >
                Reintentar
              </button>
            </div>
          )}

          {customer && (
            <>
              {/* Customer info card */}
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-full bg-indigo-100 flex items-center justify-center text-2xl shrink-0">
                  👤
                </div>
                <div className="min-w-0">
                  <h3 className="text-xl font-bold text-gray-900 truncate">{customer.name}</h3>
                  <p className="text-sm text-gray-500 truncate">{customer.email}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Registrado el {formatDate(customer.createdAt)}
                  </p>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-indigo-50 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-indigo-700">{customer.orders.length}</p>
                  <p className="text-xs text-indigo-500 mt-0.5">
                    {customer.orders.length === 1 ? 'Pedido' : 'Pedidos'}
                  </p>
                </div>
                <div className="bg-green-50 rounded-xl p-4 text-center">
                  <p className="text-lg font-bold text-green-700 leading-tight">
                    {formatCurrency(totalSpent)}
                  </p>
                  <p className="text-xs text-green-500 mt-0.5">Total gastado</p>
                </div>
              </div>

              <div className="h-px bg-gray-100" />

              {/* Orders list */}
              <div>
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                  Historial de pedidos
                </h4>

                {customer.orders.length === 0 ? (
                  <div className="text-center py-8 bg-gray-50 rounded-xl border border-gray-100">
                    <p className="text-3xl mb-2">🛒</p>
                    <p className="text-sm text-gray-400">Aún no realizó pedidos</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {customer.orders.map((order) => (
                      <OrderAccordion key={order.id} order={order} />
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminCustomersPage() {
  const [customers, setCustomers] = useState<CustomerSummary[]>([])
  const [pagination, setPagination] = useState<Pagination | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [page, setPage] = useState(1)

  const [selectedId, setSelectedId] = useState<string | null>(null)

  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Pre-compute total spent for each customer from the list — not available here,
  // so we display it only in the drawer. The list shows order count instead.

  const fetchCustomers = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      params.set('page', String(page))
      params.set('limit', '20')

      const res = await fetch(`/api/customers?${params.toString()}`)
      if (!res.ok) throw new Error('Error cargando clientes')
      const data = await res.json() as { customers: CustomerSummary[]; pagination: Pagination }
      setCustomers(data.customers)
      setPagination(data.pagination)
    } catch {
      setError('No se pudieron cargar los clientes. Intentá de nuevo.')
    } finally {
      setLoading(false)
    }
  }, [search, page])

  useEffect(() => {
    fetchCustomers()
  }, [fetchCustomers])

  function handleSearchChange(value: string) {
    setSearchInput(value)
    if (searchTimeout.current) clearTimeout(searchTimeout.current)
    searchTimeout.current = setTimeout(() => {
      setSearch(value)
      setPage(1)
    }, 400)
  }

  function handleCloseDrawer() {
    setSelectedId(null)
  }

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Clientes</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            Consultá y analizá la base de clientes registrados en la tienda
          </p>
        </div>
        <button
          onClick={fetchCustomers}
          className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-600 text-sm rounded-lg hover:bg-gray-50 transition"
        >
          <span className={loading ? 'animate-spin inline-block' : ''}>↺</span>
          Actualizar
        </button>
      </div>

      {/* ── Search bar ── */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="relative max-w-md">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
          <input
            type="text"
            placeholder="Buscar por nombre o email..."
            value={searchInput}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
        </div>
      </div>

      {/* ── Table ── */}
      {error ? (
        <div className="text-center py-12 bg-red-50 rounded-xl border border-red-100">
          <p className="text-red-500">{error}</p>
          <button
            onClick={fetchCustomers}
            className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 transition"
          >
            Reintentar
          </button>
        </div>
      ) : (
        <>
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Nombre
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Fecha de registro
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Pedidos
                    </th>
                    <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {loading ? (
                    <SkeletonRows />
                  ) : customers.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-16 text-center">
                        <p className="text-4xl mb-3">👥</p>
                        <p className="text-gray-500 font-medium">
                          {search
                            ? 'No se encontraron clientes con esa búsqueda'
                            : 'Aún no hay clientes registrados'}
                        </p>
                        {search && (
                          <button
                            onClick={() => {
                              setSearchInput('')
                              setSearch('')
                              setPage(1)
                            }}
                            className="mt-3 text-indigo-600 text-sm hover:underline"
                          >
                            Limpiar búsqueda
                          </button>
                        )}
                      </td>
                    </tr>
                  ) : (
                    customers.map((customer) => (
                      <tr key={customer.id} className="hover:bg-gray-50 transition">
                        {/* Nombre */}
                        <td className="py-3 px-4">
                          <p className="text-sm font-medium text-gray-900">{customer.name}</p>
                        </td>

                        {/* Email */}
                        <td className="py-3 px-4">
                          <p className="text-sm text-gray-600">{customer.email}</p>
                        </td>

                        {/* Fecha de registro */}
                        <td className="py-3 px-4 text-sm text-gray-500 whitespace-nowrap">
                          {formatDate(customer.createdAt)}
                        </td>

                        {/* Total de pedidos */}
                        <td className="py-3 px-4">
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700">
                            {customer._count.orders} pedido{customer._count.orders !== 1 ? 's' : ''}
                          </span>
                        </td>

                        {/* Acciones */}
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => setSelectedId(customer.id)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-indigo-600 border border-indigo-200 rounded-lg hover:bg-indigo-50 transition"
                          >
                            Ver perfil
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* ── Pagination ── */}
          {pagination && !loading && pagination.pages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">
                Mostrando {(pagination.page - 1) * pagination.limit + 1}–
                {Math.min(pagination.page * pagination.limit, pagination.total)} de{' '}
                {pagination.total} clientes
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

          {pagination && !loading && (
            <p className="text-xs text-gray-400 text-right">
              {pagination.total} cliente{pagination.total !== 1 ? 's' : ''} en total
            </p>
          )}
        </>
      )}

      {/* ── Customer Drawer ── */}
      {selectedId && (
        <CustomerDrawer customerId={selectedId} onClose={handleCloseDrawer} />
      )}
    </div>
  )
}
