import { CategoryEntity } from '../../domain/entities/category.entity';

export interface CategoryDTO {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  emoji: string | null;
  gradient_colors: string[];
  product_count: number;
  display_order: number;
  is_active: boolean;
}

export function toCategoryDTO(category: CategoryEntity): CategoryDTO {
  return {
    id: category.id,
    name: category.name,
    slug: category.slug,
    description: category.description,
    emoji: category.emoji,
    gradient_colors: category.gradientColors,
    product_count: category.productCount,
    display_order: category.displayOrder,
    is_active: category.isActive,
  };
}
