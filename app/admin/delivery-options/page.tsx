'use client'

import { useEffect, useState } from 'react'

interface DeliveryOption {
  id: string
  name: string
  description: string | null
  active: boolean
  order: number
}

interface FormState {
  name: string
  description: string
  order: string
}

const emptyForm: FormState = { name: '', description: '', order: '0' }

export default function DeliveryOptionsPage() {
  const [options, setOptions] = useState<DeliveryOption[]>([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [globalError, setGlobalError] = useState('')
  const [adding, setAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<FormState>(emptyForm)
  const [savingId, setSavingId] = useState<string | null>(null)

  useEffect(() => {
    load()
  }, [])

  async function load() {
    setLoading(true)
    try {
      const res = await fetch('/api/delivery-options?activeOnly=false')
      if (res.ok) {
        const data = await res.json()
        setOptions(data.options ?? [])
      }
    } catch {
      setGlobalError('Error al cargar los puntos de entrega')
    } finally {
      setLoading(false)
    }
  }

  // ── Create ────────────────────────────────────────────────────────────────

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setFieldErrors({})
    setGlobalError('')

    if (!form.name.trim()) {
      setFieldErrors({ name: 'El nombre es requerido' })
      return
    }

    setAdding(true)
    try {
      const res = await fetch('/api/delivery-options', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          description: form.description.trim() || null,
          order: parseInt(form.order, 10) || 0,
          active: true,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setFieldErrors(data.fields ?? {})
        setGlobalError(data.error !== 'VALIDATION_ERROR' ? data.error : '')
        return
      }
      setOptions(prev => [...prev, data.option].sort((a, b) => a.order - b.order || a.name.localeCompare(b.name)))
      setForm(emptyForm)
    } catch {
      setGlobalError('Error de red')
    } finally {
      setAdding(false)
    }
  }

  // ── Toggle active ─────────────────────────────────────────────────────────

  async function toggleActive(opt: DeliveryOption) {
    try {
      const res = await fetch(`/api/delivery-options/${opt.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !opt.active }),
      })
      if (res.ok) {
        const data = await res.json()
        setOptions(prev => prev.map(o => o.id === opt.id ? data.option : o))
      }
    } catch {
      // ignore
    }
  }

  // ── Edit ──────────────────────────────────────────────────────────────────

  function startEdit(opt: DeliveryOption) {
    setEditingId(opt.id)
    setEditForm({ name: opt.name, description: opt.description ?? '', order: String(opt.order) })
  }

  function cancelEdit() {
    setEditingId(null)
  }

  async function saveEdit(id: string) {
    if (!editForm.name.trim()) return
    setSavingId(id)
    try {
      const res = await fetch(`/api/delivery-options/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editForm.name.trim(),
          description: editForm.description.trim() || null,
          order: parseInt(editForm.order, 10) || 0,
        }),
      })
      if (res.ok) {
        const data = await res.json()
        setOptions(prev =>
          prev.map(o => o.id === id ? data.option : o)
              .sort((a, b) => a.order - b.order || a.name.localeCompare(b.name))
        )
        setEditingId(null)
      }
    } catch {
      // ignore
    } finally {
      setSavingId(null)
    }
  }

  // ── Delete ────────────────────────────────────────────────────────────────

  async function handleDelete(opt: DeliveryOption) {
    if (!confirm(`¿Eliminar "${opt.name}"? Los pedidos existentes no se verán afectados.`)) return
    try {
      await fetch(`/api/delivery-options/${opt.id}`, { method: 'DELETE' })
      setOptions(prev => prev.filter(o => o.id !== opt.id))
    } catch {
      // ignore
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Puntos de Entrega</h1>
        <p className="text-gray-500 text-sm mt-1">
          Definí las opciones de retiro y entrega que el comprador puede elegir al hacer un pedido.
        </p>
      </div>

      {globalError && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {globalError}
        </div>
      )}

      {/* Add form */}
      <form
        onSubmit={handleAdd}
        className="bg-white border border-gray-200 rounded-xl p-5 space-y-4"
      >
        <h2 className="text-sm font-semibold text-gray-800">Agregar nueva opción</h2>

        <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3">
          <div>
            <input
              type="text"
              placeholder="Nombre, ej: Retiro en local, Coordinar con el vendedor…"
              value={form.name}
              onChange={e => { setForm(p => ({ ...p, name: e.target.value })); setFieldErrors({}) }}
              className={`w-full px-4 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                fieldErrors.name ? 'border-red-400 bg-red-50' : 'border-gray-300'
              }`}
            />
            {fieldErrors.name && <p className="mt-1 text-xs text-red-600">{fieldErrors.name}</p>}
          </div>
          <button
            type="submit"
            disabled={adding}
            className="px-5 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition disabled:opacity-50 whitespace-nowrap"
          >
            {adding ? '...' : '+ Agregar'}
          </button>
        </div>

        <div>
          <input
            type="text"
            placeholder="Descripción opcional (se muestra al comprador)"
            value={form.description}
            onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </form>

      {/* List */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        {loading ? (
          <p className="text-sm text-gray-400 text-center py-8">Cargando...</p>
        ) : options.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">
            No hay opciones de entrega todavía. Agregá la primera arriba.
          </p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {options.map(opt => (
              <li key={opt.id} className="p-4">
                {editingId === opt.id ? (
                  /* Edit mode */
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={editForm.name}
                      onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))}
                      className="w-full px-3 py-2 border border-indigo-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      autoFocus
                    />
                    <input
                      type="text"
                      placeholder="Descripción (opcional)"
                      value={editForm.description}
                      onChange={e => setEditForm(p => ({ ...p, description: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => saveEdit(opt.id)}
                        disabled={savingId === opt.id}
                        className="px-3 py-1.5 bg-indigo-600 text-white text-xs font-medium rounded-lg hover:bg-indigo-700 transition disabled:opacity-50"
                      >
                        {savingId === opt.id ? '...' : '💾 Guardar'}
                      </button>
                      <button
                        onClick={cancelEdit}
                        className="px-3 py-1.5 text-gray-600 text-xs font-medium border border-gray-200 rounded-lg hover:bg-gray-50 transition"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  /* View mode */
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      {/* Active toggle */}
                      <button
                        onClick={() => toggleActive(opt)}
                        className={`mt-0.5 flex-shrink-0 w-10 h-5 rounded-full transition-colors ${
                          opt.active ? 'bg-green-500' : 'bg-gray-300'
                        }`}
                        title={opt.active ? 'Activo — click para desactivar' : 'Inactivo — click para activar'}
                      >
                        <span className={`block w-4 h-4 bg-white rounded-full shadow transition-transform mx-0.5 ${
                          opt.active ? 'translate-x-5' : 'translate-x-0'
                        }`} />
                      </button>

                      <div className="min-w-0">
                        <p className={`text-sm font-medium ${opt.active ? 'text-gray-900' : 'text-gray-400'}`}>
                          {opt.name}
                          {!opt.active && (
                            <span className="ml-2 text-xs text-gray-400 font-normal">(inactivo)</span>
                          )}
                        </p>
                        {opt.description && (
                          <p className="text-xs text-gray-500 mt-0.5">{opt.description}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={() => startEdit(opt)}
                        className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition"
                        title="Editar"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => handleDelete(opt)}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition"
                        title="Eliminar"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <p className="text-xs text-gray-400">
        💡 Las opciones inactivas no se muestran al comprador. Los pedidos existentes conservan su opción original aunque la elimines.
      </p>
    </div>
  )
}
