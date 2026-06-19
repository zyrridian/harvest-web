import { IFavoriteRepository } from "../../domain/repositories/favorite.repository";
import { FavoriteProductResponseDTO, GetFavoritesResponseDTO } from "../dtos/favorite.dto";
import { AppError } from "@/core/errors";

export class CheckFavoriteUseCase {
  constructor(private readonly favoriteRepo: IFavoriteRepository) {}

  async execute(userId: string, productId: string): Promise<FavoriteProductResponseDTO> {
    const favorite = await this.favoriteRepo.checkFavorite(userId, productId);
    return {
      product_id: productId,
      is_favorited: !!favorite,
    };
  }
}

export class AddFavoriteUseCase {
  constructor(private readonly favoriteRepo: IFavoriteRepository) {}

  async execute(userId: string, productId: string): Promise<FavoriteProductResponseDTO> {
    // Note: We're not validating the product existence here for performance, 
    // relying on foreign key constraints in Prisma (or we can add validation if needed).
    try {
      await this.favoriteRepo.addFavorite(userId, productId);
    } catch (error: any) {
      if (error.code === 'P2002') {
        // Unique constraint failed (already favorited)
        return {
          product_id: productId,
          is_favorited: true,
        };
      }
      if (error.code === 'P2003') {
        throw AppError.notFound("Product not found");
      }
      throw error;
    }

    return {
      product_id: productId,
      is_favorited: true,
    };
  }
}

export class RemoveFavoriteUseCase {
  constructor(private readonly favoriteRepo: IFavoriteRepository) {}

  async execute(userId: string, productId: string): Promise<FavoriteProductResponseDTO> {
    await this.favoriteRepo.removeFavorite(userId, productId);
    return {
      product_id: productId,
      is_favorited: false,
    };
  }
}

export class GetUserFavoritesUseCase {
  constructor(private readonly favoriteRepo: IFavoriteRepository) {}

  async execute(userId: string): Promise<GetFavoritesResponseDTO> {
    const [favorites, total] = await Promise.all([
      this.favoriteRepo.getUserFavorites(userId),
      this.favoriteRepo.countUserFavorites(userId),
    ]);

    const formattedFavorites = favorites.map((fav: any) => {
      const product = fav.product;
      return {
        id: fav.id,
        product_id: product.id,
        name: product.name,
        price: product.price,
        unit: product.unit,
        image_url: product.images?.[0]?.url || "",
        farmer_name: product.seller?.farmer?.name || product.seller?.name || "Unknown Farmer",
        is_fresh: product.isHarvest,
        rating: product.rating,
        created_at: fav.createdAt,
      };
    });

    return {
      favorites: formattedFavorites,
      total,
    };
  }
}

export class RemoveFavoriteByIdUseCase {
  constructor(private readonly favoriteRepo: IFavoriteRepository) {}

  async execute(userId: string, favoriteId: string): Promise<void> {
    const favorite = await this.favoriteRepo.findFavoriteById(favoriteId);
    if (!favorite) {
      throw AppError.notFound("Favorite not found");
    }

    if (favorite.userId !== userId) {
      throw AppError.forbidden("You do not have permission to remove this favorite");
    }

    await this.favoriteRepo.removeFavoriteById(favoriteId);
  }
}
