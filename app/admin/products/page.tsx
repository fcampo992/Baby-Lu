'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import type { ProductSummary } from '@/lib/filters'

export default function AdminProductsPage() {
  const [products, setProducts] = useState<ProductSummary[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchProducts() {
      try {
        const res = await fetch('/api/products?activeOnly=false')
        if (!res.ok) throw new Error('Error loading products')
        const data = await res.json()
        setProducts(data.products ?? [])
      } catch (err) {
        console.error('Error loading products:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchProducts()
  }, [])

  async function handleDelete(productId: string) {
    if (!window.confirm('¿Estás seguro de eliminar este producto?')) return

    try {
      const res = await fetch(`/api/products/${productId}`, { method: 'DELETE' })
      if (res.ok || res.status === 204) {
        setProducts((prev) => prev.filter((p) => p.id !== productId))
      } else {
        alert('Error al eliminar el producto')
      }
    } catch (err) {
      console.error('Error deleting product:', err)
      alert('Error al eliminar el producto')
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Productos</h1>
        <Link
          href="/admin/products/new"
          className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
        >
          + Añadir Producto
        </Link>
      </div>

      {/* Content */}
      {loading ? (
        <div className="text-center py-12 text-gray-400">Cargando productos...</div>
      ) : products.length === 0 ? (
        <div className="text-center py-16 bg-gray-50 rounded-lg border border-gray-100">
          <p className="text-xl text-gray-400 mb-4">No hay productos en el sistema.</p>
          <Link
            href="/admin/products/new"
            className="inline-flex items-center px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
          >
            Crear primer producto
          </Link>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="w-full border-collapse">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Título</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Precio</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Categoría</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Stock</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Estado</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-gray-700">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {products.map((product) => (
                  <tr key={product.id} className="hover:bg-gray-50 transition">
                    <td className="py-3 px-4 text-sm">{product.title}</td>
                    <td className="py-3 px-4 text-sm font-medium">
                      ${(product.price ?? 0).toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-sm">
                      {product.category?.name ?? 'Sin categoría'}
                    </td>
                    <td className="py-3 px-4 text-sm">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          product.stock > 0
                            ? 'bg-green-100 text-green-700'
                            : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {product.stock} unidades
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          product.active
                            ? 'bg-green-100 text-green-700'
                            : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {product.active ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm">
                      <div className="flex gap-3 justify-end">
                        <Link
                          href={`/admin/products/${product.id}/edit`}
                          className="text-blue-600 hover:underline text-sm"
                        >
                          Editar
                        </Link>
                        <button
                          onClick={() => handleDelete(product.id)}
                          className="text-red-600 hover:text-red-800 text-sm"
                        >
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="text-gray-500 text-sm">
            Mostrando {products.length} producto{products.length !== 1 ? 's' : ''}
          </p>
        </>
      )}
    </div>
  )
}
