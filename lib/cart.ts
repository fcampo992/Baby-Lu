export interface CartItem {
  productId: string
  title: string
  price: number
  quantity: number
  stock: number
  imageUrl?: string
}

export interface Cart {
  items: CartItem[]
}

// Base key for guest cart (no user logged in)
export const CART_KEY = 'ecommerce_cart'

// Returns the storage key for a specific user, or the guest key
export function getCartKey(userId?: string | null): string {
  return userId ? `ecommerce_cart_${userId}` : CART_KEY
}

function isValidCart(value: unknown): value is Cart {
  return (
    typeof value === 'object' &&
    value !== null &&
    'items' in value &&
    Array.isArray((value as Cart).items)
  )
}

export function loadCart(userId?: string | null): Cart {
  if (typeof window === 'undefined') return { items: [] }
  try {
    const key = getCartKey(userId)
    const raw = localStorage.getItem(key)
    if (!raw) return { items: [] }
    const parsed: unknown = JSON.parse(raw)
    if (!isValidCart(parsed)) return { items: [] }
    return parsed
  } catch {
    return { items: [] }
  }
}

export function saveCart(cart: Cart, userId?: string | null): void {
  if (typeof window === 'undefined') return
  try {
    const key = getCartKey(userId)
    localStorage.setItem(key, JSON.stringify(cart))
  } catch {
    // localStorage may be full or unavailable (private browsing)
    console.warn('[cart] Could not save cart to localStorage')
  }
}

export function addItem(cart: Cart, item: Omit<CartItem, 'quantity'>, qty = 1): Cart {
  if (qty < 1 || item.stock < 1) return cart
  const existing = cart.items.find((i) => i.productId === item.productId)
  if (existing) {
    const newQty = Math.min(existing.quantity + qty, item.stock)
    return {
      items: cart.items.map((i) =>
        i.productId === item.productId ? { ...i, quantity: newQty } : i
      ),
    }
  }
  return {
    items: [...cart.items, { ...item, quantity: Math.min(qty, item.stock) }],
  }
}

export function updateQty(cart: Cart, productId: string, qty: number): Cart {
  if (qty < 1) return removeItem(cart, productId)
  return {
    items: cart.items.map((i) =>
      i.productId === productId ? { ...i, quantity: Math.min(qty, i.stock) } : i
    ),
  }
}

export function removeItem(cart: Cart, productId: string): Cart {
  return { items: cart.items.filter((i) => i.productId !== productId) }
}

export function cartTotal(cart: Cart): number {
  return cart.items.reduce((sum, i) => sum + i.price * i.quantity, 0)
}

export function itemSubtotal(item: CartItem): number {
  return item.price * item.quantity
}

export function clearCart(): Cart {
  return { items: [] }
}
