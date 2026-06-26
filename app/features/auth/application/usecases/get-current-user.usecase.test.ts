import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GetCurrentUserUseCase } from './get-current-user.usecase';
import { IAuthRepository } from '../../domain/repositories/auth.repository';
import { AppError } from '@/core/errors';

describe('GetCurrentUserUseCase', () => {
  let mockRepo: IAuthRepository;
  let useCase: GetCurrentUserUseCase;

  beforeEach(() => {
    mockRepo = {
      findById: vi.fn(),
    } as unknown as IAuthRepository;

    useCase = new GetCurrentUserUseCase(mockRepo);
    vi.clearAllMocks();
  });

  it('should return user details', async () => {
    const mockUser = {
      id: '1', email: 'test@test.com', userType: 'FARMER', createdAt: new Date(), updatedAt: new Date(), lastSeen: new Date()
    };
    vi.mocked(mockRepo.findById).mockResolvedValue(mockUser as any);

    const result = await useCase.execute('1');
    expect(result.id).toBe('1');
    expect(result.email).toBe('test@test.com');
  });

  it('should throw Not Found if user does not exist', async () => {
    vi.mocked(mockRepo.findById).mockResolvedValue(null);
    await expect(useCase.execute('1')).rejects.toThrowError(AppError.notFound('User not found'));
  });
});
