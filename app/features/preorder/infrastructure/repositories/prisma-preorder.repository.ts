import { IPreOrderRepository, CampaignWithFarmer, ReservationWithCampaign } from "../../domain/repositories/preorder.repository";
import prisma from "@/core/database/prisma";
import { PreorderCampaign, PreorderReservation } from "@/generated/prisma/client";

export class PrismaPreOrderRepository implements IPreOrderRepository {
  
  // ============================================
  // CONSUMER SIDE
  // ============================================

  async getAvailableCampaigns(latitude?: number, longitude?: number): Promise<CampaignWithFarmer[]> {
    let campaigns = await prisma.preorderCampaign.findMany({
      where: {
        status: "ACTIVE",
        estimatedHarvestDate: {
          gt: new Date()
        }
      },
      include: {
        farmer: true
      },
      orderBy: {
        estimatedHarvestDate: 'asc'
      }
    });

    if (latitude && longitude) {
      campaigns = campaigns.map((c) => {
        if (c.farmer?.latitude && c.farmer?.longitude) {
          (c as any).distance = this.calculateDistance(
            latitude,
            longitude,
            c.farmer.latitude,
            c.farmer.longitude
          );
        }
        return c;
      });
      campaigns.sort((a: any, b: any) => (a.distance ?? 9999) - (b.distance ?? 9999));
    }

    return campaigns as CampaignWithFarmer[];
  }

  async getUserReservations(userId: string): Promise<ReservationWithCampaign[]> {
    return prisma.preorderReservation.findMany({
      where: { userId },
      include: {
        campaign: {
          include: { farmer: true }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    }) as unknown as ReservationWithCampaign[];
  }

  async createReservation(userId: string, campaignId: string, quantity: number, deliveryMethod: string, addressId?: string): Promise<PreorderReservation> {
    return await prisma.$transaction(async (tx) => {
      const campaign = await tx.preorderCampaign.findUnique({
        where: { id: campaignId }
      });

      if (!campaign || campaign.status !== "ACTIVE") {
        throw new Error("Campaign is not available for reservation");
      }

      if (campaign.currentBookedQuantity + quantity > campaign.targetQuantity) {
        throw new Error("Not enough target quantity remaining");
      }

      // Update booked quantity
      const newBooked = campaign.currentBookedQuantity + quantity;
      let newStatus = campaign.status;
      if (newBooked >= campaign.targetQuantity) {
        newStatus = "FULLY_BOOKED";
      }
      
      await tx.preorderCampaign.update({
        where: { id: campaignId },
        data: { 
          currentBookedQuantity: newBooked,
          status: newStatus
        }
      });

      const totalPrice = campaign.pricePerUnit * quantity;
      const depositAmount = (totalPrice * campaign.depositPercentage) / 100;

      // Create reservation
      return tx.preorderReservation.create({
        data: {
          campaignId,
          userId,
          quantity,
          totalPrice,
          depositAmount,
          status: depositAmount > 0 ? "PENDING_DEPOSIT" : "FULLY_PAID", // simple logic
          deliveryMethod,
          addressId
        }
      });
    });
  }

  async findCampaignById(campaignId: string): Promise<PreorderCampaign | null> {
    return prisma.preorderCampaign.findUnique({
      where: { id: campaignId },
      include: { farmer: true }
    });
  }

  async findReservationById(reservationId: string): Promise<PreorderReservation | null> {
    return prisma.preorderReservation.findUnique({
      where: { id: reservationId },
      include: { campaign: true }
    });
  }

  async cancelReservation(reservationId: string, reason?: string): Promise<PreorderReservation> {
    return await prisma.$transaction(async (tx) => {
      const reservation = await tx.preorderReservation.findUnique({
        where: { id: reservationId }
      });

      if (!reservation) throw new Error("Reservation not found");
      if (reservation.status === "CANCELLED") return reservation;

      // Restore campaign booked quantity
      await tx.preorderCampaign.update({
        where: { id: reservation.campaignId },
        data: {
          currentBookedQuantity: {
            decrement: reservation.quantity
          },
          status: "ACTIVE" // If it was fully booked, it might be active again
        }
      });

      return tx.preorderReservation.update({
        where: { id: reservationId },
        data: {
          status: "CANCELLED"
        }
      });
    });
  }

  async updateReservationStatus(reservationId: string, status: string, paymentMethod?: string): Promise<PreorderReservation> {
    const data: any = { status };
    if (paymentMethod) data.paymentMethod = paymentMethod;

    return prisma.preorderReservation.update({
      where: { id: reservationId },
      data
    });
  }

  // ============================================
  // FARMER SIDE
  // ============================================

  async createCampaign(farmerId: string, data: Partial<PreorderCampaign>): Promise<PreorderCampaign> {
    return prisma.preorderCampaign.create({
      data: {
        ...data,
        farmerId,
        status: data.status || "DRAFT"
      } as any
    });
  }

  async updateCampaignStatus(campaignId: string, status: string): Promise<PreorderCampaign> {
    return prisma.preorderCampaign.update({
      where: { id: campaignId },
      data: { status }
    });
  }

  async getFarmerCampaigns(farmerId: string): Promise<PreorderCampaign[]> {
    return prisma.preorderCampaign.findMany({
      where: { farmerId },
      orderBy: { createdAt: 'desc' },
      include: {
        reservations: true
      }
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
