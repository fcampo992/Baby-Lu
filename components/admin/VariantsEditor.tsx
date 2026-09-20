'use client'

/**
 * VariantsEditor — componente para gestionar variantes de un producto
 * (talle + color + stock) desde los formularios de admin.
 *
 * Props:
 *  - productId: si está presente, guarda/borra en la API directamente.
 *               Si es undefined (producto nuevo), opera en modo local
 *               y expone variants vía onChangeLocal para que el padre
 *               las envíe al crear el producto.
 */

import { useEffect, useState, useCallback } from 'react'

export interface VariantRow {
  id?: string          // presente sólo si ya está en DB
  size: string
  color: string
  stock: string        // string para el input, se parsea al guardar
  saving?: boolean
  saved?: boolean
  error?: string
  isNew?: boolean      // row todavía no guardada en DB
}

interface VariantOption {
  id: string
  type: string
  value: string
}

interface VariantsEditorProps {
  productId?: string
  /** Modo nuevo producto: el padre recibe las filas para incluirlas en el POST */
  onChangeLocal?: (variants: VariantRow[]) => void
}

export function VariantsEditor({ productId, onChangeLocal }: VariantsEditorProps) {
  const [rows, setRows] = useState<VariantRow[]>([])
  const [sizeOptions, setSizeOptions] = useState<string[]>([])
  const [colorOptions, setColorOptions] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [globalError, setGlobalError] = useState('')

  // Load existing variants (only if editing an existing product)
  // and global variant options for selects
  useEffect(() => {
    async function load() {
      try {
        const [resOptions, resVariants] = await Promise.all([
          fetch('/api/variant-options'),
          productId ? fetch(`/api/products/${productId}/variants`) : Promise.resolve(null),
        ])

        if (resOptions.ok) {
          const data = await resOptions.json()
          const opts: VariantOption[] = data.options ?? []
          setSizeOptions(opts.filter(o => o.type === 'SIZE').map(o => o.value))
          setColorOptions(opts.filter(o => o.type === 'COLOR').map(o => o.value))
        }

        if (resVariants?.ok) {
          const data = await resVariants.json()
          setRows(
            (data.variants ?? []).map((v: { id: string; size: string | null; color: string | null; stock: number }) => ({
              id: v.id,
              size: v.size ?? '',
              color: v.color ?? '',
              stock: String(v.stock),
              isNew: false,
            }))
          )
        }
      } catch {
        setGlobalError('Error al cargar opciones de variante')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [productId])

  // Notify parent in local mode whenever rows change
  const notifyParent = useCallback(
    (newRows: VariantRow[]) => {
      if (onChangeLocal) onChangeLocal(newRows)
    },
    [onChangeLocal]
  )

  function addRow() {
    const newRow: VariantRow = { size: '', color: '', stock: '0', isNew: true }
    const updated = [...rows, newRow]
    setRows(updated)
    notifyParent(updated)
  }

  function updateRow(idx: number, field: keyof VariantRow, value: string) {
    setRows(prev => {
      const next = prev.map((r, i) =>
        i === idx ? { ...r, [field]: value, error: '', saved: false } : r
      )
      notifyParent(next)
      return next
    })
  }

  // ── Save to DB (edit mode only) ─────────────────────────────────────────────

  async function saveRow(idx: number) {
    const row = rows[idx]
    const stockNum = parseInt(row.stock, 10)

    if (isNaN(stockNum) || stockNum < 0) {
      setRows(prev => prev.map((r, i) => i === idx ? { ...r, error: 'Stock inválido' } : r))
      return
    }
    if (!row.size && !row.color) {
      setRows(prev => prev.map((r, i) => i === idx ? { ...r, error: 'Ingresá talle o color' } : r))
      return
    }

    setRows(prev => prev.map((r, i) => i === idx ? { ...r, saving: true, error: '' } : r))

    try {
      let res: Response
      if (row.id) {
        // Update existing variant
        res = await fetch(`/api/products/${productId}/variants/${row.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            size: row.size || null,
            color: row.color || null,
            stock: stockNum,
          }),
        })
      } else {
        // Create new variant
        res = await fetch(`/api/products/${productId}/variants`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            size: row.size || null,
            color: row.color || null,
            stock: stockNum,
          }),
        })
      }

      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        const msg = data.fields?.variant ?? data.fields?.stock ?? data.error ?? 'Error al guardar'
        setRows(prev => prev.map((r, i) => i === idx ? { ...r, saving: false, error: msg } : r))
        return
      }

      setRows(prev =>
        prev.map((r, i) =>
          i === idx
            ? { ...r, id: data.variant.id, saving: false, saved: true, isNew: false }
            : r
        )
      )
      setTimeout(() => {
        setRows(prev => prev.map((r, i) => i === idx ? { ...r, saved: false } : r))
      }, 2500)
    } catch {
      setRows(prev => prev.map((r, i) => i === idx ? { ...r, saving: false, error: 'Error de red' } : r))
    }
  }

  async function deleteRow(idx: number) {
    const row = rows[idx]

    // If not yet saved, just remove from local state
    if (!row.id) {
      const updated = rows.filter((_, i) => i !== idx)
      setRows(updated)
      notifyParent(updated)
      return
    }

    if (!confirm(`¿Eliminar la variante ${row.size || ''}${row.size && row.color ? ' / ' : ''}${row.color || ''}?`)) return

    setRows(prev => prev.map((r, i) => i === idx ? { ...r, saving: true } : r))
    try {
      await fetch(`/api/products/${productId}/variants/${row.id}`, { method: 'DELETE' })
      const updated = rows.filter((_, i) => i !== idx)
      setRows(updated)
      notifyParent(updated)
    } catch {
      setRows(prev => prev.map((r, i) => i === idx ? { ...r, saving: false, error: 'Error al eliminar' } : r))
    }
  }

  if (loading) {
    return <p className="text-sm text-gray-400">Cargando variantes...</p>
  }

  return (
    <div className="space-y-3">
      {globalError && (
        <p className="text-sm text-red-600">{globalError}</p>
      )}

      {rows.length === 0 ? (
        <p className="text-sm text-gray-400 py-2">
          Sin variantes. El stock se maneja a nivel de producto.
        </p>
      ) : (
        <div className="space-y-2">
          {/* Header */}
          <div className="grid grid-cols-[1fr_1fr_100px_auto] gap-2 px-1 text-xs font-semibold text-gray-500 uppercase tracking-wide">
            <span>Talle</span>
            <span>Color</span>
            <span>Stock</span>
            <span />
          </div>

          {rows.map((row, idx) => (
            <div key={row.id ?? `new-${idx}`} className="grid grid-cols-[1fr_1fr_100px_auto] gap-2 items-start">
              {/* Size */}
              <div>
                <select
                  value={row.size}
                  onChange={e => updateRow(idx, 'size', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                >
                  <option value="">— Ninguno —</option>
                  {sizeOptions.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              {/* Color */}
              <div>
                <select
                  value={row.color}
                  onChange={e => updateRow(idx, 'color', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                >
                  <option value="">— Ninguno —</option>
                  {colorOptions.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              {/* Stock */}
              <div>
                <input
                  type="number"
                  min="0"
                  value={row.stock}
                  onChange={e => updateRow(idx, 'stock', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1 pt-0.5">
                {productId && (
                  <button
                    type="button"
                    onClick={() => saveRow(idx)}
                    disabled={row.saving}
                    className="px-2.5 py-2 bg-indigo-600 text-white text-xs font-medium rounded-lg hover:bg-indigo-700 transition disabled:opacity-40"
                  >
                    {row.saving ? '...' : row.saved ? '✓' : '💾'}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => deleteRow(idx)}
                  disabled={row.saving}
                  className="px-2.5 py-2 bg-red-50 text-red-600 text-xs font-medium rounded-lg hover:bg-red-100 transition disabled:opacity-40"
                >
                  ×
                </button>
              </div>

              {/* Error / saved feedback (spans full row) */}
              {(row.error || row.saved) && (
                <div className="col-span-4 -mt-1">
                  {row.error && <p className="text-xs text-red-600">{row.error}</p>}
                  {row.saved && <p className="text-xs text-green-600">✓ Guardado</p>}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={addRow}
        className="mt-1 text-sm text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1 transition"
      >
        + Agregar variante
      </button>

      {!productId && rows.length > 0 && (
        <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          Las variantes se guardarán cuando crees el producto.
          {' '}Podés editarlas en detalle después.
        </p>
      )}
    </div>
  )
}
