import { IFavoriteRepository } from "../../domain/repositories/favorite.repository";
import prisma from "@/core/database/prisma";
import { Favorite } from "@/generated/prisma/client";

export class PrismaFavoriteRepository implements IFavoriteRepository {
  async checkFavorite(userId: string, productId: string): Promise<Favorite | null> {
    return prisma.favorite.findUnique({
      where: {
        userId_productId: {
          userId,
          productId,
        },
      },
    });
  }

  async addFavorite(userId: string, productId: string): Promise<Favorite> {
    return prisma.favorite.create({
      data: {
        userId,
        productId,
      },
    });
  }

  async removeFavorite(userId: string, productId: string): Promise<void> {
    await prisma.favorite.deleteMany({
      where: {
        userId,
        productId,
      },
    });
  }

  async getUserFavorites(userId: string): Promise<Favorite[]> {
    return prisma.favorite.findMany({
      where: { userId },
      include: {
        product: {
          include: {
            images: true,
            seller: {
              include: {
                farmer: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async countUserFavorites(userId: string): Promise<number> {
    return prisma.favorite.count({ where: { userId } });
  }

  async removeFavoriteById(id: string): Promise<Favorite | null> {
    try {
      return await prisma.favorite.delete({
        where: { id },
      });
    } catch (e) {
      return null;
    }
  }

  async findFavoriteById(id: string): Promise<Favorite | null> {
    return prisma.favorite.findUnique({
      where: { id },
    });
  }
}

export const favoriteRepository = new PrismaFavoriteRepository();
