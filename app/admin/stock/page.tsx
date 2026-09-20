'use client'

import { useEffect, useState, useRef } from 'react'
import Image from 'next/image'

interface Category {
  id: string
  name: string
}

interface ProductVariant {
  id: string
  size: string | null
  color: string | null
  stock: number
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
  variants?: ProductVariant[]
}

// ── Stock badge ───────────────────────────────────────────────────────────────

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

// ── Variant label helper ──────────────────────────────────────────────────────

function variantLabel(v: ProductVariant): string {
  const parts = [v.size, v.color].filter(Boolean)
  return parts.length > 0 ? parts.join(' / ') : 'Sin nombre'
}

// ── Variant stock row ─────────────────────────────────────────────────────────

interface VariantStockRowState {
  variant: ProductVariant
  newStock: string
  saving: boolean
  saved: boolean
  error: string
}

function VariantStockRow({
  row,
  productId,
  onChange,
}: {
  row: VariantStockRowState
  productId: string
  onChange: (variantId: string, updated: Partial<VariantStockRowState>) => void
}) {
  async function handleSave() {
    const num = parseInt(row.newStock, 10)
    if (isNaN(num) || num < 0) {
      onChange(row.variant.id, { error: 'Stock inválido (debe ser >= 0)' })
      return
    }

    onChange(row.variant.id, { saving: true, error: '' })
    try {
      const res = await fetch(`/api/products/${productId}/variants/${row.variant.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stock: num }),
      })
      if (res.ok) {
        const data = await res.json()
        onChange(row.variant.id, {
          variant: data.variant,
          newStock: String(data.variant.stock),
          saving: false,
          saved: true,
          error: '',
        })
        setTimeout(() => onChange(row.variant.id, { saved: false }), 2500)
      } else {
        const data = await res.json().catch(() => ({}))
        onChange(row.variant.id, { saving: false, error: data.error ?? 'Error' })
      }
    } catch {
      onChange(row.variant.id, { saving: false, error: 'Error de red' })
    }
  }

  const changed = row.newStock !== String(row.variant.stock)

  return (
    <div className="flex items-center gap-3 pl-14 py-2 border-t border-gray-50">
      {/* Variant label */}
      <span className="text-sm text-gray-600 flex-1 min-w-0 truncate">
        <span className="text-xs bg-gray-100 text-gray-500 rounded px-1.5 py-0.5 mr-1.5 font-mono">
          {row.variant.size ?? '—'} / {row.variant.color ?? '—'}
        </span>
        <StockBadge stock={row.variant.stock} />
      </span>

      {/* Input */}
      <input
        type="number"
        min="0"
        value={row.newStock}
        onChange={e => onChange(row.variant.id, { newStock: e.target.value, saved: false, error: '' })}
        className="w-20 px-2.5 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
      />

      {/* Save btn */}
      <button
        onClick={handleSave}
        disabled={row.saving || !changed}
        className="px-3 py-1.5 bg-indigo-600 text-white text-xs font-medium rounded-lg hover:bg-indigo-700 transition disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {row.saving ? '...' : '💾'}
      </button>

      {/* Feedback */}
      {row.error && <p className="text-xs text-red-600 w-24">{row.error}</p>}
      {row.saved && <p className="text-xs text-green-600">✓</p>}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

interface StockRow {
  product: Product
  newStock: string
  saving: boolean
  saved: boolean
  error: string
  expanded: boolean
  variantRows: VariantStockRowState[]
}

export default function AdminStockPage() {
  const [rows, setRows] = useState<StockRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [savingAll, setSavingAll] = useState(false)
  const initialStockRef = useRef<Record<string, number>>({})

  useEffect(() => {
    async function fetchProducts() {
      try {
        const res = await fetch('/api/products?activeOnly=false')
        if (res.ok) {
          const data = await res.json()
          const products: Product[] = data.products || []
          const initial: Record<string, number> = {}
          products.forEach(p => { initial[p.id] = p.stock })
          initialStockRef.current = initial
          setRows(
            products.map(p => ({
              product: p,
              newStock: String(p.stock),
              saving: false,
              saved: false,
              error: '',
              expanded: false,
              variantRows: (p.variants ?? []).map(v => ({
                variant: v,
                newStock: String(v.stock),
                saving: false,
                saved: false,
                error: '',
              })),
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

  // ── Product-level stock update ──────────────────────────────────────────────

  function handleProductStockChange(productId: string, value: string) {
    setRows(prev =>
      prev.map(r =>
        r.product.id === productId
          ? { ...r, newStock: value, saved: false, error: '' }
          : r
      )
    )
  }

  async function updateProductStock(row: StockRow): Promise<boolean> {
    const num = parseInt(row.newStock, 10)
    if (isNaN(num) || num < 0) {
      setRows(prev =>
        prev.map(r =>
          r.product.id === row.product.id
            ? { ...r, error: 'Stock inválido (debe ser >= 0)', saving: false }
            : r
        )
      )
      return false
    }

    setRows(prev =>
      prev.map(r =>
        r.product.id === row.product.id ? { ...r, saving: true, error: '' } : r
      )
    )

    try {
      const fd = new FormData()
      fd.append('title', row.product.title)
      fd.append('description', row.product.description ?? '')
      fd.append('price', String(row.product.price))
      fd.append('categoryId', row.product.categoryId)
      fd.append('stock', String(num))
      fd.append('active', String(row.product.active))
      fd.append('isNew', String(row.product.isNew ?? false))
      if (row.product.imageUrl) fd.append('imageUrl', row.product.imageUrl)

      const res = await fetch(`/api/products/${row.product.id}`, { method: 'PUT', body: fd })

      if (res.ok) {
        const data = await res.json()
        const updated: Product = data.product
        setRows(prev =>
          prev.map(r =>
            r.product.id === row.product.id
              ? { ...r, product: { ...r.product, stock: updated.stock }, newStock: String(updated.stock), saving: false, saved: true, error: '' }
              : r
          )
        )
        initialStockRef.current[row.product.id] = updated.stock
        setTimeout(() => {
          setRows(prev =>
            prev.map(r => r.product.id === row.product.id ? { ...r, saved: false } : r)
          )
        }, 2500)
        return true
      } else {
        const errData = await res.json().catch(() => ({}))
        setRows(prev =>
          prev.map(r =>
            r.product.id === row.product.id
              ? { ...r, saving: false, error: errData?.fields?.stock ?? errData?.error ?? 'Error' }
              : r
          )
        )
        return false
      }
    } catch {
      setRows(prev =>
        prev.map(r =>
          r.product.id === row.product.id ? { ...r, saving: false, error: 'Error de red' } : r
        )
      )
      return false
    }
  }

  async function handleSaveAll() {
    setSavingAll(true)
    const pending = rows.filter(
      r =>
        r.product.variants && r.product.variants.length > 0
          ? false // products with variants: stock managed per-variant
          : r.newStock !== String(initialStockRef.current[r.product.id])
    )
    for (const row of pending) {
      await updateProductStock(row)
    }
    setSavingAll(false)
  }

  // ── Variant stock update ────────────────────────────────────────────────────

  function handleVariantChange(
    productId: string,
    variantId: string,
    updated: Partial<VariantStockRowState>
  ) {
    setRows(prev =>
      prev.map(r =>
        r.product.id === productId
          ? {
              ...r,
              variantRows: r.variantRows.map(vr =>
                vr.variant.id === variantId ? { ...vr, ...updated } : vr
              ),
            }
          : r
      )
    )
  }

  // ── Computed ────────────────────────────────────────────────────────────────

  const filteredRows = rows.filter(r =>
    r.product.title.toLowerCase().includes(search.toLowerCase())
  )

  const hasPendingChanges = rows.some(r => {
    if (r.product.variants && r.product.variants.length > 0) return false
    return r.newStock !== String(initialStockRef.current[r.product.id])
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestión de Stock</h1>
          <p className="text-gray-500 text-sm mt-1">
            Actualizá el stock por producto o por variante (talle / color)
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
      <input
        type="text"
        placeholder="Buscar producto por nombre..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        className="w-full max-w-sm px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
      />

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-gray-400 text-sm">Cargando productos...</div>
        ) : filteredRows.length === 0 ? (
          <div className="p-10 text-center text-gray-400 text-sm">
            {search ? 'No se encontraron productos.' : 'No hay productos.'}
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredRows.map(row => {
              const hasVariants = row.product.variants && row.product.variants.length > 0
              const totalVariantStock = hasVariants
                ? row.product.variants!.reduce((s, v) => s + v.stock, 0)
                : null

              return (
                <div key={row.product.id}>
                  {/* Product row */}
                  <div className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50">
                    {/* Thumbnail */}
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

                    {/* Title + category */}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate text-sm">{row.product.title}</p>
                      <p className="text-xs text-gray-400">{row.product.category.name}</p>
                    </div>

                    {hasVariants ? (
                      /* Variants summary + expand toggle */
                      <>
                        <div className="flex items-center gap-2">
                          <StockBadge stock={totalVariantStock!} />
                          <span className="text-xs text-gray-400">
                            {row.product.variants!.length} variante{row.product.variants!.length !== 1 ? 's' : ''}
                          </span>
                        </div>
                        <button
                          onClick={() =>
                            setRows(prev =>
                              prev.map(r =>
                                r.product.id === row.product.id
                                  ? { ...r, expanded: !r.expanded }
                                  : r
                              )
                            )
                          }
                          className="px-3 py-1.5 text-xs font-medium text-indigo-600 border border-indigo-200 rounded-lg hover:bg-indigo-50 transition"
                        >
                          {row.expanded ? '▲ Ocultar' : '▼ Editar variantes'}
                        </button>
                      </>
                    ) : (
                      /* Direct stock input */
                      <>
                        <StockBadge stock={row.product.stock} />
                        <input
                          type="number"
                          min="0"
                          value={row.newStock}
                          onChange={e => handleProductStockChange(row.product.id, e.target.value)}
                          className="w-24 px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                        {row.error && (
                          <p className="text-red-500 text-xs">{row.error}</p>
                        )}
                        {row.saved && (
                          <p className="text-green-600 text-xs">✓</p>
                        )}
                        <button
                          onClick={() => updateProductStock(row)}
                          disabled={
                            row.saving || row.newStock === String(row.product.stock)
                          }
                          className="px-3 py-1.5 bg-indigo-600 text-white text-xs font-medium rounded-lg hover:bg-indigo-700 transition disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          {row.saving ? '...' : 'Actualizar'}
                        </button>
                      </>
                    )}
                  </div>

                  {/* Variant rows (expanded) */}
                  {hasVariants && row.expanded && (
                    <div className="bg-gray-50 border-t border-gray-100">
                      {row.variantRows.map(vr => (
                        <VariantStockRow
                          key={vr.variant.id}
                          row={vr}
                          productId={row.product.id}
                          onChange={(vid, updated) =>
                            handleVariantChange(row.product.id, vid, updated)
                          }
                        />
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
