import prisma from '@/core/database/prisma';
import { IProductRepository, FindProductsQuery, PaginationOptions } from '../../domain/repositories/product.repository';
import { ProductEntity } from '../../domain/entities/product.entity';

export class PrismaProductRepository implements IProductRepository {
  async findMany(query: FindProductsQuery, pagination: PaginationOptions): Promise<[ProductEntity[], number]> {
    const where: any = {};
    
    if (query.searchQuery) {
      where.OR = [
        { name: { contains: query.searchQuery, mode: "insensitive" } },
        { description: { contains: query.searchQuery, mode: "insensitive" } },
        { longDescription: { contains: query.searchQuery, mode: "insensitive" } },
      ];
    }
    
    if (query.isAvailable !== undefined) {
      where.isAvailable = query.isAvailable;
    }

    if (query.categoryId || query.categorySlug) {
      const catOrs = [];
      if (query.categoryId) catOrs.push({ categoryId: query.categoryId });
      if (query.categorySlug) catOrs.push({ category: { slug: query.categorySlug } });
      
      if (where.OR) {
        where.AND = [ { OR: where.OR }, { OR: catOrs } ];
        delete where.OR;
      } else {
        where.OR = catOrs;
      }
    }
    
    if (query.sellerId) where.sellerId = query.sellerId;
    if (query.isOrganic !== undefined && query.isOrganic !== null) {
      where.isOrganic = query.isOrganic;
    }
    if (query.minPrice || query.maxPrice) {
      const priceFilter: any = {};
      if (query.minPrice) priceFilter.gte = query.minPrice;
      if (query.maxPrice) priceFilter.lte = query.maxPrice;
      where.price = priceFilter;
    }

    const orderBy: any = {};
    if (pagination.sortBy === "price") orderBy.price = pagination.order || "desc";
    else if (pagination.sortBy === "rating") orderBy.rating = pagination.order || "desc";
    else if (pagination.sortBy === "popular") orderBy.viewCount = pagination.order || "desc";
    else orderBy.createdAt = pagination.order || "desc";

    const [products, totalItems] = await Promise.all([
      prisma.product.findMany({
        where,
        skip: pagination.skip,
        take: pagination.take,
        orderBy,
        include: {
          category: { select: { id: true, name: true, slug: true } },
          seller: { select: { id: true, name: true, avatarUrl: true } },
          images: {
            where: { isPrimary: true },
            take: 1,
            select: { url: true, thumbnailUrl: true },
          },
          tags: { select: { tag: true } },
          discounts: {
            where: {
              isActive: true,
              validFrom: { lte: new Date() },
              validUntil: { gte: new Date() },
            },
            take: 1,
            orderBy: { value: "desc" },
          },
        },
      }),
      prisma.product.count({ where }),
    ]);

    // Fetch farmers
    const sellerIds = [...new Set(products.map((p) => p.sellerId))];
    const farmers = await prisma.farmer.findMany({
      where: { userId: { in: sellerIds } },
      select: {
        userId: true,
        name: true,
        profileImage: true,
        isVerified: true,
      },
    });
    const farmerMap = new Map(farmers.map((f) => [f.userId, f]));

    const entities = products.map(product => this.mapToEntity(product, farmerMap.get(product.sellerId)));
    return [entities, totalItems];
  }

  async findById(id: string): Promise<ProductEntity | null> {
    const product = await prisma.product.findFirst({
      where: { OR: [{ id }, { slug: id }] },
      include: {
        category: { select: { id: true, name: true, slug: true } },
        seller: { select: { id: true, name: true, avatarUrl: true } },
        images: { orderBy: { displayOrder: 'asc' } },
        tags: { select: { tag: true } },
        specifications: { orderBy: { displayOrder: 'asc' } },
        discounts: {
          where: { isActive: true, validFrom: { lte: new Date() }, validUntil: { gte: new Date() } },
          take: 1,
        },
      },
    });

    if (!product) return null;

    const farmer = await prisma.farmer.findUnique({
      where: { userId: product.sellerId },
      select: { userId: true, name: true, profileImage: true, isVerified: true },
    });

    return this.mapToEntity(product, farmer);
  }

  async toggleFavorite(userId: string, productId: string): Promise<{ added: boolean }> {
    const existing = await prisma.favorite.findUnique({
      where: { userId_productId: { userId, productId } },
    });

    if (existing) {
      await prisma.favorite.delete({ where: { id: existing.id } });
      return { added: false };
    } else {
      await prisma.favorite.create({ data: { userId, productId } });
      return { added: true };
    }
  }

  async recordView(userId: string | null, productId: string): Promise<void> {
    await prisma.$transaction([
      prisma.productView.create({
        data: { productId, userId },
      }),
      prisma.product.update({
        where: { id: productId },
        data: { viewCount: { increment: 1 } },
      }),
    ]);
  }

  async findReviews(productId: string, skip: number, take: number): Promise<[any[], number]> {
    return Promise.all([
      prisma.review.findMany({
        where: { productId },
        skip,
        take,
        orderBy: { createdAt: "desc" },
        include: {
          user: { select: { id: true, name: true, avatarUrl: true } },
          images: { select: { url: true, thumbnailUrl: true } },
          sellerResponse: true,
        },
      }),
      prisma.review.count({ where: { productId } }),
    ]);
  }

  private mapToEntity(prismaData: any, farmerData?: any): ProductEntity {
    const primaryImage = prismaData.images?.find((img: any) => img.isPrimary) || prismaData.images?.[0];
    const activeDiscount = prismaData.discounts?.[0];

    return {
      id: prismaData.id,
      name: prismaData.name,
      slug: prismaData.slug,
      description: prismaData.description,
      categoryId: prismaData.category?.id || null,
      categoryName: prismaData.category?.name || null,
      sellerId: prismaData.sellerId,
      sellerName: prismaData.seller?.name || '',
      sellerAvatarUrl: prismaData.seller?.avatarUrl || null,
      price: prismaData.price,
      currency: prismaData.currency,
      unit: prismaData.unit,
      isOrganic: prismaData.isOrganic,
      isAvailable: prismaData.isAvailable,
      stockQuantity: prismaData.stockQuantity,
      rating: prismaData.rating,
      reviewCount: prismaData.reviewCount,
      isHarvest: prismaData.isHarvest,
      targetAmount: prismaData.targetAmount,
      currentBooked: prismaData.currentBooked,
      harvestDate: prismaData.harvestDate,
      createdAt: prismaData.createdAt,
      primaryImageUrl: primaryImage?.url || primaryImage?.thumbnailUrl || null,
      imageUrls: prismaData.images?.map((img: any) => img.url) || [],
      tags: prismaData.tags?.map((t: any) => t.tag) || [],
      activeDiscountValue: activeDiscount?.value || null,
      activeDiscountType: activeDiscount?.type || null,
      farmer: farmerData ? {
        name: farmerData.name,
        profileImage: farmerData.profileImage,
        isVerified: farmerData.isVerified,
      } : undefined,
    };
  }
}

export const productRepository = new PrismaProductRepository();
