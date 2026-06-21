import { IFarmerRepository, FarmerWithRelations } from "../../domain/repositories/farmer.repository";
import prisma from "@/core/database/prisma";

export class PrismaFarmerRepository implements IFarmerRepository {
  async getNearbyFarmers(params: {
    lat: number;
    lng: number;
    radius: number;
    search?: string;
    isOrganic?: boolean;
    isOpenNow?: boolean;
  }): Promise<FarmerWithRelations[]> {
    const { lat, lng, radius, search, isOrganic, isOpenNow } = params;

    // Build the query
    let whereClause: any = {};

    if (search) {
      whereClause.OR = [
        { name: { contains: search, mode: "insensitive" } },
        {
          user: {
            products: {
              some: {
                name: { contains: search, mode: "insensitive" },
              },
            },
          },
        },
      ];
    }

    if (isOrganic) {
      // Filter farmers who have at least one organic product
      whereClause.user = {
        ...whereClause.user,
        products: {
          ...(whereClause.user?.products || {}),
          some: {
            ...(whereClause.user?.products?.some || {}),
            isOrganic: true,
          },
        },
      };
    }

    // Since we don't have a reliable isOpenNow strictly on Farmer,
    // we could filter farmers who have active drop points, or we handle it in memory
    // For now, we will fetch farmers and filter them.

    const farmers = await prisma.farmer.findMany({
      where: whereClause,
      include: {
        user: {
          include: {
            products: {
              where: {
                isAvailable: true,
              },
              include: {
                category: true,
                subcategory: true,
              },
              take: 5, // We only need a few to display in the UI (extraProductsCount handles the rest)
            },
          },
        },
        dropPoints: true, // we can use this to determine if they are open
      },
    });

    let nearbyFarmers: FarmerWithRelations[] = [];

    for (const farmer of farmers) {
      // Determine if farmer is "open" based on dropPoints or just a mock if not specified
      // For this implementation, let's say they are open if they have an active drop point or just default to true
      const hasActiveDropPoint = farmer.dropPoints && farmer.dropPoints.length > 0 && farmer.dropPoints.some((dp) => dp.isActive);
      const _isOpen = hasActiveDropPoint || true; // Mocking true for prototype if drop points don't exist

      if (isOpenNow && !_isOpen) {
        continue; // Skip if looking for open now and they are not open
      }

      if (farmer.latitude && farmer.longitude) {
        const distance = this.calculateDistance(lat, lng, farmer.latitude, farmer.longitude);
        if (distance <= radius) {
          (farmer as any).distance = distance;
          nearbyFarmers.push(farmer as unknown as FarmerWithRelations);
        }
      }
    }

    // Sort by distance
    nearbyFarmers.sort((a, b) => (a.distance ?? 9999) - (b.distance ?? 9999));

    return nearbyFarmers;
  }

  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // km
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);
    const lat1Rad = this.toRad(lat1);
    const lat2Rad = this.toRad(lat2);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1Rad) * Math.cos(lat2Rad);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in km
  }

  private toRad(value: number): number {
    return (value * Math.PI) / 180;
  }
}

export const farmerRepository = new PrismaFarmerRepository();
