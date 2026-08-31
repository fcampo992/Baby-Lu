'use client'

import { useState } from 'react'
import Link from 'next/link'

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [emailError, setEmailError] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [bannerError, setBannerError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const validate = (): boolean => {
    let valid = true

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
    } else {
      setPasswordError('')
    }

    return valid
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Clear previous errors
    setEmailError('')
    setPasswordError('')
    setBannerError('')

    if (!validate()) return

    setIsSubmitting(true)

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      })

      if (!response.ok) {
        const data = await response.json()
        if (response.status === 401 || data.error === 'INVALID_CREDENTIALS') {
          setBannerError('Credenciales inválidas. Por favor verifique su email y contraseña.')
        } else {
          setBannerError(data.error || 'Error al iniciar sesión. Por favor intente nuevamente.')
        }
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
      <h1 className="text-3xl font-bold text-gray-900">Iniciar Sesión</h1>
      <p className="text-gray-500">Accede a tu cuenta de tienda online</p>

      {bannerError && (
        <div className="bg-red-100 border border-red-200 text-red-700 p-3 rounded-lg">
          {bannerError}
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate>
        <div className="space-y-4">
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
            {isSubmitting ? 'Iniciando sesión...' : 'Iniciar Sesión'}
          </button>
        </div>

        <p className="text-sm text-gray-500 mt-4">
          No tienes cuenta?{' '}
          <Link href="/register" className="text-indigo-600 hover:underline">
            Regístrate
          </Link>
        </p>
      </form>
    </div>
  )
}
