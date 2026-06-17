import { Order, OrderItem, Product, User } from "@/generated/prisma/client";

export type ScheduleOrder = Order & {
  items: (OrderItem & {
    product: Product & {
      seller: User & {
        farmer?: any;
      };
      images: any[];
    };
  })[];
  distance?: number;
};

export interface IHarvestScheduleRepository {
  getUserHarvestSchedule(userId: string, targetMonth: Date, latitude?: number, longitude?: number): Promise<ScheduleOrder[]>;
  updateOrderDeposit(orderId: string): Promise<Order>;
  updateOrderPickup(orderId: string, pickupTime: string): Promise<Order>;
  findOrderById(orderId: string): Promise<Order | null>;
}
