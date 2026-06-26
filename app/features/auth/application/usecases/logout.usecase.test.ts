import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LogoutUseCase } from './logout.usecase';
import { IAuthRepository } from '../../domain/repositories/auth.repository';

describe('LogoutUseCase', () => {
  let mockRepo: IAuthRepository;
  let useCase: LogoutUseCase;

  beforeEach(() => {
    mockRepo = {
      deleteRefreshTokens: vi.fn(),
      updateOnlineStatus: vi.fn(),
    } as unknown as IAuthRepository;

    useCase = new LogoutUseCase(mockRepo);
    vi.clearAllMocks();
  });

  it('should revoke refresh tokens and mark user offline', async () => {
    // Act
    await useCase.execute('user-1');

    // Assert
    expect(mockRepo.deleteRefreshTokens).toHaveBeenCalledWith('user-1');
    expect(mockRepo.updateOnlineStatus).toHaveBeenCalledWith('user-1', false);
  });
});
