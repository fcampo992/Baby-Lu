import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { verifyJWT } from '@/lib/auth'
import { buildWhatsAppMessage, buildWhatsAppURL } from '@/lib/whatsapp'

interface OrderItemInput {
  productId: string
  title: string
  quantity: number
  unitPrice: number
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null)
    if (!body) {
      return NextResponse.json(
        { error: 'VALIDATION_ERROR', fields: { body: 'Invalid JSON' } },
        { status: 400 }
      )
    }

    const { customerName, address, notes, items, total } = body

    // 1. Validate required fields
    const fields: Record<string, string> = {}
    if (!customerName || String(customerName).trim() === '')
      fields.customerName = 'required'
    if (!address || String(address).trim() === '')
      fields.address = 'required'
    if (!items || !Array.isArray(items) || items.length === 0)
      fields.items = 'must be a non-empty array'
    if (total === undefined || total === null || typeof total !== 'number' || isNaN(total) || total < 0)
      fields.total = 'must be a non-negative number'

    if (Object.keys(fields).length > 0) {
      return NextResponse.json({ error: 'VALIDATION_ERROR', fields }, { status: 400 })
    }

    // 2. Optionally read JWT cookie to get userId (CUSTOMER role only)
    let userId: string | null = null
    try {
      const cookieStore = await cookies()
      const token = cookieStore.get('token')?.value
      if (token) {
        const payload = await verifyJWT(token)
        if (payload && payload.role === 'CUSTOMER') {
          userId = payload.sub
        }
      }
    } catch {
      // Cookie reading failed — continue as guest
    }

    // 3. Resolve WhatsApp phone BEFORE creating the order to fail fast
    const whatsappPhoneSetting = await prisma.setting.findUnique({ where: { key: 'whatsapp_phone' } })
    const phone = whatsappPhoneSetting?.value ?? process.env.WHATSAPP_PHONE_NUMBER

    if (!phone) {
      return NextResponse.json({ error: 'WHATSAPP_NOT_CONFIGURED' }, { status: 500 })
    }

    // 4. Validate each item references a real, active product with sufficient stock
    const productIds = (items as OrderItemInput[]).map((i) => i.productId)
    const dbProducts = await prisma.product.findMany({
      where: { id: { in: productIds }, active: true },
      select: { id: true, stock: true },
    })

    const productMap = new Map(dbProducts.map((p) => [p.id, p]))
    const stockErrors: Record<string, string> = {}
    for (const item of items as OrderItemInput[]) {
      const qty = Number(item.quantity)
      if (!Number.isInteger(qty) || qty < 1) {
        stockErrors[item.productId] = 'La cantidad debe ser un entero mayor a 0'
        continue
      }
      const prod = productMap.get(item.productId)
      if (!prod) {
        stockErrors[item.productId] = 'Producto no encontrado o inactivo'
      } else if (qty > prod.stock) {
        stockErrors[item.productId] = `Stock insuficiente (disponible: ${prod.stock})`
      }
    }
    if (Object.keys(stockErrors).length > 0) {
      return NextResponse.json({ error: 'STOCK_ERROR', items: stockErrors }, { status: 409 })
    }

    // 5. Create Order + OrderItems in a single transaction
    const order = await prisma.order.create({
      data: {
        customerName: String(customerName).trim(),
        address: String(address).trim(),
        notes: notes ? String(notes).trim() : null,
        total: Number(total),
        userId: userId ?? null,
        items: {
          create: (items as OrderItemInput[]).map((item) => ({
            productId: item.productId,
            quantity: Number(item.quantity),
            unitPrice: Number(item.unitPrice),
          })),
        },
      },
    })

    // 6. Build WhatsApp URL using already-resolved phone
    const message = buildWhatsAppMessage({
      customerName: order.customerName,
      address: order.address,
      notes: order.notes ?? undefined,
      items: (items as OrderItemInput[]).map((item) => ({
        title: item.title,
        quantity: Number(item.quantity),
        unitPrice: Number(item.unitPrice),
      })),
      total: order.total,
    })

    const whatsappUrl = buildWhatsAppURL(phone, message)

    // 7. Return 201 with orderId and whatsappUrl
    return NextResponse.json({ orderId: order.id, whatsappUrl }, { status: 201 })
  } catch (err) {
    console.error('[POST /api/orders]', err)
    return NextResponse.json({ error: 'INTERNAL_SERVER_ERROR' }, { status: 500 })
  }
}
