import { IHarvestScheduleRepository, ScheduleOrder } from "../../domain/repositories/harvest-schedule.repository";
import prisma from "@/core/database/prisma";
import { Order } from "@/generated/prisma/client";

export class PrismaHarvestScheduleRepository implements IHarvestScheduleRepository {
  async getUserHarvestSchedule(userId: string, targetMonth: Date, latitude?: number, longitude?: number): Promise<ScheduleOrder[]> {
    const startOfMonth = new Date(targetMonth.getFullYear(), targetMonth.getMonth(), 1);
    const endOfMonth = new Date(targetMonth.getFullYear(), targetMonth.getMonth() + 1, 0, 23, 59, 59, 999);

    let orders = await prisma.order.findMany({
      where: {
        buyerId: userId,
        isDeposit: true, // Indicates a pre-order reservation
        items: {
          some: {
            product: {
              harvestDate: {
                gte: startOfMonth,
                lte: endOfMonth
              }
            }
          }
        }
      },
      include: {
        items: {
          include: {
            product: {
              include: {
                seller: {
                  include: { farmer: true }
                },
                images: true
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'asc'
      }
    });

    // Optionally sort items by harvest date
    orders.sort((a: any, b: any) => {
      const aDate = a.items[0]?.product?.harvestDate?.getTime() || 0;
      const bDate = b.items[0]?.product?.harvestDate?.getTime() || 0;
      return aDate - bDate;
    });

    if (latitude && longitude) {
      orders = orders.map((o) => {
        const farmer = o.items[0]?.product?.seller?.farmer;
        if (farmer?.latitude && farmer?.longitude) {
          (o as any).distance = this.calculateDistance(
            latitude,
            longitude,
            farmer.latitude,
            farmer.longitude
          );
        }
        return o;
      });
    }

    return orders as ScheduleOrder[];
  }

  async updateOrderDeposit(orderId: string): Promise<Order> {
    return prisma.order.update({
      where: { id: orderId },
      data: {
        paymentStatus: "paid",
        status: "confirmed",
        paidAt: new Date()
      }
    });
  }

  async updateOrderPickup(orderId: string, pickupTime: string): Promise<Order> {
    return prisma.order.update({
      where: { id: orderId },
      data: {
        deliveryMethod: "pickup",
        deliveryTimeSlot: pickupTime,
        status: "pickup_arranged"
      }
    });
  }

  async findOrderById(orderId: string): Promise<Order | null> {
    return prisma.order.findUnique({
      where: { id: orderId }
    });
  }

  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371;
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);
    const lat1Rad = this.toRad(lat1);
    const lat2Rad = this.toRad(lat2);

    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1Rad) * Math.cos(lat2Rad);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRad(value: number): number {
    return (value * Math.PI) / 180;
  }
}

export const harvestScheduleRepository = new PrismaHarvestScheduleRepository();
