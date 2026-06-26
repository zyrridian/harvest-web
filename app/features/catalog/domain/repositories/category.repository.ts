import { CategoryEntity } from '../entities/category.entity';

export interface ICategoryRepository {
  findAll(options?: { isActive?: boolean }): Promise<CategoryEntity[]>;
  findByIdOrSlug(idOrSlug: string): Promise<CategoryEntity | null>;
}
