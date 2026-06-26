import { IProductRepository } from '../../../domain/repositories/product.repository';
import { ProductDTO, toProductDTO } from '../../dtos/product.dto';
import { AppError } from '@/core/errors';

export class GetProductDetailsUseCase {
  constructor(private readonly productRepo: IProductRepository) {}

  async execute(idOrSlug: string): Promise<ProductDTO> {
    const product = await this.productRepo.findById(idOrSlug);
    
    if (!product) {
      throw AppError.notFound("Product not found");
    }
    
    return toProductDTO(product);
  }
}
