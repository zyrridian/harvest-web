import { IAuthRepository } from "../../domain/repositories/auth.repository";
import { toUserDTO } from "../../domain/entities/user.entity";
import { comparePassword } from "../services/password.service";
import {
  signAccessToken,
  signRefreshToken,
  getRefreshTokenExpiry,
} from "../services/token.service";
import { LoginInputDTO, AuthResponseDTO } from "../dtos/auth.dto";
import { AppError } from "@/core/errors";
import { AUTH } from "@/core/config/constants";

export class LoginUseCase {
  constructor(private readonly authRepo: IAuthRepository) {}

  async execute(input: LoginInputDTO): Promise<AuthResponseDTO> {
    // 1. Find user
    const user = await this.authRepo.findByEmail(input.email);

    if (!user || !(await comparePassword(input.password, user.password))) {
      throw AppError.unauthorized("Invalid credentials");
    }

    // 2. Update online status
    await this.authRepo.updateOnlineStatus(user.id, true);

    // 3. Generate tokens
    const accessToken = await signAccessToken(user.id, user.userType);
    const refreshToken = await signRefreshToken(user.id, user.userType);

    // 4. Rotate refresh token (delete old, create new)
    await this.authRepo.deleteRefreshTokens(user.id);
    await this.authRepo.createRefreshToken({
      userId: user.id,
      token: refreshToken,
      expiresAt: getRefreshTokenExpiry(),
    });

    return {
      user: toUserDTO(user),
      access_token: accessToken,
      refresh_token: refreshToken,
      token_type: "Bearer",
      expires_in: AUTH.ACCESS_TOKEN_EXPIRES_IN,
    };
  }
}
