import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RefreshTokenUseCase } from './refresh-token.usecase';
import { IAuthRepository } from '../../domain/repositories/auth.repository';
import { AppError } from '@/core/errors';
import * as tokenService from '../services/token.service';

vi.mock('../services/token.service');

describe('RefreshTokenUseCase', () => {
  let mockRepo: IAuthRepository;
  let useCase: RefreshTokenUseCase;

  beforeEach(() => {
    mockRepo = {
      findRefreshToken: vi.fn(),
      deleteRefreshTokens: vi.fn(),
      rotateRefreshToken: vi.fn(),
    } as unknown as IAuthRepository;

    useCase = new RefreshTokenUseCase(mockRepo);
    vi.clearAllMocks();
  });

  it('should refresh tokens successfully', async () => {
    vi.mocked(tokenService.verifyToken).mockResolvedValue({ type: 'refresh' } as any);
    
    const storedToken = {
      id: 'token-1',
      expiresAt: new Date(Date.now() + 10000), // Not expired
      user: { id: '1', userType: 'FARMER' }
    };
    vi.mocked(mockRepo.findRefreshToken).mockResolvedValue(storedToken as any);
    
    vi.mocked(tokenService.signAccessToken).mockResolvedValue('new_access');
    vi.mocked(tokenService.signRefreshToken).mockResolvedValue('new_refresh');
    vi.mocked(tokenService.getRefreshTokenExpiry).mockReturnValue(new Date());

    const result = await useCase.execute('old_refresh');

    expect(result.access_token).toBe('new_access');
    expect(result.refresh_token).toBe('new_refresh');
    expect(mockRepo.rotateRefreshToken).toHaveBeenCalledWith('token-1', 'new_refresh', expect.any(Date));
  });

  it('should throw if token is expired', async () => {
    vi.mocked(tokenService.verifyToken).mockResolvedValue({ type: 'refresh' } as any);
    
    const storedToken = {
      id: 'token-1',
      expiresAt: new Date(Date.now() - 10000), // Expired
      user: { id: '1', userType: 'FARMER' }
    };
    vi.mocked(mockRepo.findRefreshToken).mockResolvedValue(storedToken as any);

    await expect(useCase.execute('old_refresh')).rejects.toThrowError(AppError.unauthorized('Refresh token expired'));
    expect(mockRepo.deleteRefreshTokens).toHaveBeenCalledWith('1');
  });
});
