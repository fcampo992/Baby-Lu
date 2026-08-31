import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { verifyJWT } from '@/lib/auth'

async function requireAdmin() {
  const token = (await cookies()).get('token')?.value
  if (!token) return null
  const payload = await verifyJWT(token)
  if (!payload || payload.role !== 'ADMIN') return null
  return payload
}

// GET /api/customers/[id]
// Returns: { customer: { id, name, email, createdAt, orders: [...] } }
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin()
  if (!admin) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
  }

  try {
    const { id } = await params

    const customer = await prisma.user.findFirst({
      where: { id, role: 'CUSTOMER' },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
        orders: {
          include: {
            items: {
              include: {
                product: {
                  select: { id: true, title: true, imageUrl: true },
                },
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    })

    if (!customer) {
      return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 })
    }

    return NextResponse.json({ customer })
  } catch (err) {
    console.error('[GET /api/customers/[id]]', err)
    return NextResponse.json({ error: 'INTERNAL_SERVER_ERROR' }, { status: 500 })
  }
}
