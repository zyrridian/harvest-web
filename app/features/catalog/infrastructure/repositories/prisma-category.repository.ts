import prisma from '@/core/database/prisma';
import { ICategoryRepository } from '../../domain/repositories/category.repository';
import { CategoryEntity } from '../../domain/entities/category.entity';

export class PrismaCategoryRepository implements ICategoryRepository {
  async findAll(options?: { isActive?: boolean }): Promise<CategoryEntity[]> {
    const categories = await prisma.category.findMany({
      where: options?.isActive !== undefined ? { isActive: options.isActive } : undefined,
      orderBy: { displayOrder: 'asc' },
      include: { _count: { select: { products: true } } },
    });

    return categories.map((cat) => this.mapToEntity(cat));
  }

  async findByIdOrSlug(idOrSlug: string): Promise<CategoryEntity | null> {
    const category = await prisma.category.findFirst({
      where: { OR: [{ id: idOrSlug }, { slug: idOrSlug }] },
      include: { _count: { select: { products: true } } },
    });

    if (!category) return null;
    return this.mapToEntity(category);
  }

  private mapToEntity(prismaData: any): CategoryEntity {
    return {
      id: prismaData.id,
      name: prismaData.name,
      slug: prismaData.slug,
      description: prismaData.description,
      emoji: prismaData.emoji,
      gradientColors: prismaData.gradientColors,
      productCount: prismaData._count?.products ?? prismaData.productCount,
      displayOrder: prismaData.displayOrder,
      isActive: prismaData.isActive,
    };
  }
}

export const categoryRepository = new PrismaCategoryRepository();
