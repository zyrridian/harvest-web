import prisma from '@/core/database/prisma';
import { IFarmerRepository, FindFarmersQuery } from '../../domain/repositories/farmer.repository';
import { FarmerEntity } from '../../domain/entities/farmer.entity';

export class PrismaFarmerRepository implements IFarmerRepository {
  async findMany(query: FindFarmersQuery, skip: number, limit: number): Promise<[FarmerEntity[], number]> {
    const where: any = {};
    const farmerConditions: any = {};
    
    if (query.searchQuery) {
      where.OR = [
        { name: { contains: query.searchQuery, mode: "insensitive" } },
        {
          farmer: {
            is: {
              description: { contains: query.searchQuery, mode: "insensitive" },
            },
          },
        },
      ];
    }

    if (query.specialties && query.specialties.length > 0) {
      farmerConditions.specialties = {
        some: {
          specialty: { in: query.specialties },
        },
      };
    }

    if (Object.keys(farmerConditions).length > 0) {
      where.farmer = {
        is: farmerConditions,
        isNot: null,
      };
    } else {
      where.farmer = {
        isNot: null,
      };
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        include: {
          farmer: {
            include: {
              specialties: true,
            },
          },
          products: {
            where: { isAvailable: true },
            select: { id: true },
          },
        },
      }),
      prisma.user.count({ where }),
    ]);

    const farmers: FarmerEntity[] = users
      .filter((u) => u.farmer)
      .map((user) => ({
        id: user.farmer!.id,
        userId: user.id,
        name: user.name,
        description: user.farmer!.description || "",
        profileImage: user.avatarUrl,
        rating: user.farmer!.rating,
        city: user.farmer!.city || "",
        specialties: user.farmer!.specialties.map((s: any) => s.specialty),
        totalProducts: user.products.length,
      }))
      .filter((f) => {
        if (query.minRating !== undefined) {
          return f.rating >= query.minRating;
        }
        return true;
      });

    return [farmers, query.minRating !== undefined ? farmers.length : total];
  }
}

export const farmerRepository = new PrismaFarmerRepository();
