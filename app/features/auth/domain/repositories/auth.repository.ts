import { UserEntity } from "../entities/user.entity";

/**
 * Auth Repository contract — domain layer defines the interface,
 * infrastructure layer provides the Prisma implementation.
 */
export interface IAuthRepository {
  /** Find a user by email address (case-insensitive). */
  findByEmail(email: string): Promise<UserEntity | null>;

  /** Find a user by their primary ID. */
  findById(id: string): Promise<UserEntity | null>;

  /** Create a new user record. */
  create(data: {
    email: string;
    password: string;
    name: string;
    phoneNumber?: string | null;
    userType: string;
  }): Promise<UserEntity>;

  /** Update user online presence. */
  updateOnlineStatus(userId: string, isOnline: boolean): Promise<void>;

  // ─── Refresh Token operations ───────────────────────────────────────────────

  /** Delete all refresh tokens belonging to a user. */
  deleteRefreshTokens(userId: string): Promise<void>;

  /** Persist a new refresh token for a user. */
  createRefreshToken(data: {
    userId: string;
    token: string;
    expiresAt: Date;
  }): Promise<void>;

  /** Find a stored refresh token (includes user data). */
  findRefreshToken(token: string): Promise<{
    id: string;
    token: string;
    expiresAt: Date;
    user: UserEntity;
  } | null>;

  /** Rotate (update) an existing refresh token. */
  rotateRefreshToken(
    id: string,
    newToken: string,
    expiresAt: Date,
  ): Promise<void>;
}
