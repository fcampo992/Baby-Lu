'use client'

import { useEffect, useState } from 'react'

interface VariantOption {
  id: string
  type: string
  value: string
  order: number
}

type Tab = 'SIZE' | 'COLOR'

function OptionChip({
  option,
  onDelete,
}: {
  option: VariantOption
  onDelete: (id: string) => void
}) {
  const [deleting, setDeleting] = useState(false)

  async function handleDelete() {
    if (!confirm(`¿Eliminar "${option.value}"?`)) return
    setDeleting(true)
    try {
      await fetch(`/api/variant-options/${option.id}`, { method: 'DELETE' })
      onDelete(option.id)
    } catch {
      alert('Error al eliminar')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-full text-sm font-medium text-gray-800 shadow-sm">
      {option.value}
      <button
        onClick={handleDelete}
        disabled={deleting}
        className="text-gray-400 hover:text-red-500 transition disabled:opacity-40 leading-none"
        aria-label={`Eliminar ${option.value}`}
      >
        ×
      </button>
    </span>
  )
}

export default function VariantOptionsPage() {
  const [options, setOptions] = useState<VariantOption[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>('SIZE')
  const [newValue, setNewValue] = useState('')
  const [adding, setAdding] = useState(false)
  const [addError, setAddError] = useState('')

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/variant-options')
        if (res.ok) {
          const data = await res.json()
          setOptions(data.options ?? [])
        }
      } catch {
        // ignore
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const sizes = options.filter(o => o.type === 'SIZE').sort((a, b) => a.order - b.order || a.value.localeCompare(b.value))
  const colors = options.filter(o => o.type === 'COLOR').sort((a, b) => a.order - b.order || a.value.localeCompare(b.value))
  const current = tab === 'SIZE' ? sizes : colors

  function handleDelete(id: string) {
    setOptions(prev => prev.filter(o => o.id !== id))
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setAddError('')
    const val = newValue.trim()
    if (!val) { setAddError('El valor no puede estar vacío'); return }

    setAdding(true)
    try {
      const res = await fetch('/api/variant-options', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: tab, value: val, order: current.length }),
      })
      const data = await res.json()
      if (!res.ok) {
        setAddError(data.fields?.value ?? data.error ?? 'Error al agregar')
        return
      }
      setOptions(prev => [...prev, data.option])
      setNewValue('')
    } catch {
      setAddError('Error de red')
    } finally {
      setAdding(false)
    }
  }

  const tabClass = (t: Tab) =>
    `px-5 py-2.5 text-sm font-semibold rounded-lg transition ${
      tab === t
        ? 'bg-indigo-600 text-white shadow-sm'
        : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
    }`

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Opciones de Variante</h1>
        <p className="text-gray-500 text-sm mt-1">
          Configurá los talles y colores disponibles para los productos de la tienda.
          Estas opciones se usan al agregar variantes a cada producto.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <button className={tabClass('SIZE')} onClick={() => setTab('SIZE')}>
          📐 Talles <span className="ml-1.5 text-xs opacity-70">({sizes.length})</span>
        </button>
        <button className={tabClass('COLOR')} onClick={() => setTab('COLOR')}>
          🎨 Colores <span className="ml-1.5 text-xs opacity-70">({colors.length})</span>
        </button>
      </div>

      {/* Add form */}
      <form onSubmit={handleAdd} className="flex gap-2 items-start">
        <div className="flex-1">
          <input
            type="text"
            value={newValue}
            onChange={e => { setNewValue(e.target.value); setAddError('') }}
            placeholder={tab === 'SIZE' ? 'Ej: S, M, L, XL, 0-3 meses…' : 'Ej: Rojo, Azul marino, Crema…'}
            className={`w-full px-4 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
              addError ? 'border-red-400 bg-red-50' : 'border-gray-300'
            }`}
          />
          {addError && <p className="mt-1 text-xs text-red-600">{addError}</p>}
        </div>
        <button
          type="submit"
          disabled={adding}
          className="px-5 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition disabled:opacity-50 whitespace-nowrap"
        >
          {adding ? '...' : `+ Agregar ${tab === 'SIZE' ? 'talle' : 'color'}`}
        </button>
      </form>

      {/* Options list */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 min-h-[120px]">
        {loading ? (
          <p className="text-sm text-gray-400 text-center py-4">Cargando...</p>
        ) : current.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">
            No hay {tab === 'SIZE' ? 'talles' : 'colores'} configurados todavía.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {current.map(opt => (
              <OptionChip key={opt.id} option={opt} onDelete={handleDelete} />
            ))}
          </div>
        )}
      </div>

      <p className="text-xs text-gray-400">
        💡 Al eliminar una opción de acá no afecta las variantes ya creadas en los productos.
      </p>
    </div>
  )
}
