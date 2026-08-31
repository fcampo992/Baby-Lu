'use client'

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  ReactNode,
} from 'react'
import { Cart, loadCart, saveCart } from '@/lib/cart'
import { CartToastContainer, ToastItem } from '@/components/CartToast'

interface CartContextType {
  cart: Cart
  setCart: (cart: Cart) => void
  addToastNotification: (productName: string) => void
  storeName: string
  logoUrl: string | null
}

const CartContext = createContext<CartContextType>({
  cart: { items: [] },
  setCart: () => {},
  addToastNotification: () => {},
  storeName: 'Tienda Online',
  logoUrl: null,
})

export function CartProvider({
  children,
  storeName: initialStoreName = 'Tienda Online',
  logoUrl: initialLogoUrl = null,
}: {
  children: ReactNode
  storeName?: string
  logoUrl?: string | null
}) {
  const [cart, setCartState] = useState<Cart>({ items: [] })
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const [userId, setUserId] = useState<string | null>(null)
  const [storeName, setStoreName] = useState(initialStoreName)
  const [logoUrl, setLogoUrl] = useState<string | null>(initialLogoUrl)

  // Track whether the initial session check has completed.
  // Prevents the userId-watch effect from loading the guest cart
  // before we know if the user is actually logged in.
  const initializedRef = useRef(false)

  // On mount: fetch the current session and load the correct cart
  useEffect(() => {
    async function initCart() {
      try {
        const res = await fetch('/api/auth/me')
        const data = res.ok ? await res.json() : null
        const currentUserId: string | null = data?.user?.sub ?? null
        initializedRef.current = true
        setUserId(currentUserId)
        setCartState(loadCart(currentUserId))
      } catch {
        initializedRef.current = true
        setCartState(loadCart(null))
      }
    }
    initCart()
  }, [])

  // When userId changes after initialization (login/logout without full reload),
  // switch to the correct cart for the new session.
  useEffect(() => {
    if (!initializedRef.current) return
    setCartState(loadCart(userId))
  }, [userId])

  // Poll for session changes every 30 seconds to catch login/logout
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch('/api/auth/me')
        const data = res.ok ? await res.json() : null
        const currentUserId: string | null = data?.user?.sub ?? null
        setUserId((prev) => (prev !== currentUserId ? currentUserId : prev))
      } catch {
        // ignore — keep current session state
      }
    }, 30000)
    return () => clearInterval(interval)
  }, [])

  // Use useCallback + pass userId via parameter to avoid stale closure
  const setCart = useCallback(
    (newCart: Cart) => {
      setCartState(newCart)
      // Read userId from ref to always have the latest value
      setUserId((currentUserId) => {
        saveCart(newCart, currentUserId)
        return currentUserId
      })
    },
    []
  )

  const addToastNotification = useCallback((productName: string) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`
    setToasts((prev) => [...prev, { id, productName }])
  }, [])

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  return (
    <CartContext.Provider value={{ cart, setCart, addToastNotification, storeName, logoUrl }}>
      {children}
      <CartToastContainer toasts={toasts} onRemove={removeToast} />
    </CartContext.Provider>
  )
}

export function useCart() {
  return useContext(CartContext)
}
