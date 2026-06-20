import { UserWithProfileEntity } from "../../domain/entities/profile.entity";

export interface ProfileResponseDTO {
  user: {
    id: string;
    email: string;
    name: string;
    phone_number: string | null;
    avatar_url: string | null;
    user_type: string;
    is_verified: boolean;
    created_at: string;
    updated_at: string;
  };
  profile: {
    bio: string | null;
    followers_count: number;
    response_rate: number;
    response_time: string | null;
    joined_since: string;
  } | null;
}

export function toProfileResponseDTO(entity: UserWithProfileEntity): ProfileResponseDTO {
  return {
    user: {
      id: entity.id,
      email: entity.email,
      name: entity.name,
      phone_number: entity.phoneNumber,
      avatar_url: entity.avatarUrl,
      user_type: entity.userType,
      is_verified: entity.isVerified,
      created_at: entity.createdAt.toISOString(),
      updated_at: entity.updatedAt.toISOString(),
    },
    profile: entity.profile
      ? {
          bio: entity.profile.bio,
          followers_count: entity.profile.followersCount,
          response_rate: entity.profile.responseRate,
          response_time: entity.profile.responseTime,
          joined_since: entity.profile.joinedSince.toISOString(),
        }
      : null,
  };
}
