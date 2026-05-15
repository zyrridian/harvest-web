import { IAuthRepository } from "../../domain/repositories/auth.repository";
import { toUserDTO } from "../../domain/entities/user.entity";
import { hashPassword } from "../services/password.service";
import { signAccessToken, signRefreshToken, getRefreshTokenExpiry } from "../services/token.service";
import { RegisterInputDTO, AuthResponseDTO } from "../dtos/auth.dto";
import { AppError } from "@/core/errors";
import { AUTH } from "@/core/config/constants";

export class RegisterUseCase {
  constructor(private readonly authRepo: IAuthRepository) {}

  async execute(input: RegisterInputDTO): Promise<AuthResponseDTO> {
    // 1. Check email uniqueness
    const existing = await this.authRepo.findByEmail(input.email);
    if (existing) {
      throw AppError.badRequest("Email already registered");
    }

    // 2. Hash password & create user
    const hashedPassword = await hashPassword(input.password);
    const user = await this.authRepo.create({
      email: input.email,
      password: hashedPassword,
      name: input.name,
      phoneNumber: input.phone_number ?? null,
      userType: input.user_type,
    });

    // 3. Generate tokens
    const accessToken = await signAccessToken(user.id, user.userType);
    const refreshToken = await signRefreshToken(user.id, user.userType);

    // 4. Store refresh token
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
