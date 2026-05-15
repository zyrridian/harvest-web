import { IAuthRepository } from "../../domain/repositories/auth.repository";
import { verifyToken } from "../services/token.service";
import { signAccessToken, signRefreshToken, getRefreshTokenExpiry } from "../services/token.service";
import { TokenRefreshResponseDTO } from "../dtos/auth.dto";
import { AppError } from "@/core/errors";
import { AUTH } from "@/core/config/constants";

export class RefreshTokenUseCase {
  constructor(private readonly authRepo: IAuthRepository) {}

  async execute(refreshTokenValue: string): Promise<TokenRefreshResponseDTO> {
    // 1. Verify JWT signature and type claim
    const payload = await verifyToken(refreshTokenValue);
    if (!payload || payload.type !== "refresh") {
      throw AppError.unauthorized("Invalid refresh token");
    }

    // 2. Check DB — token must exist and not be expired
    const stored = await this.authRepo.findRefreshToken(refreshTokenValue);
    if (!stored) {
      throw AppError.unauthorized("Refresh token not found");
    }
    if (stored.expiresAt < new Date()) {
      await this.authRepo.deleteRefreshTokens(stored.user.id);
      throw AppError.unauthorized("Refresh token expired");
    }

    // 3. Rotate tokens
    const newAccessToken = await signAccessToken(stored.user.id, stored.user.userType);
    const newRefreshToken = await signRefreshToken(stored.user.id, stored.user.userType);
    await this.authRepo.rotateRefreshToken(stored.id, newRefreshToken, getRefreshTokenExpiry());

    return {
      access_token: newAccessToken,
      refresh_token: newRefreshToken,
      token_type: "Bearer",
      expires_in: AUTH.ACCESS_TOKEN_EXPIRES_IN,
    };
  }
}
