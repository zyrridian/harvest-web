import { Category, Product, ProductImage, User } from "@/generated/prisma/client";

// Extended product type to include relations
export type ProductWithRelations = Product & {
  seller: User;
  images: ProductImage[];
  // Assuming distance might be dynamically added in raw queries
  distance?: number;
};

export interface IMarketplaceRepository {
  getFlashHarvest(latitude?: number, longitude?: number): Promise<ProductWithRelations | null>;
  getCategories(): Promise<Category[]>;
  getProducts(
    params: {
      page: number;
      limit: number;
      search?: string;
      filter?: string;
      latitude?: number;
      longitude?: number;
    }
  ): Promise<ProductWithRelations[]>;
  getUserFavoriteProductIds(userId: string): Promise<string[]>;
}
