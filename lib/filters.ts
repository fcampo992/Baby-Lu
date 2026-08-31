export interface ProductFilter {
  categoryId?: string
  search?: string
}

export interface ProductSummary {
  id: string
  title: string
  description: string
  price: number
  stock: number
  imageUrl?: string
  active: boolean
  isNew: boolean
  category: { id: string; name: string }
  images?: { url: string; order: number }[]
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
