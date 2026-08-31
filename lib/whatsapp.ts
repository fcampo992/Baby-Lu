export interface OrderData {
  customerName: string
  address: string
  notes?: string
  items: Array<{ title: string; quantity: number; unitPrice: number }>
  total: number
}

export function buildWhatsAppMessage(order: OrderData): string {
  const lines: string[] = [
    `*Nuevo Pedido*`,
    `👤 Cliente: ${order.customerName}`,
    `📍 Dirección: ${order.address}`,
  ]
  if (order.notes) lines.push(`📝 Notas: ${order.notes}`)
  lines.push(`\n*Productos:*`)
  for (const item of order.items) {
    const subtotal = (item.unitPrice * item.quantity).toFixed(2)
    lines.push(`- ${item.title} × ${item.quantity} = $${subtotal}`)
  }
  lines.push(`\n*Total: $${order.total.toFixed(2)}*`)
  return lines.join('\n')
}

export function buildWhatsAppURL(phone: string, message: string): string {
  const encoded = encodeURIComponent(message)
  return `https://wa.me/${phone}?text=${encoded}`
}
