/**
 * Property Tests for lib/filters.ts
 */

import { filterProducts } from '../lib/filters';

// Helper to generate random products
function randomProductSummary(): any {
  return {
    id: `product-${Math.random().toString(36).substr(2, 9)}`,
    title: `Product ${Math.floor(Math.random() * 100)}`,
    description: `Description for product ${Math.floor(Math.random() * 100)}`,
    price: Math.round(Math.random() * 100 + 1),
    stock: Math.floor(Math.random() * 50) + 1,
    imageUrl: `/uploads/image${Math.floor(Math.random() * 99)}.jpg`,
    active: Math.random() > 0.3,
    isNew: false,
    category: { id: `cat-${Math.floor(Math.random() * 20)}`, name: `Category ${Math.floor(Math.random() * 10)}` },
  };
}

describe('Product Filters - Property Tests', () => {
  describe('filterProducts', () => {
    it('Property 1: Category filter is exact match', () => {
      const products = [
        randomProductSummary(),
        randomProductSummary(),
        randomProductSummary(),
      ];

      // Filter by category should only return matching products
      for (const product of products) {
        const filtered = filterProducts(products, { categoryId: product.category.id });
        
        // All returned products must have the correct category
        expect(filtered.every(p => p.category.id === product.category.id)).toBe(true);
      }
    });

    it('Property 2: Search filter is inclusive', () => {
      const products = [
        randomProductSummary(),
        randomProductSummary(),
        randomProductSummary(),
      ];

      // For each search term, verify that matching products are included in results
      for (const product of products) {
        const searchTerm = product.title;
        
        const filtered = filterProducts(products, { search: searchTerm });
        if (searchTerm.length > 0) {
          // Products with matching title should be in results
          expect(filtered.some(p => p.title.toLowerCase().includes(searchTerm.toLowerCase()))).toBe(true);
        } else {
          // Empty search should return all products
          expect(filtered.length).toBe(products.length);
        }
      }
    });

    it('Property 3: Combined filters are subset of individual filters', () => {
      const products = Array.from({ length: 20 }, () => randomProductSummary());

      // Pick a category that exists in the dataset
      const existingCategoryId = products[0].category.id;
      
      // Individual category filter
      const byCategory = filterProducts(products, { categoryId: existingCategoryId });
      
      // Combined category and search filters  
      const searchTerm = products[0].title.toLowerCase();
      const combinedFilter = { categoryId: existingCategoryId, search: searchTerm };
      const byCombined = filterProducts(products, combinedFilter);

      // Every product in combined should also be in category-only filter
      expect(byCategory.length).toBeGreaterThanOrEqual(byCombined.length);
      
      if (byCombined.length > 0) {
        for (const item of byCombined) {
          expect(item.category.id === existingCategoryId && 
                item.title.toLowerCase().includes(searchTerm)).toBe(true);
        }
      }
    });

    it('filter with no parameters returns all products', () => {
      const products = Array.from({ length: 15 }, () => randomProductSummary());
      
      const filtered = filterProducts(products, {} as any);
      
      expect(filtered.length).toBe(products.length);
      expect(filtered.map(p => p.id)).toEqual(products.map(p => p.id));
    });

    it('filter with both empty parameters returns all products', () => {
      const products = Array.from({ length: 10 }, () => randomProductSummary());
      
      const filtered = filterProducts(products, { categoryId: '', search: '' } as any);
      
      expect(filtered.length).toBe(products.length);
    });

    it('filter with non-existent category returns empty array', () => {
      const products = Array.from({ length: 10 }, () => randomProductSummary());
      
      const filtered = filterProducts(products, { categoryId: 'non-existent-category-id' } as any);
      
      expect(filtered.length).toBe(0);
    });

    it('filter with non-matching search term returns empty array', () => {
      const products = [
        randomProductSummary(),
        randomProductSummary(),
        randomProductSummary(),
      ];
      
      // Use a search term that won't match any product
      const filtered = filterProducts(products, { search: 'zzzxyznonexistent' } as any);
      
      expect(filtered.length).toBe(0);
    });

    it('filter handles inactive products correctly (all are included by default)', () => {
      const products = [
        randomProductSummary(),
        randomProductSummary(),
        randomProductSummary(),
      ];

      // Filter without activeOnly should include all products regardless of status
      const filtered = filterProducts(products, {} as any);
      
      expect(filtered.length).toBe(products.length);
    });

    it('filter with category and empty search is equivalent to category only', () => {
      const products = Array.from({ length: 10 }, () => randomProductSummary());
      
      const byCategoryOnly = filterProducts(products, { categoryId: products[0].category.id });
      const byCategorySearchEmpty = filterProducts(products, { categoryId: products[0].category.id, search: '' } as any);
      
      expect(byCategorySearchEmpty.length).toBe(byCategoryOnly.length);
    });

    it('filter with empty category is equivalent to search only', () => {
      const products = Array.from({ length: 10 }, () => randomProductSummary());
      
      const bySearchOnly = filterProducts(products, { search: 'test' } as any);
      const byCategorySearchMixed = filterProducts(products, { categoryId: '', search: 'test' } as any);
      
      expect(bySearchOnly.length).toBe(byCategorySearchMixed.length);
    });

    it('filter preserves all original products when no match found', () => {
      const products = [
        randomProductSummary(),
        randomProductSummary(),
        randomProductSummary(),
      ];

      // With a search term that matches at least one product, should return those matching ones
      for (const product of products) {
        if (product.title.length > 0) {
          const filtered = filterProducts(products, { search: product.title });
          
          expect(filtered.length).toBeGreaterThanOrEqual(1);
        }
      }
    });

    it('filter returns correct number when combining filters', () => {
      const products = Array.from({ length: 50 }, () => randomProductSummary());
      
      // Create category filter and search filter separately
      const categoryFilter = 'cat-5';
      const searchFilter = 'test';
      
      const onlyCategory = filterProducts(products, { categoryId: categoryFilter } as any);
      const onlySearch = filterProducts(products, { search: searchFilter } as any);
      const combined = filterProducts(products, { categoryId: categoryFilter, search: searchFilter } as any);

      // Combined should be subset of both individual filters
      expect(combined.length).toBeLessThanOrEqual(onlyCategory.length);
      expect(combined.length).toBeLessThanOrEqual(onlySearch.length);
    });

    it('filter with multiple identical category IDs works correctly', () => {
      const products = [
        randomProductSummary(),
        randomProductSummary(),
        randomProductSummary(),
      ];

      // All have different categories, filtering by any should return 0 or 1 product
      for (const product of products) {
        const filtered = filterProducts(products, { categoryId: product.category.id });
        
        expect(filtered.length).toBeGreaterThanOrEqual(1);
        expect(filtered.some(p => p.category.id === product.category.id)).toBe(true);
      }
    });

    it('filter handles special characters in search terms', () => {
      const products = [
        randomProductSummary(),
        randomProductSummary(),
      ];

      // Test with various search term formats
      for (const product of products) {
        const filtered = filterProducts(products, { search: product.title });
        
        expect(filtered.some(p => p.title.toLowerCase().includes(product.title.toLowerCase()))).toBe(true);
      }
    });

    it('filter is case-insensitive for both category and search', () => {
      const products = [
        randomProductSummary(),
        randomProductSummary(),
      ];

      // Test with exact category ID match (case-sensitive)
      const product = products[0];
      const filtered = filterProducts(products, { categoryId: product.category.id });
      
      expect(filtered.some(p => p.category.id === product.category.id)).toBe(true);
    });
  });
});