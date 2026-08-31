/**
 * Property Tests for lib/cart.ts
 */

import { loadCart, saveCart, addItem, updateQty, removeItem, cartTotal, itemSubtotal, clearCart } from '../lib/cart';

// In Node test environment (typeof window === 'undefined'), loadCart/saveCart
// need a fake window + localStorage. We set that up once for the whole file.
let mockStorage: Record<string, string | null> = {};

beforeAll(() => {
  // Make `typeof window` return something other than 'undefined'
  (global as any).window = global;
  (global as any).localStorage = {
    getItem: (key: string) => mockStorage[key] ?? null,
    setItem: (key: string, value: string) => { mockStorage[key] = value; },
    removeItem: (key: string) => { delete mockStorage[key]; },
    clear: () => { mockStorage = {}; },
  };
});

afterAll(() => {
  delete (global as any).window;
  delete (global as any).localStorage;
});

beforeEach(() => {
  // Clear storage before each test to avoid cross-test contamination
  mockStorage = {};
});

describe('Cart - Property Tests', () => {
  // Helper to generate a random cart item
  function randomCartItem(): { productId: string; title: string; price: number; quantity: number; stock: number } {
    return {
      productId: `product-${Math.random().toString(36).substr(2, 9)}`,
      title: `Product ${Math.floor(Math.random() * 100)}`,
      price: Math.round(Math.random() * 50 + 1),
      quantity: Math.floor(Math.random() * 10) + 1,
      stock: Math.floor(Math.random() * 50) + 10, // ensure stock >= 10 so tests don't hit cap unexpectedly
    };
  }

  // Property 5: Adición al carrito es un round-trip de localStorage
  it('Property 5: Addition to cart is a localhost round-trip of localStorage', () => {
    const originalCart = loadCart();
    const newItem = randomCartItem();
    const updatedCart = addItem(originalCart, newItem);

    saveCart(updatedCart);
    const loadedCart = loadCart();

    // The loaded cart should have the same items as the saved cart
    expect(loadedCart.items).toHaveLength(originalCart.items.length + 1);
  });

  // Property 6: Adición acumulativa incrementa cantidad sin duplicar
  it('Property 6: Accumulative addition increments quantity without duplicating', () => {
    const item = randomCartItem();
    item.stock = 100; // large stock so we don't hit the cap

    let cart = { items: [] as any[] } as any;
    let totalAdded = 0;

    // Add the same item multiple times with different quantities
    for (let i = 0; i < 5; i++) {
      const qty = Math.floor(Math.random() * 3) + 1;
      totalAdded += qty;
      cart = addItem(cart, item, qty);
    }

    // The product should only appear once in the cart
    expect(cart.items).toHaveLength(1);
    // The quantity should be the sum of all additions (capped at stock)
    const expectedQty = Math.min(totalAdded, item.stock);
    expect(cart.items[0].quantity).toBe(expectedQty);
  });

  // Property 7: Subtotales y total son consistentes con precio × cantidad
  it('Property 7: Subtotals and total are consistent with price × quantity', () => {
    // Use items with unique productIds to avoid merging
    const items = Array.from({ length: 5 }, (_, idx) => ({
      productId: `unique-product-${idx}`,
      title: `Product ${idx}`,
      price: Math.round(Math.random() * 50 + 1),
      quantity: Math.floor(Math.random() * 5) + 1,
      stock: 100, // large stock so qty is not capped
    }));

    let cart: any = { items: [] };
    for (const item of items) {
      cart = addItem(cart, item, item.quantity);
    }

    // Cart total should equal sum of individual item subtotals
    const expectedTotal = cart.items.reduce(
      (sum: number, cartItem: any) => sum + cartItem.price * cartItem.quantity,
      0
    );
    expect(cartTotal(cart)).toBe(expectedTotal);

    // Each item subtotal should be price × quantity
    for (const cartItem of cart.items) {
      expect(itemSubtotal(cartItem)).toBe(cartItem.price * cartItem.quantity);
    }
  });

  // Property 8: Eliminar CartItem reduce el carrito en exactamente un ítem
  it('Property 8: Removing CartItem reduces the cart by exactly one item', () => {
    // Build a cart with at least one item
    const item = randomCartItem();
    const cartWithItem = addItem({ items: [] }, item);

    const productIdToRemove = cartWithItem.items[0].productId;
    const updatedCart = removeItem(cartWithItem, productIdToRemove);

    expect(updatedCart.items).toHaveLength(cartWithItem.items.length - 1);

    // Removing from empty cart returns empty cart
    const emptyCart = removeItem({ items: [] }, 'non-existent-product');
    expect(emptyCart.items).toHaveLength(0);
  });

  // Property 9: La cantidad en el carrito nunca supera el stock del producto
  it('Property 9: Quantity in cart never exceeds product stock', () => {
    // Create a scenario with low stock item
    const lowStockItem = {
      productId: 'low-stock-product',
      title: 'Low Stock',
      price: 10,
      quantity: 5,
      stock: 2,
    };

    let cart: any = { items: [] };
    for (let i = 0; i < 10; i++) {
      cart = addItem(cart, lowStockItem);
    }

    // Verify that no item exceeds its stock limit
    for (const cartItem of cart.items) {
      expect(cartItem.quantity).toBeLessThanOrEqual(cartItem.stock);
    }
  });

  describe('Edge Cases', () => {
    it('clearCart returns empty cart', () => {
      const cleared = clearCart();
      expect(cleared.items).toHaveLength(0);
    });

    it('addItem with zero quantity adds nothing', () => {
      const item = randomCartItem();
      const cart = { items: [] as any[] } as any;

      // Adding with 0 quantity should not add the item
      const result = addItem(cart, item, 0);
      expect(result.items).toHaveLength(0);
    });

    it('updateQty with zero removes the item', () => {
      const item = randomCartItem();
      const cart = addItem({ items: [] }, item);
      const productId = cart.items[0].productId;
      const updated = updateQty(cart, productId, 0);

      // The item should be removed when quantity is set to 0
      expect(updated.items.some((i: any) => i.productId === productId)).toBe(false);
    });

    it('saveCart and loadCart maintain data integrity', () => {
      const items = Array.from({ length: 5 }, () => randomCartItem());
      let cart: any = { items: [] };
      for (const item of items) {
        cart = addItem(cart, item);
      }

      saveCart(cart);
      const loaded = loadCart();

      expect(loaded.items).toHaveLength(cart.items.length);
    });

    it('loadCart handles invalid localStorage gracefully', () => {
      // localStorage returns null (no stored value)
      mockStorage = {};
      const cart = loadCart();
      expect(cart.items).toHaveLength(0);
    });

    it('loadCart handles corrupted localStorage gracefully', () => {
      // Store invalid JSON
      mockStorage['ecommerce_cart'] = 'not-valid-json';
      const cart = loadCart();
      expect(cart.items).toHaveLength(0);
    });

    it('loadCart handles object without items array gracefully', () => {
      // Valid JSON but wrong shape — missing items array
      mockStorage['ecommerce_cart'] = JSON.stringify({ foo: 'bar' });
      const cart = loadCart();
      expect(cart.items).toHaveLength(0);
    });

    it('loadCart handles items being a non-array gracefully', () => {
      // items exists but is not an array
      mockStorage['ecommerce_cart'] = JSON.stringify({ items: 'invalid' });
      const cart = loadCart();
      expect(cart.items).toHaveLength(0);
    });

    it('loadCart handles null value gracefully', () => {
      mockStorage['ecommerce_cart'] = JSON.stringify(null);
      const cart = loadCart();
      expect(cart.items).toHaveLength(0);
    });

    it('saveCart does not throw when localStorage is available', () => {
      const item = randomCartItem();
      const cart = addItem({ items: [] }, item);
      expect(() => saveCart(cart)).not.toThrow();
    });

    it('loadCart uses user-specific key when userId is provided', () => {
      const userId = 'user-123';
      const item = randomCartItem();
      const userCart = addItem({ items: [] }, item);
      saveCart(userCart, userId);

      // Guest cart should be empty
      const guestCart = loadCart();
      expect(guestCart.items).toHaveLength(0);

      // User cart should have the item
      const loadedUserCart = loadCart(userId);
      expect(loadedUserCart.items).toHaveLength(1);
    });

    it('updateQty with quantity larger than stock respects stock limit', () => {
      const item = { productId: 'p1', title: 'T', price: 10, stock: 5 };
      const cart = addItem({ items: [] }, item, 1);
      const updated = updateQty(cart, 'p1', 8);
      expect(updated.items[0].quantity).toBeLessThanOrEqual(5);
    });

    it('addItem with existing product increases quantity correctly', () => {
      const item = randomCartItem();
      item.stock = 100;

      // Start with item already at qty=1, then add 3 more
      const cart1 = addItem({ items: [] }, item, 1);
      const cart2 = addItem(cart1, item, 3);

      expect(cart2.items[0].quantity).toBe(4);
    });

    it("addItem doesn't modify original item object", () => {
      const originalItem = randomCartItem();
      const originalQty = originalItem.quantity;
      addItem({ items: [] }, originalItem);

      // The original item's quantity field should not have been mutated
      expect(originalItem.quantity).toBe(originalQty);
    });

    it('updateQty with zero or negative quantity removes the item', () => {
      const item = randomCartItem();
      const cart = addItem({ items: [] }, item);

      expect(updateQty(cart, cart.items[0].productId, 0).items.length).toBe(0);
      expect(updateQty(cart, cart.items[0].productId, -1).items.length).toBe(0);
    });

    it('clearCart resets all items', () => {
      const item = randomCartItem();
      const filledCart = addItem({ items: [] }, item);
      const cleared = clearCart();

      expect(cleared.items).toHaveLength(0);
      expect(cartTotal(cleared)).toBe(0);
    });

    it('itemSubtotal calculation is correct for various quantities', () => {
      expect(itemSubtotal({ productId: 'a', title: 'A', price: 10, quantity: 5, stock: 10 })).toBe(50);
      expect(itemSubtotal({ productId: 'b', title: 'B', price: 9.99, quantity: 2, stock: 10 })).toBeCloseTo(19.98, 5);
      expect(itemSubtotal({ productId: 'c', title: 'C', price: 0, quantity: 5, stock: 10 })).toBe(0);
    });

    it('cartTotal calculation is correct for multiple items', () => {
      const item1 = { productId: 'p1', title: 'Item 1', price: 10, stock: 100 };
      const item2 = { productId: 'p2', title: 'Item 2', price: 20, stock: 100 };

      const cart = addItem(addItem({ items: [] }, item1, 2), item2, 3);

      expect(cartTotal(cart)).toBe(10 * 2 + 20 * 3); // 20 + 60 = 80
    });

    it('addItem respects stock limit when adding to existing product', () => {
      const item = { productId: 'p-stock', title: 'Stock Item', price: 10, stock: 5 };

      // Add 3, then add 3 more — should cap at stock=5
      const cart1 = addItem({ items: [] }, item, 3);
      const cart2 = addItem(cart1, item, 3);

      expect(cart2.items[0].quantity).toBeLessThanOrEqual(item.stock);
    });

    it('addItem with zero stock prevents adding', () => {
      const item = { productId: 'p-zero', title: 'Zero Stock', price: 10, stock: 0 };

      const result = addItem({ items: [] }, item);
      expect(result.items).toHaveLength(0);
    });

    it('addItem with negative quantity adds nothing', () => {
      const item = randomCartItem();

      const result = addItem({ items: [] }, item, -5);
      expect(result.items).toHaveLength(0);
    });
  });
});
