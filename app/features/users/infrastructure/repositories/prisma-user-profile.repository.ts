import prisma from "@/core/database/prisma";
import { IUserProfileRepository, UpdateProfileData } from "../../domain/repositories/user-profile.repository";
import { UserWithProfileEntity } from "../../domain/entities/profile.entity";

export class PrismaUserProfileRepository implements IUserProfileRepository {
  async getProfileByUserId(userId: string): Promise<UserWithProfileEntity | null> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true },
    });

    if (!user) {
      return null;
    }

    return user as unknown as UserWithProfileEntity;
  }

  async updateProfile(userId: string, data: UpdateProfileData): Promise<UserWithProfileEntity> {
    const updateData: { name?: string; phoneNumber?: string } = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.phoneNumber !== undefined) updateData.phoneNumber = data.phoneNumber;

    // We can run these in parallel or sequentially. Sequential is safer for returning the final state.
    if (Object.keys(updateData).length > 0) {
      await prisma.user.update({
        where: { id: userId },
        data: updateData,
      });
    }

    if (data.bio !== undefined) {
      await prisma.userProfile.upsert({
        where: { userId },
        update: { bio: data.bio },
        create: {
          userId,
          bio: data.bio,
        },
      });
    }

    const updatedUser = await prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true },
    });

    return updatedUser as unknown as UserWithProfileEntity;
  }
}

export const userProfileRepository = new PrismaUserProfileRepository();
