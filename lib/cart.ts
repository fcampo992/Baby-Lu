export interface CartItem {
  productId: string
  variantId?: string | null       // null = producto sin variantes
  variantLabel?: string | null    // ej: "Talle M / Rojo" — para display
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

/**
 * Unique key per cart entry: productId + variantId (or just productId if no variant).
 * This allows the same product with different variants to be separate cart lines.
 */
export function cartItemKey(productId: string, variantId?: string | null): string {
  return variantId ? `${productId}__${variantId}` : productId
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
    console.warn('[cart] Could not save cart to localStorage')
  }
}

export function addItem(cart: Cart, item: Omit<CartItem, 'quantity'>, qty = 1): Cart {
  if (qty < 1 || item.stock < 1) return cart

  const key = cartItemKey(item.productId, item.variantId)
  const existing = cart.items.find(
    (i) => cartItemKey(i.productId, i.variantId) === key
  )

  if (existing) {
    const newQty = Math.min(existing.quantity + qty, item.stock)
    return {
      items: cart.items.map((i) =>
        cartItemKey(i.productId, i.variantId) === key ? { ...i, quantity: newQty } : i
      ),
    }
  }

  return {
    items: [...cart.items, { ...item, quantity: Math.min(qty, item.stock) }],
  }
}

export function updateQty(
  cart: Cart,
  productId: string,
  qty: number,
  variantId?: string | null
): Cart {
  const key = cartItemKey(productId, variantId)
  if (qty < 1) return removeItem(cart, productId, variantId)
  return {
    items: cart.items.map((i) =>
      cartItemKey(i.productId, i.variantId) === key
        ? { ...i, quantity: Math.min(qty, i.stock) }
        : i
    ),
  }
}

export function removeItem(
  cart: Cart,
  productId: string,
  variantId?: string | null
): Cart {
  const key = cartItemKey(productId, variantId)
  return { items: cart.items.filter((i) => cartItemKey(i.productId, i.variantId) !== key) }
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
