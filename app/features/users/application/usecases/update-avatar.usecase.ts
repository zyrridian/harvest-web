import { IUserProfileRepository } from "../../domain/repositories/user-profile.repository";
import { AppError } from "@/core/errors";

export class UpdateAvatarUseCase {
  constructor(private readonly userProfileRepo: IUserProfileRepository) {}

  async execute(userId: string, avatarFile: File): Promise<{ avatarUrl: string | null }> {
    // Validate file type
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!allowedTypes.includes(avatarFile.type)) {
      throw AppError.badRequest("Invalid file type. Only JPEG, PNG, and WebP are allowed");
    }

    // Validate file size (5MB max)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (avatarFile.size > maxSize) {
      throw AppError.badRequest("File size exceeds 5MB limit");
    }

    // TODO: Implement actual file upload to cloud storage (S3, Cloudinary, etc.)
    // For now, we'll use a placeholder URL
    const extension = avatarFile.type.split("/")[1];
    const avatarUrl = `https://cdn.farmmarket.com/avatars/${userId}_${Date.now()}.${extension}`;

    const result = await this.userProfileRepo.updateAvatar(userId, avatarUrl);
    return result;
  }
}
