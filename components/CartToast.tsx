'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

export interface ToastItem {
  id: string
  productName: string
}

interface CartToastProps {
  toasts: ToastItem[]
  onRemove: (id: string) => void
}

function ToastNotification({ toast, onRemove }: { toast: ToastItem; onRemove: () => void }) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    // Trigger slide-in animation
    const showTimer = setTimeout(() => setVisible(true), 10)
    // Slide out after 2.5s
    const hideTimer = setTimeout(() => {
      setVisible(false)
    }, 2500)
    // Remove from DOM after slide-out
    const removeTimer = setTimeout(() => {
      onRemove()
    }, 2850)

    return () => {
      clearTimeout(showTimer)
      clearTimeout(hideTimer)
      clearTimeout(removeTimer)
    }
  }, [onRemove])

  return (
    <div
      style={{
        transform: visible ? 'translateX(0)' : 'translateX(120%)',
        opacity: visible ? 1 : 0,
        transition: 'transform 0.35s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.35s ease',
      }}
      className="flex items-center gap-3 bg-gray-900 text-white px-4 py-3 rounded-xl shadow-2xl min-w-64 max-w-xs"
      role="alert"
      aria-live="polite"
    >
      <span className="text-xl">🛒</span>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-green-400 uppercase tracking-wide">
          ¡Agregado al carrito!
        </p>
        <p className="text-sm text-white/90 truncate mt-0.5">{toast.productName}</p>
      </div>
      <button
        onClick={() => { setVisible(false); setTimeout(onRemove, 350) }}
        className="text-white/50 hover:text-white text-lg leading-none transition ml-1"
        aria-label="Cerrar"
      >
        ×
      </button>
    </div>
  )
}

export function CartToastContainer({ toasts, onRemove }: CartToastProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted || toasts.length === 0) return null

  return createPortal(
    <div
      className="fixed top-4 right-4 z-50 flex flex-col gap-2"
      aria-label="Notificaciones del carrito"
    >
      {toasts.map((toast) => (
        <ToastNotification
          key={toast.id}
          toast={toast}
          onRemove={() => onRemove(toast.id)}
        />
      ))}
    </div>,
    document.body
  )
}
