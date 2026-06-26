import { describe, it, expect, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from './route';

vi.mock('@/features/catalog/application/usecases/products/get-products.usecase', () => {
  return {
    GetProductsUseCase: class {
      execute = vi.fn().mockResolvedValue({
        products: [{ id: 'p1', name: 'Tomato' }],
        pagination: { current_page: 1, total_pages: 1 }
      });
    }
  };
});

describe('GET /api/v1/catalog/products', () => {
  it('should return products with pagination when query is valid', async () => {
    const req = new NextRequest('http://localhost/api/v1/catalog/products?page=1&limit=10', {
      method: 'GET',
    });

    const res = await GET(req);
    expect(res.status).toBe(200);
    
    const json = await res.json();
    expect(json.status).toBe('success');
    expect(json.data.products).toHaveLength(1);
    expect(json.data.products[0].name).toBe('Tomato');
    expect(json.data.pagination.current_page).toBe(1);
  });
});
