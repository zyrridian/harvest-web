import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RegisterUseCase } from './register.usecase';
import { IAuthRepository } from '../../domain/repositories/auth.repository';
import { AppError } from '@/core/errors';
import * as passwordService from '../services/password.service';
import * as tokenService from '../services/token.service';

vi.mock('../services/password.service');
vi.mock('../services/token.service');

describe('RegisterUseCase', () => {
  let mockRepo: IAuthRepository;
  let useCase: RegisterUseCase;

  beforeEach(() => {
    mockRepo = {
      findByEmail: vi.fn(),
      create: vi.fn(),
      createRefreshToken: vi.fn(),
    } as unknown as IAuthRepository;

    useCase = new RegisterUseCase(mockRepo);
    vi.clearAllMocks();
  });

  it('should successfully register a user', async () => {
    // Arrange
    const input = { email: 'new@test.com', password: 'password123', name: 'New User', user_type: 'FARMER' as any };
    vi.mocked(mockRepo.findByEmail).mockResolvedValue(null); // No existing user
    vi.mocked(passwordService.hashPassword).mockResolvedValue('hashed_password');
    
    const createdUser = { id: '1', email: 'new@test.com', userType: 'FARMER', createdAt: new Date(), updatedAt: new Date() };
    vi.mocked(mockRepo.create).mockResolvedValue(createdUser as any);
    
    vi.mocked(tokenService.signAccessToken).mockResolvedValue('access_token');
    vi.mocked(tokenService.signRefreshToken).mockResolvedValue('refresh_token');

    // Act
    const result = await useCase.execute(input);

    // Assert
    expect(mockRepo.findByEmail).toHaveBeenCalledWith('new@test.com');
    expect(mockRepo.create).toHaveBeenCalledWith({
      email: 'new@test.com',
      password: 'hashed_password',
      name: 'New User',
      phoneNumber: null,
      userType: 'FARMER',
    });
    expect(result.access_token).toBe('access_token');
  });

  it('should throw BadRequest error if email already exists', async () => {
    // Arrange
    const input = { email: 'exist@test.com', password: 'password123', name: 'User', user_type: 'FARMER' as any };
    vi.mocked(mockRepo.findByEmail).mockResolvedValue({ id: '1' } as any);

    // Act & Assert
    await expect(useCase.execute(input)).rejects.toThrowError(AppError.badRequest('Email already registered'));
  });
});
