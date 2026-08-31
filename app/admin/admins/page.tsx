'use client'

import { useState, useEffect } from 'react'

interface Admin {
  id: string
  name: string
  email: string
}

export default function AdminsPage() {
  const [admins, setAdmins] = useState<Admin[]>([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState('')

  // Form state
  const [formName, setFormName] = useState('')
  const [formEmail, setFormEmail] = useState('')
  const [formPassword, setFormPassword] = useState('')
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const [formSuccess, setFormSuccess] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Delete state
  const [deleteError, setDeleteError] = useState('')

  useEffect(() => {
    fetchAdmins()
  }, [])

  async function fetchAdmins() {
    setLoading(true)
    setFetchError('')
    try {
      const res = await fetch('/api/admins')
      if (!res.ok) throw new Error('Error cargando administradores')
      const data = await res.json()
      setAdmins(data.admins ?? [])
    } catch {
      setFetchError('Error al cargar la lista de administradores.')
    } finally {
      setLoading(false)
    }
  }

  function validateForm(): boolean {
    const errors: Record<string, string> = {}

    if (!formName.trim()) {
      errors.name = 'El nombre es requerido'
    }

    if (!formEmail.trim()) {
      errors.email = 'El email es requerido'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formEmail.trim())) {
      errors.email = 'El formato del email no es válido'
    }

    if (!formPassword) {
      errors.password = 'La contraseña es requerida'
    } else if (formPassword.length < 8) {
      errors.password = 'La contraseña debe tener al menos 8 caracteres'
    }

    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFormSuccess('')
    setFormErrors({})

    if (!validateForm()) return

    setSubmitting(true)
    try {
      const res = await fetch('/api/admins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formName.trim(),
          email: formEmail.trim(),
          password: formPassword,
        }),
      })

      if (res.status === 409) {
        setFormErrors({ email: 'El email ya existe en el sistema' })
        return
      }

      if (res.status === 400) {
        const data = await res.json()
        setFormErrors(data.fields ?? { general: 'Error de validación' })
        return
      }

      if (!res.ok) {
        setFormErrors({ general: 'Error inesperado al crear administrador' })
        return
      }

      // Success — reset form and refresh list
      setFormName('')
      setFormEmail('')
      setFormPassword('')
      setFormSuccess('Administrador creado exitosamente.')
      await fetchAdmins()
    } catch {
      setFormErrors({ general: 'Error de conexión. Intente nuevamente.' })
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm('¿Estás seguro de eliminar a este administrador? Esta acción no se puede deshacer.')) return

    setDeleteError('')
    try {
      const res = await fetch(`/api/admins/${id}`, { method: 'DELETE' })

      if (res.status === 403) {
        setDeleteError('No puedes eliminarte a ti mismo.')
        return
      }

      if (res.ok || res.status === 204) {
        setAdmins((prev) => prev.filter((a) => a.id !== id))
      } else {
        setDeleteError('Error al eliminar el administrador.')
      }
    } catch {
      setDeleteError('Error de conexión. Intente nuevamente.')
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Administradores</h1>
      </div>

      {/* Create Admin Form */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Nuevo Administrador</h2>

        <form onSubmit={handleSubmit} noValidate>
          {formErrors.general && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {formErrors.general}
            </div>
          )}

          {formSuccess && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
              ✅ {formSuccess}
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {/* Name */}
            <div>
              <label htmlFor="admin-name" className="block text-sm font-medium text-gray-700 mb-1">
                Nombre <span className="text-red-500">*</span>
              </label>
              <input
                id="admin-name"
                type="text"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="Juan Pérez"
                className={`w-full px-4 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                  formErrors.name ? 'border-red-400' : 'border-gray-200'
                }`}
              />
              {formErrors.name && (
                <p className="mt-1 text-xs text-red-600">{formErrors.name}</p>
              )}
            </div>

            {/* Email */}
            <div>
              <label htmlFor="admin-email" className="block text-sm font-medium text-gray-700 mb-1">
                Email <span className="text-red-500">*</span>
              </label>
              <input
                id="admin-email"
                type="email"
                value={formEmail}
                onChange={(e) => setFormEmail(e.target.value)}
                placeholder="admin@tienda.local"
                className={`w-full px-4 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                  formErrors.email ? 'border-red-400' : 'border-gray-200'
                }`}
              />
              {formErrors.email && (
                <p className="mt-1 text-xs text-red-600">{formErrors.email}</p>
              )}
            </div>

            {/* Password */}
            <div>
              <label htmlFor="admin-password" className="block text-sm font-medium text-gray-700 mb-1">
                Contraseña <span className="text-red-500">*</span>
              </label>
              <input
                id="admin-password"
                type="password"
                value={formPassword}
                onChange={(e) => setFormPassword(e.target.value)}
                placeholder="••••••••"
                className={`w-full px-4 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                  formErrors.password ? 'border-red-400' : 'border-gray-200'
                }`}
              />
              {formErrors.password && (
                <p className="mt-1 text-xs text-red-600">{formErrors.password}</p>
              )}
            </div>
          </div>

          <div className="mt-4">
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center px-5 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed transition"
            >
              {submitting ? 'Creando...' : '+ Crear Administrador'}
            </button>
          </div>
        </form>
      </div>

      {/* Delete error banner */}
      {deleteError && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {deleteError}
        </div>
      )}

      {/* Admins Table */}
      {loading ? (
        <div className="text-center py-12 text-gray-400">Cargando administradores...</div>
      ) : fetchError ? (
        <div className="text-center py-12 text-red-500">{fetchError}</div>
      ) : admins.length === 0 ? (
        <div className="text-center py-16 bg-gray-50 rounded-lg border border-gray-100">
          <p className="text-xl text-gray-400">No hay administradores registrados.</p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="w-full border-collapse">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Nombre</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Email</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-gray-700">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {admins.map((admin) => (
                  <tr key={admin.id} className="hover:bg-gray-50 transition">
                    <td className="py-3 px-4 text-sm text-gray-800">{admin.name}</td>
                    <td className="py-3 px-4 text-sm text-gray-600">{admin.email}</td>
                    <td className="py-3 px-4 text-sm text-right">
                      <button
                        onClick={() => handleDelete(admin.id)}
                        className="text-red-600 hover:text-red-800 text-sm transition"
                      >
                        Eliminar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="text-gray-500 text-sm">
            Mostrando {admins.length} administrador{admins.length !== 1 ? 'es' : ''}
          </p>
        </>
      )}
    </div>
  )
}
