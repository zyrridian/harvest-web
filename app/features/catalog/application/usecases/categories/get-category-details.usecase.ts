import { ICategoryRepository } from '../../../domain/repositories/category.repository';
import { CategoryDTO, toCategoryDTO } from '../../dtos/category.dto';
import { AppError } from '@/core/errors';

export class GetCategoryDetailsUseCase {
  constructor(private readonly categoryRepo: ICategoryRepository) {}

  async execute(idOrSlug: string): Promise<CategoryDTO> {
    const category = await this.categoryRepo.findByIdOrSlug(idOrSlug);
    
    if (!category) {
      throw AppError.notFound("Category not found");
    }
    
    return toCategoryDTO(category);
  }
}
