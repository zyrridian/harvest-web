import { IProductRepository, FindProductsQuery, PaginationOptions } from '../../../domain/repositories/product.repository';
import { ProductDTO, toProductDTO } from '../../dtos/product.dto';
import { buildPaginationMeta } from '@/core/helpers/pagination';

export class GetProductsUseCase {
  constructor(private readonly productRepo: IProductRepository) {}

  async execute(query: FindProductsQuery, pagination: PaginationOptions): Promise<{ products: ProductDTO[], pagination: any }> {
    const [products, totalItems] = await this.productRepo.findMany(query, pagination);
    
    return {
      products: products.map(toProductDTO),
      pagination: buildPaginationMeta(
        Math.floor(pagination.skip / pagination.take) + 1,
        pagination.take,
        totalItems
      ),
    };
  }
}
