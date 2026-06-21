export interface UserProfileEntity {
  userId: string;
  bio: string | null;
  followersCount: number;
  responseRate: number;
  responseTime: string | null;
  joinedSince: Date;
}

export interface UserWithProfileEntity {
  id: string;
  email: string;
  name: string;
  phoneNumber: string | null;
  avatarUrl: string | null;
  userType: string;
  isVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
  profile: UserProfileEntity | null;
}
