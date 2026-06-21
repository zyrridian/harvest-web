import { UserWithProfileEntity } from "../entities/profile.entity";

export interface UpdateProfileData {
  name?: string;
  phoneNumber?: string;
  bio?: string;
}

export interface IUserProfileRepository {
  getProfileByUserId(userId: string): Promise<UserWithProfileEntity | null>;
  updateProfile(userId: string, data: UpdateProfileData): Promise<UserWithProfileEntity>;
  updateAvatar(userId: string, avatarUrl: string): Promise<{ avatarUrl: string | null }>;
}
