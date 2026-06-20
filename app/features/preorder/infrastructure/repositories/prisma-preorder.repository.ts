import { IPreOrderRepository, HarvestProduct, ReservationOrder } from "../../domain/repositories/preorder.repository";
import prisma from "@/core/database/prisma";
import { Product, Order } from "@/generated/prisma/client";

export class PrismaPreOrderRepository implements IPreOrderRepository {
  async getAvailableHarvests(latitude?: number, longitude?: number): Promise<HarvestProduct[]> {
    let harvests = await prisma.product.findMany({
      where: {
        isAvailable: true,
        isHarvest: true,
        harvestDate: {
          gt: new Date()
        }
      },
      include: {
        seller: {
          include: { farmer: true }
        },
        images: true
      },
      orderBy: {
        harvestDate: 'asc'
      }
    });

    if (latitude && longitude) {
      harvests = harvests.map((h) => {
        if (h.seller.farmer?.latitude && h.seller.farmer?.longitude) {
          (h as any).distance = this.calculateDistance(
            latitude,
            longitude,
            h.seller.farmer.latitude,
            h.seller.farmer.longitude
          );
        }
        return h;
      });
      // Optionally sort by distance
      harvests.sort((a: any, b: any) => (a.distance ?? 9999) - (b.distance ?? 9999));
    }

    return harvests as HarvestProduct[];
  }

  async getUserReservations(userId: string): Promise<ReservationOrder[]> {
    return prisma.order.findMany({
      where: {
        buyerId: userId,
        isDeposit: true, // Reservations act as deposits for harvest
        status: {
          in: ["pending_payment", "confirmed", "processing"]
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
        createdAt: 'desc'
      }
    }) as unknown as ReservationOrder[];
  }

  async getActiveHarvestsCount(): Promise<number> {
    return prisma.product.count({
      where: {
        isAvailable: true,
        isHarvest: true,
        harvestDate: {
          gt: new Date()
        }
      }
    });
  }

  async findHarvestById(harvestId: string): Promise<Product | null> {
    return prisma.product.findUnique({
      where: { id: harvestId }
    });
  }

  async createReservation(userId: string, harvestId: string, quantity: number): Promise<Order> {
    return await prisma.$transaction(async (tx) => {
      const product = await tx.product.findUnique({
        where: { id: harvestId }
      });

      if (!product || !product.isHarvest) {
        throw new Error("Invalid harvest product");
      }

      // Update booked quantity
      const newBooked = product.currentBooked + quantity;
      
      await tx.product.update({
        where: { id: harvestId },
        data: { currentBooked: newBooked }
      });

      const orderNumber = `RES-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

      const totalAmount = product.price * quantity;
      const depositAmount = totalAmount * 0.20; // Hardcoded 20% deposit

      // Create order
      return tx.order.create({
        data: {
          orderNumber,
          buyerId: userId,
          sellerId: product.sellerId,
          status: "pending_payment",
          subtotal: totalAmount,
          totalAmount: totalAmount,
          isDeposit: true,
          depositAmount: depositAmount,
          items: {
            create: {
              productId: product.id,
              productName: product.name,
              quantity: quantity,
              unitPrice: product.price,
              subtotal: totalAmount,
            }
          }
        }
      });
    });
  }

  async findOrderById(orderId: string): Promise<Order | null> {
    return prisma.order.findUnique({
      where: { id: orderId },
      include: { items: { include: { product: true } } }
    });
  }

  async getUnpaidReservations(beforeDate: Date): Promise<Order[]> {
    return prisma.order.findMany({
      where: {
        isDeposit: true,
        status: "pending_payment",
        createdAt: {
          lt: beforeDate
        }
      },
      include: { items: true }
    });
  }

  async cancelReservation(orderId: string, reason: string): Promise<Order> {
    return await prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id: orderId },
        include: { items: true }
      });

      if (!order) throw new Error("Order not found");
      if (order.status === "cancelled") return order;

      // Restore product booked quantity
      if (order.items && order.items[0]) {
        const productId = order.items[0].productId;
        const quantity = order.items[0].quantity;
        
        await tx.product.update({
          where: { id: productId },
          data: {
            currentBooked: {
              decrement: quantity
            }
          }
        });
      }

      return tx.order.update({
        where: { id: orderId },
        data: {
          status: "cancelled",
          cancelledReason: reason,
          cancelledAt: new Date()
        }
      });
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

export const preOrderRepository = new PrismaPreOrderRepository();
