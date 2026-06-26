import { describe, it, expect, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from './route';

vi.mock('@/features/auth/application/usecases/refresh-token.usecase', () => {
  return {
    RefreshTokenUseCase: class {
      execute = vi.fn().mockResolvedValue({
        access_token: 'new_access',
        refresh_token: 'new_refresh',
      });
    }
  };
});

describe('POST /api/v1/auth/refresh', () => {
  it('should return 200 and set new refresh_token cookie', async () => {
    const req = new NextRequest('http://localhost/api/v1/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refresh_token: 'old_refresh' }),
    });

    const res = await POST(req);

    expect(res.status).toBe(200);
    const cookies = res.headers.get('Set-Cookie');
    expect(cookies).toContain('refresh_token=new_refresh');
  });
});
