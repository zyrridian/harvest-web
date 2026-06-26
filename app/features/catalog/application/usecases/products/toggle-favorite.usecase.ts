import { IProductRepository } from '../../../domain/repositories/product.repository';
import { AppError } from '@/core/errors';

export class ToggleFavoriteUseCase {
  constructor(private readonly productRepo: IProductRepository) {}

  async execute(userId: string, productId: string): Promise<{ added: boolean }> {
    const product = await this.productRepo.findById(productId);
    if (!product) {
      throw AppError.notFound("Product not found");
    }
    return this.productRepo.toggleFavorite(userId, productId);
  }
}
