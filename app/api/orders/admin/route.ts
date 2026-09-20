import { NextRequest, NextResponse } from 'next/server'
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

// GET /api/orders/admin
// Query params: status?, search?, from?, to?, page?, limit?
export async function GET(request: NextRequest) {
  const admin = await requireAdmin()
  if (!admin) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') ?? undefined
    const search = searchParams.get('search')?.trim() ?? undefined
    const from = searchParams.get('from') ?? undefined
    const to = searchParams.get('to') ?? undefined
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10))
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') ?? '20', 10)))
    const skip = (page - 1) * limit

    // Build where clause
    const where: Record<string, unknown> = {}

    if (status && status !== 'ALL') {
      where.status = status
    }

    if (search) {
      where.OR = [
        { customerName: { contains: search } },
        { address: { contains: search } },
        { id: { contains: search } },
      ]
    }

    if (from || to) {
      where.createdAt = {
        ...(from ? { gte: new Date(from + 'T00:00:00.000Z') } : {}),
        ...(to   ? { lte: new Date(to   + 'T23:59:59.999Z') } : {}),
      }
    }

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          items: {
            include: {
              product: {
                select: { id: true, title: true, imageUrl: true },
              },
            },
          },
          user: {
            select: { id: true, name: true, email: true },
          },
          deliveryOption: {
            select: { id: true, name: true, description: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.order.count({ where }),
    ])

    // Summary counts by status (always over full unfiltered dataset)
    const statusCounts = await prisma.order.groupBy({
      by: ['status'],
      _count: { status: true },
    })

    const summary = {
      PENDING: 0,
      CONFIRMED: 0,
      DELIVERED: 0,
      CANCELLED: 0,
      total: 0,
    } as Record<string, number>

    for (const row of statusCounts) {
      summary[row.status] = row._count.status
      summary.total += row._count.status
    }

    return NextResponse.json({
      orders,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
      summary,
    })
  } catch (err) {
    console.error('[GET /api/orders/admin]', err)
    return NextResponse.json({ error: 'INTERNAL_SERVER_ERROR' }, { status: 500 })
  }
}
