import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { verifyJWT } from '@/lib/auth'

const VALID_STATUSES = ['PENDING', 'CONFIRMED', 'DELIVERED', 'CANCELLED']

// PATCH /api/orders/[id] — update order status
// ADMIN can set any status; CUSTOMER can only set CANCELLED on their own orders
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const cookieStore = await cookies()
  const token = cookieStore.get('token')?.value

  if (!token) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
  }

  const payload = await verifyJWT(token)
  if (!payload) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
  }

  const { id } = await params

  let body: { status?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { error: 'VALIDATION_ERROR', fields: { body: 'Invalid JSON' } },
      { status: 400 }
    )
  }

  const { status } = body

  if (!status || typeof status !== 'string' || !VALID_STATUSES.includes(status)) {
    return NextResponse.json(
      {
        error: 'VALIDATION_ERROR',
        fields: { status: `Must be one of: ${VALID_STATUSES.join(', ')}` },
      },
      { status: 400 }
    )
  }

  // Customers can only cancel their own orders
  if (payload.role === 'CUSTOMER') {
    if (status !== 'CANCELLED') {
      return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })
    }
    // Verify the order belongs to this customer
    const order = await prisma.order.findUnique({ where: { id } })
    if (!order) {
      return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 })
    }
    if (order.userId !== payload.sub) {
      return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })
    }
  } else if (payload.role !== 'ADMIN') {
    return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })
  }

  try {
    const order = await prisma.order.update({
      where: { id },
      data: { status },
      include: {
        items: {
          include: {
            product: { select: { id: true, title: true } },
          },
        },
        user: { select: { id: true, name: true, email: true } },
      },
    })
    return NextResponse.json({ order })
  } catch (err: unknown) {
    if (
      typeof err === 'object' &&
      err !== null &&
      'code' in err &&
      (err as { code: string }).code === 'P2025'
    ) {
      return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 })
    }
    console.error('[PATCH /api/orders/[id]]', err)
    return NextResponse.json({ error: 'INTERNAL_SERVER_ERROR' }, { status: 500 })
  }
}
