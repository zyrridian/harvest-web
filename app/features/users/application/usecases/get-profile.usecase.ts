import { IUserProfileRepository } from "../../domain/repositories/user-profile.repository";
import { ProfileResponseDTO, toProfileResponseDTO } from "../dtos/profile.dto";
import { AppError } from "@/core/errors";

export class GetProfileUseCase {
  constructor(private readonly userProfileRepo: IUserProfileRepository) {}

  async execute(userId: string): Promise<ProfileResponseDTO> {
    const userProfile = await this.userProfileRepo.getProfileByUserId(userId);

    if (!userProfile) {
      throw AppError.notFound("User not found");
    }

    return toProfileResponseDTO(userProfile);
  }
}
