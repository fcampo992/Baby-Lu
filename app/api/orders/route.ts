import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { verifyJWT } from '@/lib/auth'
import { buildWhatsAppMessage, buildWhatsAppURL } from '@/lib/whatsapp'

interface OrderItemInput {
  productId: string
  variantId?: string | null
  variantLabel?: string | null
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

    const { customerName, deliveryOptionId, notes, items, total } = body

    // 1. Validate required fields
    const fields: Record<string, string> = {}
    if (!customerName || String(customerName).trim() === '')
      fields.customerName = 'required'
    if (!deliveryOptionId || String(deliveryOptionId).trim() === '')
      fields.deliveryOptionId = 'Seleccioná un punto de entrega'
    if (!items || !Array.isArray(items) || items.length === 0)
      fields.items = 'must be a non-empty array'
    if (total === undefined || total === null || typeof total !== 'number' || isNaN(total) || total < 0)
      fields.total = 'must be a non-negative number'

    if (Object.keys(fields).length > 0) {
      return NextResponse.json({ error: 'VALIDATION_ERROR', fields }, { status: 400 })
    }

    // 2. Resolve delivery option — must exist and be active
    const deliveryOption = await prisma.deliveryOption.findUnique({
      where: { id: String(deliveryOptionId) },
    })
    if (!deliveryOption || !deliveryOption.active) {
      return NextResponse.json(
        { error: 'VALIDATION_ERROR', fields: { deliveryOptionId: 'Opción de entrega no válida' } },
        { status: 400 }
      )
    }

    // 3. Optionally read JWT cookie to get userId (CUSTOMER role only)
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
      // continue as guest
    }

    // 4. Resolve WhatsApp phone
    const whatsappPhoneSetting = await prisma.setting.findUnique({ where: { key: 'whatsapp_phone' } })
    const phone = whatsappPhoneSetting?.value ?? process.env.WHATSAPP_PHONE_NUMBER
    if (!phone) {
      return NextResponse.json({ error: 'WHATSAPP_NOT_CONFIGURED' }, { status: 500 })
    }

    // 5. Validate stock per variant / product
    const typedItems = items as OrderItemInput[]
    const variantItems = typedItems.filter(i => i.variantId)
    const productOnlyItems = typedItems.filter(i => !i.variantId)

    const variantIds = variantItems.map(i => i.variantId as string)
    const dbVariants = variantIds.length > 0
      ? await prisma.productVariant.findMany({
          where: { id: { in: variantIds } },
          select: { id: true, stock: true, productId: true },
        })
      : []

    const productIds = [...new Set(typedItems.map(i => i.productId))]
    const dbProducts = await prisma.product.findMany({
      where: { id: { in: productIds }, active: true },
      select: { id: true, stock: true },
    })

    const productMap = new Map(dbProducts.map(p => [p.id, p]))
    const variantMap = new Map(dbVariants.map(v => [v.id, v]))
    const stockErrors: Record<string, string> = {}

    for (const item of typedItems) {
      const qty = Number(item.quantity)
      if (!Number.isInteger(qty) || qty < 1) {
        stockErrors[item.variantId ?? item.productId] = 'La cantidad debe ser un entero mayor a 0'
        continue
      }
      if (!productMap.has(item.productId)) {
        stockErrors[item.variantId ?? item.productId] = 'Producto no encontrado o inactivo'
        continue
      }
      if (item.variantId) {
        const variant = variantMap.get(item.variantId)
        if (!variant) {
          stockErrors[item.variantId] = 'Variante no encontrada'
        } else if (qty > variant.stock) {
          stockErrors[item.variantId] = `Stock insuficiente (disponible: ${variant.stock})`
        }
      } else {
        const prod = productMap.get(item.productId)!
        if (qty > prod.stock) {
          stockErrors[item.productId] = `Stock insuficiente (disponible: ${prod.stock})`
        }
      }
    }

    if (Object.keys(stockErrors).length > 0) {
      return NextResponse.json({ error: 'STOCK_ERROR', items: stockErrors }, { status: 409 })
    }

    // 6. Create Order + items + decrement stock in a single transaction
    const order = await prisma.$transaction(async (tx) => {
      const newOrder = await tx.order.create({
        data: {
          customerName: String(customerName).trim(),
          // address stores the delivery option name for display/legacy compatibility
          address: deliveryOption.name,
          notes: notes ? String(notes).trim() : null,
          total: Number(total),
          userId: userId ?? null,
          deliveryOptionId: deliveryOption.id,
          items: {
            create: typedItems.map(item => ({
              productId: item.productId,
              variantId: item.variantId ?? null,
              quantity: Number(item.quantity),
              unitPrice: Number(item.unitPrice),
            })),
          },
        },
      })

      for (const item of variantItems) {
        await tx.productVariant.update({
          where: { id: item.variantId as string },
          data: { stock: { decrement: Number(item.quantity) } },
        })
      }
      for (const item of productOnlyItems) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { decrement: Number(item.quantity) } },
        })
      }

      return newOrder
    })

    // 7. Build WhatsApp message
    const message = buildWhatsAppMessage({
      customerName: order.customerName,
      deliveryOptionName: deliveryOption.name,
      deliveryOptionDescription: deliveryOption.description ?? undefined,
      notes: order.notes ?? undefined,
      items: typedItems.map(item => ({
        title: item.title,
        quantity: Number(item.quantity),
        unitPrice: Number(item.unitPrice),
        variantLabel: item.variantLabel ?? null,
      })),
      total: order.total,
    })

    const whatsappUrl = buildWhatsAppURL(phone, message)

    return NextResponse.json({ orderId: order.id, whatsappUrl }, { status: 201 })
  } catch (err) {
    console.error('[POST /api/orders]', err)
    return NextResponse.json({ error: 'INTERNAL_SERVER_ERROR' }, { status: 500 })
  }
}
