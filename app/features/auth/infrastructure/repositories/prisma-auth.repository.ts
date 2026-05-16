import { IAuthRepository } from "../../domain/repositories/auth.repository";
import { UserEntity } from "../../domain/entities/user.entity";
import prisma from "@/core/database/prisma";
import { UserType } from "@/generated/prisma/client";

/**
 * Prisma implementation of IAuthRepository.
 * All DB access is isolated here — use-cases never touch Prisma directly.
 */
export class PrismaAuthRepository implements IAuthRepository {
  async findByEmail(email: string): Promise<UserEntity | null> {
    return prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  }

  async findById(id: string): Promise<UserEntity | null> {
    return prisma.user.findUnique({ where: { id } });
  }

  async create(data: {
    email: string;
    password: string;
    name: string;
    phoneNumber?: string | null;
    userType: string;
  }): Promise<UserEntity> {
    return prisma.user.create({
      data: {
        email: data.email.toLowerCase(),
        password: data.password,
        name: data.name,
        phoneNumber: data.phoneNumber ?? null,
        userType: data.userType as UserType,
      },
    });
  }

  async updateOnlineStatus(userId: string, isOnline: boolean): Promise<void> {
    await prisma.user.update({
      where: { id: userId },
      data: { isOnline, lastSeen: new Date() },
    });
  }

  async deleteRefreshTokens(userId: string): Promise<void> {
    await prisma.refreshToken.deleteMany({ where: { userId } });
  }

  async createRefreshToken(data: {
    userId: string;
    token: string;
    expiresAt: Date;
  }): Promise<void> {
    await prisma.refreshToken.create({ data });
  }

  async findRefreshToken(token: string): Promise<{
    id: string;
    token: string;
    expiresAt: Date;
    user: UserEntity;
  } | null> {
    return prisma.refreshToken.findUnique({
      where: { token },
      include: { user: true },
    });
  }

  async rotateRefreshToken(
    id: string,
    newToken: string,
    expiresAt: Date,
  ): Promise<void> {
    await prisma.refreshToken.update({
      where: { id },
      data: { token: newToken, expiresAt },
    });
  }
}

// Singleton instance for use across the app
export const authRepository = new PrismaAuthRepository();
