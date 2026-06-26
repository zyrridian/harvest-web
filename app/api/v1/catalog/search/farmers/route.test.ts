import { describe, it, expect, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from './route';

vi.mock('@/features/catalog/application/usecases/search/get-farmers.usecase', () => {
  return {
    GetFarmersUseCase: class {
      execute = vi.fn().mockResolvedValue({
        farmers: [{ id: 'f1', name: 'Farmer Bob' }],
        pagination: { current_page: 1, total_pages: 1 }
      });
    }
  };
});

describe('GET /api/v1/catalog/search/farmers', () => {
  it('should return farmers when valid query is provided', async () => {
    const req = new NextRequest('http://localhost/api/v1/catalog/search/farmers?q=Bob&page=1&limit=10', {
      method: 'GET',
    });

    const res = await GET(req);
    expect(res.status).toBe(200);
    
    const json = await res.json();
    expect(json.status).toBe('success');
    expect(json.data).toHaveLength(1);
    expect(json.data[0].name).toBe('Farmer Bob');
  });

  it('should return 400 Bad Request when q parameter is missing', async () => {
    const req = new NextRequest('http://localhost/api/v1/catalog/search/farmers?page=1&limit=10', {
      method: 'GET',
    });

    const res = await GET(req);
    expect(res.status).toBe(400);
    
    const json = await res.json();
    expect(json.status).toBe('error');
    expect(json.message).toBe('Invalid query parameters');
  });
});
