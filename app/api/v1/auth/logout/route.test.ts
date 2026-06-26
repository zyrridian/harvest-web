import { describe, it, expect, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from './route';

vi.mock('@/features/auth', () => ({
  verifyAuth: vi.fn().mockResolvedValue({ userId: 'user-1' }),
}));

vi.mock('@/features/auth/application/usecases/logout.usecase', () => {
  return {
    LogoutUseCase: class {
      execute = vi.fn().mockResolvedValue(undefined);
    }
  };
});

vi.mock('@/core/database/prisma', () => ({
  default: {}
}));

describe('POST /api/v1/auth/logout', () => {
  it('should return 200 and clear refresh_token cookie', async () => {
    const req = new NextRequest('http://localhost/api/v1/auth/logout', {
      method: 'POST',
    });

    const res = await POST(req);

    expect(res.status).toBe(200);
    const cookies = res.headers.get('Set-Cookie');
    expect(cookies).toContain('refresh_token=;');
    expect(cookies).toContain('Max-Age=0');
  });
});
