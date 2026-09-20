export interface OrderItemData {
  title: string
  quantity: number
  unitPrice: number
  variantLabel?: string | null
}

export interface OrderData {
  customerName: string
  deliveryOptionName: string           // nombre del punto de entrega elegido
  deliveryOptionDescription?: string   // descripción opcional del punto
  notes?: string
  items: OrderItemData[]
  total: number
}

export function buildWhatsAppMessage(order: OrderData): string {
  const lines: string[] = [
    `*Nuevo Pedido*`,
    `👤 Cliente: ${order.customerName}`,
    `📍 Entrega: ${order.deliveryOptionName}`,
  ]

  if (order.deliveryOptionDescription) {
    lines.push(`   ${order.deliveryOptionDescription}`)
  }

  if (order.notes) lines.push(`📝 Notas: ${order.notes}`)

  lines.push(`\n*Productos:*`)
  for (const item of order.items) {
    const subtotal = (item.unitPrice * item.quantity).toFixed(2)
    const variant = item.variantLabel ? ` (${item.variantLabel})` : ''
    lines.push(`- ${item.title}${variant} × ${item.quantity} = $${subtotal}`)
  }
  lines.push(`\n*Total: $${order.total.toFixed(2)}*`)
  return lines.join('\n')
}

export function buildWhatsAppURL(phone: string, message: string): string {
  const encoded = encodeURIComponent(message)
  return `https://wa.me/${phone}?text=${encoded}`
}
