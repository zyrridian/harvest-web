import { IUserProfileRepository, UpdateProfileData } from "../../domain/repositories/user-profile.repository";
import { ProfileResponseDTO, toProfileResponseDTO } from "../dtos/profile.dto";
import { AppError } from "@/core/errors";

export class UpdateProfileUseCase {
  constructor(private readonly userProfileRepo: IUserProfileRepository) {}

  async execute(userId: string, data: UpdateProfileData): Promise<ProfileResponseDTO> {
    // You could theoretically check if user exists first, but updateProfile effectively handles it.
    // A more robust approach might be to get the profile first, ensure it exists, then update.
    const userProfile = await this.userProfileRepo.getProfileByUserId(userId);
    if (!userProfile) {
      throw AppError.notFound("User not found");
    }

    const updatedProfile = await this.userProfileRepo.updateProfile(userId, data);

    return toProfileResponseDTO(updatedProfile);
  }
}
