import { IProductRepository } from '../../../domain/repositories/product.repository';

export class RecordProductViewUseCase {
  constructor(private readonly productRepo: IProductRepository) {}

  async execute(userId: string | null, productId: string): Promise<void> {
    // Check product exists silently, if not exist, just return
    const product = await this.productRepo.findById(productId);
    if (!product) return;
    
    await this.productRepo.recordView(userId, productId);
  }
}
