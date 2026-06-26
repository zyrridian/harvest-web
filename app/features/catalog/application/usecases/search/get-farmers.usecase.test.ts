import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GetFarmersUseCase } from './get-farmers.usecase';
import { IFarmerRepository } from '../../../domain/repositories/farmer.repository';
import { FarmerEntity } from '../../../domain/entities/farmer.entity';

describe('GetFarmersUseCase', () => {
  let mockRepo: IFarmerRepository;
  let useCase: GetFarmersUseCase;

  beforeEach(() => {
    mockRepo = {
      findMany: vi.fn(),
    } as unknown as IFarmerRepository;

    useCase = new GetFarmersUseCase(mockRepo);
    vi.clearAllMocks();
  });

  it('should return farmers mapped to DTOs and pagination metadata', async () => {
    // Arrange
    const mockFarmers: FarmerEntity[] = [
      {
        id: '1',
        userId: 'u1',
        name: 'Farmer Bob',
        description: 'Best farm in town',
        profileImage: null,
        rating: 4.8,
        city: 'Bandung',
        specialties: ['Vegetables', 'Fruits'],
        totalProducts: 5,
      }
    ];
    vi.mocked(mockRepo.findMany).mockResolvedValue([mockFarmers, 1]);

    // Act
    const query = { searchQuery: 'Bob', specialties: ['Vegetables'], minRating: 4.0 };
    const result = await useCase.execute(query, { skip: 0, take: 20, page: 1 });

    // Assert
    expect(mockRepo.findMany).toHaveBeenCalledWith(query, 0, 20);
    expect(result.farmers).toHaveLength(1);
    expect(result.farmers[0].id).toBe('1');
    expect(result.farmers[0].name).toBe('Farmer Bob');
    expect(result.farmers[0].city).toBe('Bandung');
    expect(result.farmers[0].specialties).toContain('Vegetables');
    
    // Check pagination meta
    expect(result.pagination).toEqual({
      current_page: 1,
      limit: 20,
      total_items: 1,
      total_pages: 1,
    });
  });
});
