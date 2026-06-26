import { describe, it, expect, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from './route';

vi.mock('@/features/auth/application/usecases/register.usecase', () => {
  return {
    RegisterUseCase: class {
      execute = vi.fn().mockResolvedValue({
        user: { id: '1', email: 'new@test.com' },
        access_token: 'mock_access',
        refresh_token: 'mock_refresh',
      });
    }
  };
});

describe('POST /api/v1/auth/register', () => {
  it('should return 201 and set refresh_token cookie on success', async () => {
    const mockInput = { email: 'new@test.com', password: 'password123', name: 'Test', user_type: 'CONSUMER' };
    
    const req = new NextRequest('http://localhost/api/v1/auth/register', {
      method: 'POST',
      body: JSON.stringify(mockInput),
    });

    const res = await POST(req);

    expect(res.status).toBe(201);
    const cookies = res.headers.get('Set-Cookie');
    expect(cookies).toContain('refresh_token=mock_refresh');
  });
});
