export interface ProductFilter {
  categoryId?: string
  search?: string
}

export interface ProductVariantSummary {
  id: string
  size: string | null
  color: string | null
  stock: number
}

export interface ProductSummary {
  id: string
  title: string
  description: string
  price: number
  stock: number          // stock base del producto (usado solo si no tiene variantes)
  imageUrl?: string
  active: boolean
  isNew: boolean
  category: { id: string; name: string }
  images?: { url: string; order: number }[]
  variants?: ProductVariantSummary[]
}

export function filterProducts(
  products: ProductSummary[],
  filter: ProductFilter
): ProductSummary[] {
  return products.filter(p => {
    const matchesCategory =
      !filter.categoryId || p.category.id === filter.categoryId
    const term = filter.search?.toLowerCase() ?? ''
    const matchesSearch =
      !term ||
      p.title.toLowerCase().includes(term) ||
      p.description.toLowerCase().includes(term)
    return matchesCategory && matchesSearch
  })
}

/**
 * Returns true if the product has at least one variant with stock > 0,
 * or (if no variants) if product.stock > 0.
 */
export function isAvailable(product: ProductSummary): boolean {
  if (product.variants && product.variants.length > 0) {
    return product.variants.some(v => v.stock > 0)
  }
  return product.stock > 0
}

/**
 * Returns the total available stock across all variants,
 * or product.stock if no variants.
 */
export function totalStock(product: ProductSummary): number {
  if (product.variants && product.variants.length > 0) {
    return product.variants.reduce((sum, v) => sum + v.stock, 0)
  }
  return product.stock
}
