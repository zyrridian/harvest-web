import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LoginUseCase } from './login.usecase';
import { IAuthRepository } from '../../domain/repositories/auth.repository';
import { AppError } from '@/core/errors';
import * as passwordService from '../services/password.service';
import * as tokenService from '../services/token.service';

// Mock the services
vi.mock('../services/password.service');
vi.mock('../services/token.service');

describe('LoginUseCase', () => {
  let mockRepo: IAuthRepository;
  let useCase: LoginUseCase;

  beforeEach(() => {
    // Create a mock repository
    mockRepo = {
      findByEmail: vi.fn(),
      updateOnlineStatus: vi.fn(),
      deleteRefreshTokens: vi.fn(),
      createRefreshToken: vi.fn(),
      // Add other missing methods with vi.fn() if necessary depending on IAuthRepository
    } as unknown as IAuthRepository;

    useCase = new LoginUseCase(mockRepo);
    vi.clearAllMocks();
  });

  it('should successfully login and return tokens', async () => {
    // Arrange
    const mockUser = { 
      id: '1', 
      email: 'test@test.com', 
      password: 'hashed_password', 
      userType: 'FARMER',
      createdAt: new Date(),
      updatedAt: new Date()
    };
    vi.mocked(mockRepo.findByEmail).mockResolvedValue(mockUser as any);
    vi.mocked(passwordService.comparePassword).mockResolvedValue(true);
    vi.mocked(tokenService.signAccessToken).mockResolvedValue('access_token');
    vi.mocked(tokenService.signRefreshToken).mockResolvedValue('refresh_token');

    // Act
    const result = await useCase.execute({ email: 'test@test.com', password: 'password123' });

    // Assert
    expect(mockRepo.findByEmail).toHaveBeenCalledWith('test@test.com');
    expect(mockRepo.updateOnlineStatus).toHaveBeenCalledWith('1', true);
    expect(result.access_token).toBe('access_token');
    expect(result.refresh_token).toBe('refresh_token');
  });

  it('should throw Unauthorized error for invalid email', async () => {
    // Arrange
    vi.mocked(mockRepo.findByEmail).mockResolvedValue(null); // User not found

    // Act & Assert
    await expect(useCase.execute({ email: 'wrong@test.com', password: 'password123' }))
      .rejects
      .toThrowError(AppError.unauthorized('Invalid credentials'));
  });
});
