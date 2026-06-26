import { describe, it, expect, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from './route';

vi.mock('@/features/catalog/application/usecases/categories/get-categories.usecase', () => {
  return {
    GetCategoriesUseCase: class {
      execute = vi.fn().mockResolvedValue([
        { id: '1', name: 'Vegetables' },
        { id: '2', name: 'Fruits' }
      ]);
    }
  };
});

describe('GET /api/v1/catalog/categories', () => {
  it('should return a list of categories', async () => {
    // Arrange
    const req = new NextRequest('http://localhost/api/v1/catalog/categories', {
      method: 'GET',
    });

    // Act
    const res = await GET(req);

    // Assert
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.status).toBe('success');
    expect(json.data).toHaveLength(2);
    expect(json.data[0].name).toBe('Vegetables');
  });
});
