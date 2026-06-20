import { Favorite } from "@/generated/prisma/client";

export interface IFavoriteRepository {
  /**
   * Check if a specific product is favorited by a user.
   */
  checkFavorite(userId: string, productId: string): Promise<Favorite | null>;

  /**
   * Add a product to the user's favorites.
   */
  addFavorite(userId: string, productId: string): Promise<Favorite>;

  /**
   * Remove a product from the user's favorites.
   */
  removeFavorite(userId: string, productId: string): Promise<void>;

  /**
   * Get all favorites for a specific user, with product details.
   */
  getUserFavorites(userId: string): Promise<Favorite[]>;
  
  /**
   * Count total favorites for a user.
   */
  countUserFavorites(userId: string): Promise<number>;

  /**
   * Remove a favorite by its ID.
   */
  removeFavoriteById(id: string): Promise<Favorite | null>;

  /**
   * Find a favorite by its ID.
   */
  findFavoriteById(id: string): Promise<Favorite | null>;
}
