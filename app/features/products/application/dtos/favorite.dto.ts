import { z } from "zod";

export const FavoriteProductResponseSchema = z.object({
  product_id: z.string(),
  is_favorited: z.boolean(),
});

export type FavoriteProductResponseDTO = z.infer<typeof FavoriteProductResponseSchema>;

export const FavoriteItemDTOSchema = z.object({
  id: z.string(),
  product_id: z.string(),
  name: z.string(),
  price: z.number(),
  unit: z.string(),
  image_url: z.string(),
  farmer_name: z.string(),
  is_fresh: z.boolean(),
  rating: z.number(),
  created_at: z.date(),
});

export type FavoriteItemDTO = z.infer<typeof FavoriteItemDTOSchema>;

export const GetFavoritesResponseSchema = z.object({
  favorites: z.array(FavoriteItemDTOSchema),
  total: z.number(),
});

export type GetFavoritesResponseDTO = z.infer<typeof GetFavoritesResponseSchema>;
