import { ProductEntity } from '../entities/product.entity';

export interface FindProductsQuery {
  searchQuery?: string;
  categoryId?: string | null;
  categorySlug?: string | null;
  sellerId?: string | null;
  isOrganic?: boolean | null;
  minPrice?: number | null;
  maxPrice?: number | null;
  isAvailable?: boolean;
}

export interface PaginationOptions {
  skip: number;
  take: number;
  sortBy?: string;
  order?: 'asc' | 'desc';
}

export interface IProductRepository {
  findMany(query: FindProductsQuery, pagination: PaginationOptions): Promise<[ProductEntity[], number]>;
  findById(id: string): Promise<ProductEntity | null>;
  toggleFavorite(userId: string, productId: string): Promise<{ added: boolean }>;
  recordView(userId: string | null, productId: string): Promise<void>;
  // For reviews
  findReviews(productId: string, skip: number, take: number): Promise<[any[], number]>;
}
