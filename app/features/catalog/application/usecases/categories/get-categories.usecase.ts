import { ICategoryRepository } from '../../../domain/repositories/category.repository';
import { CategoryDTO, toCategoryDTO } from '../../dtos/category.dto';

export class GetCategoriesUseCase {
  constructor(private readonly categoryRepo: ICategoryRepository) {}

  async execute(): Promise<CategoryDTO[]> {
    const categories = await this.categoryRepo.findAll({ isActive: true });
    return categories.map(toCategoryDTO);
  }
}
