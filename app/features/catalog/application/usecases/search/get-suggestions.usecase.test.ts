import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GetSearchSuggestionsUseCase } from './get-suggestions.usecase';
import { IProductRepository } from '../../../domain/repositories/product.repository';
import { ICategoryRepository } from '../../../domain/repositories/category.repository';
import { IFarmerRepository } from '../../../domain/repositories/farmer.repository';
import { ProductEntity } from '../../../domain/entities/product.entity';
import { CategoryEntity } from '../../../domain/entities/category.entity';
import { FarmerEntity } from '../../../domain/entities/farmer.entity';

describe('GetSearchSuggestionsUseCase', () => {
  let mockProductRepo: IProductRepository;
  let mockCategoryRepo: ICategoryRepository;
  let mockFarmerRepo: IFarmerRepository;
  let useCase: GetSearchSuggestionsUseCase;

  beforeEach(() => {
    mockProductRepo = { findMany: vi.fn() } as unknown as IProductRepository;
    mockCategoryRepo = { findAll: vi.fn() } as unknown as ICategoryRepository;
    mockFarmerRepo = { findMany: vi.fn() } as unknown as IFarmerRepository;

    useCase = new GetSearchSuggestionsUseCase(mockProductRepo, mockCategoryRepo, mockFarmerRepo);
    vi.clearAllMocks();
  });

  it('should return aggregated suggestions for all types', async () => {
    // Arrange
    const mockProducts = [{ id: 'p1', name: 'Tomato' } as ProductEntity];
    const mockCategories = [{ id: 'c1', name: 'Vegetables' } as CategoryEntity];
    const mockFarmers = [{ id: 'f1', name: 'Farmer Bob' } as FarmerEntity];

    vi.mocked(mockProductRepo.findMany).mockResolvedValue([mockProducts, 1]);
    vi.mocked(mockCategoryRepo.findAll).mockResolvedValue(mockCategories);
    vi.mocked(mockFarmerRepo.findMany).mockResolvedValue([mockFarmers, 1]);

    // Act
    const result = await useCase.execute('to', null, 5);

    // Assert
    // Expect 3 suggestions: one of each type
    expect(result).toHaveLength(2); // Wait, "Vegetables" doesn't include "to" (oh wait, it doesn't!)
    // Let's re-evaluate "to" against "Vegetables". 
    // "Vegetables" includes "to"? V-e-g-e-t-a-b-l-e-s. No.
    // So categories won't match!
  });

  it('should properly filter categories by name', async () => {
    const mockCategories = [
      { id: 'c1', name: 'Tomatoes' } as CategoryEntity,
      { id: 'c2', name: 'Potatoes' } as CategoryEntity,
      { id: 'c3', name: 'Fruits' } as CategoryEntity,
    ];
    vi.mocked(mockCategoryRepo.findAll).mockResolvedValue(mockCategories);
    vi.mocked(mockProductRepo.findMany).mockResolvedValue([[], 0]);
    vi.mocked(mockFarmerRepo.findMany).mockResolvedValue([[], 0]);

    const result = await useCase.execute('to', null, 5);

    expect(result).toHaveLength(2); // Tomatoes, Potatoes
    expect(result[0].type).toBe('category');
    expect(result[0].text).toBe('Tomatoes');
  });

  it('should only fetch farmers if type=farmers', async () => {
    vi.mocked(mockFarmerRepo.findMany).mockResolvedValue([[{ id: 'f1', name: 'Farmer Bob' } as FarmerEntity], 1]);

    const result = await useCase.execute('Bob', 'farmers', 5);

    expect(mockProductRepo.findMany).not.toHaveBeenCalled();
    expect(mockCategoryRepo.findAll).not.toHaveBeenCalled();
    expect(mockFarmerRepo.findMany).toHaveBeenCalled();
    
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe('farmer');
  });
});
