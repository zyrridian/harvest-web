import { describe, it, expect, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from './route';
import { LoginUseCase } from '@/features/auth/application/usecases/login.usecase';

// Mock the UseCase so we don't trigger real business logic
vi.mock('@/features/auth/application/usecases/login.usecase', () => {
  return {
    LoginUseCase: class {
      execute = vi.fn().mockResolvedValue({
        user: { id: '1', email: 'test@test.com' },
        access_token: 'mock_access',
        refresh_token: 'mock_refresh',
      });
    }
  };
});

describe('POST /api/v1/auth/login', () => {
  it('should return 200 and set refresh_token cookie on success', async () => {
    // Arrange
    const mockInput = { email: 'test@test.com', password: 'password123' };
    
    // Mock the NextRequest
    const req = new NextRequest('http://localhost/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify(mockInput),
    });

    // Act
    const res = await POST(req);

    // Assert
    expect(res.status).toBe(200);
    
    // Check if the cookie was set correctly
    const cookies = res.headers.get('Set-Cookie');
    expect(cookies).toContain('refresh_token=mock_refresh');
    expect(cookies).toContain('HttpOnly');
  });
});
