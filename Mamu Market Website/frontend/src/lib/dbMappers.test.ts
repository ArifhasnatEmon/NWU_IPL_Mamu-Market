import { describe, it, expect } from 'vitest';
import { mapProduct, mapOrder } from './dbMappers';

describe('dbMappers', () => {
  describe('mapProduct', () => {
    it('should map a valid row correctly', () => {
      const mockRow = {
        id: '123',
        name: 'Test Product',
        price: 100,
        original_price: 120,
        category: 'electronics',
        units: 50,
        rating: 4.5,
        reviews_count: 10,
        image: 'http://example.com/img.png',
        images: ['http://example.com/img.png'],
        description: 'A test product',
        colors: [{ label: 'Red', value: 'red' }],
      };

      const result = mapProduct(mockRow);

      expect(result.id).toBe('123');
      expect(result.name).toBe('Test Product');
      expect(result.productName).toBe('Test Product');
      expect(result.price).toBe(100);
      expect(result.originalPrice).toBe(120);
      expect(result.category).toBe('Electronics');
      expect(result.inStock).toBe(true);
      expect(result.stockStatus).toBe('in_stock');
      expect(result.units).toBe(50);
      expect(result.image).toBe('http://example.com/img.png');
      expect(result.colors).toEqual([{ label: 'Red', value: 'red' }]);
      expect(result.dealType).toBe('none');
    });

    it('should handle null or missing fields gracefully', () => {
      const mockRow = {
        id: '456',
        name: null,
        price: null,
      };

      // @ts-ignore - simulating bad data from DB
      const result = mapProduct(mockRow);

      expect(result.id).toBe('456');
      expect(result.name).toBe('');
      expect(result.price).toBe(0);
      expect(result.originalPrice).toBe(0);
      expect(result.inStock).toBe(false);
      expect(result.stockStatus).toBe('out_of_stock');
      expect(result.colors).toEqual([]);
      expect(result.specifications).toEqual([]);
    });
  });

  describe('mapOrder', () => {
    it('should map a valid order correctly', () => {
      const mockRow = {
        id: 'ord-123',
        user_name: 'John Doe',
        total: 150.50,
        subtotal: 100,
        delivery_fee: 50.50,
        items: [{ id: 'prod-1', name: 'Item 1', quantity: 1, price: 100 }],
        status: 'pending',
        payment_status: 'paid'
      };

      const result = mapOrder(mockRow);

      expect(result.id).toBe('ord-123');
      expect(result.userName).toBe('John Doe');
      expect(result.total).toBe(150.5);
      expect(result.subtotal).toBe(100);
      expect(result.deliveryFee).toBe(50.5);
      expect(result.items.length).toBe(1);
      expect(result.status).toBe('pending');
      expect(result.paymentStatus).toBe('paid');
    });

    it('should handle null or missing fields gracefully', () => {
      const mockRow = {
        id: 'ord-456'
      };

      const result = mapOrder(mockRow);

      expect(result.id).toBe('ord-456');
      expect(result.userName).toBe('');
      expect(result.total).toBe(0);
      expect(result.items).toEqual([]);
      expect(result.vendorStatuses).toEqual({});
      expect(result.discount).toBe(0);
    });
  });
});
