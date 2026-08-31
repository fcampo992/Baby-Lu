'use client'

import { useEffect, useState, useRef } from 'react'
import Image from 'next/image'

interface Category {
  id: string
  name: string
}

interface Product {
  id: string
  title: string
  description: string
  price: number
  stock: number
  imageUrl?: string | null
  active: boolean
  isNew: boolean
  categoryId: string
  category: Category
}

interface StockRow {
  product: Product
  newStock: string
  saving: boolean
  saved: boolean
  error: string
}

function StockBadge({ stock }: { stock: number }) {
  if (stock === 0) {
    return (
      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700">
        Sin stock
      </span>
    )
  }
  if (stock <= 5) {
    return (
      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-700">
        Stock bajo ({stock})
      </span>
    )
  }
  return (
    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700">
      {stock} unidades
    </span>
  )
}

export default function AdminStockPage() {
  const [rows, setRows] = useState<StockRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [savingAll, setSavingAll] = useState(false)
  const hasPendingChanges = rows.some((r) => r.newStock !== String(r.product.stock))
  const initialStockRef = useRef<Record<string, number>>({})

  useEffect(() => {
    async function fetchProducts() {
      try {
        const res = await fetch('/api/products?activeOnly=false')
        if (res.ok) {
          const data = await res.json()
          const products: Product[] = data.products || []
          const initial: Record<string, number> = {}
          products.forEach((p) => { initial[p.id] = p.stock })
          initialStockRef.current = initial
          setRows(
            products.map((p) => ({
              product: p,
              newStock: String(p.stock),
              saving: false,
              saved: false,
              error: '',
            }))
          )
        }
      } catch {
        // ignore
      } finally {
        setLoading(false)
      }
    }
    fetchProducts()
  }, [])

  function handleStockChange(productId: string, value: string) {
    setRows((prev) =>
      prev.map((r) =>
        r.product.id === productId
          ? { ...r, newStock: value, saved: false, error: '' }
          : r
      )
    )
  }

  async function updateProductStock(row: StockRow): Promise<boolean> {
    const newStockNum = parseInt(row.newStock, 10)
    if (isNaN(newStockNum) || newStockNum < 0) {
      setRows((prev) =>
        prev.map((r) =>
          r.product.id === row.product.id
            ? { ...r, error: 'Stock inválido (debe ser un número ≥ 0)', saving: false }
            : r
        )
      )
      return false
    }

    setRows((prev) =>
      prev.map((r) =>
        r.product.id === row.product.id ? { ...r, saving: true, error: '' } : r
      )
    )

    try {
      const fd = new FormData()
      fd.append('title', row.product.title)
      fd.append('description', row.product.description ?? '')
      fd.append('price', String(row.product.price))
      fd.append('categoryId', row.product.categoryId)
      fd.append('stock', String(newStockNum))
      fd.append('active', String(row.product.active))
      fd.append('isNew', String(row.product.isNew ?? false))
      if (row.product.imageUrl) {
        fd.append('imageUrl', row.product.imageUrl)
      }

      const res = await fetch(`/api/products/${row.product.id}`, {
        method: 'PUT',
        body: fd,
      })

      if (res.ok) {
        const data = await res.json()
        const updatedProduct: Product = data.product
        setRows((prev) =>
          prev.map((r) =>
            r.product.id === row.product.id
              ? {
                  ...r,
                  product: updatedProduct,
                  newStock: String(updatedProduct.stock),
                  saving: false,
                  saved: true,
                  error: '',
                }
              : r
          )
        )
        initialStockRef.current[row.product.id] = updatedProduct.stock
        // Clear "saved" after 3s
        setTimeout(() => {
          setRows((prev) =>
            prev.map((r) =>
              r.product.id === row.product.id ? { ...r, saved: false } : r
            )
          )
        }, 3000)
        return true
      } else {
        const errData = await res.json().catch(() => ({}))
        const msg =
          errData?.fields?.stock ||
          errData?.error ||
          'Error al actualizar'
        setRows((prev) =>
          prev.map((r) =>
            r.product.id === row.product.id
              ? { ...r, saving: false, error: msg }
              : r
          )
        )
        return false
      }
    } catch {
      setRows((prev) =>
        prev.map((r) =>
          r.product.id === row.product.id
            ? { ...r, saving: false, error: 'Error de red' }
            : r
        )
      )
      return false
    }
  }

  async function handleSaveAll() {
    setSavingAll(true)
    const pending = rows.filter(
      (r) => r.newStock !== String(initialStockRef.current[r.product.id])
    )
    for (const row of pending) {
      await updateProductStock(row)
    }
    setSavingAll(false)
  }

  const filteredRows = rows.filter((r) =>
    r.product.title.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestión de Stock</h1>
          <p className="text-gray-500 text-sm mt-1">
            Actualiza el stock disponible por producto
          </p>
        </div>
        {hasPendingChanges && (
          <button
            onClick={handleSaveAll}
            disabled={savingAll}
            className="px-5 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition disabled:opacity-50"
          >
            {savingAll ? 'Guardando...' : '💾 Guardar todos'}
          </button>
        )}
      </div>

      {/* Search */}
      <div>
        <input
          type="text"
          placeholder="Buscar producto por nombre..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-sm px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-gray-400 text-sm">Cargando productos...</div>
        ) : filteredRows.length === 0 ? (
          <div className="p-10 text-center text-gray-400 text-sm">
            {search ? 'No se encontraron productos con ese nombre.' : 'No hay productos.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide w-14">
                    Img
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Producto
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">
                    Categoría
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Stock actual
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Nuevo stock
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Acción
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredRows.map((row) => (
                  <tr key={row.product.id} className="hover:bg-gray-50">
                    {/* Thumbnail */}
                    <td className="px-4 py-3">
                      <div className="relative w-10 h-10 rounded overflow-hidden bg-gray-100 flex-shrink-0">
                        {row.product.imageUrl ? (
                          <Image
                            src={row.product.imageUrl}
                            alt={row.product.title}
                            fill
                            className="object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-300 text-lg">
                            📦
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Title */}
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900 truncate max-w-[200px]">
                        {row.product.title}
                      </p>
                      {!row.product.active && (
                        <span className="text-xs text-gray-400">Inactivo</span>
                      )}
                    </td>

                    {/* Category */}
                    <td className="px-4 py-3 text-gray-500 hidden md:table-cell">
                      {row.product.category.name}
                    </td>

                    {/* Current stock badge */}
                    <td className="px-4 py-3">
                      <StockBadge stock={row.product.stock} />
                    </td>

                    {/* New stock input */}
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        min="0"
                        value={row.newStock}
                        onChange={(e) =>
                          handleStockChange(row.product.id, e.target.value)
                        }
                        className="w-24 px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                      {row.error && (
                        <p className="text-red-500 text-xs mt-1">{row.error}</p>
                      )}
                      {row.saved && (
                        <p className="text-green-600 text-xs mt-1">✓ Guardado</p>
                      )}
                    </td>

                    {/* Action button */}
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => updateProductStock(row)}
                        disabled={
                          row.saving ||
                          row.newStock === String(row.product.stock)
                        }
                        className="px-3 py-1.5 bg-indigo-600 text-white text-xs font-medium rounded-lg hover:bg-indigo-700 transition disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        {row.saving ? '...' : 'Actualizar'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
