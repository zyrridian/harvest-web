import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GetProductsUseCase } from './get-products.usecase';
import { IProductRepository } from '../../../domain/repositories/product.repository';
import { ProductEntity } from '../../../domain/entities/product.entity';

describe('GetProductsUseCase', () => {
  let mockRepo: IProductRepository;
  let useCase: GetProductsUseCase;

  beforeEach(() => {
    mockRepo = {
      findMany: vi.fn(),
      findByIdOrSlug: vi.fn(),
      findReviews: vi.fn(),
      recordView: vi.fn(),
      toggleFavorite: vi.fn(),
      isFavorited: vi.fn(),
    } as unknown as IProductRepository;

    useCase = new GetProductsUseCase(mockRepo);
    vi.clearAllMocks();
  });

  it('should return products and pagination metadata', async () => {
    // Arrange
    const mockProducts: ProductEntity[] = [
      {
        id: '1',
        name: 'Organic Tomatoes',
        slug: 'organic-tomatoes',
        description: 'Fresh from the farm',
        categoryId: 'cat1',
        categoryName: 'Vegetables',
        sellerId: 'user1',
        sellerName: 'Farmer Bob',
        sellerAvatarUrl: null,
        price: 15000,
        currency: 'IDR',
        unit: 'kg',
        isOrganic: true,
        isAvailable: true,
        stockQuantity: 100,
        rating: 4.5,
        reviewCount: 10,
        isHarvest: false,
        targetAmount: null,
        currentBooked: 0,
        harvestDate: null,
        createdAt: new Date(),
        primaryImageUrl: 'http://example.com/tomato.jpg',
        imageUrls: [],
        tags: [],
        activeDiscountValue: null,
        activeDiscountType: null,
      }
    ];
    vi.mocked(mockRepo.findMany).mockResolvedValue([mockProducts, 1]); // [items, total]

    // Act
    const result = await useCase.execute({}, { skip: 0, take: 10 });

    // Assert
    expect(mockRepo.findMany).toHaveBeenCalledWith({}, { skip: 0, take: 10 });
    expect(result.products).toHaveLength(1);
    expect(result.products[0].id).toBe('1');
    expect(result.products[0].name).toBe('Organic Tomatoes');
    expect(result.products[0].image_url).toBe('http://example.com/tomato.jpg');
    
    expect(result.pagination).toEqual({
      current_page: 1,
      limit: 10,
      total_items: 1,
      total_pages: 1,
    });
  });
});
