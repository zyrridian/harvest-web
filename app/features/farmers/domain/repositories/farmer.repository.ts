import { Category, Farmer, Product, Subcategory, User } from "@/generated/prisma/client";

export type FarmerWithRelations = Farmer & {
  user: User & {
    products: (Product & {
      category: Category | null;
      subcategory: Subcategory | null;
    })[];
  };
  distance?: number;
};

export interface IFarmerRepository {
  getNearbyFarmers(params: {
    lat: number;
    lng: number;
    radius: number;
    search?: string;
    isOrganic?: boolean;
    isOpenNow?: boolean;
  }): Promise<FarmerWithRelations[]>;
}
