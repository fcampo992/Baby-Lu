'use client'
import Link from 'next/link'
import { useCart } from '@/components/CartProvider'

export function CartIcon() {
  const { cart } = useCart()
  const totalItems = cart.items.reduce((sum, i) => sum + i.quantity, 0)

  return (
    <Link href="/cart" className="relative inline-flex items-center text-gray-600 hover:text-black transition-colors">
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2 9m10 0h2m-2 0a2 2 0 100 4 2 2 0 000-4zm-8 0a2 2 0 100 4 2 2 0 000-4z" />
      </svg>
      {totalItems > 0 && (
        <span className="absolute -top-2 -right-2 bg-black text-white text-xs font-semibold rounded-full w-5 h-5 flex items-center justify-center">
          {totalItems}
        </span>
      )}
    </Link>
  )
}
