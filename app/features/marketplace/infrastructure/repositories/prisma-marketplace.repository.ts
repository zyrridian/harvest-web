import { IMarketplaceRepository, ProductWithRelations } from "../../domain/repositories/marketplace.repository";
import { Category } from "@/generated/prisma/client";
import prisma from "@/core/database/prisma";

export class PrismaMarketplaceRepository implements IMarketplaceRepository {
  async getFlashHarvest(latitude?: number, longitude?: number): Promise<ProductWithRelations | null> {
    // Try to get a product with discount first
    let product = await prisma.product.findFirst({
      where: {
        isAvailable: true,
        discounts: {
          some: {
            isActive: true,
            validFrom: { lte: new Date() },
            validUntil: { gte: new Date() },
          },
        },
      },
      include: {
        seller: {
          include: {
            farmer: true,
          },
        },
        images: true,
      },
      orderBy: { rating: "desc" },
    });

    if (!product) {
      // Fallback: Get top rated fresh harvest
      product = await prisma.product.findFirst({
        where: {
          isAvailable: true,
          isHarvest: true,
        },
        include: {
          seller: {
            include: {
              farmer: true,
            },
          },
          images: true,
        },
        orderBy: { rating: "desc" },
      });
    }

    if (product && latitude && longitude && product.seller.farmer?.latitude && product.seller.farmer?.longitude) {
      const dist = this.calculateDistance(
        latitude,
        longitude,
        product.seller.farmer.latitude,
        product.seller.farmer.longitude
      );
      (product as any).distance = dist;
    }

    return product as ProductWithRelations | null;
  }

  async getCategories(): Promise<Category[]> {
    return prisma.category.findMany({
      where: { isActive: true },
      orderBy: { displayOrder: "asc" },
    });
  }

  async getProducts(params: {
    page: number;
    limit: number;
    search?: string;
    filter?: string;
    latitude?: number;
    longitude?: number;
  }): Promise<ProductWithRelations[]> {
    const { page, limit, search, filter, latitude, longitude } = params;

    let whereClause: any = {
      isAvailable: true,
    };

    if (search) {
      whereClause.name = {
        contains: search,
        mode: "insensitive",
      };
    }

    if (filter === "Harvest Today") {
      whereClause.isHarvest = true;
    }

    let orderByClause: any = { createdAt: "desc" };

    if (filter === "Best Rated") {
      orderByClause = { rating: "desc" };
    }

    // Nearest sorting will be done in memory since Prisma doesn't natively support PostGIS distance queries without raw SQL.
    const isNearestFilter = filter === "Nearest" && latitude !== undefined && longitude !== undefined;

    let products = await prisma.product.findMany({
      where: whereClause,
      include: {
        seller: {
          include: {
            farmer: true,
          },
        },
        images: true,
      },
      orderBy: isNearestFilter ? undefined : orderByClause,
      // If we are sorting by nearest, we need to fetch more and sort in memory, or fetch all.
      // For simplicity in a prototype, if nearest, fetch a larger batch or all.
      ...(isNearestFilter ? {} : { skip: (page - 1) * limit, take: limit }),
    });

    if (latitude && longitude) {
      products = products.map((p) => {
        if (p.seller.farmer?.latitude && p.seller.farmer?.longitude) {
          const dist = this.calculateDistance(latitude, longitude, p.seller.farmer.latitude, p.seller.farmer.longitude);
          (p as any).distance = dist;
        }
        return p;
      });
    }

    if (isNearestFilter) {
      products.sort((a: any, b: any) => (a.distance ?? 9999) - (b.distance ?? 9999));
      // Paginate in memory
      products = products.slice((page - 1) * limit, page * limit);
    }

    return products as ProductWithRelations[];
  }

  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // km
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);
    const lat1Rad = this.toRad(lat1);
    const lat2Rad = this.toRad(lat2);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1Rad) * Math.cos(lat2Rad);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRad(value: number): number {
    return (value * Math.PI) / 180;
  }
}

export const marketplaceRepository = new PrismaMarketplaceRepository();
