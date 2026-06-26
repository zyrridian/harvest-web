import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GetCategoriesUseCase } from './get-categories.usecase';
import { ICategoryRepository } from '../../../domain/repositories/category.repository';
import { CategoryEntity } from '../../../domain/entities/category.entity';

describe('GetCategoriesUseCase', () => {
  let mockRepo: ICategoryRepository;
  let useCase: GetCategoriesUseCase;

  beforeEach(() => {
    mockRepo = {
      findAll: vi.fn(),
      findByIdOrSlug: vi.fn(),
    } as unknown as ICategoryRepository;

    useCase = new GetCategoriesUseCase(mockRepo);
    vi.clearAllMocks();
  });

  it('should return a list of categories mapped to DTOs', async () => {
    // Arrange
    const mockCategories: CategoryEntity[] = [
      {
        id: '1',
        name: 'Vegetables',
        slug: 'vegetables',
        description: 'Fresh veggies',
        emoji: '🥬',
        gradientColors: ['#000', '#fff'],
        productCount: 10,
        displayOrder: 1,
        isActive: true,
      },
    ];
    vi.mocked(mockRepo.findAll).mockResolvedValue(mockCategories);

    // Act
    const result = await useCase.execute();

    // Assert
    expect(mockRepo.findAll).toHaveBeenCalledWith({ isActive: true });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('1');
    expect(result[0].name).toBe('Vegetables');
    expect(result[0].gradient_colors).toEqual(['#000', '#fff']);
    expect(result[0].is_active).toBe(true);
  });
});
