import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyJWT } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    // 1. Read JWT from HttpOnly cookie
    const token = request.cookies.get('token')?.value

    if (!token) {
      return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
    }

    // 2. Verify JWT and extract userId from payload
    const payload = await verifyJWT(token)

    if (!payload) {
      return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
    }

    // 3. Query orders belonging to this user, with nested items and products
    const orders = await prisma.order.findMany({
      where: { userId: payload.sub },
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
    })

    // 4. Return 200 with orders array
    return NextResponse.json({ orders }, { status: 200 })
  } catch (error) {
    console.error('[GET /api/orders/my]', error)
    return NextResponse.json({ error: 'INTERNAL_SERVER_ERROR' }, { status: 500 })
  }
}
