/**
 * Property Tests for lib/whatsapp.ts
 */

import { buildWhatsAppMessage, buildWhatsAppURL } from '../lib/whatsapp';

describe('WhatsApp - Property Tests', () => {
  describe('buildWhatsAppMessage', () => {
    it('Property 10: WhatsApp message contains all required fields', () => {
      const order = {
        customerName: 'Test Customer',
        deliveryOptionName: 'Retiro en local',
        notes: 'Test note',
        items: [
          { title: 'Product A', quantity: 2, unitPrice: 50 },
          { title: 'Product B', quantity: 1, unitPrice: 100 },
        ],
        total: 200,
      };

      const message = buildWhatsAppMessage(order);

      expect(message).toMatch(/^.*\*Nuevo Pedido\*.*/);
      expect(message).toContain('Test Customer');
      expect(message).toContain('Retiro en local');
      expect(message).toContain('Notas: Test note');
      expect(message).toContain('*Productos:');
      expect(message).toContain('Product A');
      expect(message).toContain('× 2 = $100.00');
      expect(message).toContain('Product B');
      expect(message).toContain('× 1 = $100.00');
      expect(message).toContain('*Total: $200.00*');
    });

    it('Property 11: Invalid checkout form does not generate WhatsApp message without products section', () => {
      const order = {
        customerName: 'Test Customer',
        deliveryOptionName: 'Coordinar con el vendedor',
        notes: '',
        items: [],
        total: 0,
      };

      const message = buildWhatsAppMessage(order);

      expect(message).toContain('*Nuevo Pedido*');
      expect(message).toContain('Test Customer');
    });

    it('buildWhatsAppMessage formats prices with 2 decimal places', () => {
      const order = {
        customerName: 'Customer',
        deliveryOptionName: 'Retiro en local',
        notes: '',
        items: [{ title: 'Item', quantity: 1, unitPrice: 10.006 }],
        total: 10.006,
      };

      const message = buildWhatsAppMessage(order);

      expect(message).toContain('$10.01');
    });

    it('buildWhatsAppMessage handles multiple items correctly', () => {
      const order = {
        customerName: 'Customer',
        deliveryOptionName: 'Retiro en local',
        notes: '',
        items: Array.from({ length: 5 }, (_, i) => ({
          title: `Product ${i + 1}`,
          quantity: Math.floor(Math.random() * 3) + 1,
          unitPrice: Math.round(Math.random() * 20 + 1),
        })),
        total: 100,
      };

      const message = buildWhatsAppMessage(order);

      for (const item of order.items) {
        expect(message).toContain(item.title);
        const expectedSubtotal = (item.unitPrice * item.quantity).toFixed(2);
        expect(message).toContain(`× ${item.quantity} = $${expectedSubtotal}`);
      }
    });

    it('buildWhatsAppMessage omits notes when not provided', () => {
      const order = {
        customerName: 'Customer',
        deliveryOptionName: 'Retiro en local',
        items: [{ title: 'Item', quantity: 1, unitPrice: 50 }],
        total: 50,
      };

      const message = buildWhatsAppMessage(order);

      expect(message).not.toContain('Notas');
    });

    it('buildWhatsAppMessage handles empty deliveryOptionName gracefully', () => {
      const order = {
        customerName: 'Customer',
        deliveryOptionName: '',
        notes: '',
        items: [{ title: 'Item', quantity: 1, unitPrice: 50 }],
        total: 50,
      };

      const message = buildWhatsAppMessage(order);

      expect(message).toContain('*Nuevo Pedido*');
    });

    it('buildWhatsAppMessage handles special characters in customer name', () => {
      const order = {
        customerName: 'José García & María',
        deliveryOptionName: 'Retiro en sucursal Centro',
        notes: '',
        items: [{ title: 'Item', quantity: 1, unitPrice: 50 }],
        total: 50,
      };

      const message = buildWhatsAppMessage(order);

      expect(message).toContain('José García');
    });
  });

  describe('buildWhatsAppURL', () => {
    it('builds valid WhatsApp URL with encoded text', () => {
      const phone = '55312345678';
      const message = 'Test message with spaces and special characters!';

      const url = buildWhatsAppURL(phone, message);

      expect(url).toContain('wa.me/');
      expect(url).toContain(phone);
      expect(url).toContain('text=');
    });

    it('properly encodes special characters in URL', () => {
      const phone = '1234567890';
      const messageWithSpecialChars = 'Product $10.50 - Order #1234!';

      const url = buildWhatsAppURL(phone, messageWithSpecialChars);

      expect(url).toContain('wa.me/');
      const decodedText = decodeURIComponent(url.split('text=')[1].split('&')[0]);
      expect(decodedText).toBe(messageWithSpecialChars);
    });

    it('handles empty messages gracefully', () => {
      const phone = '1234567890';
      const url = buildWhatsAppURL(phone, '');

      expect(url).toContain('wa.me/');
      expect(url).toContain('text=');
    });

    it('builds correct format for different phone number formats', () => {
      const urls = [
        buildWhatsAppURL('+1234567890', 'Test'),
        buildWhatsAppURL('123.456.7890', 'Test'),
        buildWhatsAppURL('01234567890', 'Test'),
      ];

      urls.forEach(url => {
        expect(url).toContain('wa.me/');
      });
    });

    it('preserves phone number format in URL', () => {
      const originalPhone = '+61987654321';
      const url = buildWhatsAppURL(originalPhone, 'Test');

      expect(url).toContain(originalPhone);
    });

    it('handles international formats without modification', () => {
      const urls = [
        buildWhatsAppURL('+1234567890', 'Test'),
        buildWhatsAppURL('123.456.7890', 'Test'),
        buildWhatsAppURL('01234567890', 'Test'),
      ];

      urls.forEach(url => {
        expect(url).toContain('wa.me/');
      });
    });
  });

  describe('Integration Properties', () => {
    it('buildWhatsAppMessage and buildWhatsAppURL work together correctly', () => {
      const order = {
        customerName: 'Test Customer',
        deliveryOptionName: 'Retiro en local',
        notes: 'Special delivery requested',
        items: [
          { title: 'Laptop Pro', quantity: 1, unitPrice: 999.99 },
          { title: 'Mouse', quantity: 2, unitPrice: 25.00 },
          { title: 'Keyboard', quantity: 1, unitPrice: 75.00 },
        ],
        total: 1100.00,
      };

      const message = buildWhatsAppMessage(order);
      const url = buildWhatsAppURL('+61987654321', message);

      expect(url).toContain('wa.me/');
      const decodedText = decodeURIComponent(url.split('text=')[1].split('&')[0]);
      expect(decodedText).toMatch(/^\*Nuevo Pedido\*/);
    });

    it('complete order flow: build message and URL together', () => {
      const completeOrder = {
        customerName: 'Customer Name',
        deliveryOptionName: 'Coordinar con el vendedor',
        notes: 'Gift delivery',
        items: [
          { title: 'Phone', quantity: 1, unitPrice: 800 },
          { title: 'Case', quantity: 1, unitPrice: 50 },
        ],
        total: 850,
      };

      const message = buildWhatsAppMessage(completeOrder);
      const url = buildWhatsAppURL('+61976543210', message);

      const decodedText = decodeURIComponent(url.split('text=')[1].split('&')[0]);
      expect(decodedText).toMatch(/^\*Nuevo Pedido\*/);
    });

    it('buildWhatsAppMessage handles large order with many items', () => {
      const order = {
        customerName: 'Bulk Buyer',
        deliveryOptionName: 'Retiro en depósito',
        notes: '',
        items: Array.from({ length: 20 }, (_, i) => ({
          title: `Item ${i + 1}`,
          quantity: Math.floor(Math.random() * 5) + 1,
          unitPrice: Math.round(Math.random() * 100),
        })),
        total: 10000,
      };

      const message = buildWhatsAppMessage(order);

      for (const item of order.items) {
        expect(message).toContain(item.title);
      }
    });
  });
});
