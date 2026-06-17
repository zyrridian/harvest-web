import { z } from "zod";

// DTOs for the response matching the mobile app's requirements
export interface FlashHarvestDTO {
  id: string;
  title: string;
  subtitle: string;
  distance: string;
  image_url: string;
}

export interface CategoryDTO {
  id: string;
  name: string;
  icon_path: string;
  gradient_colors: number[];
}

export interface ProductDTO {
  id: string;
  name: string;
  farmer_name: string;
  price: number;
  unit: string;
  image_url: string;
  rating: number;
  sold_count: number;
  is_fresh: boolean;
}

export interface MarketplaceResponseDTO {
  flash_harvest: FlashHarvestDTO | null;
  categories: CategoryDTO[];
  products: ProductDTO[];
}

// Input schema for validation
export const GetMarketplaceQuerySchema = z.object({
  latitude: z.coerce.number().optional(),
  longitude: z.coerce.number().optional(),
  filter: z.string().optional(),
  search: z.string().optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(50).default(10),
});

export type GetMarketplaceInputDTO = z.infer<typeof GetMarketplaceQuerySchema>;
