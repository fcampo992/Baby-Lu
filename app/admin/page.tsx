import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { verifyJWT } from '@/lib/auth'
import Link from 'next/link'

export default async function AdminDashboard() {
  // Defense-in-depth: verify auth even though middleware already guards /admin/*
  const token = (await cookies()).get('token')?.value
  if (!token) redirect('/admin/login')
  const payload = await verifyJWT(token)
  if (!payload || payload.role !== 'ADMIN') redirect('/admin/login')

  const [productCount, orderCount, adminCount, pendingOrderCount] = await Promise.all([
    prisma.product.count(),
    prisma.order.count(),
    prisma.user.count({ where: { role: 'ADMIN' } }),
    prisma.order.count({ where: { status: 'PENDING' } }),
  ])

  const stats = [
    {
      label: 'Productos',
      value: productCount,
      icon: '📦',
      href: '/admin/products',
      color: 'bg-blue-50 text-blue-600',
    },
    {
      label: 'Pedidos totales',
      value: orderCount,
      icon: '🛒',
      href: '/admin/orders',
      color: 'bg-green-50 text-green-600',
    },
    {
      label: 'Pedidos pendientes',
      value: pendingOrderCount,
      icon: '⏳',
      href: '/admin/orders',
      color: 'bg-yellow-50 text-yellow-600',
    },
    {
      label: 'Administradores',
      value: adminCount,
      icon: '👥',
      href: '/admin/admins',
      color: 'bg-purple-50 text-purple-600',
    },
  ]

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">
          Bienvenido, <span className="font-medium">{payload.name}</span>
        </p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {stats.map((stat) => (
          <Link
            key={stat.label}
            href={stat.href}
            className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 flex items-center gap-4 hover:shadow-md transition"
          >
            <div className={`w-12 h-12 rounded-lg flex items-center justify-center text-2xl ${stat.color}`}>
              {stat.icon}
            </div>
            <div>
              <p className="text-sm text-gray-500">{stat.label}</p>
              <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
            </div>
          </Link>
        ))}
      </div>

      {/* Quick actions */}
      <div>
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
          Acciones rápidas
        </h2>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/admin/products/new"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition"
          >
            + Nuevo producto
          </Link>
          <Link
            href="/admin/orders"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-white border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition"
          >
            Ver pedidos
          </Link>
          <Link
            href="/admin/products"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-white border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition"
          >
            Ver productos
          </Link>
          <Link
            href="/admin/settings"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-white border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition"
          >
            Configuración
          </Link>
        </div>
      </div>
    </div>
  )
}
