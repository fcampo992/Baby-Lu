import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { verifyJWT } from '@/lib/auth'

async function requireAdmin() {
  const cookieStore = await cookies()
  const token = cookieStore.get('token')?.value
  if (!token) return null
  const payload = await verifyJWT(token)
  if (!payload || payload.role !== 'ADMIN') return null
  return payload
}

// DELETE /api/categories/[id] — ADMIN only
// Returns 204 on success
// Returns 409 if category has associated products (can't delete)
// Returns 404 if not found
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin()
  if (!admin) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
  }

  const { id } = await params

  // Check if category exists
  const category = await prisma.category.findUnique({ where: { id } })
  if (!category) {
    return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 })
  }

  // Check if category has associated products
  const productCount = await prisma.product.count({ where: { categoryId: id } })
  if (productCount > 0) {
    return NextResponse.json(
      { error: 'CATEGORY_HAS_PRODUCTS', count: productCount },
      { status: 409 }
    )
  }

  await prisma.category.delete({ where: { id } })
  return new Response(null, { status: 204 })
}
