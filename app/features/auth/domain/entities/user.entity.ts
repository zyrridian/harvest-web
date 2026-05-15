// Domain entity — pure business model, no Prisma types here
export interface UserEntity {
  id: string;
  email: string;
  name: string;
  password: string;
  phoneNumber: string | null;
  avatarUrl: string | null;
  userType: string;
  isVerified: boolean;
  isOnline: boolean;
  lastSeen: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

// Serialized user shape for API responses
export interface UserDTO {
  id: string;
  email: string;
  name: string;
  phone_number: string | null;
  avatar_url: string | null;
  user_type: string;
  is_verified: boolean;
  is_online?: boolean;
  last_seen?: string | null;
  created_at: string;
  updated_at: string;
}

export function toUserDTO(user: UserEntity, includeOnlineStatus = false): UserDTO {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    phone_number: user.phoneNumber,
    avatar_url: user.avatarUrl,
    user_type: user.userType,
    is_verified: user.isVerified,
    ...(includeOnlineStatus && {
      is_online: user.isOnline,
      last_seen: user.lastSeen?.toISOString() ?? null,
    }),
    created_at: user.createdAt.toISOString(),
    updated_at: user.updatedAt.toISOString(),
  };
}
