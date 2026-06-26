import { describe, it, expect, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from './route';

vi.mock('@/features/auth', () => ({
  verifyAuth: vi.fn().mockResolvedValue({ userId: 'user-1' }),
}));

vi.mock('@/features/auth/application/usecases/get-current-user.usecase', () => {
  return {
    GetCurrentUserUseCase: class {
      execute = vi.fn().mockResolvedValue({
        id: 'user-1', email: 'me@test.com'
      });
    }
  };
});

vi.mock('@/core/database/prisma', () => ({
  default: {}
}));

describe('GET /api/v1/auth/me', () => {
  it('should return 200 and user data', async () => {
    const req = new NextRequest('http://localhost/api/v1/auth/me', {
      method: 'GET',
    });

    const res = await GET(req);
    expect(res.status).toBe(200);
    
    const body = await res.json();
    expect(body.data.email).toBe('me@test.com');
  });
});
