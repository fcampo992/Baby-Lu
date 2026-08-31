'use client'

import { useState } from 'react'
import Link from 'next/link'

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

export default function RegisterPage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [nameError, setNameError] = useState('')
  const [emailError, setEmailError] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [bannerError, setBannerError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const validate = (): boolean => {
    let valid = true

    if (!name.trim()) {
      setNameError('El nombre es requerido.')
      valid = false
    } else {
      setNameError('')
    }

    if (!email.trim()) {
      setEmailError('El correo electrónico es requerido.')
      valid = false
    } else if (!isValidEmail(email.trim())) {
      setEmailError('Ingrese un correo electrónico válido.')
      valid = false
    } else {
      setEmailError('')
    }

    if (!password) {
      setPasswordError('La contraseña es requerida.')
      valid = false
    } else if (password.length < 6) {
      setPasswordError('La contraseña debe tener al menos 6 caracteres.')
      valid = false
    } else {
      setPasswordError('')
    }

    return valid
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Clear previous errors
    setNameError('')
    setEmailError('')
    setPasswordError('')
    setBannerError('')

    if (!validate()) return

    setIsSubmitting(true)

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), email: email.trim(), password }),
      })

      if (!response.ok) {
        const data = await response.json()

        if (response.status === 409 || data.error === 'EMAIL_ALREADY_EXISTS') {
          setEmailError('Este email ya está registrado.')
          return
        }

        if (response.status === 400 && data.error === 'VALIDATION_ERROR' && data.fields) {
          const fields = data.fields as Record<string, string>
          let hasUnknownField = false

          for (const [field, message] of Object.entries(fields)) {
            if (field === 'name') {
              setNameError(message)
            } else if (field === 'email') {
              setEmailError(message)
            } else if (field === 'password') {
              setPasswordError(message)
            } else {
              hasUnknownField = true
            }
          }

          if (hasUnknownField) {
            setBannerError('Error de validación. Por favor revise los datos ingresados.')
          }
          return
        }

        setBannerError(data.error || 'Error al crear la cuenta. Por favor intente nuevamente.')
        return
      }
    } catch {
      setBannerError('Error de conexión. Por favor intente nuevamente.')
      return
    } finally {
      setIsSubmitting(false)
    }

    window.location.href = '/'
  }

  return (
    <div className="space-y-8 max-w-md mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold text-gray-900">Regístrate</h1>
      <p className="text-gray-500">Crea tu cuenta de tienda online</p>

      {bannerError && (
        <div className="bg-red-100 border border-red-200 text-red-700 p-3 rounded-lg">
          {bannerError}
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate>
        <div className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              Nombre completo
            </label>
            <input
              id="name"
              name="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              aria-describedby={nameError ? 'name-error' : undefined}
              aria-invalid={!!nameError}
              className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                nameError ? 'border-red-400' : 'border-gray-200'
              }`}
            />
            {nameError && (
              <p id="name-error" className="mt-1 text-sm text-red-600">
                {nameError}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Correo electrónico
            </label>
            <input
              id="email"
              name="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              aria-describedby={emailError ? 'email-error' : undefined}
              aria-invalid={!!emailError}
              className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                emailError ? 'border-red-400' : 'border-gray-200'
              }`}
            />
            {emailError && (
              <p id="email-error" className="mt-1 text-sm text-red-600">
                {emailError}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Contraseña
            </label>
            <input
              id="password"
              name="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              aria-describedby={passwordError ? 'password-error' : undefined}
              aria-invalid={!!passwordError}
              className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                passwordError ? 'border-red-400' : 'border-gray-200'
              }`}
            />
            {passwordError && (
              <p id="password-error" className="mt-1 text-sm text-red-600">
                {passwordError}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center justify-center w-full px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Creando cuenta...' : 'Crear Cuenta'}
          </button>
        </div>

        <p className="text-sm text-gray-500 mt-4">
          Ya tienes cuenta?{' '}
          <Link href="/login" className="text-indigo-600 hover:underline">
            Inicia Sesión
          </Link>
        </p>
      </form>
    </div>
  )
}
