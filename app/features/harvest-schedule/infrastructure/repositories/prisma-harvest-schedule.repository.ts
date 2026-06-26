import { IHarvestScheduleRepository, ScheduleReservation } from "../../domain/repositories/harvest-schedule.repository";
import prisma from "@/core/database/prisma";
import { PreorderReservation } from "@/generated/prisma/client";

export class PrismaHarvestScheduleRepository implements IHarvestScheduleRepository {
  async getUserHarvestSchedule(userId: string, targetMonth: Date, latitude?: number, longitude?: number): Promise<ScheduleReservation[]> {
    const startOfMonth = new Date(targetMonth.getFullYear(), targetMonth.getMonth(), 1);
    const endOfMonth = new Date(targetMonth.getFullYear(), targetMonth.getMonth() + 1, 0, 23, 59, 59);

    let reservations = await prisma.preorderReservation.findMany({
      where: {
        userId,
        campaign: {
          estimatedHarvestDate: {
            gte: startOfMonth,
            lte: endOfMonth
          }
        }
      },
      include: {
        campaign: {
          include: { farmer: true }
        }
      },
      orderBy: {
        campaign: {
          estimatedHarvestDate: 'asc'
        }
      }
    });

    if (latitude && longitude) {
      reservations = reservations.map((r) => {
        if (r.campaign.farmer?.latitude && r.campaign.farmer?.longitude) {
          (r as any).distance = this.calculateDistance(
            latitude,
            longitude,
            r.campaign.farmer.latitude,
            r.campaign.farmer.longitude
          );
        }
        return r;
      });
    }

    return reservations as ScheduleReservation[];
  }

  async updateReservationStatus(reservationId: string, status: string): Promise<PreorderReservation> {
    return prisma.preorderReservation.update({
      where: { id: reservationId },
      data: { status }
    });
  }

  async findReservationById(reservationId: string): Promise<PreorderReservation | null> {
    return prisma.preorderReservation.findUnique({
      where: { id: reservationId },
      include: { campaign: true }
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
