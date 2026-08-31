'use client'

import { useEffect, useState } from 'react'

interface Category {
  id: string
  name: string
}

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [newName, setNewName] = useState('')
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState('')
  const [deleteError, setDeleteError] = useState<Record<string, string>>({})
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  async function fetchCategories() {
    try {
      const res = await fetch('/api/categories')
      if (res.ok) {
        const data = await res.json()
        setCategories(data.categories || [])
      }
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCategories()
  }, [])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setCreateError('')
    if (!newName.trim()) {
      setCreateError('El nombre es requerido')
      return
    }
    setCreating(true)
    try {
      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim() }),
      })
      if (res.ok) {
        setNewName('')
        await fetchCategories()
      } else if (res.status === 409) {
        setCreateError('Ya existe una categoría con ese nombre')
      } else {
        const data = await res.json().catch(() => ({}))
        setCreateError(data?.fields?.name || 'Error al crear la categoría')
      }
    } catch {
      setCreateError('Error de red al crear la categoría')
    } finally {
      setCreating(false)
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id)
    setDeleteError((prev) => ({ ...prev, [id]: '' }))
    try {
      const res = await fetch(`/api/categories/${id}`, { method: 'DELETE' })
      if (res.status === 204) {
        setCategories((prev) => prev.filter((c) => c.id !== id))
        setConfirmDeleteId(null)
      } else if (res.status === 409) {
        const data = await res.json().catch(() => ({}))
        const count = data?.count ?? ''
        setDeleteError((prev) => ({
          ...prev,
          [id]: `No se puede eliminar: tiene ${count} producto(s) asociado(s)`,
        }))
        setConfirmDeleteId(null)
      } else if (res.status === 404) {
        setDeleteError((prev) => ({ ...prev, [id]: 'Categoría no encontrada' }))
        setConfirmDeleteId(null)
      } else {
        setDeleteError((prev) => ({ ...prev, [id]: 'Error al eliminar' }))
        setConfirmDeleteId(null)
      }
    } catch {
      setDeleteError((prev) => ({ ...prev, [id]: 'Error de red al eliminar' }))
      setConfirmDeleteId(null)
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Categorías</h1>
        <p className="text-gray-500 text-sm mt-1">Gestiona las categorías de productos</p>
      </div>

      {/* Create form */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
        <h2 className="text-base font-semibold text-gray-900 mb-4">Nueva categoría</h2>
        <form onSubmit={handleCreate} className="flex gap-3 items-start">
          <div className="flex-1">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Nombre de la categoría"
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            {createError && (
              <p className="text-red-500 text-xs mt-1">{createError}</p>
            )}
          </div>
          <button
            type="submit"
            disabled={creating}
            className="px-5 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition disabled:opacity-50"
          >
            {creating ? 'Creando...' : '+ Crear'}
          </button>
        </form>
      </div>

      {/* Categories list */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">
            Categorías existentes{' '}
            <span className="text-gray-400 font-normal text-sm">({categories.length})</span>
          </h2>
        </div>

        {loading ? (
          <div className="p-8 text-center text-gray-400 text-sm">Cargando...</div>
        ) : categories.length === 0 ? (
          <div className="p-8 text-center text-gray-400 text-sm">
            No hay categorías. Crea una arriba.
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {categories.map((cat) => (
              <li key={cat.id} className="px-6 py-4 flex items-center justify-between gap-4">
                <span className="text-sm text-gray-800 font-medium">{cat.name}</span>
                <div className="flex items-center gap-3">
                  {deleteError[cat.id] && (
                    <span className="text-xs text-red-500">{deleteError[cat.id]}</span>
                  )}
                  {confirmDeleteId === cat.id ? (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">¿Confirmar eliminación?</span>
                      <button
                        onClick={() => handleDelete(cat.id)}
                        disabled={deletingId === cat.id}
                        className="px-3 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700 transition disabled:opacity-50"
                      >
                        {deletingId === cat.id ? 'Eliminando...' : 'Sí, eliminar'}
                      </button>
                      <button
                        onClick={() => setConfirmDeleteId(null)}
                        className="px-3 py-1 bg-gray-100 text-gray-700 text-xs rounded hover:bg-gray-200 transition"
                      >
                        Cancelar
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        setDeleteError((prev) => ({ ...prev, [cat.id]: '' }))
                        setConfirmDeleteId(cat.id)
                      }}
                      className="px-3 py-1 text-xs text-red-600 border border-red-200 rounded hover:bg-red-50 transition"
                    >
                      Eliminar
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
