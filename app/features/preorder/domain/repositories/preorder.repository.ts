import { Product, Order, OrderItem, User } from "@/generated/prisma/client";

export type HarvestProduct = Product & {
  seller: User & {
    farmer?: any;
  };
  images: any[];
  distance?: number;
};

export type ReservationOrder = Order & {
  items: (OrderItem & {
    product: Product & {
      seller: User & {
        farmer?: any;
      };
      images: any[];
    };
  })[];
};

export interface IPreOrderRepository {
  getAvailableHarvests(latitude?: number, longitude?: number): Promise<HarvestProduct[]>;
  getUserReservations(userId: string): Promise<ReservationOrder[]>;
  getActiveHarvestsCount(): Promise<number>;
  createReservation(userId: string, harvestId: string, quantity: number): Promise<Order>;
  findHarvestById(harvestId: string): Promise<Product | null>;
}
