import { z } from "zod";

export const GetNearbyFarmersQuerySchema = z.object({
  lat: z.coerce.number(),
  lng: z.coerce.number(),
  radius: z.coerce.number().optional().default(3),
  search: z.string().optional(),
  is_organic: z.coerce.boolean().optional(),
  is_open_now: z.coerce.boolean().optional(),
});

export type GetNearbyFarmersQuery = z.infer<typeof GetNearbyFarmersQuerySchema>;

export interface NearbyFarmerProduct {
  name: string;
}

export interface NearbyFarmerData {
  id: string;
  name: string;
  distance: number;
  category: string;
  subCategory: string;
  rating: number;
  reviewCount: number;
  tags: string[];
  products: NearbyFarmerProduct[];
  extraProductsCount: number;
  statusText: string;
  statusSubText: string;
  isOpen: boolean;
  latitude: number;
  longitude: number;
  iconPath: string;
}
